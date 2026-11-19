# Database architecture

MessMate treats Postgres as the security boundary. The browser may render whatever it likes, but data access and every state transition are decided by RLS policies and `security definer` functions inside Supabase.

## 1. Trust boundaries

```text
React app (untrusted)
   │  authenticated PostgREST / RPC calls only
   ▼
Supabase Auth ── JWT ──► Postgres
                          ├── RLS on every public table
                          ├── helper functions (role, mess scope)
                          ├── RPCs for all sensitive writes
                          └── triggers for invariants and history
```

- The frontend uses only the anon/publishable key.
- The service-role key is used exclusively by local/dev tooling and admin setup scripts.
- The browser never decides the current role, mess scope, cutoff, booking validity, or scan validity.

## 2. Tables

| Table | Purpose |
| --- | --- |
| `profiles` | One row per person, provisioned by email. Holds `role`, `is_active`, and nullable `auth_user_id` until first Google sign-in. |
| `messes` | Mess units, active flag, description. |
| `students` | Student-specific data: roll number, assigned mess, default booking preference. One row per student profile. |
| `staff_assignments` | Many-to-many staff ↔ mess assignment. A staff member can operate multiple messes. |
| `meals` | Menu title, category, date, service window, booking cutoff, owning mess, creator. |
| `menu_items` | Ordered menu lines for a meal. |
| `meal_templates` | Weekly repeating menu definition: mess, ISO weekday, category, service window, cutoff offset, active flag. |
| `meal_template_items` | Ordered menu lines for a weekly template. |
| `meal_bookings` | One row per student/meal with current `status`, immutable `initial_status`, and `consumed_at`. |
| `booking_tokens` | Random QR secret, one row per booking, kept separate from bookings. |
| `booking_events` | Append-only status transition log with source and actor. |
| `meal_scans` | Proof of consumption: unique booking, scanning staff, timestamp. |

Key constraints:

- Email must be lowercase and match `^[a-z0-9._%+-]+@iiita\.ac\.in$`.
- Roll numbers and mess names are unique case-insensitively.
- `unique (student_id, meal_id)` prevents duplicate bookings.
- `unique (mess_id, meal_date, category)` prevents duplicate meal slots.
- `consumed_at` is only allowed when status is `opted_in`.
- `booking_tokens.booking_id` is a primary key, so each booking has at most one token.
- `meal_scans.booking_id` is unique, so each booking can be consumed at most once.
- A meal's cutoff must be at or before service start in `Asia/Kolkata`.

## 3. Authentication and account linking

Profiles are pre-provisioned by email. `auth_user_id` starts as `NULL`.

```text
Admin provisions profile(email, role, is_active)
        │
        ▼
User signs in with Google
        │
        ▼
auth.users INSERT trigger: handle_new_auth_user()
        ├── reject non-@iiita.ac.in email
        ├── reject email with no provisioned profile
        ├── reject inactive profile
        ├── reject email already linked to another auth user
        └── set profiles.auth_user_id = auth.users.id
```

Consequences:

- There is no public registration path that can create an app account.
- A valid Google account still cannot use the app unless an admin provisioned the exact email.
- Deactivated profiles keep their identity link but RLS helper functions return no usable context, and future bookings are cancelled.
- `get_my_context()` returns `null` when no profile is linked to the authenticated user. The client routes that state to the access-denied screen.

## 4. Booking lifecycle

### Automatic generation

Bookings are created for **future** meals using the student's default preference:

- `meals` insert trigger → `generate_bookings_for_meal(meal_id)` creates one booking per active student in the meal's mess.
- `students` insert trigger → `generate_bookings_for_student(student_id)` creates bookings for today's and future meals in the assigned mess.
- Reactivating a profile does the same for the student.
- All inserts use `on conflict (student_id, meal_id) do nothing`, so re-running is safe.

Historical meals are not auto-filled, because they are no longer bookable. The demo seed explicitly creates past bookings to exercise history/reporting.

### Weekly menu materialization

Staff set a repeating `meal_templates` row per mess × ISO weekday × category, with an ordered item list.

- `materialize_recurring_meals(p_mess_ids, p_days, p_refresh)` fills the next 21 days by default.
- It only writes messes the caller belongs to (admin, assigned staff, or the student's own mess).
- Missing meals are inserted with `template_id` set, then the existing meal trigger creates student bookings.
- `p_refresh = true` is used after a template is saved. It updates only future meals still linked to the same template.
- Editing a generated meal from the normal meal form clears `template_id`, turning that date into a one-off override.
- Meals whose service has already started today are never created or rewritten.

The staff and student clients call the materialization function opportunistically when loading menus, so no separate cron worker is required.

### Student changes before cutoff

`set_my_booking_status(meal_id, status)`:

1. Resolves the caller's student row from the JWT.
2. Verifies the meal belongs to the student's mess.
3. Rejects the request when `now() >= meals.booking_cutoff_at`.
4. Locks the booking row `FOR UPDATE`.
5. Refuses to change a booking that was already scanned.
6. Inserts or updates the status.

The initial insert also stores `initial_status` through a trigger. That value is never rewritten, so reports can distinguish “booked by default” from “explicitly opted in”.

### Preference changes

`update_my_preference(status)` changes only `students.default_booking_preference`. Existing bookings are intentionally untouched; the preference applies to future generated bookings.

### Mess transfer

When `students.mess_id` changes:

1. Future, unconsumed, opted-in bookings in the **old** mess become `opted_out`.
2. The event trigger logs those transitions as `system` actions.
3. New bookings are generated for the student's current preference in the **new** mess.
4. Past bookings, consumed bookings, and all existing events stay attached to their original meals.

This is why history is not rewritten: a transfer is a new set of events, not an edit of the past.

### Deactivation

When `profiles.is_active` becomes false, future unconsumed opted-in bookings are cancelled. When reactivated, future bookings are regenerated from the default preference.

## 5. History and event sourcing

`booking_events` is append-only from the app’s perspective:

```text
booking_id | previous_status | new_status | action_source | actor_profile_id | created_at
```

`log_booking_event()` fires after insert and after a status update. It ignores updates that do not change status. The calling RPC sets transaction-local settings:

```sql
set_config('messmate.action_source', 'student', true);
set_config('messmate.actor_profile_id', '<profile uuid>', true);
```

Triggers fall back to `system` when those settings are absent. Events are never updated or deleted by application RPCs.

`meal_bookings.status` is the current state; `booking_events` is the audit trail. Reports join both so the committee can see the final status and how it was reached.

## 6. QR tokens and scanning

### Token privacy

- Tokens are generated with `gen_random_bytes(24)` and hex-encoded (192 bits of entropy).
- Tokens live in `booking_tokens`, not `meal_bookings`.
- A student can read their own token through `get_my_meal_pass()` or the owner-only RLS policy.
- Staff **cannot** select `booking_tokens`; they only invoke `scan_booking(token)`.
- Tokens are only exposed for opted-in, unconsumed bookings.

### Scan path

`scan_booking(token)`:

1. Resolves the caller's profile and rejects non-staff/non-admin roles.
2. Looks up the token and its meal's mess.
3. Verifies the caller is assigned to that mess (admins bypass assignment).
4. Delegates to `_consume_booking()`, which locks the booking row and checks the meal's service window.
5. Returns a structured result: `valid`, `already_scanned`, `not_started`, `meal_ended`, `opted_out`, `invalid`, or `forbidden`.

The service window is computed in `Asia/Kolkata` from `meal_date + start_time` through `meal_date + end_time`. A pass scanned before the start returns `not_started`; a pass scanned at or after the end returns `meal_ended`. Neither result consumes the booking. The message includes the meal date and opening/closing time so the scanner can explain the rejection.

`_consume_booking()` only updates when the current instant is inside the service window and:

```sql
consumed_at is null and status = 'opted_in'
```

The conditional `UPDATE` plus the row lock makes concurrent duplicate scans safe: one transaction wins, the others observe the consumed row or fail the conditional update and return `already_scanned`.

`scan_booking_manual(meal_id, roll_number)` is the fallback when a pass cannot be scanned. It resolves the student in the selected meal's mess and then uses the same consumption routine. It can also return `not_booked`.

## 7. RLS model

RLS is enabled on every public table. The `authenticated` role receives only the privileges it needs.

| Data | Student | Staff | Admin |
| --- | --- | --- | --- |
| Own profile | Read | Read | Read/write |
| Profiles in their mess | — | Read | Read/write |
| Messes | Own mess | Assigned messes | All |
| Students | Own row | Assigned messes | All |
| Staff assignments | Own row | Own row + same mess | All |
| Meals / menu | Own mess | Assigned messes, future CRUD | All |
| Bookings | Own | Assigned messes | All |
| Booking events | Own | Assigned messes | All |
| Meal scans | Own | Assigned messes | All |
| QR tokens | Own, via owner policy/RPC | **No direct read** | Read |

Helper functions used by policies:

- `current_profile_id()` — profile linked to `auth.uid()`
- `current_user_role()` — role of the linked profile
- `is_admin()`
- `is_staff_for(mess_id)`
- `my_student_mess_id()`
- `can_read_mess(mess_id)`

Sensitive tables have **no insert/update/delete policies** for normal clients:

- `meal_bookings`
- `booking_tokens`
- `booking_events`
- `meal_scans`

Those changes happen only through RPCs owned by the function definer.

`profiles`, `messes`, `students`, `staff_assignments`, `meals`, `menu_items`, `meal_templates`, and `meal_template_items` have admin/staff write policies as appropriate, but the primary management flows still use RPCs so related side effects are consistent.

## 8. RPC catalog

**Student**

- `get_my_context()` — profile, role, student, staff messes
- `set_my_booking_status(p_meal_id, p_status)`
- `update_my_preference(p_preference)`
- `get_my_meal_pass(p_booking_id)`

**Staff / scanning**

- `scan_booking(p_token)`
- `scan_booking_manual(p_meal_id, p_roll_number)`
- `_consume_booking(p_booking_id, p_actor)` — internal shared routine
- `materialize_recurring_meals(p_mess_ids, p_days, p_refresh)` — generate/update meals from the weekly plan

**Admin**

- `admin_create_student(...)`
- `admin_update_student(...)` — details, mess transfer, preference, active flag
- `admin_create_staff(...)`
- `admin_update_staff(...)`
- `admin_bulk_import_students(p_records jsonb)`
- `admin_report(p_mess_id, p_student_id, p_from, p_to, p_category)`

Every admin RPC checks `is_admin()` inside the database. Hiding admin routes in React is not the enforcement.

`admin_update_student` and `admin_update_staff` prevent an administrator from demoting or deactivating their own admin account.

## 9. Cutoff and time

- Meal dates and service times are local campus time (`Asia/Kolkata`).
- `booking_cutoff_at` is a `timestamptz` computed from the meal date/time in `Asia/Kolkata`.
- The database compares `now()` against `booking_cutoff_at`; the client may show a countdown but cannot bypass the check.
- The meal constraint prevents a cutoff after service starts.
- Scanning is only allowed between the meal's `start_time` and `end_time`; the database checks this before consuming the booking.
- Reports use `date` ranges, not client-supplied timestamps.

## 10. Reporting and rebates

`admin_report()` returns one row per booking with:

- student and mess identity
- meal date, category, title, and joined menu text
- current status and immutable initial status
- first opt-in event timestamp
- latest opt-out event timestamp
- consumption and scan timestamps
- full event JSON

MessMate does not calculate money. The CSV export is the boundary: the mess committee can apply its own rebate policy to authoritative participation data.

## 11. Migrations

Applied in order:

1. `20261118000100_schema.sql` — enums, tables, indexes, helper functions, auth trigger, booking generation, transfer/deactivation triggers, event log, token creation, meal protection.
2. `20261118000200_rpc.sql` — student, scan, admin, import, and report RPCs.
3. `20261118000300_rls.sql` — RLS policies and table grants.
4. `20261119000100_recurring_meals.sql` — weekly templates, template RLS, generated-meal linkage, and materialization RPC.
5. `20261119000200_scan_service_window.sql` — service-window enforcement for QR and manual scans.

`supabase/seed.sql` is loaded only by `supabase db reset` locally. Production uses migrations plus admin provisioning.

## 12. Invariants worth preserving

- Never write `booking_tokens` from the client; let the trigger/RPC manage it.
- Never update or delete historical `booking_events`.
- Never rewrite `initial_status` on an existing booking.
- Never trust a client-supplied role, mess ID, cutoff, or scan result.
- Keep the cutoff check, service-window check, and consumption `UPDATE` inside the database.
- Keep transfers additive: cancel future old-mess bookings, create new-mess ones, leave history intact.
- Keep report output factual; rebate policy belongs outside the schema.

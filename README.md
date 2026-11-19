# MessMate

MessMate is a mobile-first mess management app for IIIT Allahabad. Students book or opt out of meals, staff verify single-use meal passes at the counter, and administrators manage messes, accounts, imports, and rebate exports.

The UI is a React + TypeScript PWA-style client. Every security-sensitive action is enforced in Postgres through Row Level Security (RLS) and `security definer` RPCs, so hiding a button is never the access control.

## What is included

**Students**

- Today's meals, weekly menu, and booking status at a glance
- Opt in / opt out before the server-side booking cutoff
- Meal pass with a random QR token, shown only to its owner
- Full booking history with opt-in/opt-out timestamps and initial status
- Default booking preference for future auto-generated bookings

**Staff**

- Dashboard for assigned messes and today's service
- Weekly recurring menu: set each day × meal once and meals auto-generate for the next 3 weeks
- Create, edit, and delete future meals and menus (past service is protected)
- Student directory limited to assigned messes
- Camera QR scanner plus roll-number fallback
- Server-verified results: valid, already scanned, before/after service window, opted out, wrong mess, invalid token, not booked

**Administrators**

- Campus overview and mess management
- Student provisioning, mess transfers, deactivation, and complete history
- Staff provisioning with one or more mess assignments
- CSV bulk student import with per-row validation and results
- Booking/participation report and CSV export for later rebate calculation

## Stack

- React 19, TypeScript, Vite
- Tailwind CSS v4 with shadcn-style Radix primitives
- TanStack Query, React Hook Form, Zod
- Supabase: Postgres, Auth (Google OAuth), RLS, RPCs
- `html5-qrcode` for camera scanning, `qrcode` for pass rendering

## Quick start (local)

### Prerequisites

- Node.js 22+ (Vite 8 requires a modern Node runtime)
- Docker (for the Supabase local stack)
- Supabase CLI (installed as a dev dependency, so `npx supabase` works)

### 1. Install dependencies

```bash
npm install
```

### 2. Start Supabase and configure the frontend

```bash
npx supabase start
cp .env.example .env.local
```

Copy the local API URL and anon/publishable key from `npx supabase status` into `.env.local`:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
# Older local stacks may only provide an anon key; the client accepts either.
# VITE_SUPABASE_ANON_KEY=<local anon key>

SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<local service_role or secret key>
SUPABASE_ANON_KEY=<local anon or publishable key>
```

The service-role key is only used by local tooling. Never expose it through a `VITE_` variable or add it to the Pages project.

### 3. Reset the database and create local test logins

```bash
npm run db:reset
npm run seed:auth
```

`db:reset` applies all migrations and `supabase/seed.sql` (demo messes, staff, 20 students, and meals from three days back to three days ahead).

`seed:auth` is a **local-development-only** helper that creates password-based Supabase Auth users so the app can be tested without configuring Google. The product UI never offers password sign-in.

### 4. Run the app

```bash
npm run dev
```

Open http://localhost:5173.

### Demo accounts

All local demo accounts use the password `MessMate@123` after `npm run seed:auth`.

| Role | Email | Notes |
| --- | --- | --- |
| Admin | `admin@iiita.ac.in` | Provisioned demo administrator |
| Staff | `rakesh.yadav@iiita.ac.in` | BH1 |
| Staff | `geeta.sharma@iiita.ac.in` | BH4 |
| Student | `aarav.mehta@iiita.ac.in` | BH1 |
| Student | `vivaan.gupta@iiita.ac.in` | BH2 |

The seeded database has four messes (`BH1`–`BH4`), 20 students, and roughly seven days of meals and booking history.

## Google OAuth setup

MessMate only accepts Google accounts whose email ends in `@iiita.ac.in`, and only for profiles an administrator has provisioned. Both rules are enforced by the `auth.users` trigger, not just by the UI.

### 1. Create a Google OAuth client

In Google Cloud Console → **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**:

- **Authorized JavaScript origins**
  - `http://localhost:5173`
  - your production origin, for example `https://messmate.example.com`
- **Authorized redirect URIs**
  - local Supabase: `http://127.0.0.1:54321/auth/v1/callback`
  - hosted Supabase: `https://<project-ref>.supabase.co/auth/v1/callback`

### 2. Enable Google in Supabase

**Local:** set the client ID/secret in the environment used by the Supabase CLI, then enable the provider in `supabase/config.toml`:

```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
redirect_uri = ""
skip_nonce_check = true
```

```bash
export SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID="..."
export SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET="..."
npx supabase stop
npx supabase start
```

**Hosted:** in the Supabase Dashboard → **Authentication → Providers → Google**, enable the provider and paste the client ID and secret.

### 3. Configure redirect URLs

In Supabase → **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:5173` locally or your production URL
- **Redirect URLs:** add `http://localhost:5173/auth/callback`, `http://127.0.0.1:5173/auth/callback`, and `https://<your-domain>/auth/callback`

The client redirects to `${window.location.origin}/auth/callback` and sends `hd=iiita.ac.in` as a Google account hint.

### 4. Provision the first administrator before first sign-in

The auth trigger rejects any Google account that does not already have a profile. Provision the initial admin with the service-role key:

```bash
ADMIN_EMAIL=you@iiita.ac.in ADMIN_NAME="Mess Administrator" npm run provision:admin
```

Then sign in with that exact Google account. The trigger links the Google identity to the pre-provisioned profile.

For a fresh hosted project:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
ADMIN_EMAIL=you@iiita.ac.in ADMIN_NAME="Mess Administrator" npm run provision:admin
```

Do **not** run `supabase/seed.sql` or `npm run seed:auth` against production: the seed contains demo data, and `seed:auth` creates password users.

## Bulk student import

Administrators can upload a CSV or paste rows on **Admin → Bulk import**. Required columns:

```csv
name,roll_number,email,mess
Aarav Mehta,IIT2023001,aarav.mehta@iiita.ac.in,BH1
```

- `name` — at least 2 characters
- `roll_number` — at least 3 characters, unique (case-insensitive)
- `email` — must end in `@iiita.ac.in`, unique
- `mess` — exact existing mess name

Every import is processed by `admin_bulk_import_students`, which validates each row individually and returns imported/failed results. Valid rows are inserted; invalid rows are reported with a reason. A ready-to-edit example is at [`docs/sample-students.csv`](docs/sample-students.csv).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite on port 5173 |
| `npm run build` | Type-check and build for production |
| `npm run deploy` | Build and deploy `dist/` to Cloudflare Pages |
| `npm run typecheck` | TypeScript project build check |
| `npm run lint` | Oxlint |
| `npm run db:reset` | Recreate the local database, migrations, and seed |
| `npm run db:types` | Regenerate `src/types/database.ts` from local Supabase |
| `npm run seed:auth` | Create local password users for demo accounts (never production) |
| `npm run provision:admin` | Provision the initial/further administrator by email |
| `npm run test:backend` | Run the 27-check backend integration suite |

### Backend tests

With the local stack running and demo auth seeded:

```bash
npm run test:backend
```

The suite exercises real Supabase clients and covers RLS isolation, cutoff enforcement, event history, token privacy, service-window enforcement, duplicate and concurrent scans, wrong-mess scans, manual verification, meal CRUD restrictions, transfers, deactivation, bulk import, reporting, and self-role-change prevention. It mutates the local database, so run `npm run db:reset && npm run seed:auth` afterwards if you want a clean demo state.

## Database architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full explanation. In short:

- `profiles` are provisioned by email before first sign-in; `auth_user_id` is linked by a trigger when the Google identity appears.
- Staff define a repeating weekly menu; future meals and their bookings are generated automatically from it.
- Editing a generated meal turns that date into a one-off override so the weekly plan does not overwrite it.
- Bookings are generated automatically for future meals from each student's default preference.
- Status changes are appended to `booking_events`; history is never rewritten.
- QR tokens live in a separate `booking_tokens` table that staff cannot read directly.
- Booking writes, scans, provisioning, imports, and reports are RPC-only. Direct writes to bookings, tokens, events, and scans are denied.
- Scans lock the booking row, so concurrent duplicate scans produce exactly one valid result.
- The database refuses scans outside the meal's service window, returning `not_started` or `meal_ended` with a human-readable message.

## Rebate calculation

MessMate deliberately does **not** implement a rebate formula. It stores and exports booking/participation facts (initial status, current status, opt-in/opt-out timestamps, consumption, scan times, menu) so the mess committee can apply its own policy later.

Use **Admin → Reports** to filter by mess, student, date range, and meal category, then export CSV.

## Deployment notes

1. Apply migrations with `npx supabase db push` (do not seed production).
2. Provision the first admin with `npm run provision:admin`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`) in the hosting provider.
4. Configure the production Site URL, redirect URLs, and Google OAuth client.
5. Build with `npm run build` and serve `dist/` as an SPA with a fallback to `index.html`.

The build uses route-level code splitting, so students, staff, and admins only download the screens they use. The QR renderer and camera decoder also load on demand.

### Cloudflare Pages

MessMate deploys as a static Pages project. The repository includes `public/_redirects` with a catch-all rewrite to `index.html`, so client-side routes work on refresh and direct navigation.

Configure the Pages project with:

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node version:** `22` (or newer)
- **Production variables:**
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Preview variables:** the same two values

Only public `VITE_` values belong in Pages. Do not add `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, or `SUPABASE_DB_PASSWORD` there.

First-time setup from a machine with the Wrangler CLI:

```bash
npx wrangler login
npx wrangler pages project create messmate --production-branch main
```

After that, deploy with one command:

```bash
npm run deploy
```

`npm run deploy` runs the production build and uploads `dist/` to the `messmate` Pages project on the `main` production branch. To deploy to a different Pages project, update the `--project-name` value in the `deploy` script in `package.json`.

Then update the hosted Supabase **Authentication → URL Configuration**:

- **Site URL:** `https://<project>.pages.dev`
- **Redirect URLs:** `https://<project>.pages.dev/auth/callback` and `https://<project>.pages.dev/**`
- Keep the local `http://localhost:5173/**` entries if local Google sign-in is needed.

The Google OAuth client’s authorized redirect URI remains the Supabase callback, `https://<project-ref>.supabase.co/auth/v1/callback`; the Pages callback is handled by Supabase after the token exchange.

## Project structure

```text
src/
  components/    UI primitives and shared app components
  contexts/      Auth provider and auth hooks/helpers
  hooks/         TanStack Query data hooks
  layouts/       Student, staff, and admin shells
  lib/           Supabase client, utilities, CSV helpers
  pages/         Auth, student, staff, and admin screens
  routes/        Protected route guard
  services/      Supabase queries and RPC calls
  types/         Generated database types and app contracts
supabase/
  migrations/    Schema, RPCs, and RLS policies
  seed.sql       Demo messes, accounts, meals, and history
scripts/         Dev auth seeding, admin provisioning, backend tests
docs/            Architecture and sample import CSV
```

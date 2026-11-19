-- MessMate row level security.
-- The API only ever talks to the database as the authenticated role. Every
-- table below is protected by RLS; sensitive writes happen through RPCs.

alter table public.profiles enable row level security;
alter table public.messes enable row level security;
alter table public.students enable row level security;
alter table public.staff_assignments enable row level security;
alter table public.meals enable row level security;
alter table public.menu_items enable row level security;
alter table public.meal_bookings enable row level security;
alter table public.booking_tokens enable row level security;
alter table public.booking_events enable row level security;
alter table public.meal_scans enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    auth_user_id = (select auth.uid())
    or public.is_admin()
    or exists (
      select 1 from public.students s
      where s.profile_id = profiles.id
        and public.is_staff_for(s.mess_id)
    )
    or exists (
      select 1
      from public.staff_assignments mine
      join public.staff_assignments theirs on theirs.mess_id = mine.mess_id
      where mine.staff_id = public.current_profile_id()
        and theirs.staff_id = profiles.id
    )
  );

create policy profiles_admin_insert on public.profiles
  for insert to authenticated
  with check (public.is_admin());

create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy profiles_admin_delete on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- messes
-- ---------------------------------------------------------------------------

create policy messes_select on public.messes
  for select to authenticated
  using (public.can_read_mess(id));

create policy messes_admin_insert on public.messes
  for insert to authenticated
  with check (public.is_admin());

create policy messes_admin_update on public.messes
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy messes_admin_delete on public.messes
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------------

create policy students_select on public.students
  for select to authenticated
  using (
    profile_id = public.current_profile_id()
    or public.is_admin()
    or public.is_staff_for(mess_id)
  );

create policy students_admin_insert on public.students
  for insert to authenticated
  with check (public.is_admin());

create policy students_admin_update on public.students
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy students_admin_delete on public.students
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- staff assignments
-- ---------------------------------------------------------------------------

create policy staff_assignments_select on public.staff_assignments
  for select to authenticated
  using (
    staff_id = public.current_profile_id()
    or public.is_admin()
    or public.is_staff_for(mess_id)
  );

create policy staff_assignments_admin_insert on public.staff_assignments
  for insert to authenticated
  with check (public.is_admin());

create policy staff_assignments_admin_update on public.staff_assignments
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy staff_assignments_admin_delete on public.staff_assignments
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- meals + menu items
-- ---------------------------------------------------------------------------

create policy meals_select on public.meals
  for select to authenticated
  using (public.can_read_mess(mess_id));

create policy meals_staff_insert on public.meals
  for insert to authenticated
  with check (public.is_admin() or public.is_staff_for(mess_id));

create policy meals_staff_update on public.meals
  for update to authenticated
  using (public.is_admin() or public.is_staff_for(mess_id))
  with check (public.is_admin() or public.is_staff_for(mess_id));

create policy meals_staff_delete on public.meals
  for delete to authenticated
  using (public.is_admin() or public.is_staff_for(mess_id));

create policy menu_items_select on public.menu_items
  for select to authenticated
  using (
    exists (
      select 1 from public.meals m
      where m.id = menu_items.meal_id
        and public.can_read_mess(m.mess_id)
    )
  );

create policy menu_items_staff_insert on public.menu_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.meals m
      where m.id = menu_items.meal_id
        and (public.is_admin() or public.is_staff_for(m.mess_id))
    )
  );

create policy menu_items_staff_update on public.menu_items
  for update to authenticated
  using (
    exists (
      select 1 from public.meals m
      where m.id = menu_items.meal_id
        and (public.is_admin() or public.is_staff_for(m.mess_id))
    )
  )
  with check (
    exists (
      select 1 from public.meals m
      where m.id = menu_items.meal_id
        and (public.is_admin() or public.is_staff_for(m.mess_id))
    )
  );

create policy menu_items_staff_delete on public.menu_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.meals m
      where m.id = menu_items.meal_id
        and (public.is_admin() or public.is_staff_for(m.mess_id))
    )
  );

-- ---------------------------------------------------------------------------
-- bookings, tokens, events, scans
-- ---------------------------------------------------------------------------

create policy meal_bookings_select on public.meal_bookings
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.students s
      where s.id = meal_bookings.student_id
        and s.profile_id = public.current_profile_id()
    )
    or exists (
      select 1 from public.meals m
      where m.id = meal_bookings.meal_id
        and public.is_staff_for(m.mess_id)
    )
  );

-- No insert/update/delete policies on purpose. Booking changes go through
-- set_my_booking_status(), scanning goes through scan_booking().

create policy booking_tokens_select on public.booking_tokens
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.meal_bookings b
      join public.students s on s.id = b.student_id
      where b.id = booking_tokens.booking_id
        and s.profile_id = public.current_profile_id()
    )
  );

create policy booking_events_select on public.booking_events
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.meal_bookings b
      join public.students s on s.id = b.student_id
      where b.id = booking_events.booking_id
        and s.profile_id = public.current_profile_id()
    )
    or exists (
      select 1
      from public.meal_bookings b
      join public.meals m on m.id = b.meal_id
      where b.id = booking_events.booking_id
        and public.is_staff_for(m.mess_id)
    )
  );

create policy meal_scans_select on public.meal_scans
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.meal_bookings b
      join public.students s on s.id = b.student_id
      where b.id = meal_scans.booking_id
        and s.profile_id = public.current_profile_id()
    )
    or exists (
      select 1
      from public.meal_bookings b
      join public.meals m on m.id = b.meal_id
      where b.id = meal_scans.booking_id
        and public.is_staff_for(m.mess_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;

grant select on public.profiles, public.messes, public.students,
  public.staff_assignments, public.meals, public.menu_items,
  public.meal_bookings, public.booking_events, public.meal_scans
  to authenticated;

grant insert, update, delete on public.profiles, public.messes, public.students,
  public.staff_assignments, public.meals, public.menu_items
  to authenticated;

-- Tokens are never directly writable through the API, and only owners/admins
-- can read them (see policy above).
grant select on public.booking_tokens to authenticated;

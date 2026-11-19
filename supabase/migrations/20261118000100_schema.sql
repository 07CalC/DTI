-- MessMate core schema
-- Roles, messes, meals, booking state + immutable booking history.

create extension if not exists pgcrypto with schema extensions;

create type public.user_role as enum ('student', 'staff', 'admin');
create type public.booking_status as enum ('opted_in', 'opted_out');
create type public.booking_action_source as enum ('student', 'system', 'staff', 'admin');
create type public.meal_category as enum ('breakfast', 'lunch', 'snacks', 'dinner');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  -- auth_user_id is null until the provisioned user signs in with Google.
  auth_user_id uuid unique references auth.users (id) on delete set null,
  name text not null check (length(trim(name)) >= 2),
  email text not null unique
    check (email = lower(email) and email ~ '^[a-z0-9._%+-]+@iiita\.ac\.in$'),
  role public.user_role not null default 'student',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) >= 2),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  roll_number text not null unique check (length(trim(roll_number)) >= 3),
  mess_id uuid not null references public.messes (id) on delete restrict,
  default_booking_preference public.booking_status not null default 'opted_in',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete cascade,
  mess_id uuid not null references public.messes (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (staff_id, mess_id)
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes (id) on delete restrict,
  category public.meal_category not null,
  title text not null check (length(trim(title)) >= 2),
  description text,
  meal_date date not null,
  start_time time not null,
  end_time time not null,
  booking_cutoff_at timestamptz not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mess_id, meal_date, category),
  constraint meal_time_order check (end_time > start_time),
  constraint cutoff_before_service check (
    booking_cutoff_at <= ((meal_date + start_time) at time zone 'Asia/Kolkata')
  )
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  name text not null check (length(trim(name)) >= 1),
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.meal_bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  meal_id uuid not null references public.meals (id) on delete cascade,
  status public.booking_status not null,
  -- The status generated from the student's preference when the row was made.
  initial_status public.booking_status not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, meal_id),
  constraint consumed_requires_opt_in check (consumed_at is null or status = 'opted_in')
);

-- Tokens are isolated from meal_bookings so staff can read a mess's bookings
-- without ever being able to read QR secrets.
create table public.booking_tokens (
  booking_id uuid primary key references public.meal_bookings (id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now()
);

create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.meal_bookings (id) on delete cascade,
  previous_status public.booking_status,
  new_status public.booking_status not null,
  action_source public.booking_action_source not null,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.meal_scans (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.meal_bookings (id) on delete cascade,
  scanned_by uuid references public.profiles (id) on delete set null,
  scanned_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create unique index messes_name_lower_idx on public.messes (lower(name));
create unique index students_roll_lower_idx on public.students (lower(roll_number));
create index profiles_role_idx on public.profiles (role);
create index profiles_auth_user_idx on public.profiles (auth_user_id);
create index students_mess_idx on public.students (mess_id);
create index staff_assignments_staff_idx on public.staff_assignments (staff_id);
create index staff_assignments_mess_idx on public.staff_assignments (mess_id);
create index meals_mess_date_idx on public.meals (mess_id, meal_date, start_time);
create index meals_date_idx on public.meals (meal_date);
create index menu_items_meal_idx on public.menu_items (meal_id, sort_order);
create index meal_bookings_meal_status_idx on public.meal_bookings (meal_id, status);
create index meal_bookings_student_idx on public.meal_bookings (student_id, created_at desc);
create index meal_bookings_consumed_idx on public.meal_bookings (meal_id, consumed_at);
create index booking_events_booking_idx on public.booking_events (booking_id, created_at);
create index meal_scans_booking_idx on public.meal_scans (booking_id);
create index meal_scans_scanned_by_idx on public.meal_scans (scanned_by, scanned_at desc);

-- ---------------------------------------------------------------------------
-- Generic updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger messes_set_updated_at
  before update on public.messes
  for each row execute function public.set_updated_at();
create trigger students_set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();
create trigger meals_set_updated_at
  before update on public.meals
  for each row execute function public.set_updated_at();
create trigger meal_bookings_set_updated_at
  before update on public.meal_bookings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Trusted authorization helpers (used by RLS)
-- ---------------------------------------------------------------------------

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id
  from public.profiles
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, auth
as $$
  select role
  from public.profiles
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.is_staff_for(p_mess_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.staff_assignments sa
    join public.profiles p on p.id = sa.staff_id
    where sa.staff_id = public.current_profile_id()
      and sa.mess_id = p_mess_id
      and p.role = 'staff'
      and p.is_active = true
  );
$$;

create or replace function public.my_student_mess_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select s.mess_id
  from public.students s
  join public.profiles p on p.id = s.profile_id
  where s.profile_id = public.current_profile_id()
    and p.is_active = true
  limit 1;
$$;

create or replace function public.can_read_mess(p_mess_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    public.is_admin()
    or public.my_student_mess_id() = p_mess_id
    or public.is_staff_for(p_mess_id),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Profile / account integrity
-- ---------------------------------------------------------------------------

create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if old.role is distinct from new.role
     and old.auth_user_id is not null
     and old.auth_user_id = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_self_role_change
  before update on public.profiles
  for each row execute function public.prevent_self_role_change();

-- A pre-provisioned profile is linked to its Google identity on first sign-in.
-- Rejecting an unknown / out-of-domain account here prevents a Supabase Auth
-- user from being created at all, even if the frontend is bypassed.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if new.email is null or new.email !~* '^[a-z0-9._%+-]+@iiita\.ac\.in$' then
    raise exception 'Only @iiita.ac.in Google accounts are allowed';
  end if;

  select * into v_profile
  from public.profiles
  where email = lower(new.email)
  for update;

  if not found then
    raise exception 'This account has not been provisioned by a mess administrator';
  end if;

  if not v_profile.is_active then
    raise exception 'This account has been deactivated';
  end if;

  if v_profile.auth_user_id is not null and v_profile.auth_user_id <> new.id then
    raise exception 'This email is already linked to another sign-in';
  end if;

  update public.profiles
  set auth_user_id = new.id
  where id = v_profile.id;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Booking history + token management
-- ---------------------------------------------------------------------------

create or replace function public.set_booking_initial_status()
returns trigger
language plpgsql
as $$
begin
  new.initial_status := coalesce(new.initial_status, new.status);
  return new;
end;
$$;

create trigger meal_bookings_set_initial_status
  before insert on public.meal_bookings
  for each row execute function public.set_booking_initial_status();

-- Every status transition is logged. Functions set
-- messmate.action_source / messmate.actor_profile_id for the transaction.
create or replace function public.log_booking_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.booking_action_source := 'system';
  v_actor uuid;
  v_source_text text;
  v_actor_text text;
begin
  if tg_op = 'UPDATE' and old.status = new.status then
    return new;
  end if;

  v_source_text := nullif(current_setting('messmate.action_source', true), '');
  if v_source_text is not null then
    begin
      v_source := v_source_text::public.booking_action_source;
    exception when others then
      v_source := 'system';
    end;
  end if;

  v_actor_text := nullif(current_setting('messmate.actor_profile_id', true), '');
  if v_actor_text is not null then
    begin
      v_actor := v_actor_text::uuid;
    exception when others then
      v_actor := null;
    end;
  end if;

  insert into public.booking_events (
    booking_id, previous_status, new_status, action_source, actor_profile_id
  ) values (
    new.id,
    case when tg_op = 'UPDATE' then old.status else null end,
    new.status,
    v_source,
    v_actor
  );

  return new;
end;
$$;

create trigger meal_bookings_log_event
  after insert or update of status on public.meal_bookings
  for each row execute function public.log_booking_event();

create or replace function public.ensure_booking_token()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.status = 'opted_in' then
    insert into public.booking_tokens (booking_id)
    values (new.id)
    on conflict (booking_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger meal_bookings_ensure_token
  after insert or update of status on public.meal_bookings
  for each row execute function public.ensure_booking_token();

-- ---------------------------------------------------------------------------
-- Automatic booking generation
-- ---------------------------------------------------------------------------

create or replace function public.generate_bookings_for_meal(p_meal_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mess_id uuid;
  v_count integer;
begin
  select mess_id into v_mess_id from public.meals where id = p_meal_id;
  if v_mess_id is null then
    return 0;
  end if;

  insert into public.meal_bookings (student_id, meal_id, status)
  select s.id, p_meal_id, s.default_booking_preference
  from public.students s
  join public.profiles p on p.id = s.profile_id
  where s.mess_id = v_mess_id
    and p.is_active = true
  on conflict (student_id, meal_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.generate_bookings_for_student(p_student_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.students%rowtype;
  v_profile_active boolean;
  v_count integer;
begin
  select * into v_student from public.students where id = p_student_id;
  if not found then
    return 0;
  end if;

  select is_active into v_profile_active
  from public.profiles where id = v_student.profile_id;

  if v_profile_active is not true then
    return 0;
  end if;

  insert into public.meal_bookings (student_id, meal_id, status)
  select v_student.id, m.id, v_student.default_booking_preference
  from public.meals m
  where m.mess_id = v_student.mess_id
    and m.meal_date >= (now() at time zone 'Asia/Kolkata')::date
  on conflict (student_id, meal_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.after_meal_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.meal_date >= (now() at time zone 'Asia/Kolkata')::date then
    perform public.generate_bookings_for_meal(new.id);
  end if;
  return new;
end;
$$;

create trigger meals_generate_bookings
  after insert on public.meals
  for each row execute function public.after_meal_insert();

create or replace function public.after_student_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.generate_bookings_for_student(new.id);
  return new;
end;
$$;

create trigger students_generate_bookings
  after insert on public.students
  for each row execute function public.after_student_insert();

create or replace function public.after_student_mess_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.mess_id is distinct from new.mess_id then
    perform set_config('messmate.action_source', 'system', true);

    -- Cancel only future, unconsumed bookings in the old mess. Past records
    -- and their events remain attached to the original meal forever.
    update public.meal_bookings b
    set status = 'opted_out', updated_at = now()
    from public.meals m
    where b.meal_id = m.id
      and b.student_id = new.id
      and m.mess_id = old.mess_id
      and m.meal_date >= (now() at time zone 'Asia/Kolkata')::date
      and b.consumed_at is null
      and b.status = 'opted_in';

    perform public.generate_bookings_for_student(new.id);
    perform set_config('messmate.action_source', '', true);
  end if;
  return new;
end;
$$;

create trigger students_handle_mess_change
  after update of mess_id on public.students
  for each row execute function public.after_student_mess_change();

create or replace function public.after_profile_active_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
begin
  if old.is_active is not distinct from new.is_active then
    return new;
  end if;

  select id into v_student_id from public.students where profile_id = new.id;
  if v_student_id is null then
    return new;
  end if;

  perform set_config('messmate.action_source', 'system', true);

  if new.is_active = false then
    update public.meal_bookings b
    set status = 'opted_out', updated_at = now()
    from public.meals m
    where b.meal_id = m.id
      and b.student_id = v_student_id
      and m.meal_date >= (now() at time zone 'Asia/Kolkata')::date
      and b.consumed_at is null
      and b.status = 'opted_in';
  else
    perform public.generate_bookings_for_student(v_student_id);
  end if;

  perform set_config('messmate.action_source', '', true);
  return new;
end;
$$;

create trigger profiles_handle_active_change
  after update of is_active on public.profiles
  for each row execute function public.after_profile_active_change();

-- ---------------------------------------------------------------------------
-- Meal integrity helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_meal_created_by()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.created_by is null then
    new.created_by := public.current_profile_id();
  end if;
  return new;
end;
$$;

create trigger meals_set_created_by
  before insert on public.meals
  for each row execute function public.set_meal_created_by();

create or replace function public.protect_meal_history()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.mess_id is distinct from new.mess_id then
    raise exception 'A meal cannot be moved to another mess';
  end if;

  if tg_op = 'DELETE'
     and old.meal_date < (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'Past meals are retained for reporting and cannot be deleted';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger meals_protect_history
  before update or delete on public.meals
  for each row execute function public.protect_meal_history();

create or replace function public.validate_staff_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = new.staff_id;
  if v_role is distinct from 'staff' then
    raise exception 'Only staff accounts can be assigned to a mess';
  end if;
  return new;
end;
$$;

create trigger staff_assignments_validate_role
  before insert or update on public.staff_assignments
  for each row execute function public.validate_staff_assignment();

-- ---------------------------------------------------------------------------
-- Application context (one round-trip for the app shell)
-- ---------------------------------------------------------------------------

create or replace function public.get_my_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_profile public.profiles%rowtype;
  v_student jsonb;
  v_staff_messes jsonb;
begin
  if auth.uid() is null then
    return null;
  end if;

  select * into v_profile
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'id', s.id,
    'roll_number', s.roll_number,
    'mess_id', s.mess_id,
    'default_booking_preference', s.default_booking_preference,
    'mess', jsonb_build_object('id', m.id, 'name', m.name, 'is_active', m.is_active)
  )
  into v_student
  from public.students s
  join public.messes m on m.id = s.mess_id
  where s.profile_id = v_profile.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'name', m.name, 'is_active', m.is_active
  ) order by m.name), '[]'::jsonb)
  into v_staff_messes
  from public.staff_assignments sa
  join public.messes m on m.id = sa.mess_id
  where sa.staff_id = v_profile.id;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'name', v_profile.name,
      'email', v_profile.email,
      'role', v_profile.role,
      'is_active', v_profile.is_active
    ),
    'student', v_student,
    'staff_messes', case
      when v_profile.role = 'admin' then (
        select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'is_active', m.is_active) order by m.name), '[]'::jsonb)
        from public.messes m
      )
      else v_staff_messes
    end
  );
end;
$$;

grant execute on function public.get_my_context() to authenticated;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff_for(uuid) to authenticated;
grant execute on function public.my_student_mess_id() to authenticated;
grant execute on function public.can_read_mess(uuid) to authenticated;

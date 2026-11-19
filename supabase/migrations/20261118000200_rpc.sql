-- MessMate server-side operations.
-- All authorization, cutoff enforcement, token generation and scans happen
-- inside security-definer functions. The browser never gets to decide these.

-- ---------------------------------------------------------------------------
-- Student operations
-- ---------------------------------------------------------------------------

create or replace function public.set_my_booking_status(
  p_meal_id uuid,
  p_status public.booking_status
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile_id uuid := public.current_profile_id();
  v_student public.students%rowtype;
  v_meal public.meals%rowtype;
  v_booking public.meal_bookings%rowtype;
  v_booking_exists boolean;
begin
  if v_profile_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_student
  from public.students
  where profile_id = v_profile_id;

  if not found then
    raise exception 'Student profile not found';
  end if;

  select * into v_meal
  from public.meals
  where id = p_meal_id;

  if not found or v_meal.mess_id <> v_student.mess_id then
    raise exception 'Meal not found for your mess';
  end if;

  if now() >= v_meal.booking_cutoff_at then
    raise exception 'Booking closed at %', to_char(v_meal.booking_cutoff_at at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH12:MI AM');
  end if;

  select * into v_booking
  from public.meal_bookings
  where student_id = v_student.id and meal_id = p_meal_id
  for update;

  v_booking_exists := found;

  perform set_config('messmate.action_source', 'student', true);
  perform set_config('messmate.actor_profile_id', v_profile_id::text, true);

  if not v_booking_exists then
    insert into public.meal_bookings (student_id, meal_id, status)
    values (v_student.id, p_meal_id, p_status)
    returning * into v_booking;
  else
    if v_booking.consumed_at is not null then
      raise exception 'This meal has already been scanned';
    end if;

    if v_booking.status <> p_status then
      update public.meal_bookings
      set status = p_status
      where id = v_booking.id
      returning * into v_booking;
    end if;
  end if;

  return jsonb_build_object(
    'booking_id', v_booking.id,
    'status', v_booking.status,
    'booking_cutoff_at', v_meal.booking_cutoff_at,
    'updated_at', v_booking.updated_at
  );
end;
$$;

create or replace function public.update_my_preference(p_preference public.booking_status)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile_id uuid := public.current_profile_id();
  v_student_id uuid;
begin
  if v_profile_id is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_student_id
  from public.students
  where profile_id = v_profile_id;

  if v_student_id is null then
    raise exception 'Student profile not found';
  end if;

  update public.students
  set default_booking_preference = p_preference
  where id = v_student_id;

  -- Intentionally does not change already generated bookings.
  return jsonb_build_object('default_booking_preference', p_preference);
end;
$$;

create or replace function public.get_my_meal_pass(p_booking_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_profile_id uuid := public.current_profile_id();
  v_result jsonb;
begin
  if v_profile_id is null then
    raise exception 'Not authenticated';
  end if;

  select jsonb_build_object(
    'booking_id', b.id,
    'status', b.status,
    'consumed_at', b.consumed_at,
    'token', case when b.status = 'opted_in' and b.consumed_at is null then bt.token else null end,
    'student', jsonb_build_object(
      'name', sp.name,
      'roll_number', s.roll_number
    ),
    'meal', jsonb_build_object(
      'id', m.id,
      'title', m.title,
      'category', m.category,
      'meal_date', m.meal_date,
      'start_time', m.start_time,
      'end_time', m.end_time,
      'booking_cutoff_at', m.booking_cutoff_at,
      'mess_name', ms.name
    )
  )
  into v_result
  from public.meal_bookings b
  join public.students s on s.id = b.student_id
  join public.profiles sp on sp.id = s.profile_id
  join public.meals m on m.id = b.meal_id
  join public.messes ms on ms.id = m.mess_id
  left join public.booking_tokens bt on bt.booking_id = b.id
  where b.id = p_booking_id
    and s.profile_id = v_profile_id;

  if v_result is null then
    raise exception 'Meal pass not found';
  end if;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Scanning
-- ---------------------------------------------------------------------------

create or replace function public._consume_booking(
  p_booking_id uuid,
  p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.meal_bookings%rowtype;
  v_student public.students%rowtype;
  v_student_profile public.profiles%rowtype;
  v_meal public.meals%rowtype;
  v_mess public.messes%rowtype;
  v_now timestamptz;
  v_scanned_at timestamptz;
begin
  select * into v_booking
  from public.meal_bookings
  where id = p_booking_id
  for update;

  if not found then
    return jsonb_build_object('result', 'invalid');
  end if;

  select * into v_student from public.students where id = v_booking.student_id;
  select * into v_student_profile from public.profiles where id = v_student.profile_id;
  select * into v_meal from public.meals where id = v_booking.meal_id;
  select * into v_mess from public.messes where id = v_meal.mess_id;

  if v_booking.status = 'opted_out' then
    return jsonb_build_object(
      'result', 'opted_out',
      'student_name', v_student_profile.name,
      'roll_number', v_student.roll_number,
      'mess_name', v_mess.name,
      'meal_title', v_meal.title,
      'meal_category', v_meal.category,
      'meal_date', v_meal.meal_date,
      'status', v_booking.status
    );
  end if;

  if v_booking.consumed_at is not null then
    select scanned_at into v_scanned_at
    from public.meal_scans where booking_id = v_booking.id;

    return jsonb_build_object(
      'result', 'already_scanned',
      'student_name', v_student_profile.name,
      'roll_number', v_student.roll_number,
      'mess_name', v_mess.name,
      'meal_title', v_meal.title,
      'meal_category', v_meal.category,
      'meal_date', v_meal.meal_date,
      'status', v_booking.status,
      'consumed_at', v_booking.consumed_at,
      'scanned_at', coalesce(v_scanned_at, v_booking.consumed_at)
    );
  end if;

  v_now := clock_timestamp();

  update public.meal_bookings
  set consumed_at = v_now
  where id = v_booking.id
    and consumed_at is null
    and status = 'opted_in';

  if not found then
    return jsonb_build_object('result', 'already_scanned');
  end if;

  insert into public.meal_scans (booking_id, scanned_by, scanned_at)
  values (v_booking.id, p_actor, v_now)
  on conflict (booking_id) do nothing;

  return jsonb_build_object(
    'result', 'valid',
    'student_name', v_student_profile.name,
    'roll_number', v_student.roll_number,
    'mess_name', v_mess.name,
    'meal_title', v_meal.title,
    'meal_category', v_meal.category,
    'meal_date', v_meal.meal_date,
    'status', v_booking.status,
    'scanned_at', v_now
  );
end;
$$;

create or replace function public.scan_booking(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_role public.user_role;
  v_token text := trim(p_token);
  v_booking_id uuid;
  v_mess_id uuid;
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;

  select role into v_role from public.profiles where id = v_actor;
  if v_role not in ('staff', 'admin') then
    return jsonb_build_object('result', 'forbidden');
  end if;

  select bt.booking_id, m.mess_id
  into v_booking_id, v_mess_id
  from public.booking_tokens bt
  join public.meal_bookings b on b.id = bt.booking_id
  join public.meals m on m.id = b.meal_id
  where bt.token = v_token;

  if v_booking_id is null then
    return jsonb_build_object('result', 'invalid');
  end if;

  if v_role = 'staff' and not public.is_staff_for(v_mess_id) then
    return jsonb_build_object('result', 'forbidden');
  end if;

  return public._consume_booking(v_booking_id, v_actor);
end;
$$;

create or replace function public.scan_booking_manual(
  p_meal_id uuid,
  p_roll_number text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_role public.user_role;
  v_meal public.meals%rowtype;
  v_student public.students%rowtype;
  v_profile public.profiles%rowtype;
  v_booking_id uuid;
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;

  select role into v_role from public.profiles where id = v_actor;
  if v_role not in ('staff', 'admin') then
    return jsonb_build_object('result', 'forbidden');
  end if;

  select * into v_meal from public.meals where id = p_meal_id;
  if not found then
    return jsonb_build_object('result', 'invalid');
  end if;

  if v_role = 'staff' and not public.is_staff_for(v_meal.mess_id) then
    return jsonb_build_object('result', 'forbidden');
  end if;

  select s.*
  into v_student
  from public.students s
  where lower(s.roll_number) = lower(trim(p_roll_number))
    and s.mess_id = v_meal.mess_id;

  if not found then
    return jsonb_build_object(
      'result', 'invalid',
      'message', 'No student with that roll number belongs to this mess'
    );
  end if;

  select id into v_booking_id
  from public.meal_bookings
  where student_id = v_student.id and meal_id = p_meal_id;

  if v_booking_id is null then
    select * into v_profile from public.profiles where id = v_student.profile_id;
    return jsonb_build_object(
      'result', 'not_booked',
      'student_name', v_profile.name,
      'roll_number', v_student.roll_number,
      'mess_name', (select name from public.messes where id = v_meal.mess_id),
      'meal_title', v_meal.title,
      'meal_category', v_meal.category,
      'meal_date', v_meal.meal_date
    );
  end if;

  return public._consume_booking(v_booking_id, v_actor);
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin account provisioning
-- ---------------------------------------------------------------------------

create or replace function public.admin_create_student(
  p_name text,
  p_email text,
  p_roll_number text,
  p_mess_id uuid,
  p_preference public.booking_status default 'opted_in',
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(p_email));
  v_roll text := trim(p_roll_number);
  v_name text := trim(p_name);
  v_profile_id uuid;
  v_student_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  if length(v_name) < 2 then
    raise exception 'Name is required';
  end if;
  if v_email !~ '^[a-z0-9._%+-]+@iiita\.ac\.in$' then
    raise exception 'Email must end with @iiita.ac.in';
  end if;
  if length(v_roll) < 3 then
    raise exception 'Roll number is required';
  end if;
  if not exists (select 1 from public.messes where id = p_mess_id) then
    raise exception 'Mess not found';
  end if;
  if exists (select 1 from public.profiles where email = v_email) then
    raise exception 'A profile with this email already exists';
  end if;
  if exists (select 1 from public.students where lower(roll_number) = lower(v_roll)) then
    raise exception 'A student with this roll number already exists';
  end if;

  insert into public.profiles (name, email, role, is_active)
  values (v_name, v_email, 'student', p_is_active)
  returning id into v_profile_id;

  insert into public.students (profile_id, roll_number, mess_id, default_booking_preference)
  values (v_profile_id, v_roll, p_mess_id, p_preference)
  returning id into v_student_id;

  return jsonb_build_object('profile_id', v_profile_id, 'student_id', v_student_id);
end;
$$;

create or replace function public.admin_update_student(
  p_student_id uuid,
  p_name text,
  p_email text,
  p_roll_number text,
  p_mess_id uuid,
  p_preference public.booking_status,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_student public.students%rowtype;
  v_profile public.profiles%rowtype;
  v_email text := lower(trim(p_email));
  v_roll text := trim(p_roll_number);
  v_name text := trim(p_name);
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  select * into v_student from public.students where id = p_student_id for update;
  if not found then
    raise exception 'Student not found';
  end if;

  select * into v_profile from public.profiles where id = v_student.profile_id for update;

  if length(v_name) < 2 then
    raise exception 'Name is required';
  end if;
  if v_email !~ '^[a-z0-9._%+-]+@iiita\.ac\.in$' then
    raise exception 'Email must end with @iiita.ac.in';
  end if;
  if length(v_roll) < 3 then
    raise exception 'Roll number is required';
  end if;
  if not exists (select 1 from public.messes where id = p_mess_id) then
    raise exception 'Mess not found';
  end if;
  if v_email <> v_profile.email then
    if v_profile.auth_user_id is not null then
      raise exception 'Email cannot be changed after the account has signed in';
    end if;
    if exists (select 1 from public.profiles where email = v_email and id <> v_profile.id) then
      raise exception 'Another profile already uses this email';
    end if;
  end if;
  if exists (
    select 1 from public.students
    where lower(roll_number) = lower(v_roll) and id <> p_student_id
  ) then
    raise exception 'Another student already uses this roll number';
  end if;

  update public.students
  set roll_number = v_roll,
      mess_id = p_mess_id,
      default_booking_preference = p_preference
  where id = p_student_id;

  update public.profiles
  set name = v_name,
      email = v_email,
      is_active = p_is_active
  where id = v_profile.id;

  return jsonb_build_object('student_id', p_student_id, 'profile_id', v_profile.id);
end;
$$;

create or replace function public.admin_create_staff(
  p_name text,
  p_email text,
  p_mess_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(p_email));
  v_name text := trim(p_name);
  v_profile_id uuid;
  v_mess_ids uuid[] := coalesce(p_mess_ids, '{}'::uuid[]);
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  if length(v_name) < 2 then
    raise exception 'Name is required';
  end if;
  if v_email !~ '^[a-z0-9._%+-]+@iiita\.ac\.in$' then
    raise exception 'Email must end with @iiita.ac.in';
  end if;
  if exists (select 1 from public.profiles where email = v_email) then
    raise exception 'A profile with this email already exists';
  end if;
  if (select count(*) from public.messes where id = any(v_mess_ids)) <> cardinality(v_mess_ids) then
    raise exception 'One or more selected messes do not exist';
  end if;

  insert into public.profiles (name, email, role)
  values (v_name, v_email, 'staff')
  returning id into v_profile_id;

  insert into public.staff_assignments (staff_id, mess_id)
  select v_profile_id, unnest(v_mess_ids)
  on conflict do nothing;

  return jsonb_build_object('profile_id', v_profile_id);
end;
$$;

create or replace function public.admin_update_staff(
  p_profile_id uuid,
  p_name text,
  p_is_active boolean,
  p_mess_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.profiles%rowtype;
  v_mess_ids uuid[] := coalesce(p_mess_ids, '{}'::uuid[]);
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  select * into v_profile from public.profiles where id = p_profile_id for update;
  if not found or v_profile.role <> 'staff' then
    raise exception 'Staff account not found';
  end if;
  if length(trim(p_name)) < 2 then
    raise exception 'Name is required';
  end if;
  if (select count(*) from public.messes where id = any(v_mess_ids)) <> cardinality(v_mess_ids) then
    raise exception 'One or more selected messes do not exist';
  end if;

  update public.profiles
  set name = trim(p_name), is_active = p_is_active
  where id = p_profile_id;

  delete from public.staff_assignments
  where staff_id = p_profile_id
    and not (mess_id = any(v_mess_ids));

  insert into public.staff_assignments (staff_id, mess_id)
  select p_profile_id, unnest(v_mess_ids)
  on conflict do nothing;

  return jsonb_build_object('profile_id', p_profile_id);
end;
$$;

create or replace function public.admin_bulk_import_students(p_records jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_row record;
  v_index integer := 0;
  v_name text;
  v_email text;
  v_roll text;
  v_mess_name text;
  v_mess_id uuid;
  v_profile_id uuid;
  v_inserted integer := 0;
  v_failed integer := 0;
  v_results jsonb := '[]'::jsonb;
  v_error text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  if p_records is null or jsonb_typeof(p_records) <> 'array' then
    raise exception 'Expected an array of records';
  end if;

  for v_row in select value from jsonb_array_elements(p_records)
  loop
    v_index := v_index + 1;
    begin
      v_name := trim(coalesce(v_row.value->>'name', ''));
      v_email := lower(trim(coalesce(v_row.value->>'email', '')));
      v_roll := trim(coalesce(v_row.value->>'roll_number', ''));
      v_mess_name := trim(coalesce(v_row.value->>'mess', ''));

      if length(v_name) < 2 then
        raise exception 'Name is required';
      end if;
      if v_email !~ '^[a-z0-9._%+-]+@iiita\.ac\.in$' then
        raise exception 'Invalid email (must end with @iiita.ac.in)';
      end if;
      if length(v_roll) < 3 then
        raise exception 'Roll number is required';
      end if;

      select id into v_mess_id
      from public.messes
      where lower(name) = lower(v_mess_name);

      if v_mess_id is null then
        raise exception 'Mess "%" does not exist', v_mess_name;
      end if;

      if exists (select 1 from public.profiles where email = v_email) then
        raise exception 'Email already exists';
      end if;
      if exists (select 1 from public.students where lower(roll_number) = lower(v_roll)) then
        raise exception 'Roll number already exists';
      end if;

      insert into public.profiles (name, email, role)
      values (v_name, v_email, 'student')
      returning id into v_profile_id;

      insert into public.students (profile_id, roll_number, mess_id)
      values (v_profile_id, v_roll, v_mess_id);

      v_inserted := v_inserted + 1;
      v_results := v_results || jsonb_build_object(
        'row', v_index,
        'status', 'imported',
        'email', v_email,
        'roll_number', v_roll
      );
    exception when unique_violation then
      v_failed := v_failed + 1;
      v_results := v_results || jsonb_build_object(
        'row', v_index,
        'status', 'failed',
        'email', coalesce(v_email, ''),
        'roll_number', coalesce(v_roll, ''),
        'error', 'Duplicate email or roll number'
      );
    when others then
      v_error := sqlerrm;
      v_failed := v_failed + 1;
      v_results := v_results || jsonb_build_object(
        'row', v_index,
        'status', 'failed',
        'email', coalesce(v_email, ''),
        'roll_number', coalesce(v_roll, ''),
        'error', v_error
      );
    end;
  end loop;

  return jsonb_build_object(
    'inserted', v_inserted,
    'failed', v_failed,
    'total', v_index,
    'results', v_results
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Reporting
-- ---------------------------------------------------------------------------

create or replace function public.admin_report(
  p_mess_id uuid default null,
  p_student_id uuid default null,
  p_from date default (current_date - 30),
  p_to date default current_date,
  p_category public.meal_category default null
)
returns table (
  booking_id uuid,
  student_id uuid,
  student_name text,
  roll_number text,
  mess_id uuid,
  mess_name text,
  meal_id uuid,
  meal_date date,
  meal_category public.meal_category,
  meal_title text,
  menu text,
  status public.booking_status,
  initial_status public.booking_status,
  opt_in_at timestamptz,
  opt_out_at timestamptz,
  consumed_at timestamptz,
  scanned_at timestamptz,
  events jsonb
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  return query
  select
    b.id,
    s.id,
    sp.name,
    s.roll_number,
    m.mess_id,
    ms.name,
    m.id,
    m.meal_date,
    m.category,
    m.title,
    coalesce((
      select string_agg(mi.name, ', ' order by mi.sort_order, mi.name)
      from public.menu_items mi
      where mi.meal_id = m.id
    ), ''),
    b.status,
    b.initial_status,
    (
      select max(e.created_at)
      from public.booking_events e
      where e.booking_id = b.id and e.new_status = 'opted_in'
    ),
    (
      select max(e.created_at)
      from public.booking_events e
      where e.booking_id = b.id and e.new_status = 'opted_out'
    ),
    b.consumed_at,
    (
      select max(sc.scanned_at)
      from public.meal_scans sc
      where sc.booking_id = b.id
    ),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'previous_status', e.previous_status,
          'new_status', e.new_status,
          'action_source', e.action_source,
          'created_at', e.created_at
        )
        order by e.created_at, e.id
      )
      from public.booking_events e
      where e.booking_id = b.id
    ), '[]'::jsonb)
  from public.meal_bookings b
  join public.students s on s.id = b.student_id
  join public.profiles sp on sp.id = s.profile_id
  join public.meals m on m.id = b.meal_id
  join public.messes ms on ms.id = m.mess_id
  where m.meal_date between coalesce(p_from, current_date - 30)
                        and coalesce(p_to, current_date)
    and (p_mess_id is null or m.mess_id = p_mess_id)
    and (p_student_id is null or b.student_id = p_student_id)
    and (p_category is null or m.category = p_category)
  order by m.meal_date desc, m.start_time, sp.name
  limit 5000;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on function public.set_my_booking_status(uuid, public.booking_status) from public, anon;
revoke all on function public.update_my_preference(public.booking_status) from public, anon;
revoke all on function public.get_my_meal_pass(uuid) from public, anon;
revoke all on function public.scan_booking(text) from public, anon;
revoke all on function public.scan_booking_manual(uuid, text) from public, anon;
revoke all on function public._consume_booking(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_create_student(text, text, text, uuid, public.booking_status, boolean) from public, anon;
revoke all on function public.admin_update_student(uuid, text, text, text, uuid, public.booking_status, boolean) from public, anon;
revoke all on function public.admin_create_staff(text, text, uuid[]) from public, anon;
revoke all on function public.admin_update_staff(uuid, text, boolean, uuid[]) from public, anon;
revoke all on function public.admin_bulk_import_students(jsonb) from public, anon;
revoke all on function public.admin_report(uuid, uuid, date, date, public.meal_category) from public, anon;
revoke all on function public.generate_bookings_for_meal(uuid) from public, anon;
revoke all on function public.generate_bookings_for_student(uuid) from public, anon;

grant execute on function public.set_my_booking_status(uuid, public.booking_status) to authenticated;
grant execute on function public.update_my_preference(public.booking_status) to authenticated;
grant execute on function public.get_my_meal_pass(uuid) to authenticated;
grant execute on function public.scan_booking(text) to authenticated;
grant execute on function public.scan_booking_manual(uuid, text) to authenticated;
grant execute on function public.admin_create_student(text, text, text, uuid, public.booking_status, boolean) to authenticated;
grant execute on function public.admin_update_student(uuid, text, text, text, uuid, public.booking_status, boolean) to authenticated;
grant execute on function public.admin_create_staff(text, text, uuid[]) to authenticated;
grant execute on function public.admin_update_staff(uuid, text, boolean, uuid[]) to authenticated;
grant execute on function public.admin_bulk_import_students(jsonb) to authenticated;
grant execute on function public.admin_report(uuid, uuid, date, date, public.meal_category) to authenticated;

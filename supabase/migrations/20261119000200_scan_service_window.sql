-- Only allow a meal pass to be consumed during that meal's service window.
-- Scanning before the meal starts or after it ends is rejected with a
-- specific result code so the scanner can show a useful message.

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
  v_service_start timestamptz;
  v_service_end timestamptz;
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
  v_service_start := (v_meal.meal_date + v_meal.start_time) at time zone 'Asia/Kolkata';
  v_service_end := (v_meal.meal_date + v_meal.end_time) at time zone 'Asia/Kolkata';

  if v_now < v_service_start then
    return jsonb_build_object(
      'result', 'not_started',
      'message', format(
        'Scanning for %s opens at %s on %s. This pass cannot be used yet.',
        v_meal.title,
        to_char(v_meal.meal_date + v_meal.start_time, 'FMHH12:MI AM'),
        to_char(v_meal.meal_date, 'FMDD Mon YYYY')
      ),
      'student_name', v_student_profile.name,
      'roll_number', v_student.roll_number,
      'mess_name', v_mess.name,
      'meal_title', v_meal.title,
      'meal_category', v_meal.category,
      'meal_date', v_meal.meal_date,
      'status', v_booking.status
    );
  end if;

  if v_now >= v_service_end then
    return jsonb_build_object(
      'result', 'meal_ended',
      'message', format(
        'The scanning window for %s ended at %s on %s. This pass can no longer be scanned.',
        v_meal.title,
        to_char(v_meal.meal_date + v_meal.end_time, 'FMHH12:MI AM'),
        to_char(v_meal.meal_date, 'FMDD Mon YYYY')
      ),
      'student_name', v_student_profile.name,
      'roll_number', v_student.roll_number,
      'mess_name', v_mess.name,
      'meal_title', v_meal.title,
      'meal_category', v_meal.category,
      'meal_date', v_meal.meal_date,
      'status', v_booking.status
    );
  end if;

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

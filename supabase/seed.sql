-- MessMate development seed.
-- Demo accounts are provisioned profiles only. Run scripts/seed-dev-auth.ts
-- afterwards to create local passwords for automated tests. In production the
-- same profiles are linked to Google on first sign-in.

-- ---------------------------------------------------------------------------
-- Messes
-- ---------------------------------------------------------------------------

insert into public.messes (id, name, description, is_active) values
  ('11111111-1111-4111-8111-111111111101', 'BH1', 'Bharti Bhavan 1 — North Indian kitchen', true),
  ('11111111-1111-4111-8111-111111111102', 'BH2', 'Bharti Bhavan 2 — multi-cuisine kitchen', true),
  ('11111111-1111-4111-8111-111111111103', 'BH3', 'Bharti Bhavan 3 — South Indian specials', true),
  ('11111111-1111-4111-8111-111111111104', 'BH4', 'Bharti Bhavan 4 — fresh & light meals', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

insert into public.profiles (id, name, email, role) values
  ('00000000-0000-4000-8000-000000000001', 'Mess Committee Admin', 'iec2024076@iiita.ac.in', 'admin'),
  ('00000000-0000-4000-8000-000000000101', 'Rakesh Yadav', 'rakesh.yadav@iiita.ac.in', 'staff'),
  ('00000000-0000-4000-8000-000000000102', 'Sunita Devi', 'sunita.devi@iiita.ac.in', 'staff'),
  ('00000000-0000-4000-8000-000000000103', 'Mohan Lal', 'mohan.lal@iiita.ac.in', 'staff'),
  ('00000000-0000-4000-8000-000000000104', 'Geeta Sharma', 'geeta.sharma@iiita.ac.in', 'staff'),
  ('00000000-0000-4000-8000-000000000105', 'Arun Pandey', 'arun.pandey@iiita.ac.in', 'staff')
on conflict (id) do nothing;

insert into public.staff_assignments (staff_id, mess_id) values
  ('00000000-0000-4000-8000-000000000101', '11111111-1111-4111-8111-111111111101'),
  ('00000000-0000-4000-8000-000000000102', '11111111-1111-4111-8111-111111111102'),
  ('00000000-0000-4000-8000-000000000103', '11111111-1111-4111-8111-111111111103'),
  ('00000000-0000-4000-8000-000000000104', '11111111-1111-4111-8111-111111111104'),
  ('00000000-0000-4000-8000-000000000105', '11111111-1111-4111-8111-111111111101'),
  ('00000000-0000-4000-8000-000000000105', '11111111-1111-4111-8111-111111111102')
on conflict (staff_id, mess_id) do nothing;

with data(name, email, roll_number, mess_name, preference) as (
  values
    ('Aarav Mehta',    'aarav.mehta@iiita.ac.in',    'IIT2023001', 'BH1', 'opted_in'),
    ('Diya Sharma',    'diya.sharma@iiita.ac.in',    'IIT2023002', 'BH1', 'opted_in'),
    ('Kabir Singh',    'kabir.singh@iiita.ac.in',    'IIT2023003', 'BH1', 'opted_in'),
    ('Ananya Rao',     'ananya.rao@iiita.ac.in',     'IIT2023004', 'BH1', 'opted_in'),
    ('Neel Kapoor',    'neel.kapoor@iiita.ac.in',    'IIT2023017', 'BH1', 'opted_out'),
    ('Vivaan Gupta',   'vivaan.gupta@iiita.ac.in',   'IIT2023005', 'BH2', 'opted_in'),
    ('Ishita Verma',   'ishita.verma@iiita.ac.in',   'IIT2023006', 'BH2', 'opted_in'),
    ('Arjun Nair',     'arjun.nair@iiita.ac.in',     'IIT2023007', 'BH2', 'opted_in'),
    ('Meera Iyer',     'meera.iyer@iiita.ac.in',     'IIT2023008', 'BH2', 'opted_in'),
    ('Zoya Khan',      'zoya.khan@iiita.ac.in',      'IIT2023018', 'BH2', 'opted_out'),
    ('Rohan Das',      'rohan.das@iiita.ac.in',      'IIT2023009', 'BH3', 'opted_in'),
    ('Saanvi Patel',   'saanvi.patel@iiita.ac.in',   'IIT2023010', 'BH3', 'opted_in'),
    ('Aditya Joshi',   'aditya.joshi@iiita.ac.in',   'IIT2023011', 'BH3', 'opted_in'),
    ('Nisha Kumari',   'nisha.kumari@iiita.ac.in',   'IIT2023012', 'BH3', 'opted_in'),
    ('Dev Mishra',     'dev.mishra@iiita.ac.in',     'IIT2023019', 'BH3', 'opted_out'),
    ('Karan Malhotra', 'karan.malhotra@iiita.ac.in', 'IIT2023013', 'BH4', 'opted_in'),
    ('Tara Bose',      'tara.bose@iiita.ac.in',      'IIT2023014', 'BH4', 'opted_in'),
    ('Siddharth Menon', 'siddharth.menon@iiita.ac.in', 'IIT2023015', 'BH4', 'opted_in'),
    ('Pooja Reddy',    'pooja.reddy@iiita.ac.in',    'IIT2023016', 'BH4', 'opted_in'),
    ('Riya Sen',       'riya.sen@iiita.ac.in',       'IIT2023020', 'BH4', 'opted_out')
)
insert into public.profiles (name, email, role)
select name, email, 'student' from data
on conflict (email) do nothing;

with data(name, email, roll_number, mess_name, preference) as (
  values
    ('Aarav Mehta',    'aarav.mehta@iiita.ac.in',    'IIT2023001', 'BH1', 'opted_in'),
    ('Diya Sharma',    'diya.sharma@iiita.ac.in',    'IIT2023002', 'BH1', 'opted_in'),
    ('Kabir Singh',    'kabir.singh@iiita.ac.in',    'IIT2023003', 'BH1', 'opted_in'),
    ('Ananya Rao',     'ananya.rao@iiita.ac.in',     'IIT2023004', 'BH1', 'opted_in'),
    ('Neel Kapoor',    'neel.kapoor@iiita.ac.in',    'IIT2023017', 'BH1', 'opted_out'),
    ('Vivaan Gupta',   'vivaan.gupta@iiita.ac.in',   'IIT2023005', 'BH2', 'opted_in'),
    ('Ishita Verma',   'ishita.verma@iiita.ac.in',   'IIT2023006', 'BH2', 'opted_in'),
    ('Arjun Nair',     'arjun.nair@iiita.ac.in',     'IIT2023007', 'BH2', 'opted_in'),
    ('Meera Iyer',     'meera.iyer@iiita.ac.in',     'IIT2023008', 'BH2', 'opted_in'),
    ('Zoya Khan',      'zoya.khan@iiita.ac.in',      'IIT2023018', 'BH2', 'opted_out'),
    ('Rohan Das',      'rohan.das@iiita.ac.in',      'IIT2023009', 'BH3', 'opted_in'),
    ('Saanvi Patel',   'saanvi.patel@iiita.ac.in',   'IIT2023010', 'BH3', 'opted_in'),
    ('Aditya Joshi',   'aditya.joshi@iiita.ac.in',   'IIT2023011', 'BH3', 'opted_in'),
    ('Nisha Kumari',   'nisha.kumari@iiita.ac.in',   'IIT2023012', 'BH3', 'opted_in'),
    ('Dev Mishra',     'dev.mishra@iiita.ac.in',     'IIT2023019', 'BH3', 'opted_out'),
    ('Karan Malhotra', 'karan.malhotra@iiita.ac.in', 'IIT2023013', 'BH4', 'opted_in'),
    ('Tara Bose',      'tara.bose@iiita.ac.in',      'IIT2023014', 'BH4', 'opted_in'),
    ('Siddharth Menon', 'siddharth.menon@iiita.ac.in', 'IIT2023015', 'BH4', 'opted_in'),
    ('Pooja Reddy',    'pooja.reddy@iiita.ac.in',    'IIT2023016', 'BH4', 'opted_in'),
    ('Riya Sen',       'riya.sen@iiita.ac.in',       'IIT2023020', 'BH4', 'opted_out')
)
insert into public.students (profile_id, roll_number, mess_id, default_booking_preference)
select p.id, d.roll_number, m.id, d.preference::public.booking_status
from data d
join public.profiles p on p.email = d.email
join public.messes m on m.name = d.mess_name
on conflict (profile_id) do nothing;

-- ---------------------------------------------------------------------------
-- Meals and menus for the last 3 and next 3 days
-- ---------------------------------------------------------------------------

insert into public.meals (
  mess_id, category, title, description, meal_date,
  start_time, end_time, booking_cutoff_at
)
select
  m.id,
  c.category::public.meal_category,
  case c.category
    when 'breakfast' then (array['Poha & Chai', 'Aloo Paratha', 'Idli Sambar', 'Masala Dosa'])[((d.day_offset % 4 + 4) % 4) + 1]
    when 'lunch' then (array['Rajma Chawal', 'Veg Biryani', 'Chole Bhature', 'Dal Makhani Thali'])[((d.day_offset % 4 + 4) % 4) + 1]
    when 'snacks' then (array['Samosa & Chai', 'Veg Sandwich', 'Pakora & Tea', 'Pasta & Juice'])[((d.day_offset % 4 + 4) % 4) + 1]
    else (array['Paneer Butter Masala', 'Mix Veg & Roti', 'Veg Pulao', 'Malai Kofta'])[((d.day_offset % 4 + 4) % 4) + 1]
  end,
  case c.category
    when 'breakfast' then 'Freshly prepared in the mess kitchen'
    when 'lunch' then 'Balanced lunch thali'
    when 'snacks' then 'Evening snack counter'
    else 'Dinner service'
  end,
  (current_date + d.day_offset)::date,
  c.start_time::time,
  c.end_time::time,
  ((current_date + d.day_offset)::date + c.cutoff_time::time) at time zone 'Asia/Kolkata'
from public.messes m
cross join generate_series(-3, 3) as d(day_offset)
cross join (values
  ('breakfast', '07:30', '09:00', '06:30'),
  ('lunch',     '12:30', '14:00', '11:00'),
  ('snacks',    '17:00', '18:00', '15:30'),
  ('dinner',    '19:30', '21:00', '18:00')
) as c(category, start_time, end_time, cutoff_time)
on conflict (mess_id, meal_date, category) do nothing;

insert into public.menu_items (meal_id, name, sort_order)
select m.id, item.name, item.sort_order
from public.meals m
cross join lateral (
  select * from (values
    ('Poha', 1), ('Boiled Eggs', 2), ('Banana', 3), ('Tea / Coffee', 4)
  ) as x(name, sort_order)
  where m.category = 'breakfast'
  union all
  select * from (values
    ('Steamed Rice', 1), ('Dal Tadka', 2), ('Seasonal Sabzi', 3),
    ('Roti', 4), ('Salad', 5), ('Curd', 6)
  ) as x(name, sort_order)
  where m.category = 'lunch'
  union all
  select * from (values
    ('Samosa', 1), ('Green Chutney', 2), ('Masala Chai', 3)
  ) as x(name, sort_order)
  where m.category = 'snacks'
  union all
  select * from (values
    ('Steamed Rice', 1), ('Dal Fry', 2), ('Paneer Sabzi', 3),
    ('Roti', 4), ('Salad', 5), ('Kheer', 6)
  ) as x(name, sort_order)
  where m.category = 'dinner'
) item
where m.meal_date between current_date - 3 and current_date + 3
  and not exists (select 1 from public.menu_items mi where mi.meal_id = m.id);

-- Past meals do not have auto-generated bookings, so create them from each
-- student's default preference (the insert triggers log the initial event).
insert into public.meal_bookings (student_id, meal_id, status)
select s.id, m.id, s.default_booking_preference
from public.students s
join public.meals m on m.mess_id = s.mess_id
where m.meal_date < current_date
on conflict (student_id, meal_id) do nothing;

-- Some past bookings were changed by students before the cutoff. This creates
-- a second event for those bookings.
select set_config('messmate.action_source', 'student', true);
update public.meal_bookings b
set status = 'opted_out'
from public.students s, public.meals m
where b.student_id = s.id
  and b.meal_id = m.id
  and m.meal_date < current_date
  and b.status = 'opted_in'
  and abs(hashtext(s.roll_number || m.id::text)) % 5 = 0;
select set_config('messmate.action_source', '', true);

-- Upcoming overrides: a few students opt out of bookable future meals.
select set_config('messmate.action_source', 'student', true);
update public.meal_bookings b
set status = 'opted_out'
from public.students s, public.meals m
where b.student_id = s.id
  and b.meal_id = m.id
  and m.meal_date >= current_date
  and m.booking_cutoff_at > now()
  and b.status = 'opted_in'
  and abs(hashtext(s.roll_number || m.id::text)) % 11 = 0;
select set_config('messmate.action_source', '', true);

-- Give seeded booking events realistic times between scheduling and service.
with ranked as (
  select
    e.id,
    least(
      ((m.meal_date + m.start_time) at time zone 'Asia/Kolkata')
        - interval '30 hours'
        + ((row_number() over (partition by e.booking_id order by e.id) - 1) * interval '4 hours'),
      now() - interval '1 minute'
    ) as event_at
  from public.booking_events e
  join public.meal_bookings b on b.id = e.booking_id
  join public.meals m on m.id = b.meal_id
)
update public.booking_events e
set created_at = ranked.event_at
from ranked
where e.id = ranked.id;

-- Mark a realistic subset of attended meals as scanned.
with picked as (
  select
    b.id as booking_id,
    ((m.meal_date + m.start_time) at time zone 'Asia/Kolkata') + interval '25 minutes' as scanned_at,
    (
      select sa.staff_id
      from public.staff_assignments sa
      where sa.mess_id = m.mess_id
      order by sa.created_at, sa.staff_id
      limit 1
    ) as scanned_by
  from public.meal_bookings b
  join public.meals m on m.id = b.meal_id
  where b.status = 'opted_in'
    and b.consumed_at is null
    and (
      m.meal_date < current_date
      or ((m.meal_date + m.end_time) at time zone 'Asia/Kolkata') < now()
    )
    and abs(hashtext(b.id::text)) % 10 < 7
)
update public.meal_bookings b
set consumed_at = picked.scanned_at
from picked
where b.id = picked.booking_id;

with picked as (
  select
    b.id as booking_id,
    ((m.meal_date + m.start_time) at time zone 'Asia/Kolkata') + interval '25 minutes' as scanned_at,
    (
      select sa.staff_id
      from public.staff_assignments sa
      where sa.mess_id = m.mess_id
      order by sa.created_at, sa.staff_id
      limit 1
    ) as scanned_by
  from public.meal_bookings b
  join public.meals m on m.id = b.meal_id
  where b.consumed_at is not null
    and b.status = 'opted_in'
)
insert into public.meal_scans (booking_id, scanned_by, scanned_at)
select booking_id, scanned_by, scanned_at
from picked
on conflict (booking_id) do nothing;

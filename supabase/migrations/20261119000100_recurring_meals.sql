-- MessMate recurring meal plan
-- Staff define a repeating weekly menu. Upcoming meals are materialized from
-- these templates and the existing booking trigger creates student bookings.

-- ---------------------------------------------------------------------------
-- Weekly templates
-- ---------------------------------------------------------------------------

create table public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes (id) on delete cascade,
  -- ISO weekday: 1 = Monday, 7 = Sunday.
  day_of_week smallint not null check (day_of_week between 1 and 7),
  category public.meal_category not null,
  title text not null check (length(trim(title)) >= 2),
  description text,
  start_time time not null,
  end_time time not null,
  -- How long before service bookings close.
  cutoff_offset_minutes integer not null default 60
    check (cutoff_offset_minutes between 0 and 10080),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mess_id, day_of_week, category),
  constraint meal_template_time_order check (end_time > start_time)
);

create table public.meal_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.meal_templates (id) on delete cascade,
  name text not null check (length(trim(name)) >= 1),
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index meal_templates_mess_day_idx
  on public.meal_templates (mess_id, day_of_week, start_time);
create index meal_template_items_template_idx
  on public.meal_template_items (template_id, sort_order);

create trigger meal_templates_set_updated_at
  before update on public.meal_templates
  for each row execute function public.set_updated_at();

-- Generated meals remember their template so a manual edit can turn them into
-- a one-off override instead of being overwritten by the next sync.
alter table public.meals
  add column template_id uuid references public.meal_templates (id) on delete set null;
create index meals_template_idx on public.meals (template_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.meal_templates enable row level security;
alter table public.meal_template_items enable row level security;

create policy meal_templates_select on public.meal_templates
  for select to authenticated
  using (public.can_read_mess(mess_id));

create policy meal_templates_staff_insert on public.meal_templates
  for insert to authenticated
  with check (public.is_admin() or public.is_staff_for(mess_id));

create policy meal_templates_staff_update on public.meal_templates
  for update to authenticated
  using (public.is_admin() or public.is_staff_for(mess_id))
  with check (public.is_admin() or public.is_staff_for(mess_id));

create policy meal_templates_staff_delete on public.meal_templates
  for delete to authenticated
  using (public.is_admin() or public.is_staff_for(mess_id));

create policy meal_template_items_select on public.meal_template_items
  for select to authenticated
  using (
    exists (
      select 1 from public.meal_templates t
      where t.id = meal_template_items.template_id
        and public.can_read_mess(t.mess_id)
    )
  );

create policy meal_template_items_staff_insert on public.meal_template_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.meal_templates t
      where t.id = meal_template_items.template_id
        and (public.is_admin() or public.is_staff_for(t.mess_id))
    )
  );

create policy meal_template_items_staff_update on public.meal_template_items
  for update to authenticated
  using (
    exists (
      select 1 from public.meal_templates t
      where t.id = meal_template_items.template_id
        and (public.is_admin() or public.is_staff_for(t.mess_id))
    )
  )
  with check (
    exists (
      select 1 from public.meal_templates t
      where t.id = meal_template_items.template_id
        and (public.is_admin() or public.is_staff_for(t.mess_id))
    )
  );

create policy meal_template_items_staff_delete on public.meal_template_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.meal_templates t
      where t.id = meal_template_items.template_id
        and (public.is_admin() or public.is_staff_for(t.mess_id))
    )
  );

grant select, insert, update, delete
  on public.meal_templates, public.meal_template_items
  to authenticated;

-- ---------------------------------------------------------------------------
-- Materialization
-- ---------------------------------------------------------------------------

create or replace function public.materialize_recurring_meals(
  p_mess_ids uuid[] default null,
  p_days integer default 21,
  p_refresh boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_role public.user_role;
  v_mess_ids uuid[] := coalesce(p_mess_ids, '{}'::uuid[]);
  v_start_date date := (now() at time zone 'Asia/Kolkata')::date;
  v_end_date date;
  v_day date;
  v_template public.meal_templates%rowtype;
  v_meal_id uuid;
  v_service_start timestamptz;
  v_count integer := 0;
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;

  if p_days is null or p_days < 1 or p_days > 60 then
    raise exception 'Days must be between 1 and 60';
  end if;

  select role into v_role from public.profiles where id = v_actor;

  -- With no explicit mess list, use every mess the caller can see.
  if cardinality(v_mess_ids) = 0 then
    if v_role = 'admin' then
      select coalesce(array_agg(id), '{}'::uuid[]) into v_mess_ids
      from public.messes where is_active;
    elsif v_role = 'staff' then
      select coalesce(array_agg(mess_id), '{}'::uuid[]) into v_mess_ids
      from public.staff_assignments where staff_id = v_actor;
    else
      select coalesce(array_agg(mess_id), '{}'::uuid[]) into v_mess_ids
      from public.students where profile_id = v_actor;
    end if;
  else
    -- Never let a caller materialize a mess they do not belong to.
    select coalesce(array_agg(distinct m), '{}'::uuid[]) into v_mess_ids
    from unnest(v_mess_ids) m
    where public.can_read_mess(m);
  end if;

  if cardinality(v_mess_ids) = 0 then
    return 0;
  end if;

  v_end_date := v_start_date + (p_days - 1);

  for v_day in
    select day::date
    from generate_series(v_start_date, v_end_date, interval '1 day') as day
  loop
    for v_template in
      select t.*
      from public.meal_templates t
      where t.mess_id = any(v_mess_ids)
        and t.is_active
        and t.day_of_week = extract(isodow from v_day)::smallint
    loop
      v_service_start := (v_day + v_template.start_time) at time zone 'Asia/Kolkata';

      -- Do not create or rewrite a meal that has already started today.
      if v_service_start <= now() then
        continue;
      end if;

      v_meal_id := null;

      if p_refresh then
        insert into public.meals (
          mess_id, category, title, description, meal_date, start_time,
          end_time, booking_cutoff_at, created_by, template_id
        ) values (
          v_template.mess_id, v_template.category, v_template.title,
          v_template.description, v_day, v_template.start_time,
          v_template.end_time,
          v_service_start - make_interval(mins => v_template.cutoff_offset_minutes),
          coalesce(v_template.created_by, v_actor), v_template.id
        )
        on conflict (mess_id, meal_date, category) do update
          set title = excluded.title,
              description = excluded.description,
              start_time = excluded.start_time,
              end_time = excluded.end_time,
              booking_cutoff_at = excluded.booking_cutoff_at,
              template_id = excluded.template_id,
              updated_at = now()
          where meals.template_id = excluded.template_id
        returning id into v_meal_id;
      else
        insert into public.meals (
          mess_id, category, title, description, meal_date, start_time,
          end_time, booking_cutoff_at, created_by, template_id
        ) values (
          v_template.mess_id, v_template.category, v_template.title,
          v_template.description, v_day, v_template.start_time,
          v_template.end_time,
          v_service_start - make_interval(mins => v_template.cutoff_offset_minutes),
          coalesce(v_template.created_by, v_actor), v_template.id
        )
        on conflict (mess_id, meal_date, category) do nothing
        returning id into v_meal_id;
      end if;

      if v_meal_id is not null then
        delete from public.menu_items where meal_id = v_meal_id;

        insert into public.menu_items (meal_id, name, description, sort_order)
        select v_meal_id, i.name, i.description, i.sort_order
        from public.meal_template_items i
        where i.template_id = v_template.id
        order by i.sort_order;

        v_count := v_count + 1;
      end if;
    end loop;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.materialize_recurring_meals(uuid[], integer, boolean)
  from public, anon;
grant execute on function public.materialize_recurring_meals(uuid[], integer, boolean)
  to authenticated;

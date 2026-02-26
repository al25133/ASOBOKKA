create extension if not exists pgcrypto;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  passcode char(5) not null unique check (passcode ~ '^[0-9]{5}$'),
  status text not null default 'collecting' check (status in ('collecting', 'ready', 'closed')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  selected_area text,
  selected_purpose text,
  selected_value text,
  is_ready boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, user_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_members'
  ) then
    alter publication supabase_realtime add table public.group_members;
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_group_members_updated_at on public.group_members;
create trigger set_group_members_updated_at
before update on public.group_members
for each row
execute function public.set_updated_at();

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

drop policy if exists "groups_select_by_member" on public.groups;
create policy "groups_select_by_member"
on public.groups
for select
to authenticated
using (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = groups.id
      and gm.user_id = auth.uid()
  )
);

drop policy if exists "groups_insert_by_creator" on public.groups;
create policy "groups_insert_by_creator"
on public.groups
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "groups_update_by_creator" on public.groups;
create policy "groups_update_by_creator"
on public.groups
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "group_members_select_by_group_member" on public.group_members;
create policy "group_members_select_by_group_member"
on public.group_members
for select
to authenticated
using (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
  )
);

drop policy if exists "group_members_insert_self" on public.group_members;
create policy "group_members_insert_self"
on public.group_members
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "group_members_update_self" on public.group_members;
create policy "group_members_update_self"
on public.group_members
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "group_members_delete_self" on public.group_members;
create policy "group_members_delete_self"
on public.group_members
for delete
to authenticated
using (user_id = auth.uid());

create or replace function public.generate_passcode()
returns char(5)
language sql
as $$
  select lpad((floor(random() * 100000))::int::text, 5, '0')::char(5);
$$;

create or replace function public.create_group_with_unique_passcode()
returns table(group_id uuid, passcode char(5))
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_passcode char(5);
  created_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  loop
    generated_passcode := public.generate_passcode();
    begin
      insert into public.groups (passcode, status, created_by)
      values (generated_passcode, 'collecting', auth.uid())
      returning id into created_group_id;
      exit;
    exception when unique_violation then
    end;
  end loop;

  insert into public.group_members (group_id, user_id)
  values (created_group_id, auth.uid())
  on conflict (group_id, user_id) do nothing;

  return query
  select created_group_id, generated_passcode;
end;
$$;

create or replace function public.find_group_by_passcode(input_passcode text)
returns table(group_id uuid, passcode char(5), status text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select g.id, g.passcode, g.status, g.created_at
  from public.groups g
  where g.passcode = input_passcode::char(5)
  limit 1;
$$;

create or replace function public.join_group_by_passcode(input_passcode text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select g.id
  into matched_group_id
  from public.groups g
  where g.passcode = input_passcode::char(5)
  limit 1;

  if matched_group_id is null then
    return null;
  end if;

  insert into public.group_members (group_id, user_id)
  values (matched_group_id, auth.uid())
  on conflict (group_id, user_id) do nothing;

  return matched_group_id;
end;
$$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, update, delete on public.group_members to authenticated;
grant execute on function public.create_group_with_unique_passcode() to authenticated;
grant execute on function public.find_group_by_passcode(text) to authenticated;
grant execute on function public.join_group_by_passcode(text) to authenticated;

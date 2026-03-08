-- ============================================================
-- MIGRATION: Add admin / organizer approval feature
-- ============================================================

-- 1. Add is_admin flag to profiles
alter table profiles add column if not exists is_admin boolean default false;

-- 2. Add approved flag to organizer_profiles
alter table organizer_profiles add column if not exists approved boolean default false;

-- 3. Set the superuser admin
update profiles
set is_admin = true
where id = (
  select id from auth.users where email = 'shashankbu@gmail.com'
);

-- 4. Auto-approve any existing organizers (so current users aren't locked out)
update organizer_profiles set approved = true;

-- 5. RLS: allow admins to read all organizer profiles (for approval dashboard)
create policy "organizer_profiles_admin_select" on organizer_profiles
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- 6. RLS: allow admins to update organizer profiles (to approve/reject)
create policy "organizer_profiles_admin_update" on organizer_profiles
  for update using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- 7. RLS: allow admins to read all profiles
create policy "profiles_admin_select_all" on profiles
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- ============================================================
-- MIGRATION: Fix infinite recursion in profiles RLS policies
-- ============================================================

-- 1. Create a security definer function to check admin status
--    without triggering RLS (avoids infinite recursion)
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_admin from profiles where id = auth.uid()),
    false
  );
$$;

-- 2. Drop the recursive policy
drop policy if exists "profiles_admin_select_all" on profiles;

-- 3. Recreate admin select policy using the safe function
create policy "profiles_admin_select_all" on profiles
  for select using (
    is_admin() or id = auth.uid()
  );

-- 4. Fix organizer_profiles admin policies to use the safe function too
drop policy if exists "organizer_profiles_admin_select" on organizer_profiles;
drop policy if exists "organizer_profiles_admin_update" on organizer_profiles;

create policy "organizer_profiles_admin_select" on organizer_profiles
  for select using (
    is_admin() or id = auth.uid()
  );

create policy "organizer_profiles_admin_update" on organizer_profiles
  for update using (
    is_admin()
  );

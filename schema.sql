-- ============================================================
-- SQUASH BILLETING APP — SUPABASE SCHEMA
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('player', 'host', 'organizer');
create type assignment_status as enum ('pending', 'contact_confirmed_host', 'contact_confirmed_player', 'fully_confirmed', 'cancelled');
create type tournament_status as enum ('draft', 'published', 'closed', 'completed');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text not null,
  avatar_url text,
  bio text,
  nationality text,
  city text,
  state text,
  interests text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PLAYER PROFILES
-- ============================================================

create table player_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  psa_ranking integer,
  psa_id text,
  home_club text,
  created_at timestamptz default now()
);

-- ============================================================
-- HOST PROFILES
-- ============================================================

create table host_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  capacity integer not null default 1 check (capacity between 1 and 10),
  offers_food boolean default false,
  offers_transport boolean default false,
  has_pets boolean default false,
  pet_details text,
  distance_to_venue_miles numeric(5,1),
  address_line text,
  created_at timestamptz default now()
);

-- Host availability windows (a host can have multiple date ranges)
create table host_availability (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid not null references host_profiles(id) on delete cascade,
  available_from date not null,
  available_to date not null,
  notes text,
  created_at timestamptz default now(),
  constraint valid_range check (available_to >= available_from)
);

-- ============================================================
-- ORGANIZER PROFILES
-- ============================================================

create table organizer_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  organization_name text not null,
  website text,
  created_at timestamptz default now()
);

-- ============================================================
-- TOURNAMENTS
-- ============================================================

create table tournaments (
  id uuid primary key default uuid_generate_v4(),
  organizer_id uuid not null references organizer_profiles(id) on delete cascade,
  name text not null,
  description text,
  status tournament_status default 'draft',
  start_date date not null,
  end_date date not null,
  -- Venue details
  venue_name text not null,
  venue_address text not null,
  venue_city text not null,
  venue_state text not null,
  venue_lat numeric(9,6),
  venue_lng numeric(9,6),
  -- Billeting window (may be wider than tournament dates)
  billeting_start date not null,
  billeting_end date not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_tournament_range check (end_date >= start_date),
  constraint valid_billeting_range check (billeting_end >= billeting_start)
);

-- ============================================================
-- TOURNAMENT HOST SIGNUPS
-- Players of a tournament who also offer hosting for that event
-- ============================================================

create table tournament_host_signups (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  host_id uuid not null references host_profiles(id) on delete cascade,
  signed_up_at timestamptz default now(),
  notes text,
  unique(tournament_id, host_id)
);

-- ============================================================
-- TOURNAMENT PLAYER REGISTRATIONS
-- Players who register interest in billeting for a tournament
-- ============================================================

create table tournament_player_registrations (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  player_id uuid not null references player_profiles(id) on delete cascade,
  registered_at timestamptz default now(),
  arrival_date date,
  departure_date date,
  special_requests text,
  unique(tournament_id, player_id)
);

-- ============================================================
-- ASSIGNMENTS (organizer assigns player to host)
-- ============================================================

create table assignments (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  player_id uuid not null references player_profiles(id),
  host_id uuid not null references host_profiles(id),
  organizer_id uuid not null references organizer_profiles(id),
  status assignment_status default 'pending',
  assigned_at timestamptz default now(),
  host_confirmed_at timestamptz,
  player_confirmed_at timestamptz,
  notes text,
  unique(tournament_id, player_id) -- a player gets one assignment per tournament
);

-- ============================================================
-- BROADCAST EMAILS (organizer recruits potential hosts)
-- ============================================================

create table broadcast_emails (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  organizer_id uuid not null references organizer_profiles(id),
  email_address text not null,
  sent_at timestamptz default now()
);

-- ============================================================
-- MESSAGES (in-app messaging between assigned host & player)
-- ============================================================

create table messages (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  link text, -- deep link within the app (e.g. /assignments/123)
  read_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table player_profiles enable row level security;
alter table host_profiles enable row level security;
alter table organizer_profiles enable row level security;
alter table host_availability enable row level security;
alter table tournaments enable row level security;
alter table tournament_host_signups enable row level security;
alter table tournament_player_registrations enable row level security;
alter table assignments enable row level security;
alter table broadcast_emails enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;

-- Profiles: users can read all profiles, only edit their own
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- Player profiles
create policy "player_profiles_select_all" on player_profiles for select using (true);
create policy "player_profiles_manage_own" on player_profiles for all using (auth.uid() = id);

-- Host profiles
create policy "host_profiles_select_all" on host_profiles for select using (true);
create policy "host_profiles_manage_own" on host_profiles for all using (auth.uid() = id);

-- Host availability
create policy "host_availability_select_all" on host_availability for select using (true);
create policy "host_availability_manage_own" on host_availability for all
  using (auth.uid() = host_id);

-- Organizer profiles
create policy "organizer_profiles_select_all" on organizer_profiles for select using (true);
create policy "organizer_profiles_manage_own" on organizer_profiles for all using (auth.uid() = id);

-- Tournaments: anyone can read published ones; organizers manage their own
create policy "tournaments_select_published" on tournaments for select
  using (status = 'published' or organizer_id = auth.uid());
create policy "tournaments_manage_own" on tournaments for all
  using (organizer_id = auth.uid());

-- Tournament host signups
create policy "host_signups_select" on tournament_host_signups for select using (true);
create policy "host_signups_manage_own" on tournament_host_signups for all
  using (auth.uid() = host_id);

-- Tournament player registrations
create policy "player_registrations_select_organizer" on tournament_player_registrations
  for select using (
    auth.uid() = player_id or
    exists (select 1 from tournaments t where t.id = tournament_id and t.organizer_id = auth.uid())
  );
create policy "player_registrations_manage_own" on tournament_player_registrations for all
  using (auth.uid() = player_id);

-- Assignments: visible to player, host, and organizer involved
create policy "assignments_select" on assignments for select
  using (
    auth.uid() = player_id or
    auth.uid() = host_id or
    auth.uid() = organizer_id
  );
create policy "assignments_insert_organizer" on assignments for insert
  with check (auth.uid() = organizer_id);
create policy "assignments_update_parties" on assignments for update
  using (
    auth.uid() = player_id or
    auth.uid() = host_id or
    auth.uid() = organizer_id
  );

-- Messages: only parties in the assignment can read/write
create policy "messages_select" on messages for select
  using (
    exists (
      select 1 from assignments a
      where a.id = assignment_id
      and (a.player_id = auth.uid() or a.host_id = auth.uid())
    )
  );
create policy "messages_insert" on messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from assignments a
      where a.id = assignment_id
      and (a.player_id = auth.uid() or a.host_id = auth.uid())
    )
  );

-- Notifications: own only
create policy "notifications_own" on notifications for all using (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamps
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

create trigger tournaments_updated_at before update on tournaments
  for each row execute function update_updated_at();

-- When both parties confirm contact, mark assignment as fully_confirmed
create or replace function check_assignment_fully_confirmed()
returns trigger as $$
begin
  if new.host_confirmed_at is not null and new.player_confirmed_at is not null then
    new.status = 'fully_confirmed';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger assignment_confirmation_check before update on assignments
  for each row execute function check_assignment_fully_confirmed();

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_tournaments_organizer on tournaments(organizer_id);
create index idx_tournaments_dates on tournaments(start_date, end_date);
create index idx_host_availability_host on host_availability(host_id);
create index idx_assignments_tournament on assignments(tournament_id);
create index idx_assignments_player on assignments(player_id);
create index idx_assignments_host on assignments(host_id);
create index idx_messages_assignment on messages(assignment_id);
create index idx_notifications_user on notifications(user_id, read_at);

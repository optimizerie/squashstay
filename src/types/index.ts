// ============================================================
// SQUASH BILLETING APP — TypeScript Types
// ============================================================

export type UserRole = 'player' | 'host' | 'organizer';
export type AssignmentStatus =
  | 'pending'
  | 'contact_confirmed_host'
  | 'contact_confirmed_player'
  | 'fully_confirmed'
  | 'cancelled';
export type TournamentStatus = 'draft' | 'published' | 'closed' | 'completed';

// ── Profiles ──────────────────────────────────────────────

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  nationality?: string;
  city?: string;
  state?: string;
  interests?: string;
  created_at: string;
  updated_at: string;
}

export interface PlayerProfile {
  id: string;
  psa_ranking?: number;
  psa_id?: string;
  home_club?: string;
  created_at: string;
  // joined
  profile?: Profile;
}

export interface HostProfile {
  id: string;
  capacity: number;
  offers_food: boolean;
  offers_transport: boolean;
  has_pets: boolean;
  pet_details?: string;
  distance_to_venue_miles?: number;
  address_line?: string;
  created_at: string;
  // joined
  profile?: Profile;
  availability?: HostAvailability[];
}

export interface OrganizerProfile {
  id: string;
  organization_name: string;
  website?: string;
  created_at: string;
  // joined
  profile?: Profile;
}

// ── Availability ──────────────────────────────────────────

export interface HostAvailability {
  id: string;
  host_id: string;
  available_from: string; // ISO date string
  available_to: string;
  notes?: string;
  created_at: string;
}

// ── Tournaments ───────────────────────────────────────────

export interface Tournament {
  id: string;
  organizer_id: string;
  name: string;
  description?: string;
  status: TournamentStatus;
  start_date: string;
  end_date: string;
  venue_name: string;
  venue_address: string;
  venue_city: string;
  venue_state: string;
  venue_lat?: number;
  venue_lng?: number;
  billeting_start: string;
  billeting_end: string;
  created_at: string;
  updated_at: string;
  // joined
  organizer?: OrganizerProfile;
  host_signup_count?: number;
  player_registration_count?: number;
}

// ── Tournament Participation ──────────────────────────────

export interface TournamentHostSignup {
  id: string;
  tournament_id: string;
  host_id: string;
  signed_up_at: string;
  notes?: string;
  // joined
  host?: HostProfile;
  tournament?: Tournament;
}

export interface TournamentPlayerRegistration {
  id: string;
  tournament_id: string;
  player_id: string;
  registered_at: string;
  arrival_date?: string;
  departure_date?: string;
  special_requests?: string;
  // joined
  player?: PlayerProfile;
  tournament?: Tournament;
}

// ── Assignments ───────────────────────────────────────────

export interface Assignment {
  id: string;
  tournament_id: string;
  player_id: string;
  host_id: string;
  organizer_id: string;
  status: AssignmentStatus;
  assigned_at: string;
  host_confirmed_at?: string;
  player_confirmed_at?: string;
  notes?: string;
  // joined
  player?: PlayerProfile;
  host?: HostProfile;
  tournament?: Tournament;
}

// ── Messaging ─────────────────────────────────────────────

export interface Message {
  id: string;
  assignment_id: string;
  sender_id: string;
  body: string;
  read_at?: string;
  created_at: string;
  // joined
  sender?: Profile;
}

// ── Notifications ─────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link?: string;
  read_at?: string;
  created_at: string;
}

// ── Broadcast ─────────────────────────────────────────────

export interface BroadcastEmail {
  id: string;
  tournament_id: string;
  organizer_id: string;
  email_address: string;
  sent_at: string;
}

// ── Form / UI helpers ─────────────────────────────────────

export interface CreateTournamentForm {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  venue_name: string;
  venue_address: string;
  venue_city: string;
  venue_state: string;
  billeting_start: string;
  billeting_end: string;
}

export interface HostProfileForm {
  capacity: number;
  offers_food: boolean;
  offers_transport: boolean;
  has_pets: boolean;
  pet_details: string;
  distance_to_venue_miles: string;
  address_line: string;
}

export interface PlayerProfileForm {
  psa_ranking: string;
  psa_id: string;
  home_club: string;
}

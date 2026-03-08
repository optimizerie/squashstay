import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

// ── Auth helpers ──────────────────────────────────────────

export const signUp = async (email: string, password: string) => {
  return supabase.auth.signUp({ email, password });
};

export const signIn = async (email: string, password: string) => {
  return supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  return supabase.auth.signOut();
};

export const getSession = async () => {
  return supabase.auth.getSession();
};

// ── Profile helpers ───────────────────────────────────────

export const getProfile = async (userId: string) => {
  return supabase.from('profiles').select('*').eq('id', userId).single();
};

export const upsertProfile = async (profile: Partial<{
  id: string; role: string; full_name: string; avatar_url: string;
  bio: string; nationality: string; city: string; state: string; interests: string;
}>) => {
  return supabase.from('profiles').upsert(profile);
};

// ── Tournament helpers ────────────────────────────────────

export const getPublishedTournaments = async () => {
  return supabase
    .from('tournaments')
    .select(`
      *,
      organizer:organizer_profiles(*, profile:profiles(*)),
      host_signup_count:tournament_host_signups(count),
      player_registration_count:tournament_player_registrations(count)
    `)
    .eq('status', 'published')
    .order('start_date', { ascending: true });
};

export const getTournamentById = async (id: string) => {
  return supabase
    .from('tournaments')
    .select(`
      *,
      organizer:organizer_profiles(*, profile:profiles(*))
    `)
    .eq('id', id)
    .single();
};

export const getOrganizerTournaments = async (organizerId: string) => {
  return supabase
    .from('tournaments')
    .select('*')
    .eq('organizer_id', organizerId)
    .order('start_date', { ascending: false });
};

// ── Assignment helpers ────────────────────────────────────

export const getMyAssignments = async (userId: string, role: 'player' | 'host') => {
  const field = role === 'player' ? 'player_id' : 'host_id';
  return supabase
    .from('assignments')
    .select(`
      *,
      tournament:tournaments(*),
      player:player_profiles(*, profile:profiles(*)),
      host:host_profiles(*, profile:profiles(*))
    `)
    .eq(field, userId)
    .order('assigned_at', { ascending: false });
};

export const confirmContact = async (
  assignmentId: string,
  role: 'host' | 'player'
) => {
  const field = role === 'host' ? 'host_confirmed_at' : 'player_confirmed_at';
  return supabase
    .from('assignments')
    .update({ [field]: new Date().toISOString() })
    .eq('id', assignmentId);
};

// ── Messaging helpers ─────────────────────────────────────

export const getMessages = async (assignmentId: string) => {
  return supabase
    .from('messages')
    .select('*, sender:profiles(*)')
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: true });
};

export const sendMessage = async (assignmentId: string, senderId: string, body: string) => {
  return supabase.from('messages').insert({
    assignment_id: assignmentId,
    sender_id: senderId,
    body,
  });
};

export const subscribeToMessages = (
  assignmentId: string,
  callback: (message: unknown) => void
) => {
  return supabase
    .channel(`messages:${assignmentId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `assignment_id=eq.${assignmentId}`,
      },
      callback
    )
    .subscribe();
};

// ── Notification helpers ──────────────────────────────────

export const getNotifications = async (userId: string) => {
  return supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
};

export const markNotificationRead = async (notificationId: string) => {
  return supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
};

export const subscribeToNotifications = (
  userId: string,
  callback: (notification: unknown) => void
) => {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
};

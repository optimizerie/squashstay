import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth, navigate } from "../App";
import { Navbar } from "../components/shared/Navbar";
import type { Tournament, Assignment, TournamentPlayerRegistration } from "../types";

export function PlayerDashboard() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [registrations, setRegistrations] = useState<TournamentPlayerRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"browse" | "my">("browse");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("tournaments").select("*, organizer:organizer_profiles(*, profile:profiles(*))").eq("status", "published").order("start_date"),
      supabase.from("assignments").select("*, tournament:tournaments(*), host:host_profiles(*, profile:profiles(*))").eq("player_id", user.id),
      supabase.from("tournament_player_registrations").select("*, tournament:tournaments(*)").eq("player_id", user.id),
    ]).then(([t, a, r]) => {
      setTournaments((t.data as Tournament[]) || []);
      setAssignments((a.data as Assignment[]) || []);
      setRegistrations((r.data as TournamentPlayerRegistration[]) || []);
      setLoading(false);
    });
  }, [user]);

  const isRegistered = (tId: string) => registrations.some(r => r.tournament_id === tId);
  const getAssignment = (tId: string) => assignments.find(a => a.tournament_id === tId);

  const handleRegister = async (tournament: Tournament) => {
    if (!user) return;
    await supabase.from("tournament_player_registrations").insert({
      tournament_id: tournament.id,
      player_id: user.id,
    });
    const { data } = await supabase.from("tournament_player_registrations").select("*, tournament:tournaments(*)").eq("player_id", user.id);
    setRegistrations((data as TournamentPlayerRegistration[]) || []);
  };

  return (
    <div className="page-layout">
      <Navbar />
      <main className="page-main">
        <div className="page-header">
          <h1>Player Dashboard</h1>
          <p className="page-sub">Find tournaments and get matched with a host.</p>
        </div>

        {/* Active assignment banner */}
        {assignments.filter(a => a.status !== "cancelled").map(a => (
          <div key={a.id} className={`assignment-banner ${a.status === "fully_confirmed" ? "confirmed" : "pending"}`}>
            <div className="assignment-banner-content">
              <div>
                <strong>{a.status === "fully_confirmed" ? "✅ Confirmed stay" : "🏠 You've been assigned a host!"}</strong>
                <span> · {(a.tournament as any)?.name}</span>
              </div>
              <div className="assignment-banner-host">
                Host: <strong>{(a.host as any)?.profile?.full_name}</strong>
                {a.status !== "fully_confirmed" && !a.player_confirmed_at && (
                  <button className="btn-confirm" onClick={async () => {
                    await supabase.from("assignments").update({ player_confirmed_at: new Date().toISOString() }).eq("id", a.id);
                    const { data } = await supabase.from("assignments").select("*, tournament:tournaments(*), host:host_profiles(*, profile:profiles(*))").eq("player_id", user!.id);
                    setAssignments((data as Assignment[]) || []);
                  }}>
                    ✓ Confirm contact made
                  </button>
                )}
              </div>
            </div>
            <button className="btn-primary btn-sm" onClick={() => navigate(`/assignment/${a.id}`)}>
              Open →
            </button>
          </div>
        ))}

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${activeTab === "browse" ? "active" : ""}`} onClick={() => setActiveTab("browse")}>
            Browse Tournaments
          </button>
          <button className={`tab ${activeTab === "my" ? "active" : ""}`} onClick={() => setActiveTab("my")}>
            My Registrations ({registrations.length})
          </button>
        </div>

        {loading ? (
          <div className="loading-placeholder">Loading…</div>
        ) : activeTab === "browse" ? (
          <div className="tournament-grid">
            {tournaments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏆</div>
                <p>No tournaments open right now. Check back soon!</p>
              </div>
            ) : tournaments.map(t => (
              <TournamentCard
                key={t.id}
                tournament={t}
                registered={isRegistered(t.id)}
                assignment={getAssignment(t.id)}
                onRegister={() => handleRegister(t)}
              />
            ))}
          </div>
        ) : (
          <div className="tournament-grid">
            {registrations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>You haven't registered for any tournaments yet.</p>
              </div>
            ) : registrations.map(r => (
              <TournamentCard
                key={r.id}
                tournament={r.tournament as Tournament}
                registered={true}
                assignment={getAssignment(r.tournament_id)}
                onRegister={() => {}}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TournamentCard({ tournament, registered, assignment, onRegister }: {
  tournament: Tournament;
  registered: boolean;
  assignment?: Assignment;
  onRegister: () => void;
}) {
  if (!tournament) return null;
  const org = (tournament.organizer as any)?.profile?.full_name || (tournament.organizer as any)?.organization_name;
  return (
    <div className="tournament-card">
      <div className="tournament-card-header">
        <div className="tournament-status-dot" data-status={tournament.status} />
        <span className="tournament-date">
          {new Date(tournament.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {" – "}
          {new Date(tournament.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>
      <h3 className="tournament-name">{tournament.name}</h3>
      <div className="tournament-venue">📍 {tournament.venue_name}, {tournament.venue_city}, {tournament.venue_state}</div>
      {org && <div className="tournament-org">Organized by {org}</div>}
      {tournament.description && <p className="tournament-desc">{tournament.description}</p>}

      <div className="tournament-card-footer">
        {assignment ? (
          <button className="btn-primary btn-sm" onClick={() => navigate(`/assignment/${assignment.id}`)}>
            View Assignment →
          </button>
        ) : registered ? (
          <span className="badge badge-registered">✓ Registered — awaiting assignment</span>
        ) : (
          <button className="btn-primary btn-sm" onClick={onRegister}>
            Register Interest
          </button>
        )}
      </div>
    </div>
  );
}

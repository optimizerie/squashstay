import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth, navigate } from "../App";
import { Navbar } from "../components/shared/Navbar";
import type { Tournament, Assignment, TournamentHostSignup, HostAvailability } from "../types";

export function HostDashboard() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [signups, setSignups] = useState<TournamentHostSignup[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availability, setAvailability] = useState<HostAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tournaments" | "assignments" | "availability">("tournaments");

  // Availability form
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [savingAvail, setSavingAvail] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const [t, s, a, av] = await Promise.all([
      supabase.from("tournaments").select("*, organizer:organizer_profiles(*, profile:profiles(*))").eq("status", "published").order("start_date"),
      supabase.from("tournament_host_signups").select("*, tournament:tournaments(*)").eq("host_id", user.id),
      supabase.from("assignments").select("*, tournament:tournaments(*), player:player_profiles(*, profile:profiles(*))").eq("host_id", user.id),
      supabase.from("host_availability").select("*").eq("host_id", user.id).order("available_from"),
    ]);
    setTournaments((t.data as Tournament[]) || []);
    setSignups((s.data as TournamentHostSignup[]) || []);
    setAssignments((a.data as Assignment[]) || []);
    setAvailability((av.data as HostAvailability[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const isSignedUp = (tId: string) => signups.some(s => s.tournament_id === tId);

  const handleSignup = async (tournamentId: string) => {
    if (!user) return;
    await supabase.from("tournament_host_signups").insert({ tournament_id: tournamentId, host_id: user.id });
    fetchData();
  };

  const handleWithdraw = async (tournamentId: string) => {
    if (!user) return;
    await supabase.from("tournament_host_signups").delete().eq("tournament_id", tournamentId).eq("host_id", user.id);
    fetchData();
  };

  const handleAddAvailability = async () => {
    if (!user || !newFrom || !newTo) return;
    setSavingAvail(true);
    await supabase.from("host_availability").insert({
      host_id: user.id,
      available_from: newFrom,
      available_to: newTo,
      notes: newNotes || null,
    });
    setNewFrom(""); setNewTo(""); setNewNotes("");
    setSavingAvail(false);
    fetchData();
  };

  const handleDeleteAvailability = async (id: string) => {
    await supabase.from("host_availability").delete().eq("id", id);
    fetchData();
  };

  const confirmContact = async (assignmentId: string) => {
    await supabase.from("assignments").update({ host_confirmed_at: new Date().toISOString() }).eq("id", assignmentId);
    fetchData();
  };

  return (
    <div className="page-layout">
      <Navbar />
      <main className="page-main">
        <div className="page-header">
          <h1>Host Dashboard</h1>
          <p className="page-sub">Manage your hosting for squash tournaments.</p>
        </div>

        {/* Active assignments */}
        {assignments.filter(a => a.status !== "cancelled").map(a => (
          <div key={a.id} className={`assignment-banner ${a.status === "fully_confirmed" ? "confirmed" : "pending"}`}>
            <div className="assignment-banner-content">
              <div>
                <strong>{a.status === "fully_confirmed" ? "✅ Confirmed" : "🎾 New player assigned to you!"}</strong>
                <span> · {(a.tournament as any)?.name}</span>
              </div>
              <div>
                Player: <strong>{(a.player as any)?.profile?.full_name}</strong>
                {!a.host_confirmed_at && (
                  <button className="btn-confirm" onClick={() => confirmContact(a.id)}>
                    ✓ Confirm contact made
                  </button>
                )}
              </div>
            </div>
            <button className="btn-primary btn-sm" onClick={() => navigate(`/assignment/${a.id}`)}>Open →</button>
          </div>
        ))}

        <div className="tabs">
          <button className={`tab ${activeTab === "tournaments" ? "active" : ""}`} onClick={() => setActiveTab("tournaments")}>
            Tournaments ({signups.length} signed up)
          </button>
          <button className={`tab ${activeTab === "assignments" ? "active" : ""}`} onClick={() => setActiveTab("assignments")}>
            My Assignments ({assignments.length})
          </button>
          <button className={`tab ${activeTab === "availability" ? "active" : ""}`} onClick={() => setActiveTab("availability")}>
            My Availability ({availability.length})
          </button>
        </div>

        {loading ? (
          <div className="loading-placeholder">Loading…</div>
        ) : activeTab === "tournaments" ? (
          <div className="tournament-grid">
            {tournaments.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">🏆</div><p>No open tournaments right now.</p></div>
            ) : tournaments.map(t => (
              <div key={t.id} className="tournament-card">
                <div className="tournament-card-header">
                  <span className="tournament-date">
                    {new Date(t.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {new Date(t.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <h3 className="tournament-name">{t.name}</h3>
                <div className="tournament-venue">📍 {t.venue_name}, {t.venue_city}, {t.venue_state}</div>
                <div className="tournament-billeting">
                  🛏 Billeting: {new Date(t.billeting_start).toLocaleDateString()} – {new Date(t.billeting_end).toLocaleDateString()}
                </div>
                <div className="tournament-card-footer">
                  {isSignedUp(t.id) ? (
                    <div className="host-signup-row">
                      <span className="badge badge-registered">✓ Signed up to host</span>
                      <button className="btn-ghost btn-sm" onClick={() => handleWithdraw(t.id)}>Withdraw</button>
                    </div>
                  ) : (
                    <button className="btn-primary btn-sm" onClick={() => handleSignup(t.id)}>
                      Sign Up to Host
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === "assignments" ? (
          <div className="tournament-grid">
            {assignments.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">🎾</div><p>No player assignments yet.</p></div>
            ) : assignments.map(a => (
              <div key={a.id} className="tournament-card">
                <h3 className="tournament-name">{(a.tournament as any)?.name}</h3>
                <div className="assignment-player-info">
                  <div className="player-avatar-placeholder">🎾</div>
                  <div>
                    <strong>{(a.player as any)?.profile?.full_name}</strong>
                    <div className="player-meta">{(a.player as any)?.profile?.nationality} · PSA #{(a.player as any)?.psa_ranking || "—"}</div>
                  </div>
                </div>
                <div className="status-row">
                  <span className={`badge badge-${a.status}`}>{a.status.replace(/_/g, " ")}</span>
                </div>
                <button className="btn-primary btn-sm" onClick={() => navigate(`/assignment/${a.id}`)}>Open conversation →</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="availability-section">
            <div className="availability-form card">
              <h3>Add availability window</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">From</label>
                  <input className="form-input" type="date" value={newFrom} onChange={e => setNewFrom(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">To</label>
                  <input className="form-input" type="date" value={newTo} min={newFrom} onChange={e => setNewTo(e.target.value)} />
                </div>
                <div className="form-group form-group-full">
                  <label className="form-label">Notes (optional)</label>
                  <input className="form-input" value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="e.g. No pets that week" />
                </div>
              </div>
              <button className="btn-primary" onClick={handleAddAvailability} disabled={!newFrom || !newTo || savingAvail}>
                {savingAvail ? "Saving…" : "Add window"}
              </button>
            </div>

            <div className="availability-list">
              {availability.length === 0 ? (
                <div className="empty-state"><p>No availability set yet.</p></div>
              ) : availability.map(av => (
                <div key={av.id} className="availability-item">
                  <div className="availability-dates">
                    📅 {new Date(av.available_from).toLocaleDateString()} → {new Date(av.available_to).toLocaleDateString()}
                  </div>
                  {av.notes && <div className="availability-notes">{av.notes}</div>}
                  <button className="btn-danger btn-sm" onClick={() => handleDeleteAvailability(av.id)}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

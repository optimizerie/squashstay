import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth, navigate } from "../App";
import { Navbar } from "../components/shared/Navbar";
import type { Tournament, TournamentHostSignup, TournamentPlayerRegistration, Assignment } from "../types";

type OrgTab = "tournaments" | "create" | "manage" | "edit";

export function OrganizerDashboard() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTab, setActiveTab] = useState<OrgTab>("tournaments");
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  // Tournament details (for manage view)
  const [hosts, setHosts] = useState<TournamentHostSignup[]>([]);
  const [players, setPlayers] = useState<TournamentPlayerRegistration[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Create form
  const [form, setForm] = useState({
    name: "", description: "", start_date: "", end_date: "",
    venue_name: "", venue_address: "", venue_city: "", venue_state: "",
    billeting_start: "", billeting_end: "",
  });
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit form
  const [editForm, setEditForm] = useState({ ...form });
  const [editError, setEditError] = useState("");

  // Broadcast
  const [broadcastEmails, setBroadcastEmails] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  // Assignment modal
  const [assignModal, setAssignModal] = useState<{ playerId: string; playerName: string } | null>(null);
  const [selectedHostId, setSelectedHostId] = useState("");

  const fetchTournaments = async () => {
    if (!user) return;
    const { data } = await supabase.from("tournaments").select("*").eq("organizer_id", user.id).order("start_date", { ascending: false });
    setTournaments((data as Tournament[]) || []);
    setLoading(false);
  };

  const fetchTournamentDetails = async (t: Tournament) => {
    const [h, p, a] = await Promise.all([
      supabase.from("tournament_host_signups").select("*, host:host_profiles(*, profile:profiles(*))").eq("tournament_id", t.id),
      supabase.from("tournament_player_registrations").select("*, player:player_profiles(*, profile:profiles(*))").eq("tournament_id", t.id),
      supabase.from("assignments").select("*, player:player_profiles(*, profile:profiles(*)), host:host_profiles(*, profile:profiles(*))").eq("tournament_id", t.id),
    ]);
    setHosts((h.data as TournamentHostSignup[]) || []);
    setPlayers((p.data as TournamentPlayerRegistration[]) || []);
    setAssignments((a.data as Assignment[]) || []);
  };

  useEffect(() => { fetchTournaments(); }, [user]);

  useEffect(() => {
    if (selectedTournament) fetchTournamentDetails(selectedTournament);
  }, [selectedTournament]);

  const handleCreate = async () => {
    if (!user) return;
    setSaving(true); setCreateError("");
    const { error } = await supabase.from("tournaments").insert({
      ...form,
      organizer_id: user.id,
      status: "published",
    });
    if (error) { setCreateError(error.message); setSaving(false); return; }
    await fetchTournaments();
    setForm({ name: "", description: "", start_date: "", end_date: "", venue_name: "", venue_address: "", venue_city: "", venue_state: "", billeting_start: "", billeting_end: "" });
    setSaving(false);
    setActiveTab("tournaments");
  };

  const openEdit = (t: Tournament) => {
    setEditForm({
      name: t.name,
      description: t.description || "",
      start_date: t.start_date,
      end_date: t.end_date,
      venue_name: t.venue_name,
      venue_address: t.venue_address || "",
      venue_city: t.venue_city,
      venue_state: t.venue_state,
      billeting_start: t.billeting_start,
      billeting_end: t.billeting_end,
    });
    setEditError("");
    setActiveTab("edit");
  };

  const handleSaveEdit = async () => {
    if (!selectedTournament) return;
    setSaving(true); setEditError("");
    const { error } = await supabase.from("tournaments").update(editForm).eq("id", selectedTournament.id);
    if (error) { setEditError(error.message); setSaving(false); return; }
    await fetchTournaments();
    const updated = { ...selectedTournament, ...editForm };
    setSelectedTournament(updated as Tournament);
    setSaving(false);
    setActiveTab("manage");
  };

  const ef = (k: keyof typeof editForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEditForm(prev => ({ ...prev, [k]: e.target.value }));

  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: { email: string; error: string }[] } | null>(null);

  const handleBroadcast = async () => {
    if (!user || !selectedTournament) return;
    setBroadcasting(true);
    setBroadcastResult(null);
    const emails = broadcastEmails.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);

    // Log to DB
    const rows = emails.map(email => ({ tournament_id: selectedTournament.id, organizer_id: user.id, email_address: email }));
    await supabase.from("broadcast_emails").insert(rows);

    // Send via Edge Function
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-broadcast`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session?.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ emails, tournament: selectedTournament }),
    });

    const result = await res.json();
    setBroadcastResult(result);
    setBroadcastEmails("");
    setBroadcasting(false);
  };

  const handleAssign = async () => {
    if (!user || !selectedTournament || !assignModal || !selectedHostId) return;
    const { error } = await supabase.from("assignments").insert({
      tournament_id: selectedTournament.id,
      player_id: assignModal.playerId,
      host_id: selectedHostId,
      organizer_id: user.id,
    });
    if (!error) {
      // Create notifications for both parties
      await supabase.from("notifications").insert([
        { user_id: assignModal.playerId, title: "You've been assigned a host!", body: `You have a host for ${selectedTournament.name}. Check your assignments.`, link: "/dashboard" },
        { user_id: selectedHostId, title: "A player has been assigned to you!", body: `You're hosting a player for ${selectedTournament.name}. Check your dashboard.`, link: "/dashboard" },
      ]);
      setAssignModal(null);
      setSelectedHostId("");
      fetchTournamentDetails(selectedTournament);
    }
  };

  const isAssigned = (playerId: string) => assignments.some(a => a.player_id === playerId);
  const getAvailableHosts = () => {
    return hosts.filter(h => {
      const assignedCount = assignments.filter(a => a.host_id === h.host_id).length;
      const cap = (h.host as any)?.capacity || 1;
      return assignedCount < cap;
    });
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="page-layout">
      <Navbar />
      <main className="page-main">
        <div className="page-header">
          <h1>Organizer Dashboard</h1>
          <p className="page-sub">Manage your tournaments and player assignments.</p>
        </div>

        <div className="tabs">
          <button className={`tab ${activeTab === "tournaments" ? "active" : ""}`} onClick={() => setActiveTab("tournaments")}>My Tournaments</button>
          <button className={`tab ${activeTab === "create" ? "active" : ""}`} onClick={() => setActiveTab("create")}>+ New Tournament</button>
          {selectedTournament && (
            <button className={`tab ${activeTab === "manage" ? "active" : ""}`} onClick={() => setActiveTab("manage")}>
              Manage: {selectedTournament.name}
            </button>
          )}
          {selectedTournament && activeTab === "edit" && (
            <button className="tab active">Edit: {selectedTournament.name}</button>
          )}
        </div>

        {loading ? (
          <div className="loading-placeholder">Loading…</div>
        ) : activeTab === "tournaments" ? (
          <div className="tournament-grid">
            {tournaments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏆</div>
                <p>No tournaments yet. Create your first one!</p>
                <button className="btn-primary" onClick={() => setActiveTab("create")}>Create Tournament</button>
              </div>
            ) : tournaments.map(t => (
              <div key={t.id} className="tournament-card">
                <div className="tournament-card-header">
                  <span className={`badge badge-${t.status}`}>{t.status}</span>
                  <span className="tournament-date">
                    {new Date(t.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {new Date(t.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <h3 className="tournament-name">{t.name}</h3>
                <div className="tournament-venue">📍 {t.venue_name}, {t.venue_city}, {t.venue_state}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-ghost btn-sm" onClick={() => { setSelectedTournament(t); openEdit(t); }}>
                    Edit
                  </button>
                  <button className="btn-primary btn-sm" onClick={() => { setSelectedTournament(t); setActiveTab("manage"); }}>
                    Manage →
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === "create" ? (
          <div className="create-form card">
            <h2>New Tournament</h2>
            {createError && <div className="alert alert-error">{createError}</div>}
            <div className="form-grid">
              <div className="form-group form-group-full">
                <label className="form-label">Tournament name *</label>
                <input className="form-input" value={form.name} onChange={f("name")} placeholder="e.g. Pacific Northwest Open 2025" />
              </div>
              <div className="form-group form-group-full">
                <label className="form-label">Description</label>
                <textarea className="form-input form-textarea" value={form.description} onChange={f("description")} rows={3} placeholder="PSA Challenger event…" />
              </div>
              <div className="form-group">
                <label className="form-label">Start date *</label>
                <input className="form-input" type="date" value={form.start_date} onChange={f("start_date")} />
              </div>
              <div className="form-group">
                <label className="form-label">End date *</label>
                <input className="form-input" type="date" value={form.end_date} min={form.start_date} onChange={f("end_date")} />
              </div>
              <div className="form-section-title form-group-full">📍 Venue</div>
              <div className="form-group form-group-full">
                <label className="form-label">Venue name *</label>
                <input className="form-input" value={form.venue_name} onChange={f("venue_name")} placeholder="e.g. Multnomah Athletic Club" />
              </div>
              <div className="form-group form-group-full">
                <label className="form-label">Address</label>
                <input className="form-input" value={form.venue_address} onChange={f("venue_address")} placeholder="1849 SW Salmon St" />
              </div>
              <div className="form-group">
                <label className="form-label">City *</label>
                <input className="form-input" value={form.venue_city} onChange={f("venue_city")} placeholder="Portland" />
              </div>
              <div className="form-group">
                <label className="form-label">State *</label>
                <input className="form-input" value={form.venue_state} onChange={f("venue_state")} placeholder="OR" />
              </div>
              <div className="form-section-title form-group-full">🛏 Billeting window</div>
              <div className="form-group">
                <label className="form-label">Billeting from *</label>
                <input className="form-input" type="date" value={form.billeting_start} onChange={f("billeting_start")} />
              </div>
              <div className="form-group">
                <label className="form-label">Billeting to *</label>
                <input className="form-input" type="date" value={form.billeting_end} min={form.billeting_start} onChange={f("billeting_end")} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-ghost" onClick={() => setActiveTab("tournaments")}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={saving || !form.name || !form.start_date || !form.end_date || !form.venue_name || !form.venue_city || !form.venue_state || !form.billeting_start || !form.billeting_end}>
                {saving ? "Creating…" : "Publish Tournament"}
              </button>
            </div>
          </div>
        ) : activeTab === "manage" && selectedTournament ? (
          <div className="manage-section">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button className="btn-ghost btn-sm" onClick={() => openEdit(selectedTournament)}>✏️ Edit tournament details</button>
          </div>
          <div className="manage-stats">
              <div className="stat-card"><div className="stat-num">{hosts.length}</div><div className="stat-label">Hosts signed up</div></div>
              <div className="stat-card"><div className="stat-num">{players.length}</div><div className="stat-label">Players registered</div></div>
              <div className="stat-card"><div className="stat-num">{assignments.length}</div><div className="stat-label">Assignments made</div></div>
              <div className="stat-card"><div className="stat-num">{players.length - assignments.length}</div><div className="stat-label">Awaiting assignment</div></div>
            </div>

            {/* Broadcast */}
            <div className="card manage-card">
              <h3>📢 Broadcast to recruit hosts</h3>
              <p className="manage-card-sub">Email people to invite them to sign up as hosts for this tournament.</p>
              <textarea
                className="form-input form-textarea"
                rows={4}
                value={broadcastEmails}
                onChange={e => setBroadcastEmails(e.target.value)}
                placeholder="Enter email addresses, one per line or comma-separated&#10;john@example.com&#10;jane@squashclub.org"
              />
              <button className="btn-primary" onClick={handleBroadcast} disabled={!broadcastEmails.trim() || broadcasting}>
                {broadcasting ? "Sending…" : "Send Broadcast"}
              </button>
              {broadcastResult && (
                <div className={`alert ${broadcastResult.failed?.length ? "alert-error" : "alert-success"}`} style={{ marginTop: "12px" }}>
                  {broadcastResult.sent > 0 && <div>✅ Sent to {broadcastResult.sent} address{broadcastResult.sent !== 1 ? "es" : ""}.</div>}
                  {broadcastResult.failed?.map(f => (
                    <div key={f.email}>❌ {f.email}: {f.error}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Assignment panel */}
            <div className="manage-columns">
              {/* Players */}
              <div className="manage-column">
                <h3>Players ({players.length})</h3>
                {players.length === 0 ? (
                  <div className="empty-state-sm">No players registered yet.</div>
                ) : players.map(p => {
                  const player = p.player as any;
                  const assigned = isAssigned(p.player_id);
                  return (
                    <div key={p.id} className={`person-card ${assigned ? "assigned" : ""}`}>
                      <div className="person-info">
                        <div className="person-avatar">🎾</div>
                        <div>
                          <div className="person-name">{player?.profile?.full_name}</div>
                          <div className="person-meta">
                            {player?.profile?.nationality} · PSA #{player?.psa_ranking || "—"}
                            {player?.home_club && ` · ${player.home_club}`}
                          </div>
                          {player?.profile?.phone && (
                            <div className="person-phone">
                              📞 {player.profile.phone}
                              {(player.profile.contact_via_text || player.profile.contact_via_whatsapp) && (
                                <span style={{ color: "var(--gray-400)", marginLeft: 6 }}>
                                  ({[player.profile.contact_via_text && "text", player.profile.contact_via_whatsapp && "WhatsApp"].filter(Boolean).join(" · ")})
                                </span>
                              )}
                            </div>
                          )}
                          {p.special_requests && <div className="person-notes">{p.special_requests}</div>}
                        </div>
                      </div>
                      {assigned ? (
                        <span className="badge badge-registered">✓ Assigned</span>
                      ) : (
                        <button className="btn-primary btn-sm" onClick={() => { setAssignModal({ playerId: p.player_id, playerName: player?.profile?.full_name }); setSelectedHostId(""); }}>
                          Assign host
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Hosts */}
              <div className="manage-column">
                <h3>Available hosts ({hosts.length})</h3>
                {hosts.length === 0 ? (
                  <div className="empty-state-sm">No hosts signed up yet. Use the broadcast tool above.</div>
                ) : hosts.map(h => {
                  const host = h.host as any;
                  const assignedCount = assignments.filter(a => a.host_id === h.host_id).length;
                  return (
                    <div key={h.id} className="person-card">
                      <div className="person-info">
                        <div className="person-avatar">🏠</div>
                        <div>
                          <div className="person-name">{host?.profile?.full_name}</div>
                          <div className="person-meta">
                            Capacity: {assignedCount}/{host?.capacity} ·
                            {host?.distance_to_venue_miles && ` ${host.distance_to_venue_miles}mi from venue`}
                          </div>
                          {host?.profile?.phone && (
                            <div className="person-phone">
                              📞 {host.profile.phone}
                              {(host.profile.contact_via_text || host.profile.contact_via_whatsapp) && (
                                <span style={{ color: "var(--gray-400)", marginLeft: 6 }}>
                                  ({[host.profile.contact_via_text && "text", host.profile.contact_via_whatsapp && "WhatsApp"].filter(Boolean).join(" · ")})
                                </span>
                              )}
                            </div>
                          )}
                          <div className="host-offerings">
                            {host?.offers_food && <span className="offer-tag">🍳 Food</span>}
                            {host?.offers_transport && <span className="offer-tag">🚗 Transport</span>}
                            {host?.has_pets && <span className="offer-tag">🐾 Pets</span>}
                          </div>
                        </div>
                      </div>
                      <div className="capacity-bar">
                        <div className="capacity-fill" style={{ width: `${(assignedCount / (host?.capacity || 1)) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Assignments list */}
            {assignments.length > 0 && (
              <div className="card manage-card">
                <h3>Current assignments ({assignments.length})</h3>
                {assignments.map(a => (
                  <div key={a.id} className="assignment-row">
                    <span className="assignment-player">🎾 {(a.player as any)?.profile?.full_name}</span>
                    <span className="assignment-arrow">→</span>
                    <span className="assignment-host">🏠 {(a.host as any)?.profile?.full_name}</span>
                    <span className={`badge badge-${a.status}`}>{a.status.replace(/_/g, " ")}</span>
                    <button className="btn-ghost btn-sm" onClick={() => navigate(`/assignment/${a.id}`)}>View</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "edit" && selectedTournament ? (
          <div className="create-form card">
            <h2>Edit Tournament</h2>
            {editError && <div className="alert alert-error">{editError}</div>}
            <div className="form-grid">
              <div className="form-group form-group-full">
                <label className="form-label">Tournament name *</label>
                <input className="form-input" value={editForm.name} onChange={ef("name")} />
              </div>
              <div className="form-group form-group-full">
                <label className="form-label">Description</label>
                <textarea className="form-input form-textarea" value={editForm.description} onChange={ef("description")} rows={3} />
              </div>
              <div className="form-group">
                <label className="form-label">Start date *</label>
                <input className="form-input" type="date" value={editForm.start_date} onChange={ef("start_date")} />
              </div>
              <div className="form-group">
                <label className="form-label">End date *</label>
                <input className="form-input" type="date" value={editForm.end_date} min={editForm.start_date} onChange={ef("end_date")} />
              </div>
              <div className="form-section-title form-group-full">📍 Venue</div>
              <div className="form-group form-group-full">
                <label className="form-label">Venue name *</label>
                <input className="form-input" value={editForm.venue_name} onChange={ef("venue_name")} />
              </div>
              <div className="form-group form-group-full">
                <label className="form-label">Address</label>
                <input className="form-input" value={editForm.venue_address} onChange={ef("venue_address")} />
              </div>
              <div className="form-group">
                <label className="form-label">City *</label>
                <input className="form-input" value={editForm.venue_city} onChange={ef("venue_city")} />
              </div>
              <div className="form-group">
                <label className="form-label">State *</label>
                <input className="form-input" value={editForm.venue_state} onChange={ef("venue_state")} />
              </div>
              <div className="form-section-title form-group-full">🛏 Billeting window</div>
              <div className="form-group">
                <label className="form-label">Billeting from *</label>
                <input className="form-input" type="date" value={editForm.billeting_start} onChange={ef("billeting_start")} />
              </div>
              <div className="form-group">
                <label className="form-label">Billeting to *</label>
                <input className="form-input" type="date" value={editForm.billeting_end} min={editForm.billeting_start} onChange={ef("billeting_end")} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-ghost" onClick={() => setActiveTab("manage")}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveEdit} disabled={saving || !editForm.name || !editForm.start_date || !editForm.end_date || !editForm.venue_name || !editForm.venue_city || !editForm.venue_state || !editForm.billeting_start || !editForm.billeting_end}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        ) : null}

        {/* Assignment modal */}
        {assignModal && (
          <div className="modal-overlay" onClick={() => setAssignModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Assign host to {assignModal.playerName}</h3>
              <p className="modal-sub">Select a host with available capacity.</p>
              <div className="modal-options">
                {getAvailableHosts().length === 0 ? (
                  <div className="empty-state-sm">No hosts with remaining capacity.</div>
                ) : getAvailableHosts().map(h => {
                  const host = h.host as any;
                  return (
                    <label key={h.host_id} className={`modal-option ${selectedHostId === h.host_id ? "selected" : ""}`}>
                      <input type="radio" name="host" value={h.host_id} checked={selectedHostId === h.host_id} onChange={e => setSelectedHostId(e.target.value)} />
                      <div>
                        <div className="person-name">{host?.profile?.full_name}</div>
                        <div className="person-meta">
                          {host?.distance_to_venue_miles && `${host.distance_to_venue_miles}mi from venue · `}
                          Cap: {assignments.filter(a => a.host_id === h.host_id).length}/{host?.capacity}
                          {host?.offers_food ? " · 🍳" : ""}{host?.offers_transport ? " · 🚗" : ""}{host?.has_pets ? " · 🐾" : ""}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="modal-actions">
                <button className="btn-ghost" onClick={() => setAssignModal(null)}>Cancel</button>
                <button className="btn-primary" onClick={handleAssign} disabled={!selectedHostId}>Confirm Assignment</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

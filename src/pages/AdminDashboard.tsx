import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Navbar } from "../components/shared/Navbar";
import type { OrganizerProfile } from "../types";

export function AdminDashboard() {
  const [organizers, setOrganizers] = useState<OrganizerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchOrganizers = async () => {
    const { data } = await supabase
      .from("organizer_profiles")
      .select("*, profile:profiles(*)")
      .order("created_at", { ascending: false });
    setOrganizers((data as OrganizerProfile[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrganizers(); }, []);

  const handleApprove = async (id: string, approved: boolean) => {
    setUpdating(id);
    await supabase.from("organizer_profiles").update({ approved }).eq("id", id);
    await fetchOrganizers();
    setUpdating(null);
  };

  const pending = organizers.filter(o => !o.approved);
  const approved = organizers.filter(o => o.approved);

  return (
    <div className="page-layout">
      <Navbar />
      <main className="page-main">
        <div className="page-header">
          <h1>Admin Dashboard</h1>
          <p className="page-sub">Approve organizer accounts to grant tournament creation access.</p>
        </div>

        {loading ? (
          <div className="loading-placeholder">Loading…</div>
        ) : (
          <>
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ marginBottom: 16 }}>
                Pending Approval
                {pending.length > 0 && (
                  <span className="badge badge-pending" style={{ marginLeft: 10, fontSize: 14 }}>
                    {pending.length}
                  </span>
                )}
              </h2>
              {pending.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <p>No pending organizers.</p>
                </div>
              ) : (
                <div className="tournament-grid">
                  {pending.map(o => (
                    <OrganizerCard
                      key={o.id}
                      organizer={o}
                      updating={updating === o.id}
                      onApprove={() => handleApprove(o.id, true)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 style={{ marginBottom: 16 }}>Approved Organizers ({approved.length})</h2>
              {approved.length === 0 ? (
                <div className="empty-state"><p>No approved organizers yet.</p></div>
              ) : (
                <div className="tournament-grid">
                  {approved.map(o => (
                    <OrganizerCard
                      key={o.id}
                      organizer={o}
                      updating={updating === o.id}
                      onRevoke={() => handleApprove(o.id, false)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function OrganizerCard({ organizer, updating, onApprove, onRevoke }: {
  organizer: OrganizerProfile;
  updating: boolean;
  onApprove?: () => void;
  onRevoke?: () => void;
}) {
  const profile = organizer.profile as any;
  return (
    <div className="tournament-card">
      <div className="tournament-card-header">
        <span className={`badge ${organizer.approved ? "badge-registered" : "badge-pending"}`}>
          {organizer.approved ? "✓ Approved" : "⏳ Pending"}
        </span>
      </div>
      <h3 className="tournament-name">{organizer.organization_name}</h3>
      <div className="tournament-venue">
        👤 {profile?.full_name}
        {profile?.email && <> · {profile.email}</>}
      </div>
      {profile?.city && (
        <div className="tournament-venue">📍 {profile.city}{profile?.state ? `, ${profile.state}` : ""}</div>
      )}
      {organizer.website && (
        <div className="tournament-venue">🌐 {organizer.website}</div>
      )}
      <div className="tournament-card-footer">
        {onApprove && (
          <button className="btn-primary btn-sm" onClick={onApprove} disabled={updating}>
            {updating ? "Approving…" : "Approve"}
          </button>
        )}
        {onRevoke && (
          <button className="btn-ghost btn-sm" onClick={onRevoke} disabled={updating}>
            {updating ? "Revoking…" : "Revoke"}
          </button>
        )}
      </div>
    </div>
  );
}

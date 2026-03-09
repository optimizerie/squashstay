import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth, navigate } from "../App";
import { Navbar } from "../components/shared/Navbar";
import type { PlayerProfile, HostProfile, OrganizerProfile } from "../types";

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();

  // Role-specific data
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);

  // Edit form state
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [nationality, setNationality] = useState(profile?.nationality || "");
  const [city, setCity] = useState(profile?.city || "");
  const [state, setState] = useState(profile?.state || "");
  const [interests, setInterests] = useState(profile?.interests || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [contactViaText, setContactViaText] = useState(profile?.contact_via_text || false);
  const [contactViaWhatsapp, setContactViaWhatsapp] = useState(profile?.contact_via_whatsapp || false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    if (profile.role === "player") {
      supabase.from("player_profiles").select("*").eq("id", user.id).single()
        .then(({ data }) => setPlayerProfile(data));
    } else if (profile.role === "host") {
      supabase.from("host_profiles").select("*").eq("id", user.id).single()
        .then(({ data }) => setHostProfile(data));
    } else if (profile.role === "organizer") {
      supabase.from("organizer_profiles").select("*").eq("id", user.id).single()
        .then(({ data }) => setOrganizerProfile(data));
    }
  }, [user, profile]);

  // Sync edit fields when profile changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setNationality(profile.nationality || "");
      setCity(profile.city || "");
      setState(profile.state || "");
      setInterests(profile.interests || "");
      setPhone(profile.phone || "");
      setContactViaText(profile.contact_via_text || false);
      setContactViaWhatsapp(profile.contact_via_whatsapp || false);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ full_name: fullName, bio, nationality, city, state, interests, phone: phone || null, contact_via_text: contactViaText, contact_via_whatsapp: contactViaWhatsapp }).eq("id", user.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const roleIcon = profile?.role === "player" ? "🎾" : profile?.role === "host" ? "🏠" : "📋";
  const roleLabel = profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : "";

  return (
    <div className="page-layout">
      <Navbar />
      <main className="page-main page-main-narrow">

        {/* Profile header */}
        <div className="profile-header">
          <div className="profile-avatar-large">{roleIcon}</div>
          <div>
            <h1>{profile?.full_name}</h1>
            <span className="badge badge-role">{roleLabel}</span>
          </div>
        </div>

        {/* Profile view */}
        {!editing ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>My Profile</h3>
              <div style={{ display: "flex", gap: 8 }}>
                {saved && <span style={{ color: "var(--green)", fontSize: 14, alignSelf: "center" }}>✓ Saved!</span>}
                <button className="btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
                <button className="btn-primary btn-sm" onClick={() => navigate("/dashboard")}>Go to Dashboard →</button>
              </div>
            </div>

            <div className="profile-view-grid">
              {profile?.bio && (
                <div className="profile-view-row full">
                  <span className="profile-view-label">Bio</span>
                  <span className="profile-view-value">{profile.bio}</span>
                </div>
              )}
              {profile?.nationality && (
                <div className="profile-view-row">
                  <span className="profile-view-label">Nationality</span>
                  <span className="profile-view-value">{profile.nationality}</span>
                </div>
              )}
              {(profile?.city || profile?.state) && (
                <div className="profile-view-row">
                  <span className="profile-view-label">Location</span>
                  <span className="profile-view-value">{[profile.city, profile.state].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {profile?.interests && (
                <div className="profile-view-row full">
                  <span className="profile-view-label">Interests</span>
                  <span className="profile-view-value">{profile.interests}</span>
                </div>
              )}
              {profile?.phone && (
                <div className="profile-view-row">
                  <span className="profile-view-label">Phone</span>
                  <span className="profile-view-value">{profile.phone}</span>
                </div>
              )}
              {(profile?.contact_via_text || profile?.contact_via_whatsapp) && (
                <div className="profile-view-row">
                  <span className="profile-view-label">Contact via</span>
                  <span className="profile-view-value">
                    {[profile.contact_via_text && "💬 Direct text", profile.contact_via_whatsapp && "📱 WhatsApp"].filter(Boolean).join(" · ")}
                  </span>
                </div>
              )}
            </div>

            {/* Role-specific details */}
            {profile?.role === "player" && playerProfile && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--gray-200)" }}>
                <div className="profile-view-grid">
                  {playerProfile.psa_ranking && (
                    <div className="profile-view-row">
                      <span className="profile-view-label">PSA Ranking</span>
                      <span className="profile-view-value">#{playerProfile.psa_ranking}</span>
                    </div>
                  )}
                  {playerProfile.psa_id && (
                    <div className="profile-view-row">
                      <span className="profile-view-label">PSA ID</span>
                      <span className="profile-view-value">{playerProfile.psa_id}</span>
                    </div>
                  )}
                  {playerProfile.home_club && (
                    <div className="profile-view-row full">
                      <span className="profile-view-label">Home Club</span>
                      <span className="profile-view-value">{playerProfile.home_club}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {profile?.role === "host" && hostProfile && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--gray-200)" }}>
                <div className="profile-view-grid">
                  <div className="profile-view-row">
                    <span className="profile-view-label">Capacity</span>
                    <span className="profile-view-value">{hostProfile.capacity} player{hostProfile.capacity !== 1 ? "s" : ""}</span>
                  </div>
                  {hostProfile.distance_to_venue_miles != null && (
                    <div className="profile-view-row">
                      <span className="profile-view-label">Distance to venue</span>
                      <span className="profile-view-value">{hostProfile.distance_to_venue_miles} mi</span>
                    </div>
                  )}
                  <div className="profile-view-row full">
                    <span className="profile-view-label">Offerings</span>
                    <span className="profile-view-value">
                      {[
                        hostProfile.offers_food && "🍳 Meals",
                        hostProfile.offers_transport && "🚗 Transport",
                        hostProfile.has_pets && `🐾 Pets${hostProfile.pet_details ? ` (${hostProfile.pet_details})` : ""}`,
                      ].filter(Boolean).join(" · ") || "None listed"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {profile?.role === "organizer" && organizerProfile && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--gray-200)" }}>
                <div className="profile-view-grid">
                  <div className="profile-view-row full">
                    <span className="profile-view-label">Organization</span>
                    <span className="profile-view-value">{organizerProfile.organization_name}</span>
                  </div>
                  {organizerProfile.website && (
                    <div className="profile-view-row full">
                      <span className="profile-view-label">Website</span>
                      <span className="profile-view-value">{organizerProfile.website}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Edit form */
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Edit Profile</h3>
              <button className="btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            </div>
            <div className="form-grid">
              <div className="form-group form-group-full">
                <label className="form-label">Full name</label>
                <input className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Nationality</label>
                <input className="form-input" value={nationality} onChange={e => setNationality(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={city} onChange={e => setCity(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" value={state} onChange={e => setState(e.target.value)} />
              </div>
              <div className="form-group form-group-full">
                <label className="form-label">Bio</label>
                <textarea className="form-input form-textarea" value={bio} onChange={e => setBio(e.target.value)} rows={3} />
              </div>
              <div className="form-group form-group-full">
                <label className="form-label">Squash interests</label>
                <input className="form-input" value={interests} onChange={e => setInterests(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone number</label>
                <input className="form-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
              </div>
              <div className="form-group">
                <label className="form-label">Contact via</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={contactViaText} onChange={e => setContactViaText(e.target.checked)} />
                    <span>💬 Direct text</span>
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={contactViaWhatsapp} onChange={e => setContactViaWhatsapp(e.target.checked)} />
                    <span>📱 WhatsApp</span>
                  </label>
                </div>
              </div>
            </div>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}

      </main>
    </div>
  );
}

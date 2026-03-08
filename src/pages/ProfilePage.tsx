// ProfilePage.tsx
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth, navigate } from "../App";
import { Navbar } from "../components/shared/Navbar";

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [nationality, setNationality] = useState(profile?.nationality || "");
  const [city, setCity] = useState(profile?.city || "");
  const [state, setState] = useState(profile?.state || "");
  const [interests, setInterests] = useState(profile?.interests || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ full_name: fullName, bio, nationality, city, state, interests }).eq("id", user.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const roleIcon = profile?.role === "player" ? "🎾" : profile?.role === "host" ? "🏠" : "📋";
  const roleLabel = profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : "";

  return (
    <div className="page-layout">
      <Navbar />
      <main className="page-main page-main-narrow">
        <button className="back-btn" onClick={() => navigate("/dashboard")}>← Back</button>
        <div className="profile-header">
          <div className="profile-avatar-large">{roleIcon}</div>
          <div>
            <h1>{profile?.full_name}</h1>
            <span className="badge badge-role">{roleLabel}</span>
          </div>
        </div>

        <div className="card profile-form">
          <h3>Edit Profile</h3>
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
          </div>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saved ? "✓ Saved!" : saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </main>
    </div>
  );
}

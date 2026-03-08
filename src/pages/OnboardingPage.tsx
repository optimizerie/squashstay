import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth, navigate } from "../App";
import type { UserRole } from "../types";

type Step = "role" | "profile" | "role-details";

export function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Common fields
  const [fullName, setFullName] = useState("");
  const [nationality, setNationality] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");

  // Player fields
  const [psaRanking, setPsaRanking] = useState("");
  const [psaId, setPsaId] = useState("");
  const [homeClub, setHomeClub] = useState("");

  // Host fields
  const [capacity, setCapacity] = useState("1");
  const [offersFood, setOffersFood] = useState(false);
  const [offersTransport, setOffersTransport] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [petDetails, setPetDetails] = useState("");
  const [distanceToVenue, setDistanceToVenue] = useState("");
  const [addressLine, setAddressLine] = useState("");

  // Organizer fields
  const [orgName, setOrgName] = useState("");
  const [website, setWebsite] = useState("");

  const handleFinish = async () => {
    if (!user || !role || !fullName) return;
    setLoading(true);
    setError("");

    try {
      // 1. Upsert base profile
      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: user.id,
        role,
        full_name: fullName,
        nationality,
        city,
        state,
        bio,
        interests,
      });
      if (profileErr) throw profileErr;

      // 2. Upsert role-specific profile
      if (role === "player") {
        const { error: e } = await supabase.from("player_profiles").upsert({
          id: user.id,
          psa_ranking: psaRanking ? parseInt(psaRanking) : null,
          psa_id: psaId || null,
          home_club: homeClub || null,
        });
        if (e) throw e;
      } else if (role === "host") {
        const { error: e } = await supabase.from("host_profiles").upsert({
          id: user.id,
          capacity: parseInt(capacity),
          offers_food: offersFood,
          offers_transport: offersTransport,
          has_pets: hasPets,
          pet_details: petDetails || null,
          distance_to_venue_miles: distanceToVenue ? parseFloat(distanceToVenue) : null,
          address_line: addressLine || null,
        });
        if (e) throw e;
      } else if (role === "organizer") {
        const { error: e } = await supabase.from("organizer_profiles").upsert({
          id: user.id,
          organization_name: orgName,
          website: website || null,
        });
        if (e) throw e;
      }

      await refreshProfile();
      // Organizers land on dashboard which shows pending screen until approved
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
    setLoading(false);
  };

  const roles: { value: UserRole; icon: string; title: string; desc: string }[] = [
    { value: "player", icon: "🎾", title: "Player", desc: "I need accommodation at tournaments" },
    { value: "host", icon: "🏠", title: "Host", desc: "I want to host visiting players" },
    { value: "organizer", icon: "📋", title: "Organizer", desc: "I run tournaments and manage billeting" },
  ];

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <div className="onboarding-logo">🏸 SquashStay</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="onboarding-steps">
              {["role", "profile", "role-details"].map((s, i) => (
                <div key={s} className={`onboarding-step-dot ${step === s ? "active" : (["role", "profile", "role-details"].indexOf(step) > i ? "done" : "")}`} />
              ))}
            </div>
            <button
              className="btn-ghost btn-sm"
              onClick={() => supabase.auth.signOut().then(() => navigate("/"))}
            >
              Sign out
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {step === "role" && (
          <div className="onboarding-section">
            <h2>What's your role?</h2>
            <p className="onboarding-sub">Choose how you'll primarily use SquashStay.</p>
            <div className="role-picker">
              {roles.map(r => (
                <button
                  key={r.value}
                  className={`role-option ${role === r.value ? "selected" : ""}`}
                  onClick={() => setRole(r.value)}
                >
                  <span className="role-option-icon">{r.icon}</span>
                  <div>
                    <div className="role-option-title">{r.title}</div>
                    <div className="role-option-desc">{r.desc}</div>
                  </div>
                  {role === r.value && <span className="role-check">✓</span>}
                </button>
              ))}
            </div>
            <button
              className="btn-primary btn-full"
              disabled={!role}
              onClick={() => setStep("profile")}
            >
              Continue →
            </button>
          </div>
        )}

        {step === "profile" && (
          <div className="onboarding-section">
            <h2>Your profile</h2>
            <p className="onboarding-sub">Tell hosts and players a bit about yourself.</p>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full name *</label>
                <input className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Sarah Johnson" />
              </div>
              <div className="form-group">
                <label className="form-label">Nationality</label>
                <input className="form-input" value={nationality} onChange={e => setNationality(e.target.value)} placeholder="American" />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Portland" />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" value={state} onChange={e => setState(e.target.value)} placeholder="OR" />
              </div>
              <div className="form-group form-group-full">
                <label className="form-label">Bio</label>
                <textarea className="form-input form-textarea" value={bio} onChange={e => setBio(e.target.value)} placeholder="A little about yourself…" rows={3} />
              </div>
              <div className="form-group form-group-full">
                <label className="form-label">Squash interests</label>
                <input className="form-input" value={interests} onChange={e => setInterests(e.target.value)} placeholder="PSA fan, club player, coaching…" />
              </div>
            </div>
            <div className="onboarding-nav">
              <button className="btn-ghost" onClick={() => setStep("role")}>← Back</button>
              <button className="btn-primary" disabled={!fullName} onClick={() => setStep("role-details")}>Continue →</button>
            </div>
          </div>
        )}

        {step === "role-details" && role === "player" && (
          <div className="onboarding-section">
            <h2>Player details</h2>
            <p className="onboarding-sub">Help organizers match you with the right host.</p>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">PSA World Ranking</label>
                <input className="form-input" type="number" value={psaRanking} onChange={e => setPsaRanking(e.target.value)} placeholder="e.g. 250" />
              </div>
              <div className="form-group">
                <label className="form-label">PSA Player ID</label>
                <input className="form-input" value={psaId} onChange={e => setPsaId(e.target.value)} placeholder="e.g. PSA-12345" />
              </div>
              <div className="form-group form-group-full">
                <label className="form-label">Home Club</label>
                <input className="form-input" value={homeClub} onChange={e => setHomeClub(e.target.value)} placeholder="e.g. Chicago Racquet Club" />
              </div>
            </div>
            <div className="onboarding-nav">
              <button className="btn-ghost" onClick={() => setStep("profile")}>← Back</button>
              <button className="btn-primary" onClick={handleFinish} disabled={loading}>
                {loading ? "Saving…" : "Finish →"}
              </button>
            </div>
          </div>
        )}

        {step === "role-details" && role === "host" && (
          <div className="onboarding-section">
            <h2>Host details</h2>
            <p className="onboarding-sub">Let players know what you can offer.</p>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">How many players can you host?</label>
                <select className="form-input" value={capacity} onChange={e => setCapacity(e.target.value)}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} player{n > 1 ? "s" : ""}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Distance to venue (miles)</label>
                <input className="form-input" type="number" step="0.1" value={distanceToVenue} onChange={e => setDistanceToVenue(e.target.value)} placeholder="e.g. 2.5" />
              </div>
              <div className="form-group form-group-full">
                <label className="form-label">Address (optional — not shown publicly)</label>
                <input className="form-input" value={addressLine} onChange={e => setAddressLine(e.target.value)} placeholder="123 Main St, Portland, OR" />
              </div>
              <div className="form-group form-group-full">
                <label className="form-label">What can you offer?</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={offersFood} onChange={e => setOffersFood(e.target.checked)} />
                    <span>🍳 Meals / food</span>
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={offersTransport} onChange={e => setOffersTransport(e.target.checked)} />
                    <span>🚗 Transport to/from venue</span>
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={hasPets} onChange={e => setHasPets(e.target.checked)} />
                    <span>🐾 I have pets</span>
                  </label>
                </div>
              </div>
              {hasPets && (
                <div className="form-group form-group-full">
                  <label className="form-label">Pet details</label>
                  <input className="form-input" value={petDetails} onChange={e => setPetDetails(e.target.value)} placeholder="e.g. One friendly golden retriever" />
                </div>
              )}
            </div>
            <div className="onboarding-nav">
              <button className="btn-ghost" onClick={() => setStep("profile")}>← Back</button>
              <button className="btn-primary" onClick={handleFinish} disabled={loading}>
                {loading ? "Saving…" : "Finish →"}
              </button>
            </div>
          </div>
        )}

        {step === "role-details" && role === "organizer" && (
          <div className="onboarding-section">
            <h2>Organizer details</h2>
            <p className="onboarding-sub">Tell the community about your organization.</p>
            <div className="form-grid">
              <div className="form-group form-group-full">
                <label className="form-label">Organization name *</label>
                <input className="form-input" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Pacific Northwest Squash" />
              </div>
              <div className="form-group form-group-full">
                <label className="form-label">Website</label>
                <input className="form-input" type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourclub.com" />
              </div>
            </div>
            <div className="onboarding-nav">
              <button className="btn-ghost" onClick={() => setStep("profile")}>← Back</button>
              <button className="btn-primary" onClick={handleFinish} disabled={loading || !orgName}>
                {loading ? "Saving…" : "Finish →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

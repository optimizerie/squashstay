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

  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Base profile fields
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [nationality, setNationality] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [interests, setInterests] = useState("");
  const [phone, setPhone] = useState("");
  const [contactViaText, setContactViaText] = useState(false);
  const [contactViaWhatsapp, setContactViaWhatsapp] = useState(false);

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

  const fetchRoleProfile = async () => {
    if (!user || !profile) return;
    if (profile.role === "player") {
      const { data } = await supabase.from("player_profiles").select("*").eq("id", user.id).single();
      setPlayerProfile(data);
    } else if (profile.role === "host") {
      const { data } = await supabase.from("host_profiles").select("*").eq("id", user.id).single();
      setHostProfile(data);
    } else if (profile.role === "organizer") {
      const { data } = await supabase.from("organizer_profiles").select("*").eq("id", user.id).single();
      setOrganizerProfile(data);
    }
  };

  useEffect(() => { fetchRoleProfile(); }, [user, profile]);

  // Sync base fields from profile
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || "");
    setBio(profile.bio || "");
    setNationality(profile.nationality || "");
    setCity(profile.city || "");
    setStateName(profile.state || "");
    setInterests(profile.interests || "");
    setPhone(profile.phone || "");
    setContactViaText(profile.contact_via_text || false);
    setContactViaWhatsapp(profile.contact_via_whatsapp || false);
  }, [profile]);

  // Sync role-specific fields
  useEffect(() => {
    if (playerProfile) {
      setPsaRanking(playerProfile.psa_ranking?.toString() || "");
      setPsaId(playerProfile.psa_id || "");
      setHomeClub(playerProfile.home_club || "");
    }
  }, [playerProfile]);

  useEffect(() => {
    if (hostProfile) {
      setCapacity(hostProfile.capacity?.toString() || "1");
      setOffersFood(hostProfile.offers_food || false);
      setOffersTransport(hostProfile.offers_transport || false);
      setHasPets(hostProfile.has_pets || false);
      setPetDetails(hostProfile.pet_details || "");
      setDistanceToVenue(hostProfile.distance_to_venue_miles?.toString() || "");
      setAddressLine(hostProfile.address_line || "");
    }
  }, [hostProfile]);

  useEffect(() => {
    if (organizerProfile) {
      setOrgName(organizerProfile.organization_name || "");
      setWebsite(organizerProfile.website || "");
    }
  }, [organizerProfile]);

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);

    // Save base profile
    await supabase.from("profiles").update({
      full_name: fullName, bio, nationality,
      city, state: stateName, interests,
      phone: phone || null,
      contact_via_text: contactViaText,
      contact_via_whatsapp: contactViaWhatsapp,
    }).eq("id", user.id);

    // Save role-specific profile
    if (profile.role === "player") {
      await supabase.from("player_profiles").upsert({
        id: user.id,
        psa_ranking: psaRanking ? parseInt(psaRanking) : null,
        psa_id: psaId || null,
        home_club: homeClub || null,
      });
    } else if (profile.role === "host") {
      await supabase.from("host_profiles").upsert({
        id: user.id,
        capacity: parseInt(capacity),
        offers_food: offersFood,
        offers_transport: offersTransport,
        has_pets: hasPets,
        pet_details: petDetails || null,
        distance_to_venue_miles: distanceToVenue ? parseFloat(distanceToVenue) : null,
        address_line: addressLine || null,
      });
    } else if (profile.role === "organizer") {
      await supabase.from("organizer_profiles").upsert({
        id: user.id,
        organization_name: orgName,
        website: website || null,
      });
    }

    await refreshProfile();
    await fetchRoleProfile();
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

        <div className="profile-header">
          <div className="profile-avatar-large">{roleIcon}</div>
          <div>
            <h1>{profile?.full_name}</h1>
            <span className="badge badge-role">{roleLabel}</span>
          </div>
        </div>

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
              {profile?.bio && <div className="profile-view-row full"><span className="profile-view-label">Bio</span><span className="profile-view-value">{profile.bio}</span></div>}
              {profile?.nationality && <div className="profile-view-row"><span className="profile-view-label">Nationality</span><span className="profile-view-value">{profile.nationality}</span></div>}
              {(profile?.city || profile?.state) && <div className="profile-view-row"><span className="profile-view-label">Location</span><span className="profile-view-value">{[profile.city, profile.state].filter(Boolean).join(", ")}</span></div>}
              {profile?.interests && <div className="profile-view-row full"><span className="profile-view-label">Interests</span><span className="profile-view-value">{profile.interests}</span></div>}
              {profile?.phone && <div className="profile-view-row"><span className="profile-view-label">Phone</span><span className="profile-view-value">{profile.phone}</span></div>}
              {(profile?.contact_via_text || profile?.contact_via_whatsapp) && (
                <div className="profile-view-row">
                  <span className="profile-view-label">Contact via</span>
                  <span className="profile-view-value">{[profile.contact_via_text && "💬 Direct text", profile.contact_via_whatsapp && "📱 WhatsApp"].filter(Boolean).join(" · ")}</span>
                </div>
              )}
            </div>

            {profile?.role === "player" && playerProfile && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--gray-200)" }}>
                <div className="profile-view-grid">
                  {playerProfile.psa_ranking && <div className="profile-view-row"><span className="profile-view-label">PSA Ranking</span><span className="profile-view-value">#{playerProfile.psa_ranking}</span></div>}
                  {playerProfile.psa_id && <div className="profile-view-row"><span className="profile-view-label">PSA ID</span><span className="profile-view-value">{playerProfile.psa_id}</span></div>}
                  {playerProfile.home_club && <div className="profile-view-row full"><span className="profile-view-label">Home Club</span><span className="profile-view-value">{playerProfile.home_club}</span></div>}
                </div>
              </div>
            )}

            {profile?.role === "host" && hostProfile && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--gray-200)" }}>
                <div className="profile-view-grid">
                  <div className="profile-view-row"><span className="profile-view-label">Capacity</span><span className="profile-view-value">{hostProfile.capacity} player{hostProfile.capacity !== 1 ? "s" : ""}</span></div>
                  {hostProfile.distance_to_venue_miles != null && <div className="profile-view-row"><span className="profile-view-label">Distance to venue</span><span className="profile-view-value">{hostProfile.distance_to_venue_miles} mi</span></div>}
                  {hostProfile.address_line && <div className="profile-view-row full"><span className="profile-view-label">Address</span><span className="profile-view-value">{hostProfile.address_line}</span></div>}
                  <div className="profile-view-row full">
                    <span className="profile-view-label">Offerings</span>
                    <span className="profile-view-value">{[hostProfile.offers_food && "🍳 Meals", hostProfile.offers_transport && "🚗 Transport", hostProfile.has_pets && `🐾 Pets${hostProfile.pet_details ? ` (${hostProfile.pet_details})` : ""}`].filter(Boolean).join(" · ") || "None listed"}</span>
                  </div>
                </div>
              </div>
            )}

            {profile?.role === "organizer" && organizerProfile && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--gray-200)" }}>
                <div className="profile-view-grid">
                  <div className="profile-view-row full"><span className="profile-view-label">Organization</span><span className="profile-view-value">{organizerProfile.organization_name}</span></div>
                  {organizerProfile.website && <div className="profile-view-row full"><span className="profile-view-label">Website</span><span className="profile-view-value">{organizerProfile.website}</span></div>}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Edit Profile</h3>
              <button className="btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            </div>

            {/* Base fields */}
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
                <input className="form-input" value={stateName} onChange={e => setStateName(e.target.value)} />
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
                  <label className="checkbox-label"><input type="checkbox" checked={contactViaText} onChange={e => setContactViaText(e.target.checked)} /><span>💬 Direct text</span></label>
                  <label className="checkbox-label"><input type="checkbox" checked={contactViaWhatsapp} onChange={e => setContactViaWhatsapp(e.target.checked)} /><span>📱 WhatsApp</span></label>
                </div>
              </div>
            </div>

            {/* Player-specific fields */}
            {profile?.role === "player" && (
              <>
                <div className="form-section-title" style={{ margin: "20px 0 12px" }}>🎾 Player Details</div>
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
              </>
            )}

            {/* Host-specific fields */}
            {profile?.role === "host" && (
              <>
                <div className="form-section-title" style={{ margin: "20px 0 12px" }}>🏠 Host Details</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Players you can host</label>
                    <select className="form-input" value={capacity} onChange={e => setCapacity(e.target.value)}>
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} player{n > 1 ? "s" : ""}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Distance to venue (miles)</label>
                    <input className="form-input" type="number" step="0.1" value={distanceToVenue} onChange={e => setDistanceToVenue(e.target.value)} placeholder="e.g. 2.5" />
                  </div>
                  <div className="form-group form-group-full">
                    <label className="form-label">Address (private)</label>
                    <input className="form-input" value={addressLine} onChange={e => setAddressLine(e.target.value)} placeholder="123 Main St, Portland, OR" />
                  </div>
                  <div className="form-group form-group-full">
                    <label className="form-label">What can you offer?</label>
                    <div className="checkbox-group">
                      <label className="checkbox-label"><input type="checkbox" checked={offersFood} onChange={e => setOffersFood(e.target.checked)} /><span>🍳 Meals / food</span></label>
                      <label className="checkbox-label"><input type="checkbox" checked={offersTransport} onChange={e => setOffersTransport(e.target.checked)} /><span>🚗 Transport</span></label>
                      <label className="checkbox-label"><input type="checkbox" checked={hasPets} onChange={e => setHasPets(e.target.checked)} /><span>🐾 I have pets</span></label>
                    </div>
                  </div>
                  {hasPets && (
                    <div className="form-group form-group-full">
                      <label className="form-label">Pet details</label>
                      <input className="form-input" value={petDetails} onChange={e => setPetDetails(e.target.value)} placeholder="e.g. One friendly golden retriever" />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Organizer-specific fields */}
            {profile?.role === "organizer" && (
              <>
                <div className="form-section-title" style={{ margin: "20px 0 12px" }}>📋 Organization Details</div>
                <div className="form-grid">
                  <div className="form-group form-group-full">
                    <label className="form-label">Organization name</label>
                    <input className="form-input" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Pacific Northwest Squash" />
                  </div>
                  <div className="form-group form-group-full">
                    <label className="form-label">Website</label>
                    <input className="form-input" type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourclub.com" />
                  </div>
                </div>
              </>
            )}

            <div style={{ marginTop: 20 }}>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

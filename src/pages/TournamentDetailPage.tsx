import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { navigate } from "../App";
import { Navbar } from "../components/shared/Navbar";
import type { Tournament } from "../types";

export function TournamentDetailPage({ id }: { id: string }) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("tournaments")
      .select("*, organizer:organizer_profiles(*, profile:profiles(*))")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setTournament(data as Tournament);
        setLoading(false);
      });
  }, [id]);

  if (loading) return (
    <div className="page-layout">
      <Navbar />
      <main className="page-main"><div className="loading-placeholder">Loading…</div></main>
    </div>
  );

  if (!tournament) return (
    <div className="page-layout">
      <Navbar />
      <main className="page-main"><div className="empty-state">Tournament not found.</div></main>
    </div>
  );

  const org = (tournament.organizer as any)?.profile;

  return (
    <div className="page-layout">
      <Navbar />
      <main className="page-main page-main-narrow">
        <button className="back-btn" onClick={() => navigate("/dashboard")}>← Back</button>
        <div className="tournament-detail-header">
          <span className={`badge badge-${tournament.status}`}>{tournament.status}</span>
          <h1>{tournament.name}</h1>
          <div className="tournament-detail-dates">
            {new Date(tournament.start_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {" – "}
            {new Date(tournament.end_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>

        <div className="tournament-detail-grid">
          <div className="card detail-card">
            <h3>📍 Venue</h3>
            <p className="detail-main">{tournament.venue_name}</p>
            <p className="detail-sub">{tournament.venue_address}</p>
            <p className="detail-sub">{tournament.venue_city}, {tournament.venue_state}</p>
          </div>
          <div className="card detail-card">
            <h3>🛏 Billeting Window</h3>
            <p className="detail-main">
              {new Date(tournament.billeting_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {" – "}
              {new Date(tournament.billeting_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          {org && (
            <div className="card detail-card">
              <h3>👤 Organizer</h3>
              <p className="detail-main">{org.full_name}</p>
            </div>
          )}
        </div>

        {tournament.description && (
          <div className="card">
            <h3>About this tournament</h3>
            <p>{tournament.description}</p>
          </div>
        )}
      </main>
    </div>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { navigate } from "../App";
import type { Tournament } from "../types";

export function LandingPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    supabase
      .from("tournaments")
      .select("*")
      .eq("status", "published")
      .gte("end_date", new Date().toISOString().split("T")[0])
      .order("start_date", { ascending: true })
      .limit(6)
      .then(({ data }) => setTournaments((data as Tournament[]) || []));
  }, []);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-logo">
          <span className="logo-icon">🏸</span>
          <span className="logo-text">SquashStay</span>
        </div>
        <div className="landing-nav-actions">
          <button className="btn-ghost" onClick={() => navigate("/login")}>Sign in</button>
          <button className="btn-primary" onClick={() => navigate("/signup")}>Join</button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">MAC Squash Tournament Series</div>
          <h1 className="hero-title">
            Billeting for<br />
            <span className="hero-accent">Squash Players</span>
          </h1>
          <p className="hero-sub">
            Connect players with host families at tournaments across the US.
            Free accommodation. Real community.
          </p>
          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={() => navigate("/signup")}>
              Get Started
            </button>
            <button className="btn-hero-ghost" onClick={() => navigate("/login")}>
              Sign In
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="court-graphic">
            <div className="court-short-line" />
            <div className="court-half-line" />
            <div className="court-service-left" />
            <div className="court-service-right" />
            <div className="court-ball" />
          </div>
        </div>
      </section>

      {/* Upcoming tournaments */}
      {tournaments.length > 0 && (
        <section className="landing-tournaments">
          <h2 className="section-title">Upcoming Tournaments</h2>
          <div className="tournament-grid">
            {tournaments.map(t => (
              <div key={t.id} className="tournament-card">
                <div className="tournament-card-header">
                  <span className={`badge badge-${t.status}`}>{t.status}</span>
                  <span className="tournament-date">
                    {fmt(t.start_date)} – {fmt(t.end_date)}{new Date(t.end_date).getFullYear() !== new Date().getFullYear() ? `, ${new Date(t.end_date).getFullYear()}` : ""}
                  </span>
                </div>
                <h3 className="tournament-name">{t.name}</h3>
                <div className="tournament-venue">📍 {t.venue_name}, {t.venue_city}, {t.venue_state}</div>
                {t.description && (
                  <p style={{ fontSize: 13, color: "var(--gray-600)", lineHeight: 1.5 }}>{t.description}</p>
                )}
                <div className="tournament-card-footer" style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary btn-sm" onClick={() => navigate("/signup")}>
                    Join as host or player →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="roles-section">
        <h2 className="section-title">Who's it for?</h2>
        <div className="roles-grid">
          <div className="role-card role-player">
            <div className="role-icon">🎾</div>
            <h3>Players</h3>
            <p>Find free accommodation near the venue. Register interest, get matched, stay with a local host.</p>
          </div>
          <div className="role-card role-host">
            <div className="role-icon">🏠</div>
            <h3>Hosts</h3>
            <p>Open your home to visiting players. Offer a bed, meals, or a ride to the club.</p>
          </div>
          <div className="role-card role-organizer">
            <div className="role-icon">📋</div>
            <h3>Organizers</h3>
            <p>Post tournaments, recruit hosts, and assign players — all from one dashboard.</p>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2 className="section-title">How it works</h2>
        <div className="steps">
          {[
            { n: "01", title: "Organizer posts a tournament", desc: "They set dates, venue, and invite hosts via email broadcast." },
            { n: "02", title: "Hosts sign up", desc: "Local squash fans list their capacity, availability, and what they can offer." },
            { n: "03", title: "Players register interest", desc: "Players join the waitlist and fill in their travel dates." },
            { n: "04", title: "Organizer assigns", desc: "The organizer reviews profiles and makes the match." },
            { n: "05", title: "Both parties confirm", desc: "Host and player confirm they've made contact. Then chat freely in-app." },
          ].map(step => (
            <div className="step" key={step.n}>
              <div className="step-num">{step.n}</div>
              <div className="step-content">
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <span className="landing-logo">🏸 SquashStay</span>
        <span className="footer-copy">© 2025 · Built for the squash community</span>
      </footer>
    </div>
  );
}

import { navigate } from "../App";

export function LandingPage() {
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
          <div className="hero-badge">PSA Challenger Circuit</div>
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
            <div className="court-lines" />
            <div className="court-ball" />
          </div>
        </div>
      </section>

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

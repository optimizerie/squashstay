import { useState } from "react";
import { supabase } from "../lib/supabase";
import { navigate } from "../App";

interface AuthPageProps {
  mode: "login" | "signup";
}

export function AuthPage({ mode }: AuthPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) setError(err.message);
      else {
        setSuccess("Account created! Check your email to confirm, then sign in.");
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
      else navigate("/dashboard");
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <button className="auth-back" onClick={() => navigate("/")}>← Back</button>
        <div className="auth-logo">🏸</div>
        <h1 className="auth-title">
          {mode === "login" ? "Welcome back" : "Join SquashStay"}
        </h1>
        <p className="auth-sub">
          {mode === "login"
            ? "Sign in to your account"
            : "Create your free account"}
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="auth-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <button
            className="btn-primary btn-full"
            onClick={handleSubmit}
            disabled={loading || !email || !password}
          >
            {loading ? "Loading…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>

        <p className="auth-switch">
          {mode === "login" ? (
            <>Don't have an account? <button className="link-btn" onClick={() => navigate("/signup")}>Sign up</button></>
          ) : (
            <>Already have an account? <button className="link-btn" onClick={() => navigate("/login")}>Sign in</button></>
          )}
        </p>
      </div>
    </div>
  );
}

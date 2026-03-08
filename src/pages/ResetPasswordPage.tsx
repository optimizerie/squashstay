import { useState } from "react";
import { supabase } from "../lib/supabase";
import { navigate } from "../App";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleReset = async () => {
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) setError(err.message);
    else {
      setSuccess("Password updated! Redirecting to dashboard…");
      setTimeout(() => navigate("/dashboard"), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🏸</div>
        <h1 className="auth-title">Set new password</h1>
        <p className="auth-sub">Choose a strong password for your account.</p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="auth-form">
          <div className="form-group">
            <label className="form-label">New password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleReset()}
            />
          </div>
          <button
            className="btn-primary btn-full"
            onClick={handleReset}
            disabled={loading || !password || !confirm}
          >
            {loading ? "Saving…" : "Update Password"}
          </button>
          <button
            className="btn-ghost btn-full"
            onClick={() => supabase.auth.signOut().then(() => navigate("/"))}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

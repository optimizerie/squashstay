import { useState, useEffect } from "react";
import { useAuth, navigate } from "../../App";
import { supabase, getNotifications } from "../../lib/supabase";
import type { Notification } from "../../types";

export function Navbar() {
  const { profile, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  const unread = notifications.filter(n => !n.read_at).length;

  useEffect(() => {
    if (!user) return;
    getNotifications(user.id).then(({ data }) => {
      if (data) setNotifications(data as Notification[]);
    });

    const channel = supabase
      .channel(`notifs-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const roleLabel = profile?.role === "player" ? "🎾" : profile?.role === "host" ? "🏠" : "📋";

  return (
    <nav className="navbar">
      <button className="navbar-logo" onClick={() => navigate("/dashboard")}>
        🏸 <span>SquashStay</span>
      </button>

      <div className="navbar-actions">
        {/* Notifications */}
        <div className="notif-wrapper">
          <button className="navbar-icon-btn" onClick={() => setShowNotifs(!showNotifs)}>
            🔔
            {unread > 0 && <span className="notif-badge">{unread}</span>}
          </button>
          {showNotifs && (
            <div className="notif-dropdown">
              <div className="notif-header">Notifications</div>
              {notifications.length === 0 ? (
                <div className="notif-empty">No notifications yet</div>
              ) : (
                notifications.slice(0, 8).map(n => (
                  <div
                    key={n.id}
                    className={`notif-item ${!n.read_at ? "unread" : ""}`}
                    onClick={() => {
                      if (n.link) navigate(n.link);
                      setShowNotifs(false);
                    }}
                  >
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-body">{n.body}</div>
                    <div className="notif-time">{new Date(n.created_at).toLocaleDateString()}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <button className="navbar-profile-btn" onClick={() => navigate("/profile")}>
          <span className="navbar-role-icon">{roleLabel}</span>
          <span className="navbar-name">{profile?.full_name?.split(" ")[0]}</span>
        </button>

        <button className="btn-ghost btn-sm" onClick={handleSignOut}>Sign out</button>
      </div>
    </nav>
  );
}

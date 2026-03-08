import { useState, useEffect, createContext, useContext } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import type { Profile } from "./types";

// ── Pages ──────────────────────────────────────────────────
import { LandingPage } from "./pages/LandingPage";
import { AuthPage } from "./pages/AuthPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { PlayerDashboard } from "./pages/PlayerDashboard";
import { HostDashboard } from "./pages/HostDashboard";
import { OrganizerDashboard } from "./pages/OrganizerDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { TournamentDetailPage } from "./pages/TournamentDetailPage";
import { AssignmentDetailPage } from "./pages/AssignmentDetailPage";
import { ProfilePage } from "./pages/ProfilePage";

// ── Auth Context ───────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: (userId?: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// ── Router (simple hash-based) ─────────────────────────────

type Route =
  | { page: "landing" }
  | { page: "auth"; mode: "login" | "signup" }
  | { page: "onboarding" }
  | { page: "dashboard" }
  | { page: "admin" }
  | { page: "reset-password" }
  | { page: "tournament"; id: string }
  | { page: "assignment"; id: string }
  | { page: "profile" };

function parseRoute(): Route {
  const hash = window.location.hash.replace("#", "") || "/";
  if (hash === "/" || hash === "") return { page: "landing" };
  if (hash === "/login") return { page: "auth", mode: "login" };
  if (hash === "/signup") return { page: "auth", mode: "signup" };
  if (hash === "/onboarding") return { page: "onboarding" };
  if (hash === "/dashboard") return { page: "dashboard" };
  if (hash === "/admin") return { page: "admin" };
  if (hash === "/reset-password") return { page: "reset-password" };
  if (hash === "/profile") return { page: "profile" };
  const tmatch = hash.match(/^\/tournament\/(.+)/);
  if (tmatch) return { page: "tournament", id: tmatch[1] };
  const amatch = hash.match(/^\/assignment\/(.+)/);
  if (amatch) return { page: "assignment", id: amatch[1] };
  return { page: "landing" };
}

export function navigate(path: string) {
  window.location.hash = path;
}

// ── App ────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [organizerApproved, setOrganizerApproved] = useState<boolean | null>(null);
  const [route, setRoute] = useState<Route>(parseRoute());

  const refreshProfile = async (userId?: string) => {
    const id = userId ?? user?.id;
    if (!id) return;
    setProfileLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();
    setProfile(data);
    setProfileLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) refreshProfile(user.id);
    else { setProfile(null); setOrganizerApproved(null); setProfileLoading(false); }
  }, [user]);

  useEffect(() => {
    if (profile?.role === "organizer") {
      supabase.from("organizer_profiles").select("approved").eq("id", profile.id).single()
        .then(({ data }) => setOrganizerApproved(data?.approved ?? false));
    } else {
      setOrganizerApproved(null);
    }
  }, [profile]);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Redirect logic
  useEffect(() => {
    if (loading) return;
    if (!user && route.page !== "landing" && route.page !== "auth") {
      navigate("/");
    }
    if (user && !profile && route.page !== "onboarding") {
      // will be handled after profile fetch
    }
  }, [user, profile, route, loading]);

  const renderPage = () => {
    if (loading || profileLoading) return <LoadingScreen />;

    if (route.page === "reset-password") return <ResetPasswordPage />;

    if (!user) {
      if (route.page === "auth") return <AuthPage mode={route.mode} />;
      return <LandingPage />;
    }

    if (!profile) return <OnboardingPage />;

    if (!profile.role || route.page === "onboarding") {
      return <OnboardingPage />;
    }

    if (route.page === "admin") {
      if (profile.is_admin) return <AdminDashboard />;
      return <LandingPage />;
    }

    switch (route.page) {
      case "dashboard":
        if (profile.role === "player") return <PlayerDashboard />;
        if (profile.role === "host") return <HostDashboard />;
        if (profile.role === "organizer") {
          if (organizerApproved === null) return <LoadingScreen />;
          if (!organizerApproved) return <PendingApprovalScreen />;
          return <OrganizerDashboard />;
        }
        break;
      case "tournament":
        return <TournamentDetailPage id={route.id} />;
      case "assignment":
        return <AssignmentDetailPage id={route.id} />;
      case "profile":
        return <ProfilePage />;
      default:
        return profile.role ? <DashboardRedirect /> : <LandingPage />;
    }
    return <LandingPage />;
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, refreshProfile }}>
      <div className="app-root">
        {renderPage()}
      </div>
    </AuthContext.Provider>
  );
}

function DashboardRedirect() {
  useEffect(() => { navigate("/dashboard"); }, []);
  return <LoadingScreen />;
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-logo">🏸</div>
      <div className="loading-spinner" />
    </div>
  );
}

function PendingApprovalScreen() {
  const { refreshProfile, user } = useAuth();
  return (
    <div className="loading-screen">
      <div className="loading-logo">🏸</div>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <h2 style={{ marginBottom: 12 }}>Pending Approval</h2>
        <p style={{ color: "#666", lineHeight: 1.6 }}>
          Your organizer account is awaiting approval from the SquashStay admin.
          You'll be able to create and manage tournaments once approved.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
          <button
            className="btn-ghost btn-sm"
            onClick={() => { if (user) refreshProfile(user.id); }}
          >
            Check again
          </button>
          <button
            className="btn-ghost btn-sm"
            onClick={() => supabase.auth.signOut().then(() => navigate("/"))}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

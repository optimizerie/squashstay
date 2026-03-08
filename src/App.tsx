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
import { TournamentDetailPage } from "./pages/TournamentDetailPage";
import { AssignmentDetailPage } from "./pages/AssignmentDetailPage";
import { ProfilePage } from "./pages/ProfilePage";

// ── Auth Context ───────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
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
  const [profileLoading, setProfileLoading] = useState(false);
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
    else setProfile(null);
  }, [user]);

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

    if (!user) {
      if (route.page === "auth") return <AuthPage mode={route.mode} />;
      return <LandingPage />;
    }

    if (!profile) return <OnboardingPage />;

    if (!profile.role || route.page === "onboarding") {
      return <OnboardingPage />;
    }

    switch (route.page) {
      case "dashboard":
        if (profile.role === "player") return <PlayerDashboard />;
        if (profile.role === "host") return <HostDashboard />;
        if (profile.role === "organizer") return <OrganizerDashboard />;
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

import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

// Global dev user interface
declare global {
  interface Window {
    __devUser__?: {
      id: string;
      email: string;
      role: string;
      name?: string;
    };
  }
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireOnboarding?: boolean;
  redirectIfComplete?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  requireOnboarding = false,
  redirectIfComplete = false 
}: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [devUser, setDevUser] = useState<any>(null);
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        // Check for dev user first
        const storedDevUser = localStorage.getItem("devUser");
        if (storedDevUser) {
          const parsedDevUser = JSON.parse(storedDevUser);
          window.__devUser__ = parsedDevUser;
          if (mounted) {
            setDevUser(parsedDevUser);
            setHasProfile(true);
            setProfileRole(parsedDevUser.role);
            setLoading(false);
          }
          return;
        }

        if (window.__devUser__) {
          if (mounted) {
            setDevUser(window.__devUser__);
            setHasProfile(true);
            setProfileRole(window.__devUser__.role);
            setLoading(false);
          }
          return;
        }

        // Normal Supabase auth check
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          
          // Check if user has completed onboarding and get role
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, role")
            .eq("user_id", session.user.id)
            .single();
            
          setHasProfile(!!profile);
          setProfileRole(profile?.role || null);
        } else {
          setUser(null);
          setHasProfile(false);
          setProfileRole(null);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        if (mounted) {
          setUser(null);
          setHasProfile(false);
          setProfileRole(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        // Skip if dev user is active
        if (window.__devUser__ || devUser) return;
        
        if (session?.user) {
          setUser(session.user);
          
          // Check profile on auth change
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, role")
              .eq("user_id", session.user.id)
              .single();
              
            setHasProfile(!!profile);
            setProfileRole(profile?.role || null);
          } catch (error) {
            setHasProfile(false);
            setProfileRole(null);
          }
        } else {
          setUser(null);
          setHasProfile(false);
          setProfileRole(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [devUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Use dev user or real user
  const currentUser = devUser || user;
  const currentRole = devUser?.role || profileRole;

  // If auth is required but user is not logged in
  if (requireAuth && !currentUser) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If user is logged in but trying to access auth page
  if (!requireAuth && currentUser && location.pathname === "/auth") {
    // Redirect admins to moderation, others to dashboard
    if (currentRole === "admin") {
      return <Navigate to="/admin/moderation" replace />;
    }
    return <Navigate to={hasProfile ? "/dashboard" : "/onboarding"} replace />;
  }

  // If onboarding is required but user hasn't completed it (skip for dev users)
  if (requireOnboarding && currentUser && !devUser && !hasProfile) {
    return <Navigate to="/onboarding" replace />;
  }

  // If trying to access onboarding but already completed (skip for dev users)
  if (redirectIfComplete && currentUser && !devUser && hasProfile) {
    return <Navigate to="/dashboard" replace />;
  }

  // Admin role check for admin routes
  if (location.pathname.startsWith("/admin") && currentRole !== "admin") {
    toast({
      title: "Access denied",
      description: "You need admin privileges to access this page.",
      variant: "destructive",
    });
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
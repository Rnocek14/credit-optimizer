import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

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
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          
          // Check if user has completed onboarding
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", session.user.id)
            .single();
            
          setHasProfile(!!profile);
        } else {
          setUser(null);
          setHasProfile(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        if (mounted) {
          setUser(null);
          setHasProfile(false);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          
          // Check profile on auth change
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("user_id", session.user.id)
              .single();
              
            setHasProfile(!!profile);
          } catch (error) {
            setHasProfile(false);
          }
        } else {
          setUser(null);
          setHasProfile(false);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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

  // If auth is required but user is not logged in
  if (requireAuth && !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If user is logged in but trying to access auth page
  if (!requireAuth && user && location.pathname === "/auth") {
    return <Navigate to={hasProfile ? "/dashboard" : "/onboarding"} replace />;
  }

  // If onboarding is required but user hasn't completed it
  if (requireOnboarding && user && !hasProfile) {
    return <Navigate to="/onboarding" replace />;
  }

  // If trying to access onboarding but already completed
  if (redirectIfComplete && user && hasProfile) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
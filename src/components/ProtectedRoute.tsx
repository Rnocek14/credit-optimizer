
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import SecurityMonitor from "@/components/SecurityMonitor";
import { supabase } from "@/integrations/supabase/client";

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
  const [hasProfile, setHasProfile] = useState(false);
  const location = useLocation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Check onboarding status when user changes
    const checkOnboarding = async () => {
      if (user && !user.isDevUser) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
          
          setHasProfile(!!profile);
        } catch (error) {
          console.error("Profile check error:", error);
          setHasProfile(false);
        }
      } else if (user?.isDevUser) {
        // Dev users always considered to have profile
        setHasProfile(true);
      }
    };

    if (user) {
      checkOnboarding();
    } else {
      setHasProfile(false);
    }
  }, [user]);

  if (isLoading) {
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
    // Redirect to dashboard
    return <Navigate to={hasProfile ? "/today" : "/onboarding"} replace />;
  }

  // If onboarding is required but user hasn't completed it (skip for dev users)
  if (requireOnboarding && user && !user.isDevUser && !hasProfile) {
    return <Navigate to="/onboarding" replace />;
  }

  // If trying to access onboarding but already completed (skip for dev users)
  if (redirectIfComplete && user && !user.isDevUser && hasProfile) {
    return <Navigate to="/dashboard" replace />;
  }

  // Secure admin role check for admin routes
  if (location.pathname.startsWith("/admin") && user?.role !== "admin") {
    console.warn("SECURITY: Unauthorized admin access attempt", {
      userId: user?.id,
      userRole: user?.role,
      path: location.pathname,
      timestamp: new Date().toISOString()
    });
    
    toast({
      title: "Access denied",
      description: "You need admin privileges to access this page.",
      variant: "destructive",
    });
    return <Navigate to="/today" replace />;
  }

  // Secure mentor role check for teach route
  if (location.pathname === "/teach" && user?.role !== "mentor" && user?.role !== "admin") {
    console.warn("SECURITY: Unauthorized mentor access attempt", {
      userId: user?.id,
      userRole: user?.role,
      path: location.pathname,
      timestamp: new Date().toISOString()
    });
    
    toast({
      title: "Access denied", 
      description: "You need mentor privileges to access this page.",
      variant: "destructive",
    });
    return <Navigate to="/today" replace />;
  }

  return (
    <>
      <SecurityMonitor />
      {children}
    </>
  );
}

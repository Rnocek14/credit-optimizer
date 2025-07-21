
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser, getUserProfile, type AuthUser } from "@/lib/authHelper";

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (!mounted) return;
        
        if (currentUser) {
          setUser(currentUser);
          
          // Check if user has completed onboarding and get role
          const profile = await getUserProfile(currentUser.id, currentUser.isDevUser);
          
          setHasProfile(!!profile);
          setUserRole(profile?.role || currentUser.role || null);
        } else {
          setUser(null);
          setHasProfile(false);
          setUserRole(null);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        if (mounted) {
          setUser(null);
          setHasProfile(false);
          setUserRole(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkAuth();

    return () => {
      mounted = false;
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
    // Redirect admins to moderation, others to dashboard
    if (userRole === "admin") {
      return <Navigate to="/admin/moderation" replace />;
    }
    return <Navigate to={hasProfile ? "/dashboard" : "/onboarding"} replace />;
  }

  // If onboarding is required but user hasn't completed it (skip for dev users)
  if (requireOnboarding && user && !user.isDevUser && !hasProfile) {
    return <Navigate to="/onboarding" replace />;
  }

  // If trying to access onboarding but already completed (skip for dev users)
  if (redirectIfComplete && user && !user.isDevUser && hasProfile) {
    return <Navigate to="/dashboard" replace />;
  }

  // Admin role check for admin routes
  if (location.pathname.startsWith("/admin") && userRole !== "admin") {
    toast({
      title: "Access denied",
      description: "You need admin privileges to access this page.",
      variant: "destructive",
    });
    return <Navigate to="/dashboard" replace />;
  }

  // Mentor role check for teach route
  if (location.pathname === "/teach" && userRole !== "mentor" && userRole !== "admin") {
    toast({
      title: "Access denied", 
      description: "You need mentor privileges to access this page.",
      variant: "destructive",
    });
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

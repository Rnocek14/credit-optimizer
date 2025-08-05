import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import { toast } from "sonner";

interface StakeholderProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "mentor" | "user";
  stakeholderType?: string;
}

export function StakeholderProtectedRoute({ 
  children, 
  requiredRole = "user",
  stakeholderType 
}: StakeholderProtectedRouteProps) {
  const { hasPermission, isLoading } = useSecureAuth();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !hasPermission(requiredRole)) {
      toast.error("This dashboard is restricted to approved roles.");
    }
  }, [isLoading, hasPermission, requiredRole]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // For admin routes, require admin permission
  if (requiredRole === "admin" && !hasPermission("admin")) {
    return <Navigate to="/explore-hub" replace />;
  }

  // For mentor/teach routes, require mentor permission
  if (stakeholderType === "teach" && !hasPermission("mentor")) {
    console.log('DEBUG: Teach route access denied. User role:', hasPermission("mentor") ? 'has mentor' : 'no mentor');
    return <Navigate to="/explore-hub" replace />;
  }

  // For institution/employer, allow all authenticated users (will be refined in Stage 2)
  if ((stakeholderType === "institution" || stakeholderType === "employer") && !hasPermission("user")) {
    return <Navigate to="/explore-hub" replace />;
  }

  return <>{children}</>;
}
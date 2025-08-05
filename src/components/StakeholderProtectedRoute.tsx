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

  // Determine the actual required role based on stakeholder type
  let actualRequiredRole = requiredRole;
  
  if (stakeholderType === "teach") {
    actualRequiredRole = "mentor";
  } else if (stakeholderType === "institution" || stakeholderType === "employer") {
    actualRequiredRole = "user"; // Will be refined in Stage 2
  }

  useEffect(() => {
    if (!isLoading && !hasPermission(actualRequiredRole)) {
      console.log('DEBUG: Access denied to route:', {
        requiredRole,
        actualRequiredRole,
        stakeholderType,
        location: location.pathname
      });
      toast.error("This dashboard is restricted to approved roles.");
    }
  }, [isLoading, hasPermission, actualRequiredRole]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasRequiredPermission = hasPermission(actualRequiredRole);
  
  console.log('DEBUG: Route protection check:', {
    stakeholderType,
    requiredRole,
    actualRequiredRole,
    hasRequiredPermission,
    pathname: location.pathname,
    timestamp: new Date().toISOString()
  });

  // Single permission check based on actual required role
  if (!hasRequiredPermission) {
    console.log('DEBUG: Access denied - insufficient permissions for route:', location.pathname);
    return <Navigate to="/explore-hub" replace />;
  }

  return <>{children}</>;
}
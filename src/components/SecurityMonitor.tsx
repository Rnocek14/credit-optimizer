import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/authHelper";
import { isProduction, isDevelopment } from "@/lib/security";

/**
 * Security monitoring component that watches for suspicious activities
 */
export default function SecurityMonitor() {
  const { toast } = useToast();

  useEffect(() => {
    const checkSecurityStatus = async () => {
      try {
        const user = await getCurrentUser();
        
        // Monitor for dev mode in production
        if (isProduction() && user?.isDevUser) {
          console.warn("SECURITY: Dev user detected in production");
          toast({
            title: "Security Warning",
            description: "Development authentication detected in production environment",
            variant: "destructive",
          });
        }

        // Monitor for role changes
        if (user && user.role === "admin") {
          console.log("SECURITY: Admin user session active", {
            userId: user.id,
            timestamp: new Date().toISOString(),
            isDevUser: user.isDevUser
          });
        }

        // Monitor localStorage for suspicious changes
        const storedDevUser = localStorage.getItem("devUser");
        if (isProduction() && storedDevUser) {
          console.warn("SECURITY: Dev user data found in production localStorage");
          localStorage.removeItem("devUser");
        }

      } catch (error) {
        console.error("Security monitor error:", error);
      }
    };

    checkSecurityStatus();

    // Set up periodic security checks
    const interval = setInterval(checkSecurityStatus, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [toast]);

  // This component doesn't render anything visible
  return null;
}
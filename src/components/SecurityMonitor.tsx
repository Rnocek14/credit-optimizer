import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/authHelper";
import { 
  isProduction, 
  isDevelopment, 
  isDevSessionExpired, 
  clearDevMode,
  checkRateLimit,
  generateRateLimitKey
} from "@/lib/security";

/**
 * Enhanced security monitoring component that watches for suspicious activities
 */
export default function SecurityMonitor() {
  const { toast } = useToast();

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/auth') || path.startsWith('/dev-login')) {
      return;
    }
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
          clearDevMode();
        }

        // Check dev session timeout
        if (isDevelopment() && user?.isDevUser && isDevSessionExpired()) {
          console.warn("SECURITY: Dev session expired");
          toast({
            title: "Session Expired",
            description: "Development session has expired for security",
            variant: "destructive",
          });
          clearDevMode();
          window.location.reload();
        }

        // Monitor for role changes and admin access
        if (user && user.role === "admin") {
          const rateLimitKey = generateRateLimitKey(user.id, "admin_access");
          console.log("SECURITY: Admin user session active", {
            userId: user.id,
            timestamp: new Date().toISOString(),
            isDevUser: user.isDevUser,
            sessionId: crypto.randomUUID()
          });
          
          // Rate limit admin access logging
          if (!checkRateLimit(rateLimitKey, 10, 5 * 60 * 1000)) {
            console.warn("SECURITY: High frequency admin access detected");
          }
        }

        // Monitor localStorage for suspicious changes
        const storedDevUser = localStorage.getItem("devUser");
        if (isProduction() && storedDevUser) {
          console.warn("SECURITY: Dev user data found in production localStorage");
          clearDevMode();
        }

        // Check for suspicious localStorage patterns
        const localStorageKeys = Object.keys(localStorage);
        const suspiciousKeys = localStorageKeys.filter(key => 
          key.includes('admin') || key.includes('token') || key.includes('secret')
        );
        
        if (suspiciousKeys.length > 0) {
          console.warn("SECURITY: Suspicious localStorage keys detected:", suspiciousKeys);
        }

      } catch (error) {
        console.error("Security monitor error:", error);
      }
    };

    checkSecurityStatus();

    // Set up periodic security checks
    const interval = setInterval(checkSecurityStatus, 60000); // Check every minute

    // Check for page visibility changes (potential session hijacking)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkSecurityStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [toast]);

  // This component doesn't render anything visible
  return null;
}
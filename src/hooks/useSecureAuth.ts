import { useState, useEffect } from "react";
import { getCurrentUser, hasRole, type AuthUser, type AppRole } from "@/lib/authHelper";
import { supabase } from "@/integrations/supabase/client";
import { isProduction } from "@/lib/security";

interface SecureAuthState {
  user: AuthUser | null;
  role: AppRole | null;
  isLoading: boolean;
  hasPermission: (requiredRole: AppRole) => boolean;
  refreshRole: () => Promise<void>;
}

/**
 * Secure authentication hook that validates roles against database
 */
export function useSecureAuth(): SecureAuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshRole = async () => {
    if (!user) return;
    
    try {
      // Always validate role against database for security
      const { data: secureRole } = await supabase.rpc('get_user_role', { 
        user_uuid: user.id 
      });
      
      setRole(secureRole || 'user');
      
      // Security logging for admin access
      if (secureRole === 'admin') {
        console.log('SECURITY: Admin role validated', {
          userId: user.id,
          timestamp: new Date().toISOString(),
          isProduction: isProduction()
        });
      }
    } catch (error) {
      console.error('Failed to validate role:', error);
      setRole('user'); // Fail safely
    }
  };

  const hasPermission = (requiredRole: AppRole): boolean => {
    if (!user || !role) return false;
    
    // Admin has all permissions
    if (role === 'admin') return true;
    
    // Exact role match required for non-admin roles
    return role === requiredRole;
  };

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (!mounted) return;
        
        setUser(currentUser);
        
        if (currentUser) {
          // Validate role against database
          await refreshRole();
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (mounted) {
          setUser(null);
          setRole(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Re-validate role when user changes
  useEffect(() => {
    if (user) {
      refreshRole();
    }
  }, [user?.id]);

  return {
    user,
    role,
    isLoading,
    hasPermission,
    refreshRole
  };
}
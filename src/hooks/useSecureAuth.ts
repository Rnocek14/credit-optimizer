import { useState, useEffect } from "react";
import { getCurrentUser, hasRole, type AuthUser, type AppRole } from "@/lib/authHelper";
import { supabase } from "@/integrations/supabase/client";
import { isProduction } from "@/lib/security";
import { setupAishaForValidation, getCurrentDevUser } from "@/lib/devUserSetup";

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
    console.log('DEBUG: hasPermission check:', { 
      userId: user?.id,
      userName: user?.name,
      userRole: role,
      requiredRole,
      isDevUser: user?.isDevUser,
      hasUser: !!user,
      hasRole: !!role
    });
    
    if (!user || !role) {
      console.log('DEBUG: Permission denied - missing user or role');
      return false;
    }
    
    // Admin has all permissions
    if (role === 'admin') {
      console.log('DEBUG: Permission granted - admin role');
      return true;
    }
    
    // Exact role match required for non-admin roles
    const hasPermission = role === requiredRole;
    console.log('DEBUG: Permission result:', hasPermission);
    return hasPermission;
  };

  useEffect(() => {
    let mounted = true;

  const checkAuth = async () => {
      try {
        // Auto-setup dev user if none exists in development
        if (!isProduction() && !getCurrentDevUser()) {
          console.log('DEBUG: No dev user found, setting up Aisha for validation');
          setupAishaForValidation();
        }

        const currentUser = await getCurrentUser();
        console.log('DEBUG: Auth check result:', {
          user: currentUser,
          isDevUser: currentUser?.isDevUser,
          role: currentUser?.role
        });
        
        if (!mounted) return;
        
        setUser(currentUser);
        
        if (currentUser) {
          console.log('DEBUG: Current user in useSecureAuth:', currentUser);
          // Use role from getCurrentUser (already validated) to avoid double fetching
          setRole(currentUser.role || 'user');
        } else {
          console.log('DEBUG: No user found, setting to null');
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
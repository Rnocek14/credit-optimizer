import { useState, useEffect, useRef, useCallback } from "react";
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
  
  // Refs to prevent race conditions
  const isCheckingAuth = useRef(false);
  const authCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidState = useRef<{ user: AuthUser | null; role: AppRole | null }>({ user: null, role: null });

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

  // Debounced auth check to prevent race conditions
  const debouncedCheckAuth = useCallback(async (immediate = false) => {
    // Clear any pending timeout
    if (authCheckTimeoutRef.current) {
      clearTimeout(authCheckTimeoutRef.current);
      authCheckTimeoutRef.current = null;
    }

    // If not immediate, debounce the call
    if (!immediate) {
      authCheckTimeoutRef.current = setTimeout(() => {
        debouncedCheckAuth(true);
      }, 100);
      return;
    }

    // Prevent concurrent auth checks
    if (isCheckingAuth.current) {
      console.log('DEBUG: Auth check already in progress, skipping');
      return;
    }

    isCheckingAuth.current = true;

    try {
      console.log('DEBUG: Starting auth check...');
      
      // Auto-setup dev user if none exists in development
      if (!isProduction()) {
        const currentDevUser = getCurrentDevUser();
        if (!currentDevUser) {
          console.log('DEBUG: No valid dev user found, setting up Aisha for validation');
          setupAishaForValidation();
        }
      }

      const currentUser = await getCurrentUser();
      console.log('DEBUG: Auth check result:', {
        user: currentUser ? {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
          isDevUser: currentUser.isDevUser
        } : null
      });
      
      if (currentUser) {
        // For dev users, use the role from the dev user data directly
        // For real users, the role comes from database via getCurrentUser
        const userRole = currentUser.role || 'user';
        console.log('DEBUG: Setting role to:', userRole, 'for user:', currentUser.name);
        
        // Update state consistently
        lastValidState.current = { user: currentUser, role: userRole };
        setUser(currentUser);
        setRole(userRole);
      } else {
        // Only clear state if we don't have a valid user
        console.log('DEBUG: No user found, clearing state');
        lastValidState.current = { user: null, role: null };
        setUser(null);
        setRole(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Don't clear valid state on errors, just log them
      if (!lastValidState.current.user) {
        setUser(null);
        setRole(null);
      }
    } finally {
      isCheckingAuth.current = false;
      setIsLoading(false);
      console.log('DEBUG: Auth check completed, loading finished');
    }
  }, []);

  useEffect(() => {
    // Initial auth check
    debouncedCheckAuth(true);

    // Listen for auth state changes (mainly for real auth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('DEBUG: Auth state change:', event, session?.user?.id);
      // Only trigger auth check for meaningful events
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        debouncedCheckAuth();
      }
    });

    return () => {
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [debouncedCheckAuth]);

  // Don't re-validate role for dev users as it's already set correctly
  useEffect(() => {
    if (user && !user.isDevUser) {
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
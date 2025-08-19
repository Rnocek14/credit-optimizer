import { supabase } from "@/integrations/supabase/client";
import { isProduction, secureStorage, isDevAuthEnabled } from "./security";
import type { User } from "@supabase/supabase-js";

// App role type to match database enum
export type AppRole = 'user' | 'admin' | 'mentor';

// Type guard to validate AppRole
export const isValidAppRole = (role: string): role is AppRole => {
  return ['user', 'admin', 'mentor'].includes(role);
};

// Convert string role to AppRole with fallback
export const toAppRole = (role: string | null | undefined): AppRole => {
  if (role && isValidAppRole(role)) {
    return role;
  }
  return 'user'; // Default fallback
};

export interface AuthUser {
  id: string;
  email: string;
  role?: AppRole;
  name?: string;
  isDevUser: boolean;
}

export interface AuthProfile {
  id: string;
  user_id: string;
  name: string;
  role: AppRole;
  [key: string]: any;
}

// Get user role securely from database
export const getSecureUserRole = async (userId: string): Promise<AppRole | null> => {
  try {
    const { data, error } = await supabase.rpc('get_user_role', { user_uuid: userId });
    if (error) {
      console.error('Error getting user role:', error);
      return null;
    }
    return data as AppRole;
  } catch (error) {
    console.error('Error in getSecureUserRole:', error);
    return null;
  }
};

// Check if user has specific role
export const hasRole = async (userId: string, role: AppRole): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('has_role', { 
      user_uuid: userId, 
      check_role: role 
    });
    if (error) {
      console.error('Error checking user role:', error);
      return false;
    }
    return data || false;
  } catch (error) {
    console.error('Error in hasRole:', error);
    return false;
  }
};

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  // Try real Supabase auth FIRST
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const role = await getSecureUserRole(user.id);
      const profile = await getUserProfile(user.id);
      return {
        id: user.id,
        email: user.email || "",
        role: role || 'user',
        name: profile?.name || user.user_metadata?.name || '',
        isDevUser: false,
      };
    }
  } catch (error) {
    console.error("Error getting user:", error);
  }

  // If explicitly enabled, allow dev user in development
  if (isDevAuthEnabled() && !isProduction()) {
    const { getCurrentDevUser } = await import("./devUserSetup");
    const devUser = getCurrentDevUser();
    if (devUser) {
      console.log('DEBUG: Valid dev user session found:', {
        name: devUser.name,
        role: devUser.role,
        id: devUser.id,
        sessionValid: devUser.sessionExpires ? Date.now() < devUser.sessionExpires : true
      });
      return {
        id: devUser.id,
        email: devUser.email,
        role: toAppRole(devUser.role),
        name: devUser.name,
        isDevUser: true,
      };
    }
  }

  return null;
};

// Ensure user session is valid for database operations
export async function ensureValidSession(userId?: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.id === userId) {
      return true;
    }

    // Check if it's a dev user
    if (isDevAuthEnabled() && !isProduction()) {
      const { getCurrentDevUser } = await import("./devUserSetup");
      const devUser = getCurrentDevUser();
      return devUser?.id === userId;
    }

    return false;
  } catch (error) {
    console.error('Error validating session:', error);
    return false;
  }
}

export const getUserProfile = async (userId: string, isDevUser: boolean = false): Promise<AuthProfile | null> => {
  console.log("getUserProfile called with:", { userId, isDevUser });
  
  if (isDevUser) {
    // For dev users, always return a mock profile immediately
    const devUser = window.__devUser__ || secureStorage.getItem("devUser") || {};
    console.log("Dev user data:", devUser);
    
    if (devUser && devUser.id) {
      const mockProfile: AuthProfile = {
        id: userId,
        user_id: userId,
        name: devUser.name || "Dev User",
        role: toAppRole(devUser.role),
      };
      console.log("Returning mock profile:", mockProfile);
      return mockProfile;
    }
    
    // Fallback if no dev user data
    console.log("No dev user data found, returning fallback mock profile");
    return {
      id: userId,
      user_id: userId,
      name: "Demo User",
      role: "user" as AppRole,
    };
  } else {
    // For real users, get profile from database
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        // Convert the database profile to AuthProfile with proper role typing
        return {
          ...profile,
          role: toAppRole(profile.role)
        } as AuthProfile;
      }
      return null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  }

  return null;
};

export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return user !== null;
};

export const getAuthenticatedUserId = async (): Promise<string | null> => {
  const user = await getCurrentUser();
  return user?.id || null;
};

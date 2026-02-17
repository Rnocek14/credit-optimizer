/**
 * Unified Authentication System
 * Handles real and dev authentication with production safety
 */

import { supabase } from "@/integrations/supabase/client";
import { secureStorage } from "./security";
import type { User } from "@supabase/supabase-js";

// App role type to match database enum
export type AppRole = 'user' | 'admin' | 'mentor';

// Unified AppUser interface
export interface AppUser {
  id: string;
  email: string;
  name?: string;
  role?: AppRole;
  isDevUser: boolean;
}

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

// Environment checks
export const isDevAuthEnabled = (): boolean => !isProduction() && (import.meta.env.VITE_DEV_AUTH === '1' || import.meta.env.NEXT_PUBLIC_DEV_AUTH === '1');
export const isProduction = (): boolean => import.meta.env.PROD;

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

// Get user profile from database
export const getUserProfile = async (userId: string, isDevUser: boolean = false): Promise<any | null> => {
  if (isDevUser) {
    // For dev users, return mock profile
    const devUser = window.__devUser__ || secureStorage.getItem("devUser") || {};
    
    if (devUser && devUser.id) {
      return {
        id: userId,
        user_id: userId,
        name: devUser.name || "Dev User",
        role: toAppRole(devUser.role),
      };
    }
    
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
        return {
          ...profile,
          role: toAppRole(profile.role)
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }
};

// Main authentication function
export const getCurrentUser = async (): Promise<AppUser | null> => {
  // BLOCK dev auth in production
  if (isProduction() && isDevAuthEnabled()) {
    console.warn('Dev auth attempted in production - blocking');
    return null;
  }

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

  // If explicitly enabled and not production, allow dev user
  if (isDevAuthEnabled() && !isProduction()) {
    const { getCurrentDevUser } = await import("./devUserSetup");
    const devUser = getCurrentDevUser();
    if (devUser) {
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

  // BLOCK dev flows in production
  if (isProduction()) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.id === userId;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.id === userId) {
      return true;
    }

    // Check if it's a dev user (only in non-production)
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

export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return user !== null;
};

export const getAuthenticatedUserId = async (): Promise<string | null> => {
  const user = await getCurrentUser();
  return user?.id || null;
};
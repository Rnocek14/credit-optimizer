
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

// Global dev user interface
declare global {
  interface Window {
    __devUser__?: {
      id: string;
      email: string;
      role: string;
      name?: string;
    };
  }
}

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  name?: string;
  isDevUser: boolean;
}

export interface AuthProfile {
  id: string;
  user_id: string;
  name: string;
  role: string;
  [key: string]: any;
}

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  // Temporarily allow dev mode for CRI testing
  {
    // Check for dev user first
    const storedDevUser = localStorage.getItem("devUser");
    if (storedDevUser) {
      const parsedDevUser = JSON.parse(storedDevUser);
      window.__devUser__ = parsedDevUser;
      return {
        id: parsedDevUser.id,
        email: parsedDevUser.email,
        role: parsedDevUser.role,
        name: parsedDevUser.name,
        isDevUser: true,
      };
    }

    if (window.__devUser__) {
      return {
        id: window.__devUser__.id,
        email: window.__devUser__.email,
        role: window.__devUser__.role,
        name: window.__devUser__.name,
        isDevUser: true,
      };
    }
  }

  // Fall back to real Supabase auth
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return {
        id: user.id,
        email: user.email || "",
        isDevUser: false,
      };
    }
  } catch (error) {
    console.error("Error getting user:", error);
  }

  return null;
};

export const getUserProfile = async (userId: string, isDevUser: boolean = false): Promise<AuthProfile | null> => {
  console.log("getUserProfile called with:", { userId, isDevUser });
  
  if (isDevUser) {
    // For dev users, always return a mock profile immediately
    const devUser = window.__devUser__ || JSON.parse(localStorage.getItem("devUser") || "{}");
    console.log("Dev user data:", devUser);
    
    if (devUser && devUser.id) {
      const mockProfile = {
        id: userId,
        user_id: userId,
        name: devUser.name || "Dev User",
        role: devUser.role || "user",
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
      role: "user",
    };
  } else {
    // For real users, get profile from database
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      return profile;
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


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

// Generate a proper UUID v4
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Predefined demo user UUIDs for consistency
const DEMO_USERS = {
  'aisha@demo.com': '2b458624-d498-4cca-a63d-9341cc20e363',
  'mateo@demo.com': '3c459625-e499-5ddb-b64d-a442dd21f474',
  'jade@demo.com': '4d56a736-f5aa-6eec-c75e-b553ee32e585'
};

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  // Check for dev user first
  const storedDevUser = localStorage.getItem("devUser");
  if (storedDevUser) {
    const parsedDevUser = JSON.parse(storedDevUser);
    
    // Ensure proper UUID format for dev user
    const userId = DEMO_USERS[parsedDevUser.email as keyof typeof DEMO_USERS] || generateUUID();
    
    window.__devUser__ = { ...parsedDevUser, id: userId };
    return {
      id: userId,
      email: parsedDevUser.email,
      role: parsedDevUser.role,
      name: parsedDevUser.name,
      isDevUser: true,
    };
  }

  if (window.__devUser__) {
    const userId = DEMO_USERS[window.__devUser__.email as keyof typeof DEMO_USERS] || window.__devUser__.id;
    return {
      id: userId,
      email: window.__devUser__.email,
      role: window.__devUser__.role,
      name: window.__devUser__.name,
      isDevUser: true,
    };
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
  if (isDevUser) {
    // For dev users, try to get profile or create a mock one
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        return profile;
      }

      // Create a mock profile for dev users if none exists
      const devUser = window.__devUser__;
      if (devUser) {
        return {
          id: userId,
          user_id: userId,
          name: devUser.name || "Dev User",
          role: devUser.role || "user",
        };
      }
    } catch (error) {
      console.warn("Could not fetch dev user profile:", error);
      // Return a mock profile for dev users
      const devUser = window.__devUser__;
      if (devUser) {
        return {
          id: userId,
          user_id: userId,
          name: devUser.name || "Dev User",
          role: devUser.role || "user",
        };
      }
    }
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

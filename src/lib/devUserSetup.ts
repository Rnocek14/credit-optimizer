/**
 * Development user setup utility
 * Establishes active dev sessions for testing
 */

import { secureStorage } from "@/lib/security";

export interface DevUser {
  id: string;
  email: string;
  name: string;
  role: string;
  sessionStart: number;
}

// Known dev users for validation/testing
export const DEV_USERS: Record<string, DevUser> = {
  'aisha': {
    id: '2b458624-d498-4cca-a63d-9341cc20e363',
    email: 'aisha@demo.com',
    name: 'Aisha Khan',
    role: 'mentor',
    sessionStart: Date.now()
  },
  'mateo': {
    id: '3c459625-e499-5ddb-b64d-a442dd21f474',
    email: 'mateo@demo.com', 
    name: 'Mateo Silva',
    role: 'user',
    sessionStart: Date.now()
  },
  'jade': {
    id: '4d56a736-f5aa-6eec-c75e-b553ee32e585',
    email: 'jade@demo.com',
    name: 'Jade Chen', 
    role: 'admin',
    sessionStart: Date.now()
  }
};

/**
 * Set up a dev user session
 */
export const setupDevUser = (userKey: keyof typeof DEV_USERS): void => {
  const user = DEV_USERS[userKey];
  if (!user) {
    console.error('Invalid dev user key:', userKey);
    return;
  }

  // Update session timestamp
  const userWithFreshSession = {
    ...user,
    sessionStart: Date.now()
  };

  // Store in secure storage
  secureStorage.setItem("devUser", userWithFreshSession);
  
  // Also set on window for immediate access
  window.__devUser__ = userWithFreshSession;
  
  console.log('Dev user session established:', {
    name: user.name,
    role: user.role,
    id: user.id
  });
};

/**
 * Clear all dev user sessions
 */
export const clearDevUserSession = (): void => {
  secureStorage.removeItem("devUser");
  delete window.__devUser__;
  console.log('Dev user session cleared');
};

/**
 * Get current active dev user
 */
export const getCurrentDevUser = (): DevUser | null => {
  return secureStorage.getItem("devUser") || window.__devUser__ || null;
};

/**
 * Auto-setup Aisha Khan for teach validation testing
 */
export const setupAishaForValidation = (): void => {
  setupDevUser('aisha');
  console.log('Aisha Khan set up for teach validation dashboard access');
};
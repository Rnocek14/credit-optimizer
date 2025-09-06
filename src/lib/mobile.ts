import { Capacitor } from '@capacitor/core';

/**
 * Mobile/Capacitor utilities for the Path to Success Tracker app
 */

export const isMobileApp = () => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = () => {
  return Capacitor.getPlatform();
};

export const isIOS = () => {
  return Capacitor.getPlatform() === 'ios';
};

export const isAndroid = () => {
  return Capacitor.getPlatform() === 'android';
};

export const isWeb = () => {
  return Capacitor.getPlatform() === 'web';
};

/**
 * Check if we're running in development vs production mobile environment
 */
export const isMobileDev = () => {
  return isMobileApp() && import.meta.env.DEV;
};

/**
 * Get app info for debugging
 */
export const getAppInfo = () => {
  return {
    platform: getPlatform(),
    isNative: isMobileApp(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isWeb: isWeb(),
    isDev: import.meta.env.DEV
  };
};

/**
 * Safe console logging for mobile
 */
export const mobileLog = (...args: any[]) => {
  if (import.meta.env.DEV || !isMobileApp()) {
    console.log('[Mobile]', ...args);
  }
};

/**
 * Handle mobile-specific authentication redirects
 */
export const getMobileAuthRedirectUrl = () => {
  if (isMobileApp()) {
    // For mobile apps, use the app's custom scheme
    return `pathfindai://auth/callback`;
  }
  return `${window.location.origin}/auth/callback`;
};

/**
 * Handle deep linking for mobile app
 */
export const handleMobileDeepLink = (url: string) => {
  mobileLog('Handling deep link:', url);
  
  // Parse the URL and navigate accordingly
  if (url.includes('/auth/callback')) {
    // Handle auth callback
    window.location.href = '/dashboard';
  } else if (url.includes('/share/')) {
    // Handle shared content
    const shareId = url.split('/share/')[1];
    window.location.href = `/shared/${shareId}`;
  }
};

/**
 * Mobile-specific storage utilities
 */
export const mobileStorage = {
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      mobileLog('Storage error:', error);
    }
  },
  
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      mobileLog('Storage error:', error);
      return null;
    }
  },
  
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      mobileLog('Storage error:', error);
    }
  }
};
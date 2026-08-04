/**
 * Web-only stubs for the former Capacitor mobile shell.
 * The native mobile build was abandoned (no android/ or ios/ projects exist);
 * Capacitor was removed in the Phase-2 cut. These keep call sites working.
 */

export const isMobileApp = () => false;

export const getPlatform = () => 'web';

export const isIOS = () => false;

export const isAndroid = () => false;

export const isWeb = () => true;

export const isMobileDev = () => false;

export const getAppInfo = () => ({
  platform: 'web',
  isNative: false,
  isIOS: false,
  isAndroid: false,
  isWeb: true,
  isDev: import.meta.env.DEV,
});

export const mobileLog = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log('[Mobile]', ...args);
  }
};

export const getMobileAuthRedirectUrl = () => {
  return `${window.location.origin}/auth`;
};

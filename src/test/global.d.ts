/// <reference types="vitest/globals" />

import '@testing-library/jest-dom';

// Global test utilities
declare global {
  const screen: typeof import('@testing-library/react').screen;
  const fireEvent: typeof import('@testing-library/react').fireEvent;
  const waitFor: typeof import('@testing-library/react').waitFor;
}

export {};
/// <reference types="cypress" />

import '@testing-library/cypress/add-commands';
import { seedSatisfiedModule, clearPlanStore, stubTelemetry, forceABBucket } from './testUtils';

declare global {
  namespace Cypress {
    interface Chainable {
      saveLocalStorage(): Chainable<void>
      restoreLocalStorage(): Chainable<void>
      seedSatisfiedModule(): Chainable<void>
      clearPlanStore(): Chainable<void>
      stubTelemetry(): Chainable<void>
      forceABBucket(bucket: 'A' | 'B' | null): Chainable<void>
    }
  }
}

let LOCAL_STORAGE_MEMORY: Record<string, string> = {};

Cypress.Commands.add('saveLocalStorage', () => {
  Object.keys(localStorage).forEach(key => {
    LOCAL_STORAGE_MEMORY[key] = localStorage[key];
  });
});

Cypress.Commands.add('restoreLocalStorage', () => {
  Object.keys(LOCAL_STORAGE_MEMORY).forEach(key => {
    localStorage.setItem(key, LOCAL_STORAGE_MEMORY[key]);
  });
});

Cypress.Commands.add('seedSatisfiedModule', seedSatisfiedModule);
Cypress.Commands.add('clearPlanStore', clearPlanStore);
Cypress.Commands.add('stubTelemetry', stubTelemetry);
Cypress.Commands.add('forceABBucket', forceABBucket);

export {};

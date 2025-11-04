/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      saveLocalStorage(): Chainable<void>
      restoreLocalStorage(): Chainable<void>
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

export {};

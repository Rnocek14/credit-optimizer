import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:5173',
    defaultCommandTimeout: 12000,
    pageLoadTimeout: 60000,
    chromeWebSecurity: false,
    retries: { runMode: 2, openMode: 0 },
    video: false,
    viewportWidth: 1400,
    viewportHeight: 900,
    setupNodeEvents(on, config) {
      // Cypress task to seed a satisfied module for testing
      on('task', {
        seedSatisfiedModule() {
          // This runs in Node.js context - for browser localStorage manipulation,
          // use cy.window() directly in tests instead
          return null;
        },
        log(message) {
          console.log(message);
          return null;
        }
      });
    },
  },
});

import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
    defaultCommandTimeout: 12000,
    pageLoadTimeout: 60000,
    chromeWebSecurity: false,
    retries: { runMode: 2, openMode: 0 },
    video: false,
    viewportWidth: 1400,
    viewportHeight: 900,
  },
});

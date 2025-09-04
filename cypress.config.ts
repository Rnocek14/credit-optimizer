import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.BASE_URL || 'http://localhost:5173',
    defaultCommandTimeout: 12000,
    pageLoadTimeout: 60000,
    viewportWidth: 1400,
    viewportHeight: 900,
    video: false,
  },
  retries: 1,
});

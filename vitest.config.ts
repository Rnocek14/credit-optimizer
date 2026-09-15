import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      // The test.yml workflow uploads ./coverage/lcov.info to Codecov, but
      // vitest's default reporters are text/html/clover/json — no lcov — so
      // that upload has always pointed at a file which was never written.
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      // Only measure the app. Without this, the report is dominated by
      // Deno edge functions and build scripts that vitest never executes,
      // all reading 0% and burying the numbers that matter.
      include: ['src/**'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'supabase/**',
        'scripts/**',
        'cypress/**',
        'tests/**',
        'src/**/*.{test,spec}.{js,ts,tsx}',
        'src/test/**',
        'src/fixtures/**',
        'src/integrations/supabase/types.ts',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
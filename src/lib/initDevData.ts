import { seedEduTreeData } from './seedData';

// Auto-seed in development mode if data doesn't exist
if (import.meta.env.DEV) {
  // Run non-destructive seeding on app boot
  seedEduTreeData({ destructive: false });
}
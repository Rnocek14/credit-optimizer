/**
 * AppShell — ensures HubNavigation is present on all logged-in pages.
 * Wrap any route that should keep the global nav visible.
 */
import React from 'react';
import { HubNavigation } from '@/components/HubNavigation';

interface AppShellProps {
  children: React.ReactNode;
  /** If true, renders a compact top bar instead of full nav (for full-screen tools) */
  compact?: boolean;
}

export function AppShell({ children, compact }: AppShellProps) {
  return (
    <>
      <HubNavigation />
      {children}
    </>
  );
}

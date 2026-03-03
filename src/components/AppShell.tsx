/**
 * AppShell — ensures HubNavigation is present on all logged-in pages.
 * Uses flex layout so children can fill remaining height without brittle calc().
 */
import React from 'react';
import { HubNavigation } from '@/components/HubNavigation';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <HubNavigation />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}

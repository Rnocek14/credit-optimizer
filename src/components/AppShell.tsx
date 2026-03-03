/**
 * AppShell — ensures HubNavigation is present on all logged-in pages.
 * Uses flex layout so children can fill remaining height without brittle calc().
 *
 * Default: children scroll naturally (overflow-auto on main).
 * For full-screen tools (EduTree/ReactFlow), children should set their own
 * overflow-hidden on their container to avoid double scrollbars.
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
      <main className="flex-1 flex flex-col overflow-auto">
        {children}
      </main>
    </div>
  );
}

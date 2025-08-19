import React from 'react';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { HubNavigation } from '@/components/HubNavigation';
import { PathCanvas } from '@/components/path/PathCanvas';
import { LoadingState } from '@/components/LoadingState';

export default function Build() {
  const { user, isLoading } = useSecureAuth();

  if (isLoading) {
    return <LoadingState />;
  }

  if (!user) {
    return <div>Access denied. Please log in.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      <div className="h-[calc(100vh-60px)]">
        <PathCanvas userId={user.id} />
      </div>
    </div>
  );
}
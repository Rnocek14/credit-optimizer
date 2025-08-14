import React from 'react';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { HubNavigation } from '@/components/HubNavigation';
import { Phase6Dashboard } from '@/components/Phase6Dashboard';
import { LoadingState } from '@/components/LoadingState';

export default function Phase6() {
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
      <div className="container mx-auto px-4 py-6">
        <Phase6Dashboard userId={user.id} />
      </div>
    </div>
  );
}
import React from 'react';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import Navigation from '@/components/Navigation';
import { Phase7Dashboard } from '@/components/Phase7Dashboard';
import { LoadingState } from '@/components/LoadingState';

export default function Phase7() {
  const { user, isLoading } = useSecureAuth();

  if (isLoading) {
    return <LoadingState />;
  }

  if (!user) {
    return <div>Access denied. Please log in.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-6">
        <Phase7Dashboard userId={user.id} />
      </div>
    </div>
  );
}
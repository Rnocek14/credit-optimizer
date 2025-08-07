import React from 'react';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import Navigation from '@/components/Navigation';
import { Phase7Dashboard } from '@/components/Phase7Dashboard';
import { LoadingState } from '@/components/LoadingState';
import { Helmet } from 'react-helmet-async';
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
      <Helmet>
        <title>Trust Intelligence Dashboard | Life Path AI</title>
        <meta name="description" content="Trust Intelligence: real-time trust, satisfaction, and accuracy metrics for Maya. Analyze trends and build confidence in AI decisions." />
        <link rel="canonical" href={(typeof window !== 'undefined' ? window.location.origin : '') + '/phase7'} />
      </Helmet>
      <Navigation />
      <div className="container mx-auto px-4 py-6">
        <Phase7Dashboard userId={user.id} />
      </div>
    </div>
  );
}
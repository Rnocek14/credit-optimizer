/**
 * Phase 7: Maya + CRI Integration Page
 * Main entry point for integrated Maya + CRI experience
 */

import React from 'react';
import { HubNavigation } from '@/components/HubNavigation';
import { MayaCRIDashboard } from '@/components/MayaCRIDashboard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const MayaCRIIntegration = () => {
  // Get current user
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  return (
    <>
      <HubNavigation />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <MayaCRIDashboard userId={user?.id} />
        </div>
      </div>
    </>
  );
};

export default MayaCRIIntegration;
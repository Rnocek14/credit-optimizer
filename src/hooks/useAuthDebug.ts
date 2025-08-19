/**
 * Authentication Debug Hook
 * Helps debug authentication issues across the app
 */

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';

export const useAuthDebug = () => {
  useEffect(() => {
    const checkAuthState = async () => {
      console.log('🔍 Auth Debug Check:');
      
      // Check Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('📋 Supabase Session:', {
        exists: !!session,
        user: session?.user?.id,
        error: sessionError?.message
      });

      // Check getCurrentUser
      try {
        const currentUser = await getCurrentUser();
        console.log('👤 getCurrentUser Result:', {
          exists: !!currentUser,
          id: currentUser?.id,
          isDevUser: currentUser?.isDevUser,
          email: currentUser?.email
        });
      } catch (error) {
        console.error('❌ getCurrentUser Error:', error);
      }

      // Check auth.uid() context
      const { data: testQuery, error: testError } = await supabase
        .from('career_goals')
        .select('count')
        .limit(1);
      
      console.log('🗄️ Database Access Test:', {
        success: !testError,
        error: testError?.message
      });
    };

    checkAuthState();
  }, []);
};
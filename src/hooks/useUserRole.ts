import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'moderator' | 'user';

export function useUserRole() {
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  });

  const { data: role, isLoading, error } = useQuery({
    queryKey: ['user-role', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;

      const { data, error } = await supabase.rpc('get_user_role', {
        user_uuid: session.user.id
      });

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data as AppRole | null;
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    role,
    isAdmin: role === 'admin',
    isModerator: role === 'moderator',
    isUser: role === 'user',
    isLoading,
    error,
    hasRole: (checkRole: AppRole) => role === checkRole
  };
}

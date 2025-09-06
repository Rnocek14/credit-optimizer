import { useAuth } from '@/contexts/AuthContext';

export const useUser = () => {
  const { user, isLoading } = useAuth();
  
  return { 
    user: user ? {
      id: user.id,
      email: user.email,
      user_metadata: {
        name: user.name
      }
    } : null, 
    loading: isLoading 
  };
};
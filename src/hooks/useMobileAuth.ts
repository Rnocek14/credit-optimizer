/**
 * Mobile-optimized authentication components and hooks
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getMobileAuthRedirectUrl, isMobileApp, mobileLog } from '@/lib/mobile';
import { useToast } from '@/hooks/use-toast';

export const useMobileAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const signInWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You've been signed in successfully.",
      });

      return { success: true };
    } catch (error: any) {
      mobileLog('Sign in error:', error);
      toast({
        title: "Sign in failed",
        description: error.message || "Invalid login credentials",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getMobileAuthRedirectUrl(),
        },
      });

      if (error) throw error;

      toast({
        title: "Account created!",
        description: isMobileApp() 
          ? "Please check your email to verify your account."
          : "Please check your email to verify your account.",
      });

      return { success: true, data };
    } catch (error: any) {
      mobileLog('Sign up error:', error);
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });

      return { success: true };
    } catch (error: any) {
      mobileLog('Sign out error:', error);
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signInWithEmail,
    signUpWithEmail,
    signOut,
    isLoading
  };
};
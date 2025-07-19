import { supabase } from "@/integrations/supabase/client";

export const triggerBadgeAssignment = async (userId: string) => {
  try {
    console.log('Triggering badge assignment for user:', userId);
    
    const { data, error } = await supabase.functions.invoke('assign-badges', {
      body: { user_id: userId }
    });

    if (error) {
      console.error('Error calling assign-badges function:', error);
      return;
    }

    console.log('Badge assignment result:', data);
    return data;
  } catch (error) {
    console.error('Error triggering badge assignment:', error);
  }
};
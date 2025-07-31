import { supabase } from "@/integrations/supabase/client";

export const awardXP = async (
  userId: string, 
  xpAmount: number, 
  actionType: string, 
  reason: string, 
  sourceId?: string
) => {
  try {
    console.log('Awarding XP:', { userId, xpAmount, actionType, reason, sourceId });
    
    const { data, error } = await supabase.rpc('award_xp', {
      user_id_param: userId,
      xp_amount_param: xpAmount,
      action_type_param: actionType,
      reason_param: reason,
      source_id_param: sourceId || null
    });

    if (error) {
      console.error('Error awarding XP:', error);
      return { success: false, error };
    }

    console.log('XP awarded successfully');
    return { success: true, data };
  } catch (error) {
    console.error('Error awarding XP:', error);
    return { success: false, error };
  }
};

export const getUserLevel = async (userId: string) => {
  try {
    const { data, error } = await supabase.rpc('get_user_level', {
      user_id_param: userId
    });

    if (error) {
      console.error('Error getting user level:', error);
      return { success: false, error };
    }

    return { success: true, data: data[0] || null };
  } catch (error) {
    console.error('Error getting user level:', error);
    return { success: false, error };
  }
};

// XP Constants for different actions
export const XP_REWARDS = {
  GOAL_CREATED: 10,
  TRANSCRIPT_SAVED: 15,
  SAVED_COURSE: 10,
  RESUME_PUBLISHED: 40,
  BADGE_EARNED: 25,
  CRI_SCORE_70_PLUS: 30,
  PROFILE_COMPLETED: 25,
  FIRST_LOGIN: 25,
  COURSE_STARTED: 5,
  COURSE_COMPLETED: 50,
} as const;

export type XPActionType = keyof typeof XP_REWARDS;
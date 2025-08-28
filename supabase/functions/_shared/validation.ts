// deno-lint-ignore-file no-explicit-any
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Onboarding validation schemas
export const CareerGoalSchema = z.enum(['new_job', 'career_switch', 'skill_up'], {
  errorMap: () => ({ message: 'Career goal must be new_job, career_switch, or skill_up' })
});

export const OnboardingSubmitSchema = z.object({
  career_goal: CareerGoalSchema,
  target_role: z.string().min(2, 'Target role must be at least 2 characters').max(60, 'Target role cannot exceed 60 characters'),
  location: z.string().min(2, 'Location must be at least 2 characters').max(60, 'Location cannot exceed 60 characters')
});

// Referral event schemas
export const ReferralEventTypeSchema = z.enum(['click', 'signup'], {
  errorMap: () => ({ message: 'Event type must be click or signup' })
});

export const ReferralEventSchema = z.object({
  type: ReferralEventTypeSchema
});

// Utility functions for validation
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .trim()
    .slice(0, 1000); // Limit length
}

export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function validateReferralCode(code: string): boolean {
  // Referral codes should be 12 hex characters (from gen_random_bytes(6))
  const codeRegex = /^[0-9a-f]{12}$/i;
  return codeRegex.test(code);
}

export function getClientIP(req: Request): string {
  return req.headers.get('cf-connecting-ip') || 
         req.headers.get('x-forwarded-for')?.split(',')[0] || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

export function getUserAgent(req: Request): string {
  return req.headers.get('user-agent')?.slice(0, 500) || 'unknown';
}

// Score bucket mapping for privacy-safe sharing
export function getScoreBucket(score: number): string {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 55) return 'moderate';
  if (score >= 40) return 'developing';
  return 'emerging';
}

// Generate short insight based on score and goal
export function generateShortInsight(score: number, goal: string): string {
  const bucket = getScoreBucket(score);
  
  const insights = {
    excellent: {
      new_job: "You're well-positioned for your target role with strong fundamentals.",
      career_switch: "Your transferable skills give you a solid foundation for switching careers.",
      skill_up: "You have excellent potential to advance to the next level."
    },
    good: {
      new_job: "You have good foundations with some areas to strengthen for your target role.",
      career_switch: "You're on a good path with some additional skills needed for the switch.",
      skill_up: "You're well-prepared with focused improvement in key areas needed."
    },
    moderate: {
      new_job: "You have potential with focused skill development needed for your target role.",
      career_switch: "A strategic learning plan will help bridge the gap to your target career.",
      skill_up: "Structured learning in core areas will accelerate your advancement."
    },
    developing: {
      new_job: "Building foundational skills will significantly improve your job readiness.",
      career_switch: "A comprehensive learning plan will set you up for a successful transition.",
      skill_up: "Focus on core competencies to build a strong foundation for advancement."
    },
    emerging: {
      new_job: "Starting with fundamentals will build the strong base you need for success.",
      career_switch: "A step-by-step approach will help you build the skills for your new career.",
      skill_up: "Beginning with basics will create a solid pathway for your growth goals."
    }
  };
  
  return insights[bucket as keyof typeof insights][goal as keyof typeof insights.excellent] || 
         "Continue building your skills to reach your career goals.";
}
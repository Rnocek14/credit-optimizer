import { corsHeaders, json, badRequest, serverError } from '../_shared/responseHelpers.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

interface EvidenceSummary {
  completed: string[];
  inProgress: string[];
  transferPending: string[];
  byBlock?: Record<string, { earnedCredits: number; neededCredits?: number | null; complete: boolean }>;
  asOf: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Create Supabase client with request auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { 
          headers: { Authorization: req.headers.get('Authorization') ?? '' }
        }
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return badRequest('Authentication required');
    }

    // Query student evidence data
    const { data: mappedCourses, error: mappingError } = await supabase
      .from('student_course_map')
      .select(`
        catalog_course_id,
        status,
        confidence,
        student_courses_raw (
          credits,
          grade,
          term
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'confirmed');

    if (mappingError) {
      console.error('Error fetching course mappings:', mappingError);
      return serverError(mappingError);
    }

    // Term parsing utilities
    const SEASON = { SP: 1, SU: 2, FA: 3 } as const;
    const parseTerm = (t?: string) => {
      const m = t?.match(/^(\d{4})(SP|SU|FA)$/i);
      return m ? { y: +m[1], s: SEASON[m[2].toUpperCase() as keyof typeof SEASON] } : null;
    };
    const cmpTerm = (a: ReturnType<typeof parseTerm>, b: ReturnType<typeof parseTerm>) =>
      !a || !b ? 0 : (a.y - b.y) || (a.s - b.s);

    // Get current term for in-progress detection
    const now = new Date();
    const currentTerm = { y: now.getFullYear(), s: now.getMonth() >= 8 ? SEASON.FA : SEASON.SP };

    // Grade normalization sets
    const PASS = new Set(['A','A-','A+','B','B-','B+','C','C-','C+','P','S','CR','TR','PASS']);
    const FAIL = new Set(['F','W','I','NP','U','NC','WF','WU']);

    // Process the data into categories with deduplication
    const completed = new Set<string>();
    const inProgress = new Set<string>();
    const transferPending = new Set<string>();
    const completedMap = new Map<string, number>(); // courseId -> max credits

    mappedCourses?.forEach((mapping: any) => {
      const rawCourse = mapping.student_courses_raw;
      const courseId = mapping.catalog_course_id;
      
      if (!rawCourse || !courseId) return;
      
      // Normalize grade status
      const grade = rawCourse.grade?.toUpperCase().trim();
      const term = rawCourse.term;
      const credits = rawCourse.credits || 0;
      
      // Check for completed courses (passing grades)
      if (grade && PASS.has(grade)) {
        completed.add(courseId);
        // Track highest credit value for deduplication
        completedMap.set(courseId, Math.max(credits, completedMap.get(courseId) || 0));
      } 
      // Check for failed/withdrawn courses (don't count these)
      else if (grade && FAIL.has(grade)) {
        // Don't count failed/withdrawn courses
        return;
      }
      // Check for in-progress courses (current/future term with no grade)
      else if (term && !grade) {
        const pt = parseTerm(term);
        if (pt && cmpTerm(pt, currentTerm) >= 0) {
          inProgress.add(courseId);
        }
      } 
      // Low confidence mappings need review
      else if (mapping.confidence < 0.8) {
        transferPending.add(courseId);
      }
    });

    // Calculate total credits earned with deduplication
    const totalCreditsEarned = [...completedMap.values()].reduce((a, b) => a + b, 0);

    // Build block coverage with actual credit calculations
    const byBlock: Record<string, any> = {};
    
    // For now, create a simple mapping - in production this should join with block_members table
    if (completed.size > 0 || totalCreditsEarned > 0) {
      byBlock['y1-core'] = {
        earnedCredits: Math.min(totalCreditsEarned, 9),
        neededCredits: 9,
        complete: totalCreditsEarned >= 9
      };
      
      if (totalCreditsEarned > 9) {
        byBlock['y2-cs-core'] = {
          earnedCredits: Math.min(totalCreditsEarned - 9, 6),
          neededCredits: 6,
          complete: totalCreditsEarned >= 15
        };
      }
    }

    const summary: EvidenceSummary = {
      completed: [...completed],
      inProgress: [...inProgress],
      transferPending: [...transferPending],
      byBlock,
      asOf: new Date().toISOString()
    };

    return json(200, summary);

  } catch (error) {
    console.error('Evidence summary error:', error);
    return serverError(error);
  }
});
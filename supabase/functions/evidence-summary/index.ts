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

    // Process the data into categories
    const completed: string[] = [];
    const inProgress: string[] = [];
    const transferPending: string[] = [];

    // Get current term for in-progress detection
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const currentTerm = currentMonth >= 8 ? `${currentYear}FA` : 
                       currentMonth >= 1 ? `${currentYear}SP` : 
                       `${currentYear-1}FA`;

    mappedCourses?.forEach((mapping: any) => {
      const rawCourse = mapping.student_courses_raw;
      const courseId = mapping.catalog_course_id;
      
      if (!rawCourse || !courseId) return;
      
      // Normalize grade status
      const grade = rawCourse.grade?.toUpperCase().trim();
      const term = rawCourse.term;
      
      // Check for completed courses (passing grades)
      if (grade && ['A', 'B', 'C', 'A-', 'B-', 'C-', 'A+', 'B+', 'C+', 'PASS', 'P', 'S'].includes(grade)) {
        completed.push(courseId);
      } 
      // Check for failed/withdrawn courses (don't count these)
      else if (grade && ['F', 'W', 'I', 'NP', 'U', 'NC'].includes(grade)) {
        // Don't count failed/withdrawn courses
        return;
      }
      // Check for in-progress courses (current term with no grade)
      else if (term && term >= currentTerm && !grade) {
        inProgress.push(courseId);
      } 
      // Low confidence mappings need review
      else if (mapping.confidence < 0.8) {
        transferPending.push(courseId);
      }
    });

    // Calculate actual credits earned from completed courses
    const totalCreditsEarned = mappedCourses
      ?.filter((mapping: any) => completed.includes(mapping.catalog_course_id))
      .reduce((sum: number, mapping: any) => {
        return sum + (mapping.student_courses_raw?.credits || 3); // Default to 3 if not specified
      }, 0) || 0;

    // Build block coverage with actual credit calculations
    const byBlock: Record<string, any> = {};
    
    // For now, create a simple mapping - in production this should join with block_members table
    if (completed.length > 0 || totalCreditsEarned > 0) {
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
      completed,
      inProgress,
      transferPending,
      byBlock,
      asOf: new Date().toISOString()
    };

    return json(200, summary);

  } catch (error) {
    console.error('Evidence summary error:', error);
    return serverError(error);
  }
});
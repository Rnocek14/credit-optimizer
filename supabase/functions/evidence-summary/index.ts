import { corsHeaders, json, badRequest, serverError } from '../_shared/responseHelpers.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface EvidenceSummary {
  completed: string[];
  inProgress: string[];
  transferPending: string[];
  byBlock?: Record<string, { earnedCredits: number; neededCredits?: number | null; complete: boolean }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    // For now, return demo data for "me" or demo users
    if (userId === 'me' || !userId) {
      const demoSummary: EvidenceSummary = {
        completed: ['MATH-241', 'ENG-101', 'CS-101'],
        inProgress: ['STAT-201', 'CS-201'],
        transferPending: ['BIO-110'],
        byBlock: {
          'y1-core': { earnedCredits: 6, neededCredits: 9, complete: false },
          'y2-cs-core': { earnedCredits: 3, neededCredits: 6, complete: false },
          'y2-se-track': { earnedCredits: 0, neededCredits: 12, complete: false },
          'y3-ds-track': { earnedCredits: 3, neededCredits: 15, complete: false },
          'y4-capstone': { earnedCredits: 0, neededCredits: 6, complete: false }
        }
      };
      
      return json(200, demoSummary);
    }

    // Get the current user's auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return badRequest('Authorization header required');
    }

    // Set the auth header for the Supabase client
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return badRequest('Invalid authentication');
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

    mappedCourses?.forEach((mapping: any) => {
      const rawCourse = mapping.student_courses_raw;
      const courseId = mapping.catalog_course_id;
      
      if (!rawCourse || !courseId) return;
      
      // Determine status based on grade and term
      const grade = rawCourse.grade?.toUpperCase();
      const term = rawCourse.term;
      
      if (grade && ['A', 'B', 'C', 'A-', 'B-', 'C-', 'A+', 'B+', 'C+', 'PASS', 'P'].includes(grade)) {
        completed.push(courseId);
      } else if (term && term.includes('2024') && !grade) {
        inProgress.push(courseId);
      } else if (mapping.confidence < 0.8) {
        transferPending.push(courseId);
      }
    });

    // Build block coverage (simplified for now)
    const byBlock: Record<string, any> = {};
    
    // Sample block coverage calculation
    if (completed.length > 0) {
      byBlock['y1-core'] = {
        earnedCredits: completed.length * 3, // Assume 3 credits per course
        neededCredits: 9,
        complete: completed.length >= 3
      };
    }

    const summary: EvidenceSummary = {
      completed,
      inProgress,
      transferPending,
      byBlock
    };

    return json(200, summary);

  } catch (error) {
    console.error('Evidence summary error:', error);
    return serverError(error);
  }
});
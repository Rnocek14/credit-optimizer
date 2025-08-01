import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COURSERA_API_KEY = Deno.env.get('COURSERA_API_KEY');
const COURSERA_BASE_URL = 'https://api.coursera.org/api/courses.v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    
    let result;
    
    switch (action) {
      case 'search':
        result = await searchCourses(params);
        break;
      case 'trending':
        result = await getTrendingCourses(params.limit || 10);
        break;
      case 'details':
        result = await getCourseDetails(params.courseId);
        break;
      default:
        throw new Error('Invalid action');
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Coursera API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function searchCourses(filters: any) {
  const params = new URLSearchParams();
  
  if (filters.query) {
    params.append('q', filters.query);
  }
  
  if (filters.skills && filters.skills.length > 0) {
    params.append('skills', filters.skills.join(','));
  }
  
  if (filters.difficulty) {
    params.append('difficultyLevel', mapDifficulty(filters.difficulty));
  }
  
  params.append('limit', '50');
  params.append('fields', 'name,description,workload,partnerIds,courseType,certificates');
  
  const response = await fetch(`${COURSERA_BASE_URL}/courses?${params}`, {
    headers: {
      'Authorization': `Bearer ${COURSERA_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Coursera API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return transformCourseData(data.elements || []);
}

async function getTrendingCourses(limit: number) {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('fields', 'name,description,workload,partnerIds,courseType,certificates');
  params.append('sort', 'enrollmentCount');
  
  const response = await fetch(`${COURSERA_BASE_URL}/courses?${params}`, {
    headers: {
      'Authorization': `Bearer ${COURSERA_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Coursera API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return transformCourseData(data.elements || []);
}

async function getCourseDetails(courseId: string) {
  const params = new URLSearchParams();
  params.append('fields', 'name,description,workload,partnerIds,courseType,certificates,instructorIds');
  
  const response = await fetch(`${COURSERA_BASE_URL}/courses/${courseId}?${params}`, {
    headers: {
      'Authorization': `Bearer ${COURSERA_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Coursera API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return transformCourseData([data])[0];
}

function transformCourseData(courses: any[]): any[] {
  return courses.map(course => ({
    id: course.id,
    title: course.name || 'Untitled Course',
    description: course.description || '',
    platform: 'Coursera',
    url: `https://www.coursera.org/learn/${course.slug || course.id}`,
    difficulty: mapDifficultyFromCoursera(course.difficultyLevel),
    duration_hours: extractDurationHours(course.workload),
    cost: determineCost(course),
    has_projects: course.courseType === 'project' || (course.description && course.description.toLowerCase().includes('project')),
    skill_tags: extractSkillTags(course),
    language: 'English',
    certificate_available: course.certificates && course.certificates.length > 0,
    instructor_rating: 4.5, // Default rating - would need instructor API call for real rating
    updated_at: new Date().toISOString()
  }));
}

function mapDifficulty(difficulty: string): string {
  const difficultyMap: { [key: string]: string } = {
    'beginner': 'Beginner',
    'intermediate': 'Intermediate',
    'advanced': 'Advanced'
  };
  return difficultyMap[difficulty.toLowerCase()] || 'Beginner';
}

function mapDifficultyFromCoursera(level: string): string {
  if (!level) return 'Beginner';
  const lowerLevel = level.toLowerCase();
  if (lowerLevel.includes('advanced')) return 'Advanced';
  if (lowerLevel.includes('intermediate')) return 'Intermediate';
  return 'Beginner';
}

function extractDurationHours(workload: string): number {
  if (!workload) return 10;
  
  const match = workload.match(/(\d+)/);
  if (match) {
    const hours = parseInt(match[1]);
    if (workload.toLowerCase().includes('week')) {
      return hours * 4; // Assume 4 hours per week
    }
    return hours;
  }
  return 10;
}

function determineCost(course: any): number {
  // Coursera courses are typically free to audit, paid for certificate
  if (course.certificates && course.certificates.length > 0) {
    return 49; // Typical Coursera certificate cost
  }
  return 0; // Free to audit
}

function extractSkillTags(course: any): string[] {
  const tags = [];
  
  if (course.name) {
    // Extract potential skills from course name
    const nameWords = course.name.toLowerCase().split(/\s+/);
    const skillKeywords = ['python', 'javascript', 'machine learning', 'data science', 'react', 'node', 'sql', 'analytics'];
    
    nameWords.forEach(word => {
      skillKeywords.forEach(skill => {
        if (skill.includes(word) || word.includes(skill)) {
          if (!tags.includes(skill)) {
            tags.push(skill);
          }
        }
      });
    });
  }
  
  return tags.length > 0 ? tags : ['General'];
}
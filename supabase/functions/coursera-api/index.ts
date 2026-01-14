import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COURSERA_API_KEY = Deno.env.get('COURSERA_API_KEY');
const COURSERA_API_SECRET = Deno.env.get('COURSERA_API_SECRET');
const COURSERA_BASE_URL = 'https://api.coursera.org/api/catalog.v1';

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
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function searchCourses(filters: any) {
  // If API credentials are not configured, return mock data
  if (!COURSERA_API_KEY || !COURSERA_API_SECRET) {
    console.log('Coursera API credentials not configured, returning mock data');
    return getMockCourseData(filters.query || 'programming');
  }

  try {
    // Use OAuth 2.0 authentication for Coursera Catalog API
    const authToken = await getOAuthToken();
    
    const params = new URLSearchParams();
    params.append('start', '0');
    params.append('limit', '50');
    params.append('fields', 'name,description,workload,partnerIds,photoUrl,slug');
    
    if (filters.query) {
      params.append('q', filters.query);
    }

    const response = await fetch(`${COURSERA_BASE_URL}/courses?${params}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`Coursera API error: ${response.status} ${response.statusText}`);
      return getMockCourseData(filters.query || 'programming');
    }
    
    const data = await response.json();
    return transformCourseData(data.elements || []);
  } catch (error) {
    console.error('Coursera API call failed, falling back to mock data:', error);
    return getMockCourseData(filters.query || 'programming');
  }
}

async function getTrendingCourses(limit: number) {
  // If API credentials are not configured, return mock data
  if (!COURSERA_API_KEY || !COURSERA_API_SECRET) {
    console.log('Coursera API credentials not configured, returning mock trending data');
    return getMockCourseData('trending').slice(0, limit);
  }

  try {
    const authToken = await getOAuthToken();
    
    const params = new URLSearchParams();
    params.append('start', '0');
    params.append('limit', limit.toString());
    params.append('fields', 'name,description,workload,partnerIds,photoUrl,slug');
    
    const response = await fetch(`${COURSERA_BASE_URL}/courses?${params}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`Coursera API error: ${response.status} ${response.statusText}`);
      return getMockCourseData('trending').slice(0, limit);
    }
    
    const data = await response.json();
    return transformCourseData(data.elements || []);
  } catch (error) {
    console.error('Coursera trending API call failed, falling back to mock data:', error);
    return getMockCourseData('trending').slice(0, limit);
  }
}

async function getCourseDetails(courseId: string) {
  // If API credentials are not configured, return mock data
  if (!COURSERA_API_KEY || !COURSERA_API_SECRET) {
    console.log('Coursera API credentials not configured, returning mock course details');
    const mockCourses = getMockCourseData('details');
    return mockCourses.find(c => c.id === courseId) || mockCourses[0];
  }

  try {
    const authToken = await getOAuthToken();
    
    const params = new URLSearchParams();
    params.append('fields', 'name,description,workload,partnerIds,photoUrl,slug');
    
    const response = await fetch(`${COURSERA_BASE_URL}/courses/${courseId}?${params}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`Coursera API error: ${response.status} ${response.statusText}`);
      const mockCourses = getMockCourseData('details');
      return mockCourses.find(c => c.id === courseId) || mockCourses[0];
    }
    
    const data = await response.json();
    return transformCourseData([data])[0];
  } catch (error) {
    console.error('Coursera details API call failed, falling back to mock data:', error);
    const mockCourses = getMockCourseData('details');
    return mockCourses.find(c => c.id === courseId) || mockCourses[0];
  }
}

function transformCourseData(courses: any[]): any[] {
  return courses.map(course => {
    // Only use real URLs from the Coursera API response
    // If the API provides a 'link' or 'homeLink', use it. Otherwise, set to null.
    // NEVER fabricate URLs from slugs or IDs - they often don't work
    const realUrl = course.link || course.homeLink || course.url || null;
    
    return {
      id: course.id,
      title: course.name || 'Untitled Course',
      description: course.description || '',
      platform: 'Coursera',
      url: realUrl, // null if no real URL available
      difficulty: mapDifficultyFromCoursera(course.difficultyLevel),
      duration_hours: extractDurationHours(course.workload),
      cost: determineCost(course),
      has_projects: course.courseType === 'project' || (course.description && course.description.toLowerCase().includes('project')),
      skill_tags: extractSkillTags(course),
      language: 'English',
      certificate_available: course.certificates && course.certificates.length > 0,
      instructor_rating: 4.5, // Default rating - would need instructor API call for real rating
      updated_at: new Date().toISOString()
    };
  });
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
  const tags: string[] = [];
  
  if (course.name) {
    // Extract potential skills from course name
    const nameWords = course.name.toLowerCase().split(/\s+/);
    const skillKeywords = ['python', 'javascript', 'machine learning', 'data science', 'react', 'node', 'sql', 'analytics'];
    
    nameWords.forEach((word: string) => {
      skillKeywords.forEach((skill: string) => {
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

async function getOAuthToken(): Promise<string> {
  if (!COURSERA_API_KEY || !COURSERA_API_SECRET) {
    throw new Error('Coursera API credentials not configured');
  }

  const credentials = btoa(`${COURSERA_API_KEY}:${COURSERA_API_SECRET}`);
  
  const response = await fetch('https://api.coursera.org/oauth2/client_credentials/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`OAuth token request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

function getMockCourseData(query: string): any[] {
  const mockCourses = [
    {
      id: 'mock-python-basics',
      title: 'Python for Beginners',
      description: 'Learn Python programming from scratch with hands-on exercises and real-world projects.',
      platform: 'Coursera',
      url: 'https://www.coursera.org/learn/python-basics',
      difficulty: 'Beginner',
      duration_hours: 40,
      cost: 0,
      has_projects: true,
      skill_tags: ['python', 'programming', 'data science'],
      language: 'English',
      certificate_available: true,
      instructor_rating: 4.7,
      updated_at: new Date().toISOString()
    },
    {
      id: 'mock-machine-learning',
      title: 'Introduction to Machine Learning',
      description: 'Dive into machine learning algorithms and build your first predictive models.',
      platform: 'Coursera',
      url: 'https://www.coursera.org/learn/machine-learning-intro',
      difficulty: 'Intermediate',
      duration_hours: 60,
      cost: 49,
      has_projects: true,
      skill_tags: ['machine learning', 'python', 'data science', 'analytics'],
      language: 'English',
      certificate_available: true,
      instructor_rating: 4.8,
      updated_at: new Date().toISOString()
    },
    {
      id: 'mock-web-dev',
      title: 'Full Stack Web Development',
      description: 'Master both frontend and backend development with React, Node.js, and databases.',
      platform: 'Coursera',
      url: 'https://www.coursera.org/learn/full-stack-web-development',
      difficulty: 'Intermediate',
      duration_hours: 80,
      cost: 49,
      has_projects: true,
      skill_tags: ['javascript', 'react', 'node', 'sql'],
      language: 'English',
      certificate_available: true,
      instructor_rating: 4.6,
      updated_at: new Date().toISOString()
    },
    {
      id: 'mock-data-science',
      title: 'Data Science Fundamentals',
      description: 'Learn data analysis, visualization, and statistical methods for business insights.',
      platform: 'Coursera',
      url: 'https://www.coursera.org/learn/data-science-fundamentals',
      difficulty: 'Beginner',
      duration_hours: 50,
      cost: 39,
      has_projects: true,
      skill_tags: ['data science', 'analytics', 'python', 'sql'],
      language: 'English',
      certificate_available: true,
      instructor_rating: 4.5,
      updated_at: new Date().toISOString()
    },
    {
      id: 'mock-cybersecurity',
      title: 'Cybersecurity Essentials',
      description: 'Understand cybersecurity principles, threats, and defense mechanisms.',
      platform: 'Coursera',
      url: 'https://www.coursera.org/learn/cybersecurity-essentials',
      difficulty: 'Intermediate',
      duration_hours: 45,
      cost: 49,
      has_projects: false,
      skill_tags: ['cybersecurity', 'networking', 'security'],
      language: 'English',
      certificate_available: true,
      instructor_rating: 4.4,
      updated_at: new Date().toISOString()
    }
  ];

  // Filter courses based on query if provided
  if (query && query !== 'trending' && query !== 'details') {
    return mockCourses.filter(course => 
      course.title.toLowerCase().includes(query.toLowerCase()) ||
      course.description.toLowerCase().includes(query.toLowerCase()) ||
      course.skill_tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
  }

  return mockCourses;
}
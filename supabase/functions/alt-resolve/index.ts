import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';
import { corsHeaders } from '../_shared/utils.ts';

// Course resolution types
interface ResolveRequest {
  url: string;
}

type Provider = 'youtube' | 'udemy' | 'coursera' | 'edx' | 'masterclass' | 'other';

interface SkillTag {
  name: string;
  weight?: number;
}

interface AlternativeCourse {
  id: string;
  provider: Provider;
  external_id: string | null;
  title: string;
  description: string | null;
  url: string;
  creator_name: string | null;
  published_at: string | null;
  estimated_hours: number | null;
  difficulty: number | null;
  cri_score: number | null;
  skills: SkillTag[] | null;
}

// Provider detection
function detectProvider(url: string): { provider: Provider; external_id: string | null } {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.toLowerCase();
  
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
    return { provider: 'youtube', external_id: videoId };
  }
  
  if (hostname.includes('udemy.com')) {
    const courseId = urlObj.pathname.split('/')[2] || null;
    return { provider: 'udemy', external_id: courseId };
  }
  
  if (hostname.includes('coursera.org')) {
    const courseId = urlObj.pathname.split('/').pop() || null;
    return { provider: 'coursera', external_id: courseId };
  }
  
  if (hostname.includes('edx.org')) {
    const courseId = urlObj.pathname.split('/')[3] || null;
    return { provider: 'edx', external_id: courseId };
  }
  
  if (hostname.includes('masterclass.com')) {
    const courseId = urlObj.pathname.split('/')[2] || null;
    return { provider: 'masterclass', external_id: courseId };
  }
  
  return { provider: 'other', external_id: null };
}

// Metadata fetching
async function fetchMetadata(url: string): Promise<{ title: string; description: string | null }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PathfindAI/1.0)',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled Course';
    
    // Extract description from meta tags
    const descMatch = html.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"']+)["\'][^>]*>/i) ||
                     html.match(/<meta[^>]*property=["\']og:description["\'][^>]*content=["\']([^"']+)["\'][^>]*>/i);
    const description = descMatch ? descMatch[1].trim() : null;
    
    return { title, description };
  } catch (error) {
    console.error('Metadata fetch error:', error);
    return { title: 'External Course', description: null };
  }
}

// Skill mapping
function mapSkills(title: string, description: string | null): SkillTag[] {
  const skillKeywords = {
    'React': ['react', 'jsx', 'component', 'hook'],
    'JavaScript': ['javascript', 'js', 'node', 'npm'],
    'Python': ['python', 'django', 'flask', 'pandas'],
    'TypeScript': ['typescript', 'ts', 'type'],
    'CSS': ['css', 'style', 'design', 'layout'],
    'HTML': ['html', 'markup', 'web'],
    'Node.js': ['node', 'express', 'server'],
    'Database': ['database', 'sql', 'mongodb', 'postgres'],
    'API': ['api', 'rest', 'graphql', 'endpoint'],
    'DevOps': ['docker', 'kubernetes', 'deployment', 'ci/cd'],
  };
  
  const content = `${title} ${description || ''}`.toLowerCase();
  const skills: SkillTag[] = [];
  
  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    const matches = keywords.filter(keyword => content.includes(keyword)).length;
    if (matches > 0) {
      skills.push({ name: skill, weight: matches / keywords.length });
    }
  }
  
  return skills.slice(0, 5); // Limit to top 5 skills
}

// CRI calculation
function calculateCRI(provider: Provider, title: string, description: string | null): { cri_score: number; difficulty: number } {
  const baseScores: Record<Provider, number> = {
    youtube: 65,
    udemy: 75,
    coursera: 85,
    edx: 80,
    masterclass: 70,
    other: 60,
  };
  
  let cri = baseScores[provider];
  let difficulty = 3; // Default medium
  
  const content = `${title} ${description || ''}`.toLowerCase();
  
  // Adjust for content indicators
  if (content.includes('beginner') || content.includes('intro')) {
    difficulty = Math.max(1, difficulty - 1);
    cri += 5;
  }
  
  if (content.includes('advanced') || content.includes('expert')) {
    difficulty = Math.min(5, difficulty + 1);
    cri += 10;
  }
  
  if (content.includes('complete') || content.includes('comprehensive')) {
    cri += 8;
  }
  
  if (content.includes('hands-on') || content.includes('project')) {
    cri += 12;
  }
  
  return { cri_score: Math.min(100, cri), difficulty };
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { url }: ResolveRequest = await req.json();
    
    if (!url) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'URL is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('[edge:alt-resolve] Processing URL:', url);
    
    const { provider, external_id } = detectProvider(url);
    console.log('[edge:alt-resolve] Detected:', { provider, external_id });
    
    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );
    
    // Check if course already exists
    if (external_id) {
      const { data: existing } = await supabase
        .from('alternative_courses')
        .select('*')
        .eq('provider', provider)
        .eq('external_id', external_id)
        .maybeSingle();
        
      if (existing) {
        console.log('[edge:alt-resolve] Found existing course:', existing.id, { cached: true });
        return new Response(JSON.stringify({
          success: true,
          course: existing,
          cached: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Fetch metadata
    const { title, description } = await fetchMetadata(url);
    const skills = mapSkills(title, description);
    const { cri_score, difficulty } = calculateCRI(provider, title, description);
    
    // Estimate hours based on provider and content
    let estimated_hours = 5; // Default
    if (provider === 'coursera' || provider === 'edx') estimated_hours = 20;
    if (provider === 'udemy') estimated_hours = 12;
    if (provider === 'masterclass') estimated_hours = 8;
    
    // Insert new course
    const courseData = {
      provider,
      external_id,
      title: title.slice(0, 255), // Truncate if needed
      description: description?.slice(0, 500) || null,
      url,
      creator_name: null, // Could be extracted from metadata
      published_at: new Date().toISOString(),
      estimated_hours,
      difficulty,
      cri_score,
      skills,
    };
    
    const { data: newCourse, error } = await supabase
      .from('alternative_courses')
      .insert(courseData)
      .select()
      .single();
    
    if (error) {
      console.error('[alt-resolve] Database error:', error);
      throw error;
    }
    
    console.log('[edge:alt-resolve] Created new course:', newCourse.id, { cached: false });
    
    return new Response(JSON.stringify({
      success: true,
      course: newCourse,
      cached: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[alt-resolve] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ResolveRequest {
  url: string;
}

type Provider = 'youtube' | 'udemy' | 'coursera' | 'edx' | 'masterclass' | 'other';

function detectProvider(url: string): { provider: Provider; externalId: string | null } {
  try {
    const u = new URL(url);

    // YouTube
    if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') {
      const vid = u.searchParams.get('v') || (u.hostname === 'youtu.be' ? u.pathname.slice(1) : null);
      return { provider: 'youtube', externalId: vid };
    }

    // Udemy
    if (u.hostname.includes('udemy.com')) {
      const match = u.pathname.match(/\/course\/([^/?#]+)/);
      return { provider: 'udemy', externalId: match?.[1] ?? null };
    }

    // Coursera
    if (u.hostname.includes('coursera.org')) {
      const match = u.pathname.match(/\/learn\/([^/?#]+)/);
      return { provider: 'coursera', externalId: match?.[1] ?? null };
    }

    // edX
    if (u.hostname.includes('edx.org')) {
      const match = u.pathname.match(/\/course\/([^/?#]+)/);
      return { provider: 'edx', externalId: match?.[1] ?? null };
    }

    // MasterClass
    if (u.hostname.includes('masterclass.com')) {
      const slug = u.pathname.replace(/^\/+/, '');
      return { provider: 'masterclass', externalId: slug || null };
    }

    return { provider: 'other', externalId: url };
  } catch (error) {
    return { provider: 'other', externalId: url };
  }
}

async function fetchMetadata(url: string) {
  try {
    console.log(`Fetching metadata for: ${url}`);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AltCourseBot/1.0)' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
    const title = (ogTitleMatch?.[1] || titleMatch?.[1] || 'Untitled Course').trim();
    
    // Extract description
    const descMatch = html.match(/<meta name="description" content="([^"]+)"/i);
    const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/i);
    const description = (ogDescMatch?.[1] || descMatch?.[1] || null)?.trim();
    
    return { title, description };
  } catch (error) {
    console.error(`Failed to fetch metadata for ${url}:`, error);
    return { 
      title: 'External Course',
      description: 'Course imported from external source'
    };
  }
}

function mapSkills(title: string, description: string | null): any[] {
  const text = `${title} ${description || ''}`.toLowerCase();
  const skillKeywords = [
    'react', 'javascript', 'typescript', 'node', 'python', 'java', 'sql',
    'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'design', 'ui', 'ux',
    'machine learning', 'data science', 'analytics', 'marketing', 'sales'
  ];
  
  const detectedSkills: any[] = [];
  skillKeywords.forEach(skill => {
    if (text.includes(skill)) {
      detectedSkills.push({ name: skill, weight: 0.7 });
    }
  });
  
  return detectedSkills;
}

function calculateCRI(params: {
  provider: Provider;
  title: string;
  description: string | null;
}): { criScore: number; difficulty: number } {
  const baseScore = 55;
  
  // Provider reputation weights
  const providerWeights: Record<Provider, number> = {
    youtube: 5,
    udemy: 10,
    coursera: 20,
    edx: 20,
    masterclass: 8,
    other: 0
  };
  
  // Quality indicators
  let qualityBonus = 0;
  if (params.description && params.description.length > 200) qualityBonus += 5;
  if (params.title.toLowerCase().includes('complete') || params.title.toLowerCase().includes('comprehensive')) {
    qualityBonus += 5;
  }
  
  // Difficulty assessment (1-5 scale)
  const titleLower = params.title.toLowerCase();
  let difficulty = 3; // Default medium
  
  if (titleLower.includes('beginner') || titleLower.includes('intro')) difficulty = 2;
  if (titleLower.includes('advanced') || titleLower.includes('expert')) difficulty = 4;
  if (titleLower.includes('master') || titleLower.includes('professional')) difficulty = 5;
  
  const criScore = Math.max(0, Math.min(100, 
    baseScore + providerWeights[params.provider] + qualityBonus
  ));
  
  return { criScore, difficulty };
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const body: ResolveRequest = await req.json();
    console.log('Resolving URL:', body.url);
    
    // Detect provider and extract ID
    const { provider, externalId } = detectProvider(body.url);
    console.log(`Detected provider: ${provider}, external_id: ${externalId}`);
    
    // Check if already exists
    const { data: existing } = await supabase
      .from('alternative_courses')
      .select('*')
      .eq('provider', provider)
      .eq('external_id', externalId || body.url)
      .single();
    
    if (existing) {
      console.log('Course already exists, returning existing record');
      return new Response(JSON.stringify({ 
        success: true, 
        course: existing,
        cached: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Fetch fresh metadata
    const metadata = await fetchMetadata(body.url);
    const skills = mapSkills(metadata.title, metadata.description);
    const { criScore, difficulty } = calculateCRI({
      provider,
      title: metadata.title,
      description: metadata.description
    });
    
    // Insert new course
    const courseData = {
      provider,
      external_id: externalId || body.url,
      title: metadata.title,
      description: metadata.description,
      url: body.url,
      creator_name: null,
      published_at: null,
      estimated_hours: null,
      difficulty,
      cri_score: criScore,
      skills: skills
    };
    
    const { data: course, error } = await supabase
      .from('alternative_courses')
      .insert(courseData)
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    console.log('Successfully resolved and stored course:', course.id);
    
    return new Response(JSON.stringify({ 
      success: true, 
      course,
      cached: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Alt-resolve error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Failed to resolve course'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
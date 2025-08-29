import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PlaylistImportRequest {
  url: string;
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
    console.log('Playlist import requested');
    const body: PlaylistImportRequest = await req.json();
    
    // Phase 1: Return mock data for UI development
    // Phase 2: Implement real YouTube API integration
    
    const mockItems = [
      {
        provider: 'youtube',
        external_id: 'dQw4w9WgXcQ',
        title: 'Introduction to Web Development',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        description: 'Learn the basics of HTML, CSS, and JavaScript',
        estimated_hours: 2,
        difficulty: 2,
        cri_score: 65,
        skills: [{ name: 'html', weight: 0.8 }, { name: 'css', weight: 0.7 }]
      },
      {
        provider: 'youtube', 
        external_id: 'oHg5SJYRHA0',
        title: 'Advanced JavaScript Concepts',
        url: 'https://www.youtube.com/watch?v=oHg5SJYRHA0',
        description: 'Deep dive into closures, promises, and async/await',
        estimated_hours: 3,
        difficulty: 4,
        cri_score: 75,
        skills: [{ name: 'javascript', weight: 0.9 }, { name: 'async', weight: 0.8 }]
      },
      {
        provider: 'youtube',
        external_id: 'M7lc1UVf-VE',
        title: 'React Fundamentals',
        url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE', 
        description: 'Build your first React application from scratch',
        estimated_hours: 4,
        difficulty: 3,
        cri_score: 80,
        skills: [{ name: 'react', weight: 0.9 }, { name: 'javascript', weight: 0.7 }]
      }
    ];
    
    console.log(`Returning ${mockItems.length} mock playlist items`);
    
    return new Response(JSON.stringify({
      success: true,
      items: mockItems,
      total: mockItems.length,
      mock: true // Indicate this is mock data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Playlist import error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to import playlist'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
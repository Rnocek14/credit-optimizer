import { corsHeaders } from '../_shared/utils.ts';

interface PlaylistImportRequest {
  playlistUrl: string;
  trackId?: string;
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
    const { playlistUrl, trackId }: PlaylistImportRequest = await req.json();
    
    if (!playlistUrl) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Playlist URL is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('[edge:yt-playlist-import] start');
    console.log('[edge:yt-playlist-import] Processing playlist:', playlistUrl);
    
    // Mock implementation - simulate playlist processing
    console.log('[edge:yt-playlist-import] mock=true total=5');
    
    const mockItems = Array.from({ length: 5 }, (_, i) => ({
      id: `mock-${i + 1}`,
      provider: 'youtube',
      external_id: `mock-video-${i + 1}`,
      title: `Mock Course ${i + 1}: Advanced Development`,
      description: `This is a mock course description for testing the playlist import functionality.`,
      url: `https://youtube.com/watch?v=mock-${i + 1}`,
      creator_name: 'Mock Instructor',
      published_at: new Date().toISOString(),
      estimated_hours: Math.floor(Math.random() * 10) + 1,
      difficulty: Math.floor(Math.random() * 5) + 1,
      cri_score: Math.floor(Math.random() * 40) + 60,
      skills: [{ name: 'development', weight: 0.8 }],
      created_at: new Date().toISOString()
    }));
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Playlist import completed (mock)',
      items: mockItems,
      total: mockItems.length,
      mock: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[yt-playlist-import] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
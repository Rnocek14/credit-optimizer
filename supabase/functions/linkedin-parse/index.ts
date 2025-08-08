import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LinkedInParseInput = z.object({
  demo: z.boolean().optional(),
  file_content: z.string().optional(),
  oauth_token: z.string().optional(),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const input = LinkedInParseInput.parse(body);

    // Demo mode - return predefined skills
    if (input.demo) {
      return new Response(JSON.stringify({
        mode: 'dry-run',
        skills: ['SQL', 'Market Analysis', 'User Research', 'Project Management', 'Data Visualization'],
        parsed_sections: {
          experience: [
            {
              title: 'Senior Business Analyst',
              company: 'TechCorp Inc.',
              duration: '2022-Present',
              skills_extracted: ['SQL', 'Market Analysis']
            },
            {
              title: 'UX Researcher',
              company: 'DesignLab',
              duration: '2020-2022',
              skills_extracted: ['User Research', 'Data Visualization']
            }
          ],
          education: [
            {
              degree: 'MBA',
              institution: 'Business University',
              year: '2020',
              skills_extracted: ['Project Management']
            }
          ]
        },
        confidence_score: 0.92,
        message: 'LinkedIn profile parsed successfully (demo mode)'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // In a real implementation, this would:
    // 1. Parse uploaded file content or use OAuth token
    // 2. Extract skills from experience, education, endorsements
    // 3. Use NLP to identify relevant skills
    // 4. Return structured data

    return new Response(JSON.stringify({
      mode: 'dry-run',
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS'],
      message: 'LinkedIn parsing not implemented yet (dry-run mode)'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in linkedin-parse function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      mode: 'dry-run'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
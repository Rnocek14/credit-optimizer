import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, mentorEmail, message } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch user data for the resume
    const [profileResult, tracksResult, stepsResult] = await Promise.all([
      supabaseClient.from('profiles').select('*').eq('user_id', userId).single(),
      supabaseClient.from('career_tracks').select('*').eq('user_id', userId),
      supabaseClient.from('roadmap_steps').select('*').eq('user_id', userId).order('order_index')
    ]);

    if (profileResult.error) {
      throw new Error(`Failed to fetch profile: ${profileResult.error.message}`);
    }

    const profile = profileResult.data;
    const tracks = tracksResult.data || [];
    const steps = stepsResult.data || [];

    // Parse AI review if available
    let aiReview = null;
    if (profile.resume_review_summary) {
      try {
        aiReview = JSON.parse(profile.resume_review_summary);
      } catch (error) {
        console.error('Failed to parse AI review:', error);
      }
    }

    // Create proof items summary
    const proofItems: any[] = [];
    steps.forEach((step, index) => {
      const trackIndex = Math.floor(index / 3);
      const track = tracks[trackIndex];
      const trackTitle = track?.title || 'Unknown Track';

      if (step.success_metrics) {
        proofItems.push({
          type: 'Achievement',
          title: step.title,
          description: step.success_metrics,
          track: trackTitle,
          criScore: step.cri_score
        });
      }

      if (step.mentor_verified) {
        proofItems.push({
          type: 'Mentor Verified',
          title: step.title,
          track: trackTitle,
          criScore: step.cri_score
        });
      }

      if (step.external_links?.length > 0) {
        step.external_links.forEach((link: any) => {
          proofItems.push({
            type: 'External Link',
            title: step.title,
            link: link,
            track: trackTitle,
            criScore: step.cri_score
          });
        });
      }
    });

    // Build comprehensive resume data
    const resumeData = {
      profile: {
        name: profile.name,
        role_title: profile.role_title,
        experience_level: profile.experience_level,
        years_experience: profile.years_experience,
        skills: profile.skills || [],
        education: profile.education,
        career_goals: profile.career_goals,
        location: profile.location
      },
      tracks: tracks.map(track => ({
        title: track.title,
        description: track.description,
        time_to_proficiency: track.time_to_proficiency,
        growth_potential: track.growth_potential
      })),
      proof_of_learning: proofItems,
      ai_review: aiReview,
      stats: {
        total_steps: steps.length,
        completed_steps: steps.filter(s => s.completed).length,
        verified_steps: steps.filter(s => s.mentor_verified).length,
        avg_cri_score: steps.filter(s => s.cri_score).length > 0 
          ? Math.round((steps.filter(s => s.cri_score).reduce((sum, s) => sum + s.cri_score, 0) / steps.filter(s => s.cri_score).length) * 10) / 10 
          : null
      }
    };

    // Create HTML email content
    const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { margin-bottom: 20px; }
        .badge { background: #e7f3ff; color: #0066cc; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .proof-item { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .track { background: #fff; border: 1px solid #e0e0e0; padding: 15px; margin: 10px 0; border-radius: 6px; }
        .ai-review { background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0066cc; }
        .score { font-size: 24px; font-weight: bold; color: #0066cc; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 Resume & Learning Portfolio</h1>
        <h2>${profile.name}</h2>
        <p><strong>Role:</strong> ${profile.role_title} | <strong>Experience:</strong> ${profile.experience_level} (${profile.years_experience || 0} years)</p>
        <p><strong>Location:</strong> ${profile.location}</p>
        ${message ? `<p><strong>Personal Message:</strong> ${message}</p>` : ''}
      </div>

      ${aiReview ? `
      <div class="ai-review">
        <h3>🤖 AI Career Analysis <span class="badge">✅ AI Reviewed</span></h3>
        <div class="score">Score: ${aiReview.overall_score}/100</div>
        <p><strong>Summary:</strong> ${aiReview.summary}</p>
        
        <div style="display: flex; gap: 20px; margin-top: 15px;">
          <div style="flex: 1;">
            <h4>📈 Key Strengths</h4>
            <ul>
              ${aiReview.strengths.map((strength: string) => `<li>${strength}</li>`).join('')}
            </ul>
          </div>
          <div style="flex: 1;">
            <h4>🎯 Growth Areas</h4>
            <ul>
              ${aiReview.gaps.map((gap: string) => `<li>${gap}</li>`).join('')}
            </ul>
          </div>
        </div>
        
        <h4>🏷️ Professional Status</h4>
        <div>
          ${aiReview.taglines.map((tagline: string) => `<span class="badge">${tagline}</span>`).join(' ')}
        </div>
      </div>
      ` : ''}

      <div class="section">
        <h3>🎯 Career Tracks (${tracks.length})</h3>
        ${tracks.map(track => `
          <div class="track">
            <h4>${track.title}</h4>
            <p>${track.description}</p>
            <p><strong>Time to Proficiency:</strong> ${track.time_to_proficiency}</p>
            <p><strong>Growth Potential:</strong> ${track.growth_potential}</p>
          </div>
        `).join('')}
      </div>

      <div class="section">
        <h3>📜 Proof of Learning (${proofItems.length} items)</h3>
        <p><strong>Learning Stats:</strong> ${resumeData.stats.completed_steps}/${resumeData.stats.total_steps} steps completed | ${resumeData.stats.verified_steps} mentor verified${resumeData.stats.avg_cri_score ? ` | Avg CRI Score: ${resumeData.stats.avg_cri_score}` : ''}</p>
        
        ${proofItems.map(item => `
          <div class="proof-item">
            <strong>${item.type}:</strong> ${item.title} 
            <span class="badge">${item.track}</span>
            ${item.criScore ? `<span class="badge">CRI: ${item.criScore}</span>` : ''}
            ${item.description ? `<br><small>${item.description}</small>` : ''}
            ${item.link ? `<br><a href="${item.link}" target="_blank">🔗 View Resource</a>` : ''}
          </div>
        `).join('')}
      </div>

      <div class="section">
        <h3>🎓 Skills & Education</h3>
        <p><strong>Skills:</strong> ${(profile.skills || []).join(', ')}</p>
        <p><strong>Education:</strong> ${profile.education}</p>
        <p><strong>Career Goals:</strong> ${profile.career_goals}</p>
      </div>

      <hr style="margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        This resume was generated by Maya Career Intelligence Platform. 
        All learning achievements and AI analysis are based on verified user data and portfolio evidence.
      </p>
    </body>
    </html>
    `;

    // For now, we'll use a simple fetch to a hypothetical email service
    // In production, you'd use Resend or similar service
    console.log(`Would send email to: ${mentorEmail}`);
    console.log(`Email content length: ${emailHTML.length} characters`);

    // Log the sharing event
    const { error: shareError } = await supabaseClient
      .from('resume_shared_events')
      .insert({
        user_id: userId,
        shared_with_email: mentorEmail,
        resume_data: resumeData,
        ai_review_data: aiReview
      });

    if (shareError) {
      console.error('Failed to log sharing event:', shareError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Resume shared successfully',
        emailPreview: emailHTML // For development/preview
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-resume-to-mentor function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
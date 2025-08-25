import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { ok, withCircuitBreaker, requireUser, rateLimit, corsHeaders } from "../_shared/utils.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return withCircuitBreaker(async () => {
    const { user, supabase } = await requireUser(req);
    const event = await req.json(); // {type, payload}

    await rateLimit(user.id, "maya_ctx", 10, 40); // 40/10s burst

    console.log('Maya Context Processor - Processing event:', { userId: user.id, eventType: event.type });

    // Store raw event
    await supabase.from("maya_context_tracking").insert({
      user_id: user.id,
      event_type: event.type,
      payload: event.payload ?? {},
    });

    // Simple rules → immediate insights (upgrade later with ML)
    let insightGenerated = false;

    if (event.type === "page_visit" && event.payload?.path === "/plan") {
      await supabase.from("maya_proactive_insights").insert({
        user_id: user.id,
        title: "Ready for the next step on your plan?",
        body: "You're viewing your career plan. Would you like me to analyze your current progress and recommend the next prioritized action?",
        priority: "medium",
        kind: "trigger",
        meta: { trigger: "visit_plan", path: event.payload.path },
      });
      insightGenerated = true;
    }

    if (event.type === "goal_progress" && event.payload?.progress >= 80) {
      await supabase.from("maya_proactive_insights").insert({
        user_id: user.id,
        title: "Goal almost complete! 🎯",
        body: `You're ${event.payload.progress}% complete with your goal. Time to prepare for the next milestone or set a new challenge?`,
        priority: "high",
        kind: "trigger",
        meta: { trigger: "goal_near_completion", progress: event.payload.progress },
      });
      insightGenerated = true;
    }

    if (event.type === "course_completed") {
      await supabase.from("maya_proactive_insights").insert({
        user_id: user.id,
        title: "Course completed! What's next? 📚",
        body: "Great job completing that course! Let me find related courses or projects to maintain your learning momentum.",
        priority: "high",
        kind: "trigger",
        meta: { trigger: "course_completed", course_id: event.payload?.course_id },
      });
      insightGenerated = true;
    }

    console.log('Maya Context Processor - Success:', { 
      userId: user.id, 
      eventType: event.type,
      insightGenerated 
    });

    return { 
      success: true,
      stored: true,
      insightGenerated,
      timestamp: new Date().toISOString()
    };
  });
});
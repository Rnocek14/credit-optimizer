import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { career_title, create_comprehensive = false } = await req.json();

    console.log('Creating skill tree for:', career_title);

    // 1. Generate comprehensive career roadmap using GPT-4
    const roadmapPrompt = `Create a comprehensive career roadmap for "${career_title}". 

Generate a JSON response with this exact structure:
{
  "career_path": {
    "title": "${career_title}",
    "description": "2-3 sentence overview of this career",
    "industry": "Primary industry category",
    "level": "Entry|Mid|Senior",
    "average_salary": 75000,
    "growth_outlook": "Growing|Stable|Declining"
  },
  "career_steps": [
    {
      "title": "Step title",
      "description": "What this step involves",
      "step_order": 1,
      "step_type": "education|certification|skill|project|job|milestone",
      "estimated_time": "2-3 months",
      "estimated_cost": "$0-500",
      "is_terminal": false,
      "prerequisites": []
    }
  ],
  "skills": [
    {
      "name": "Skill name",
      "category": "Programming|Framework|Tools|Design|Data|DevOps|Testing|Communication",
      "description": "Brief skill description"
    }
  ],
  "step_skills": [
    {
      "step_index": 0,
      "skill_name": "HTML",
      "importance_score": 0.9
    }
  ]
}

Requirements:
- Create 8-12 progressive career steps
- Include foundational skills first, then advanced ones
- Mark the final job/role step as is_terminal: true
- Include 20-30 relevant skills across categories
- Map 3-6 key skills to each step with importance scores
- Build logical prerequisite chains (later steps depend on earlier ones)
- Include realistic time/cost estimates
- Cover entry to advanced proficiency levels`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert career advisor and curriculum designer. Generate comprehensive, realistic career roadmaps with proper skill progression.' },
          { role: 'user', content: roadmapPrompt }
        ],
        temperature: 0.3,
      }),
    });

    const gptData = await response.json();
    const roadmapData = JSON.parse(gptData.choices[0].message.content);

    console.log('Generated roadmap data:', roadmapData);

    // 2. Create career path
    const { data: careerPath, error: pathError } = await supabaseClient
      .from('career_paths')
      .insert([roadmapData.career_path])
      .select()
      .single();

    if (pathError) {
      console.error('Error creating career path:', pathError);
      throw pathError;
    }

    // 3. Create or find skills
    const skillsToCreate = [];
    const skillIdMap = new Map();

    for (const skill of roadmapData.skills) {
      // Check if skill already exists
      const { data: existingSkill } = await supabaseClient
        .from('skills')
        .select('id')
        .eq('name', skill.name)
        .single();

      if (existingSkill) {
        skillIdMap.set(skill.name, existingSkill.id);
      } else {
        skillsToCreate.push({
          ...skill,
          slug: skill.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
        });
      }
    }

    // Insert new skills
    if (skillsToCreate.length > 0) {
      const { data: newSkills, error: skillsError } = await supabaseClient
        .from('skills')
        .insert(skillsToCreate)
        .select();

      if (skillsError) {
        console.error('Error creating skills:', skillsError);
        throw skillsError;
      }

      // Map new skill IDs
      newSkills.forEach(skill => {
        skillIdMap.set(skill.name, skill.id);
      });
    }

    // 4. Create career steps
    const stepsToCreate = roadmapData.career_steps.map((step: any, index: number) => ({
      ...step,
      career_path_id: careerPath.id,
      step_order: index + 1,
    }));

    const { data: createdSteps, error: stepsError } = await supabaseClient
      .from('career_steps')
      .insert(stepsToCreate)
      .select();

    if (stepsError) {
      console.error('Error creating career steps:', stepsError);
      throw stepsError;
    }

    // 5. Map skills to steps
    const stepSkillMappings: any[] = [];
    
    roadmapData.step_skills.forEach((mapping: any) => {
      const step = createdSteps[mapping.step_index];
      const skillId = skillIdMap.get(mapping.skill_name);
      
      if (step && skillId) {
        stepSkillMappings.push({
          step_id: step.id,
          skill_id: skillId,
          importance_score: Math.round(mapping.importance_score)
        });
      }
    });

    if (stepSkillMappings.length > 0) {
      const { error: mappingError } = await supabaseClient
        .from('career_step_skills')
        .insert(stepSkillMappings);

      if (mappingError) {
        console.error('Error creating step-skill mappings:', mappingError);
        throw mappingError;
      }
    }

    // 6. Update prerequisites (after steps are created)
    for (let i = 0; i < roadmapData.career_steps.length; i++) {
      const stepData = roadmapData.career_steps[i];
      if (stepData.prerequisites && stepData.prerequisites.length > 0) {
        const prerequisiteIds = stepData.prerequisites.map((prereqIndex: any) => 
          createdSteps[prereqIndex]?.id
        ).filter(Boolean);

        if (prerequisiteIds.length > 0) {
          await supabaseClient
            .from('career_steps')
            .update({ prerequisites: prerequisiteIds })
            .eq('id', createdSteps[i].id);
        }
      }
    }

    console.log('Successfully created skill tree:', {
      careerPath: careerPath.title,
      steps: createdSteps.length,
      skills: skillIdMap.size,
      mappings: stepSkillMappings.length
    });

    return new Response(JSON.stringify({
      success: true,
      career_path: careerPath,
      steps_created: createdSteps.length,
      skills_created: skillsToCreate.length,
      skills_total: skillIdMap.size,
      mappings_created: stepSkillMappings.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-skill-tree function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { nodeId, targetType, limit = 5 } = await req.json();

    console.log(`🔍 Semantic matching for node ${nodeId}, target type: ${targetType}`);

    // Get the source node
    const { data: sourceNode, error: sourceError } = await supabaseClient
      .from('career_graph_nodes')
      .select('*')
      .eq('id', nodeId)
      .single();

    if (sourceError || !sourceNode) {
      throw new Error(`Source node not found: ${sourceError?.message}`);
    }

    // Get potential target nodes
    const { data: targetNodes, error: targetError } = await supabaseClient
      .from('career_graph_nodes')
      .select('*')
      .eq('node_type', targetType)
      .eq('active', true)
      .neq('id', nodeId);

    if (targetError) {
      throw new Error(`Error fetching target nodes: ${targetError.message}`);
    }

    console.log(`📊 Found ${targetNodes?.length || 0} potential targets`);

    // Use GPT-4 to analyze semantic relationships
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `Analyze semantic relationships between a ${sourceNode.node_type} and potential ${targetType} matches.

SOURCE NODE:
- Title: ${sourceNode.title}
- Description: ${sourceNode.description || 'No description'}
- Category: ${sourceNode.category || 'Unknown'}

POTENTIAL TARGETS:
${targetNodes?.map((node, i) => `${i + 1}. ${node.title} - ${node.description || 'No description'}`).join('\n') || 'None'}

For each target, determine:
1. Semantic similarity score (0-100)
2. Relationship type (teaches, requires, supports, leads_to, validates, qualifies_for)
3. Confidence level (0-100)
4. Brief reasoning

Return JSON array with matches scoring above 30:
[
  {
    "targetId": "uuid",
    "similarityScore": 85,
    "relationshipType": "teaches",
    "confidence": 90,
    "reasoning": "Brief explanation"
  }
]

Consider:
- Skill prerequisites and progressions
- Course-to-skill teaching relationships
- Job-to-skill requirements
- Career step connections
- Project skill demonstrations
- Certification validations`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: 'You are an expert career path analyzer. Return only valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    const aiResult = await response.json();
    console.log('🤖 AI analysis complete');

    let semanticMatches = [];
    try {
      semanticMatches = JSON.parse(aiResult.choices[0].message.content);
    } catch (e) {
      console.error('Failed to parse AI response, using fallback matching');
      
      // Fallback: simple title similarity
      semanticMatches = targetNodes?.slice(0, limit).map(node => ({
        targetId: node.id,
        similarityScore: calculateTitleSimilarity(sourceNode.title, node.title),
        relationshipType: getDefaultRelationship(sourceNode.node_type, targetType),
        confidence: 60,
        reasoning: 'Fallback title similarity matching'
      })).filter(match => match.similarityScore > 30) || [];
    }

    // Update semantic tags for the source node based on AI analysis
    const semanticTags = extractSemanticTags(sourceNode, semanticMatches);
    await supabaseClient
      .from('career_graph_nodes')
      .update({ 
        semantic_tags: semanticTags,
        last_analyzed: new Date().toISOString()
      })
      .eq('id', nodeId);

    console.log(`✅ Found ${semanticMatches.length} semantic matches`);

    return new Response(
      JSON.stringify({
        success: true,
        sourceNode,
        matches: semanticMatches.slice(0, limit),
        totalMatches: semanticMatches.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Semantic matching error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        matches: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function calculateTitleSimilarity(title1: string, title2: string): number {
  const words1 = title1.toLowerCase().split(/\s+/);
  const words2 = title2.toLowerCase().split(/\s+/);
  
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = new Set([...words1, ...words2]).size;
  
  return Math.round((commonWords.length / totalWords) * 100);
}

function getDefaultRelationship(sourceType: string, targetType: string): string {
  const relationships: Record<string, Record<string, string>> = {
    course: { skill: 'teaches', step: 'supports' },
    skill: { skill: 'requires', job: 'qualifies_for' },
    step: { skill: 'teaches', job: 'leads_to' },
    project: { skill: 'validates' },
    certification: { skill: 'validates', job: 'qualifies_for' }
  };
  
  return relationships[sourceType]?.[targetType] || 'supports';
}

function extractSemanticTags(node: any, matches: any[]): string[] {
  const tags = new Set<string>();
  
  // Add category as tag
  if (node.category) tags.add(node.category.toLowerCase());
  
  // Add node type
  tags.add(node.node_type);
  
  // Extract keywords from title
  const titleWords = node.title.toLowerCase()
    .split(/[^a-z0-9]/g)
    .filter(word => word.length > 3);
  titleWords.forEach(word => tags.add(word));
  
  // Add relationship types from matches
  matches.forEach(match => {
    if (match.confidence > 70) {
      tags.add(match.relationshipType);
    }
  });
  
  return Array.from(tags).slice(0, 10); // Limit to 10 tags
}
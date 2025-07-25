import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { careerPath, location, sources = ['linkedin', 'indeed', 'glassdoor'] } = await req.json();

    if (!careerPath || !location) {
      return new Response(JSON.stringify({ error: 'Career path and location are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Aggregating job market data for ${careerPath} in ${location} from sources: ${sources.join(', ')}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Simulate real-time job market data aggregation
    const aggregatedData = await aggregateJobMarketData(careerPath, location, sources);

    // Store the aggregated data for caching
    await cacheJobMarketData(supabase, careerPath, location, aggregatedData);

    console.log('✅ Job market data aggregated successfully');

    return new Response(JSON.stringify(aggregatedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Job market aggregation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Job market aggregation failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function aggregateJobMarketData(careerPath: string, location: string, sources: string[]) {
  const aggregatedResults = [];

  for (const source of sources) {
    try {
      const jobData = await fetchJobDataFromSource(source, careerPath, location);
      aggregatedResults.push(jobData);
    } catch (error) {
      console.error(`⚠️ Failed to fetch data from ${source}:`, error);
      // Continue with other sources even if one fails
    }
  }

  return aggregatedResults;
}

async function fetchJobDataFromSource(source: string, careerPath: string, location: string) {
  // In a real implementation, these would be actual API calls
  // For now, we'll simulate the data based on realistic patterns

  const baseData = {
    source,
    updated_at: new Date().toISOString(),
    career_path: careerPath,
    location
  };

  switch (source) {
    case 'linkedin':
      return {
        ...baseData,
        job_count: Math.floor(Math.random() * 5000) + 1000,
        average_salary: Math.floor(Math.random() * 100000) + 80000,
        companies: ['Microsoft', 'Google', 'Amazon', 'Meta', 'Apple'],
        skills: getRelevantSkills(careerPath),
        insights: {
          premium_jobs_percentage: Math.floor(Math.random() * 30) + 20,
          remote_percentage: Math.floor(Math.random() * 40) + 30,
          experience_distribution: {
            'entry': Math.floor(Math.random() * 20) + 15,
            'mid': Math.floor(Math.random() * 30) + 40,
            'senior': Math.floor(Math.random() * 25) + 25
          }
        }
      };

    case 'indeed':
      return {
        ...baseData,
        job_count: Math.floor(Math.random() * 8000) + 2000,
        average_salary: Math.floor(Math.random() * 90000) + 70000,
        companies: ['Indeed', 'Glassdoor', 'Monster', 'ZipRecruiter'],
        skills: getRelevantSkills(careerPath),
        insights: {
          application_competition: Math.floor(Math.random() * 50) + 20,
          salary_transparency: Math.floor(Math.random() * 60) + 40,
          company_reviews_avg: (Math.random() * 2 + 3).toFixed(1)
        }
      };

    case 'glassdoor':
      return {
        ...baseData,
        job_count: Math.floor(Math.random() * 3000) + 500,
        average_salary: Math.floor(Math.random() * 110000) + 90000,
        companies: ['Glassdoor', 'Facebook', 'Netflix', 'Uber'],
        skills: getRelevantSkills(careerPath),
        insights: {
          employee_satisfaction: (Math.random() * 2 + 3).toFixed(1),
          interview_difficulty: Math.floor(Math.random() * 3) + 2,
          benefits_rating: (Math.random() * 1.5 + 3.5).toFixed(1)
        }
      };

    default:
      throw new Error(`Unknown job data source: ${source}`);
  }
}

function getRelevantSkills(careerPath: string): string[] {
  const skillMap: { [key: string]: string[] } = {
    'Software Engineer': ['Python', 'JavaScript', 'React', 'Node.js', 'AWS', 'Docker'],
    'Data Scientist': ['Python', 'R', 'SQL', 'Machine Learning', 'Tableau', 'Pandas'],
    'Product Manager': ['Strategy', 'Analytics', 'SQL', 'A/B Testing', 'Roadmapping'],
    'UX Designer': ['Figma', 'Sketch', 'Prototyping', 'User Research', 'Adobe Creative Suite'],
    'DevOps Engineer': ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'Jenkins', 'CI/CD'],
    'Cybersecurity Analyst': ['SIEM', 'Incident Response', 'Penetration Testing', 'Python', 'Network Security'],
    'Digital Marketing Manager': ['Google Analytics', 'SEO', 'SEM', 'Social Media', 'Content Marketing']
  };

  return skillMap[careerPath] || ['Communication', 'Problem Solving', 'Teamwork', 'Leadership'];
}

async function cacheJobMarketData(supabase: any, careerPath: string, location: string, data: any) {
  try {
    // Cache the aggregated data for 1 hour
    const cacheKey = `job_market_${careerPath}_${location}`;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await supabase.from('ai_operation_cache').upsert({
      input_hash: cacheKey,
      operation_type: 'job_market_aggregation',
      result_data: data,
      expires_at: expiresAt.toISOString(),
      confidence_score: 0.9
    }, {
      onConflict: 'input_hash,operation_type'
    });

    console.log(`✅ Cached job market data for ${careerPath} in ${location}`);
  } catch (error) {
    console.error('⚠️ Failed to cache job market data:', error);
    // Don't throw - caching failure shouldn't break the main functionality
  }
}
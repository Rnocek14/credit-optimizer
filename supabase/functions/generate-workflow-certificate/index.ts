import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CertificateRequest {
  workflowId: string;
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { workflowId, userId }: CertificateRequest = await req.json()

    // Fetch workflow and related data
    const { data: workflow, error: workflowError } = await supabase
      .from('autonomous_workflows')
      .select(`
        *,
        workflow_steps (*)
      `)
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single()

    if (workflowError || !workflow) {
      throw new Error('Workflow not found')
    }

    // Check if workflow is completed
    if (workflow.status !== 'completed') {
      throw new Error('Workflow must be completed to generate certificate')
    }

    // Fetch Maya decisions for this workflow
    const { data: decisions, error: decisionsError } = await supabase
      .from('maya_decisions')
      .select('*')
      .eq('workflow_id', workflowId)

    if (decisionsError) {
      console.error('Error fetching decisions:', decisionsError)
    }

    const validDecisions = decisions || []

    // Calculate qualification metrics
    const totalDecisions = validDecisions.length
    const avgConfidence = totalDecisions > 0 
      ? validDecisions.reduce((sum, d) => sum + d.confidence_score, 0) / totalDecisions 
      : 0

    const userFeedbackDecisions = validDecisions.filter(d => d.user_feedback_rating)
    const avgUserRating = userFeedbackDecisions.length > 0
      ? userFeedbackDecisions.reduce((sum, d) => sum + (d.user_feedback_rating || 0), 0) / userFeedbackDecisions.length
      : 0

    const autonomousSteps = workflow.workflow_steps?.filter(s => s.is_autonomous).length || 0
    const manualSteps = workflow.workflow_steps?.filter(s => !s.is_autonomous).length || 0

    // Check qualification criteria
    const qualificationCriteria = {
      workflowCompleted: workflow.status === 'completed',
      minConfidence: avgConfidence >= 0.75, // 75% average confidence
      minUserRating: avgUserRating >= 3.5 || userFeedbackDecisions.length === 0, // 3.5+ rating or no feedback
      minDecisions: totalDecisions >= 3 // At least 3 Maya decisions
    }

    const isQualified = Object.values(qualificationCriteria).every(Boolean)

    if (!isQualified) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Workflow does not meet certificate qualification criteria',
          criteria: qualificationCriteria,
          metrics: {
            avgConfidence,
            avgUserRating,
            totalDecisions,
            autonomousSteps
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Check if certificate already exists
    const { data: existingCert } = await supabase
      .from('workflow_certificates')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('user_id', userId)
      .eq('is_revoked', false)
      .single()

    if (existingCert) {
      return new Response(
        JSON.stringify({
          success: true,
          certificate: existingCert,
          alreadyExists: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate certificate number and verification code
    const { data: certNumber } = await supabase.rpc('generate_certificate_number')
    const { data: verificationCode } = await supabase.rpc('generate_verification_code')

    // Prepare certificate data
    const certificateData = {
      workflow: {
        title: workflow.title,
        description: workflow.description,
        type: workflow.workflow_type,
        duration: workflow.estimated_duration_days
      },
      completion: {
        startedAt: workflow.started_at,
        completedAt: workflow.completed_at,
        progressPercentage: workflow.progress_percentage
      },
      maya: {
        totalDecisions,
        avgConfidence: Number((avgConfidence * 100).toFixed(1)),
        avgUserRating: Number(avgUserRating.toFixed(1)),
        autonomousSteps,
        manualSteps
      },
      user: {
        userId: userId
      },
      certificate: {
        number: certNumber,
        verificationCode: verificationCode,
        issuedAt: new Date().toISOString(),
        type: 'maya_certified'
      }
    }

    // Create certificate record
    const { data: certificate, error: certError } = await supabase
      .from('workflow_certificates')
      .insert({
        user_id: userId,
        workflow_id: workflowId,
        certificate_number: certNumber,
        verification_code: verificationCode,
        workflow_title: workflow.title,
        workflow_description: workflow.description,
        completion_date: workflow.completed_at,
        maya_confidence_score: avgConfidence,
        user_feedback_score: avgUserRating,
        total_decisions: totalDecisions,
        autonomous_steps: autonomousSteps,
        manual_steps: manualSteps,
        certificate_data: certificateData
      })
      .select()
      .single()

    if (certError) {
      throw new Error(`Failed to create certificate: ${certError.message}`)
    }

    // Trigger badge assignment for Maya Certified badge
    try {
      await supabase.functions.invoke('assign-badges', {
        body: { user_id: userId }
      })
    } catch (badgeError) {
      console.log('Badge assignment failed, but certificate was created:', badgeError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        certificate,
        qualificationMet: true,
        metrics: {
          avgConfidence: Number((avgConfidence * 100).toFixed(1)),
          avgUserRating: Number(avgUserRating.toFixed(1)),
          totalDecisions,
          autonomousSteps,
          manualSteps
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error generating certificate:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
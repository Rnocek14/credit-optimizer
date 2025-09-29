import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CertificateRequest {
  userId: string;
  action: 'generate_certificate' | 'verify_certificate' | 'list_certificates';
  certificateType: 'course_completion' | 'skill_verification' | 'career_milestone' | 'workflow_completion';
  certificateData?: any;
  verificationCode?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, action, certificateType, certificateData, verificationCode }: CertificateRequest = await req.json();

    console.log(`Certificate generation: ${action} for user ${userId}`);

    switch (action) {
      case 'generate_certificate':
        return await generateCertificate(supabaseClient, userId, certificateType, certificateData);
      
      case 'verify_certificate':
        return await verifyCertificate(supabaseClient, verificationCode!);
      
      case 'list_certificates':
        return await listUserCertificates(supabaseClient, userId);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in certificate-generation:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function generateCertificate(supabase: any, userId: string, certificateType: string, certificateData: any) {
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!profile) {
    throw new Error('User profile not found');
  }

  // Generate certificate metadata
  const certificateMetadata = await buildCertificateMetadata(supabase, userId, certificateType, certificateData);
  
  // Generate verification code
  const verificationCode = generateVerificationCode();
  
  // Create certificate record
  const { data: certificate } = await supabase
    .from('workflow_certificates')
    .insert({
      user_id: userId,
      certificate_type: certificateType,
      certificate_number: generateCertificateNumber(),
      verification_code: verificationCode,
      recipient_name: profile.name || 'Unknown User',
      achievement_title: certificateMetadata.title,
      achievement_description: certificateMetadata.description,
      skills_demonstrated: certificateMetadata.skills,
      completion_date: new Date().toISOString(),
      certificate_data: {
        ...certificateMetadata,
        templateVersion: '1.0',
        issuer: 'Maya Career Intelligence',
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      },
      is_verified: true,
      issued_at: new Date().toISOString()
    })
    .select()
    .single();

  // Generate PDF content (simplified)
  const pdfContent = await generateCertificatePDF(certificate, profile);
  
  // Store in Supabase Storage (simulation)
  const fileName = `certificates/${certificate.id}.pdf`;
  
  return new Response(
    JSON.stringify({
      success: true,
      certificateId: certificate.id,
      verificationCode: verificationCode,
      certificateNumber: certificate.certificate_number,
      downloadUrl: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/certificates/${fileName}`,
      metadata: certificateMetadata,
      validUntil: certificate.certificate_data.validUntil
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function verifyCertificate(supabase: any, verificationCode: string) {
  const { data: certificate } = await supabase
    .from('workflow_certificates')
    .select('*')
    .eq('verification_code', verificationCode)
    .single();

  if (!certificate) {
    return new Response(
      JSON.stringify({
        valid: false,
        error: 'Certificate not found'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if certificate is still valid
  const validUntil = new Date(certificate.certificate_data.validUntil);
  const isExpired = validUntil < new Date();

  // Get additional verification data
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('user_id', certificate.user_id)
    .single();

  return new Response(
    JSON.stringify({
      valid: !isExpired,
      expired: isExpired,
      certificate: {
        id: certificate.id,
        number: certificate.certificate_number,
        recipientName: certificate.recipient_name,
        achievementTitle: certificate.achievement_title,
        achievementDescription: certificate.achievement_description,
        skillsDemonstrated: certificate.skills_demonstrated,
        completionDate: certificate.completion_date,
        issueDate: certificate.issued_at,
        validUntil: certificate.certificate_data.validUntil,
        issuer: 'Maya Career Intelligence'
      },
      verificationDate: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function listUserCertificates(supabase: any, userId: string) {
  const { data: certificates } = await supabase
    .from('workflow_certificates')
    .select('*')
    .eq('user_id', userId)
    .order('issued_at', { ascending: false });

  const formattedCertificates = certificates?.map((cert: any) => ({
    id: cert.id,
    type: cert.certificate_type,
    title: cert.achievement_title,
    description: cert.achievement_description,
    skills: cert.skills_demonstrated,
    completionDate: cert.completion_date,
    issueDate: cert.issued_at,
    verificationCode: cert.verification_code,
    certificateNumber: cert.certificate_number,
    isVerified: cert.is_verified,
    downloadUrl: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/certificates/${cert.id}.pdf`
  })) || [];

  return new Response(
    JSON.stringify({
      certificates: formattedCertificates,
      totalCount: formattedCertificates.length,
      verified: formattedCertificates.filter((c: any) => c.isVerified).length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function buildCertificateMetadata(supabase: any, userId: string, certificateType: string, certificateData: any) {
  let metadata = {
    title: 'Career Achievement',
    description: 'Successfully completed career milestone',
    skills: [] as string[],
    level: 'intermediate'
  };

  switch (certificateType) {
    case 'course_completion':
      metadata = {
        title: `Course Completion: ${certificateData.courseTitle || 'Professional Course'}`,
        description: `Successfully completed comprehensive training in ${certificateData.subject || 'professional development'}`,
        skills: certificateData.skillsLearned || ['Professional Development'],
        level: certificateData.difficulty || 'intermediate'
      };
      break;

    case 'skill_verification':
      metadata = {
        title: `Skill Verification: ${certificateData.skillName || 'Professional Skill'}`,
        description: `Demonstrated proficiency in ${certificateData.skillName || 'professional skill'}`,
        skills: [certificateData.skillName || 'Professional Skill'],
        level: certificateData.proficiencyLevel || 'intermediate'
      };
      break;

    case 'career_milestone':
      metadata = {
        title: `Career Milestone: ${certificateData.milestoneName || 'Professional Achievement'}`,
        description: `Achieved significant career milestone in professional development`,
        skills: certificateData.skillsGained || ['Leadership', 'Professional Growth'],
        level: 'advanced'
      };
      break;

    case 'workflow_completion':
      metadata = {
        title: `Workflow Completion: ${certificateData.workflowName || 'Career Development Program'}`,
        description: `Successfully completed autonomous career development workflow`,
        skills: certificateData.skillsDeveloped || ['Career Planning', 'Professional Development'],
        level: certificateData.workflowLevel || 'intermediate'
      };
      break;
  }

  return metadata;
}

function generateVerificationCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `MAYA-${year}-${random}`;
}

async function generateCertificatePDF(certificate: any, profile: any): Promise<string> {
  // This is a simplified PDF generation
  // In a real implementation, you would use a PDF library like jsPDF or similar
  
  const pdfContent = `
    MAYA CAREER INTELLIGENCE CERTIFICATE
    
    Certificate Number: ${certificate.certificate_number}
    
    This is to certify that
    
    ${certificate.recipient_name}
    
    has successfully completed
    
    ${certificate.achievement_title}
    
    ${certificate.achievement_description}
    
    Skills Demonstrated:
    ${certificate.skills_demonstrated?.join(', ') || 'Professional Development'}
    
    Completion Date: ${new Date(certificate.completion_date).toLocaleDateString()}
    Issue Date: ${new Date(certificate.issued_at).toLocaleDateString()}
    
    Verification Code: ${certificate.verification_code}
    
    Maya Career Intelligence
    Digital Career Development Platform
  `;
  
  // Return base64 encoded content (simplified)
  return btoa(pdfContent);
}
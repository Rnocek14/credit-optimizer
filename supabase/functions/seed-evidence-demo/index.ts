import { corsHeaders, json, badRequest, serverError } from '../_shared/responseHelpers.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Demo user IDs for seeding
const DEMO_USERS = [
  '2b458624-d498-4cca-a63d-9341cc20e363', // Aisha Khan
  '3c459625-e499-5ddb-b64d-a442dd21f474', // Mateo Silva  
  '4d56a736-f5aa-6eec-c75e-b553ee32e585'  // Jade Chen
];

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return badRequest('Only POST method allowed');
  }

  try {
    console.log('Seeding demo evidence data...');

    // Sample transcript data for each demo user
    const transcriptData = [
      {
        user_id: DEMO_USERS[0],
        institution: 'Community College of Denver',
        courses: [
          { subject: 'MATH', number: '241', title: 'Calculus I', credits: 4, grade: 'A', term: '2023FA' },
          { subject: 'ENG', number: '101', title: 'English Composition', credits: 3, grade: 'B+', term: '2023FA' },
          { subject: 'CS', number: '101', title: 'Intro to Programming', credits: 3, grade: 'A-', term: '2024SP' },
          { subject: 'STAT', number: '201', title: 'Statistics', credits: 3, grade: 'IP', term: '2024FA' }
        ]
      },
      {
        user_id: DEMO_USERS[1],
        institution: 'Austin Community College',
        courses: [
          { subject: 'MATH', number: '241', title: 'Calculus I', credits: 4, grade: 'B', term: '2023SP' },
          { subject: 'PHYS', number: '211', title: 'Physics I', credits: 4, grade: 'A', term: '2023FA' },
          { subject: 'CS', number: '201', title: 'Data Structures', credits: 3, grade: 'IP', term: '2024FA' }
        ]
      },
      {
        user_id: DEMO_USERS[2],
        institution: 'Portland Community College',
        courses: [
          { subject: 'BIO', number: '110', title: 'General Biology', credits: 4, grade: 'B+', term: '2023SP' },
          { subject: 'CHEM', number: '151', title: 'General Chemistry', credits: 4, grade: 'A-', term: '2023FA' }
        ]
      }
    ];

    let totalInserted = 0;

    for (const userData of transcriptData) {
      // Create a document record
      const { data: doc, error: docError } = await supabase
        .from('student_documents')
        .insert({
          user_id: userData.user_id,
          type: 'transcript',
          source: 'pdf',
          storage_path: `transcripts/${userData.user_id}/transcript.pdf`,
          parsed_json: { courses: userData.courses, institution: userData.institution }
        })
        .select()
        .single();

      if (docError) {
        console.error('Error creating document:', docError);
        continue;
      }

      // Insert raw course data
      for (const course of userData.courses) {
        const { data: rawCourse, error: rawError } = await supabase
          .from('student_courses_raw')
          .insert({
            user_id: userData.user_id,
            doc_id: doc.id,
            institution: userData.institution,
            term: course.term,
            subject: course.subject,
            number: course.number,
            title: course.title,
            credits: course.credits,
            grade: course.grade === 'IP' ? null : course.grade,
            raw_line: `${course.subject} ${course.number} ${course.title} ${course.credits} ${course.grade}`
          })
          .select()
          .single();

        if (rawError) {
          console.error('Error creating raw course:', rawError);
          continue;
        }

        // Create course mapping
        const catalogCourseId = `${course.subject}-${course.number}`;
        const confidence = course.grade === 'IP' ? 0.7 : 0.95;
        const status = course.grade === 'IP' ? 'auto' : 'confirmed';

        const { error: mapError } = await supabase
          .from('student_course_map')
          .insert({
            user_id: userData.user_id,
            raw_id: rawCourse.id,
            catalog_course_id: catalogCourseId,
            confidence: confidence,
            method: 'code',
            status: status
          });

        if (mapError) {
          console.error('Error creating course mapping:', mapError);
          continue;
        }

        totalInserted++;
      }
    }

    console.log(`Seeded ${totalInserted} course records across ${transcriptData.length} users`);

    return json(200, {
      success: true,
      message: `Successfully seeded ${totalInserted} course records for ${transcriptData.length} demo users`,
      users_seeded: DEMO_USERS.length
    });

  } catch (error) {
    console.error('Seeding error:', error);
    return serverError(error);
  }
});
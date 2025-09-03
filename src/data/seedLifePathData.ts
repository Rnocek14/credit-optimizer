// Seed script for Life Path Graph prototype data
import { supabase } from '@/integrations/supabase/client';

export async function seedLifePathData() {
  try {
    console.log('🌱 Seeding Life Path Graph data...');

    // Sample nodes for the prototype
    const nodes = [
      // Skills
      {
        id: 'skill-math-fundamentals',
        node_type: 'skill',
        title: 'Mathematics Fundamentals',
        description: 'Basic algebra and calculus concepts',
        estimated_hours: 120,
        cost: 0,
        difficulty: 2,
        modality: 'self-paced',
        tags: ['mathematics', 'foundational'],
        prerequisite_ids: [],
        skill_outcomes: ['algebra', 'basic-calculus']
      },
      {
        id: 'skill-programming-basics',
        node_type: 'skill',
        title: 'Programming Fundamentals',
        description: 'Basic programming concepts and logic',
        estimated_hours: 80,
        cost: 0,
        difficulty: 3,
        modality: 'self-paced',
        tags: ['programming', 'foundational'],
        prerequisite_ids: [],
        skill_outcomes: ['variables', 'loops', 'functions']
      },

      // Community College Courses
      {
        id: 'course-cc-math101',
        node_type: 'course',
        title: 'College Algebra',
        description: 'MAT 1105 - College level algebra course',
        estimated_hours: 150,
        cost: 1200,
        credits: 3,
        difficulty: 2,
        institution: 'Florida Community College',
        modality: 'hybrid',
        tags: ['mathematics', 'transfer'],
        prerequisite_ids: ['skill-math-fundamentals'],
        skill_outcomes: ['algebra', 'functions'],
        metadata: { commonCourseNumber: 'MAC1105' }
      },
      {
        id: 'course-cc-cs101',
        node_type: 'course',
        title: 'Introduction to Computer Science',
        description: 'COP 1000 - Fundamental programming concepts',
        estimated_hours: 180,
        cost: 1200,
        credits: 3,
        difficulty: 3,
        institution: 'Florida Community College',
        modality: 'in-person',
        tags: ['computer-science', 'programming', 'transfer'],
        prerequisite_ids: ['skill-programming-basics'],
        skill_outcomes: ['programming', 'problem-solving'],
        metadata: { commonCourseNumber: 'COP1000' }
      },

      // University Courses
      {
        id: 'course-univ-cs301',
        node_type: 'course',
        title: 'Data Structures & Algorithms',
        description: 'COP 3530 - Advanced programming concepts',
        estimated_hours: 220,
        cost: 2400,
        credits: 4,
        difficulty: 5,
        institution: 'Florida State University',
        modality: 'in-person',
        tags: ['algorithms', 'data-structures', 'university'],
        prerequisite_ids: ['course-cc-cs101'],
        skill_outcomes: ['algorithms', 'data-structures', 'complexity-analysis'],
        metadata: { commonCourseNumber: 'COP3530' }
      },

      // CLEP Alternative
      {
        id: 'exam-clep-math',
        node_type: 'exam',
        title: 'CLEP College Mathematics',
        description: 'Credit by examination for college mathematics',
        estimated_hours: 40,
        cost: 120,
        credits: 6,
        difficulty: 3,
        provider: 'College Board',
        modality: 'in-person',
        tags: ['clep', 'mathematics', 'alternative'],
        prerequisite_ids: ['skill-math-fundamentals'],
        skill_outcomes: ['algebra', 'statistics', 'geometry'],
        ace_recommended: true,
        metadata: { examCode: 'CLEP-MATH' }
      },

      // Goal
      {
        id: 'bachelor-cs',
        node_type: 'job',
        title: "Bachelor's in Computer Science",
        description: 'Complete bachelor degree in computer science',
        estimated_hours: 3200,
        cost: 40000,
        credits: 120,
        difficulty: 4,
        institution: 'Florida State University',
        modality: 'in-person',
        tags: ['degree', 'computer-science', 'bachelor'],
        prerequisite_ids: ['course-univ-cs301'],
        skill_outcomes: ['cs-degree', 'advanced-programming', 'software-engineering'],
        metadata: { degreeType: 'Bachelor of Science', totalCredits: 120 }
      }
    ];

    // Insert nodes
    const { error: nodesError } = await supabase
      .from('life_path_nodes')
      .upsert(nodes, { onConflict: 'id' });

    if (nodesError) {
      console.error('❌ Error seeding nodes:', nodesError);
      return;
    }

    // Sample edges
    const edges = [
      {
        id: 'edge-math-skill-to-cc-math',
        source_id: 'skill-math-fundamentals',
        target_id: 'course-cc-math101',
        edge_type: 'enables',
        weight_time: 1.0,
        weight_cost: 1200,
        weight_credit_loss: 0,
        confidence: 0.9,
        data_source: 'curriculum_analysis'
      },
      {
        id: 'edge-prog-skill-to-cc-cs',
        source_id: 'skill-programming-basics',
        target_id: 'course-cc-cs101',
        edge_type: 'enables',
        weight_time: 1.0,
        weight_cost: 1200,
        weight_credit_loss: 0,
        confidence: 0.9,
        data_source: 'curriculum_analysis'
      },
      {
        id: 'edge-cc-cs-to-univ-cs',
        source_id: 'course-cc-cs101',
        target_id: 'course-univ-cs301',
        edge_type: 'creditTransfersTo',
        weight_time: 0.9,
        weight_cost: 2400,
        weight_credit_loss: 0,
        credit_transfer_rate: 1.0,
        confidence: 0.9,
        data_source: 'florida_articulation'
      },
      {
        id: 'edge-clep-math-substitute',
        source_id: 'exam-clep-math',
        target_id: 'course-cc-math101',
        edge_type: 'substitutes',
        weight_time: 0.3,
        weight_cost: 120,
        weight_credit_loss: 0,
        credit_transfer_rate: 1.0,
        confidence: 0.8,
        data_source: 'ace_recommendation'
      },
      {
        id: 'edge-univ-cs-to-bachelor',
        source_id: 'course-univ-cs301',
        target_id: 'bachelor-cs',
        edge_type: 'requires',
        weight_time: 1.0,
        weight_cost: 35000,
        weight_credit_loss: 0,
        confidence: 1.0,
        data_source: 'degree_requirements'
      }
    ];

    // Insert edges
    const { error: edgesError } = await supabase
      .from('life_path_edges')
      .upsert(edges, { onConflict: 'id' });

    if (edgesError) {
      console.error('❌ Error seeding edges:', edgesError);
      return;
    }

    console.log('✅ Life Path Graph data seeded successfully!');
    console.log(`📊 Created ${nodes.length} nodes and ${edges.length} edges`);

  } catch (error) {
    console.error('❌ Error in seed process:', error);
  }
}

// Auto-run seeding for development
if (typeof window !== 'undefined' && window.location.pathname === '/skilltree3') {
  seedLifePathData();
}
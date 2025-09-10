import { supabase } from '@/integrations/supabase/client';

const seedData = {
  courses: [
    // Foundation courses
    { code: "CS-101", title: "Programming Fundamentals I", credits: 3, area: "foundation", level_year: 1, is_core: true, is_capstone: false },
    { code: "CS-102", title: "Programming Fundamentals II", credits: 3, area: "foundation", level_year: 1, is_core: true, is_capstone: false },
    
    // Math courses
    { code: "MATH-111", title: "College Algebra", credits: 3, area: "mathematics", level_year: 1, is_core: false, is_capstone: false },
    { code: "MATH-120", title: "Statistics", credits: 3, area: "mathematics", level_year: 1, is_core: false, is_capstone: false },
    
    // General Education courses
    { code: "ENG-101", title: "English Composition I", credits: 3, area: "general_education", level_year: 1, is_core: false, is_capstone: false },
    { code: "ENG-102", title: "English Composition II", credits: 3, area: "general_education", level_year: 1, is_core: false, is_capstone: false },
    { code: "PSY-101", title: "Introduction to Psychology", credits: 3, area: "general_education", level_year: 1, is_core: false, is_capstone: false },
    
    // Core courses
    { code: 'CS-201', title: 'Data Structures', credits: 3, area: 'core', level_year: 2, is_core: true, is_capstone: false },
    { code: 'CS-202', title: 'Algorithms', credits: 3, area: 'core', level_year: 2, is_core: true, is_capstone: false },
    { code: 'CS-301', title: 'Operating Systems', credits: 3, area: 'core', level_year: 3, is_core: true, is_capstone: false },
    { code: 'CS-302', title: 'Database Systems', credits: 3, area: 'core', level_year: 3, is_core: true, is_capstone: false },
    
    // Specialization courses
    { code: 'CS-351', title: 'Web Development', credits: 3, area: 'specialization', level_year: 3, is_core: false, is_capstone: false },
    { code: 'CS-361', title: 'Mobile Development', credits: 3, area: 'specialization', level_year: 3, is_core: false, is_capstone: false },
    
    // Architecture and Capstone
    { code: 'CS-401', title: 'Software Architecture', credits: 3, area: 'software_engineering', level_year: 4, is_core: false, is_capstone: false },
    { code: 'CS-499', title: 'Capstone Project', credits: 6, area: 'capstone', level_year: 4, is_core: false, is_capstone: true },

    // Web Development track
    { code: 'WD-201', title: 'Frontend Foundations', credits: 3, area: 'specialization', level_year: 3, is_core: false, is_capstone: false },
    { code: 'WD-301', title: 'Full-Stack Development', credits: 3, area: 'specialization', level_year: 3, is_core: false, is_capstone: false },
    { code: 'WD-499', title: 'Web Capstone', credits: 6, area: 'capstone', level_year: 4, is_core: false, is_capstone: true },

    // Data Science track
    { code: 'MATH-210', title: 'Linear Algebra', credits: 3, area: 'mathematics', level_year: 2, is_core: false, is_capstone: false },
    { code: 'DS-201', title: 'Intro to Data Science', credits: 3, area: 'specialization', level_year: 3, is_core: false, is_capstone: false },
    { code: 'DS-301', title: 'Machine Learning', credits: 3, area: 'specialization', level_year: 3, is_core: false, is_capstone: false },
    { code: 'DS-499', title: 'Data Science Capstone', credits: 6, area: 'capstone', level_year: 4, is_core: false, is_capstone: true },

    // DevOps track
    { code: 'DO-201', title: 'Cloud Fundamentals', credits: 3, area: 'software_engineering', level_year: 3, is_core: false, is_capstone: false },
    { code: 'DO-301', title: 'DevOps Tooling', credits: 3, area: 'specialization', level_year: 3, is_core: false, is_capstone: false },
    { code: 'CERT-101', title: 'Certification Prep (Linux+)', credits: 3, area: 'general_education', level_year: 3, is_core: false, is_capstone: false },
    { code: 'DO-499', title: 'DevOps Capstone', credits: 6, area: 'capstone', level_year: 4, is_core: false, is_capstone: true }
  ],

  blocks: [
    { title: "Foundations", rule_type: "K_OF_N", k: 2, level_year: 1, area: "foundation" },
    { title: "Mathematics", rule_type: "K_OF_N", k: 2, level_year: 1, area: "mathematics" },
    { title: "General Education", rule_type: "K_OF_N", k: 3, level_year: 1, area: "general_education" },
    { title: "Core I", rule_type: "K_OF_N", k: 2, level_year: 2, area: "core" },
    { title: "Core II", rule_type: "K_OF_N", k: 2, level_year: 3, area: "core" },
    { title: "Specializations", rule_type: "K_OF_N", k: 2, level_year: 3, area: "specialization" },
    { title: "Web Development", rule_type: "ALL", level_year: 3, area: "specialization" },
    { title: "Mobile Development", rule_type: "ALL", level_year: 3, area: "specialization" },
    { title: "Architecture", rule_type: "ALL", level_year: 4, area: "software_engineering" },
    { title: "Capstone", rule_type: "ALL", level_year: 4, area: "capstone" },

    // New branching tracks for multipath demo
    { title: "Track: Web Development", rule_type: "K_OF_N", k: 2, level_year: 3, area: "specialization" },
    { title: "Track: Data Science", rule_type: "K_OF_N", k: 2, level_year: 3, area: "specialization" },
    { title: "Track: DevOps Engineering", rule_type: "K_OF_N", k: 2, level_year: 3, area: "specialization" },
    { title: "Capstone: Web", rule_type: "ALL", level_year: 4, area: "capstone" },
    { title: "Capstone: Data Science", rule_type: "ALL", level_year: 4, area: "capstone" },
    { title: "Capstone: DevOps", rule_type: "ALL", level_year: 4, area: "capstone" }
  ],

  blockCourseRelations: [
    { blockTitle: 'Foundations', courseCodes: ['CS-101', 'CS-102'] },
    { blockTitle: 'Mathematics', courseCodes: ['MATH-111', 'MATH-120'] },
    { blockTitle: 'General Education', courseCodes: ['ENG-101', 'ENG-102', 'PSY-101'] },
    { blockTitle: 'Core I', courseCodes: ['CS-201', 'CS-202'] },
    { blockTitle: 'Core II', courseCodes: ['CS-301', 'CS-302'] },
    { blockTitle: 'Specializations', courseCodes: ['CS-351', 'CS-361'] },
    { blockTitle: 'Web Development', courseCodes: ['CS-351'] },
    { blockTitle: 'Mobile Development', courseCodes: ['CS-361'] },
    { blockTitle: 'Architecture', courseCodes: ['CS-401'] },
    { blockTitle: 'Capstone', courseCodes: ['CS-499'] },

    // New branching track mappings
    { blockTitle: 'Track: Web Development', courseCodes: ['WD-201', 'WD-301'] },
    { blockTitle: 'Track: Data Science', courseCodes: ['DS-201', 'DS-301', 'MATH-210'] },
    { blockTitle: 'Track: DevOps Engineering', courseCodes: ['DO-201', 'DO-301', 'CERT-101'] },
    { blockTitle: 'Capstone: Web', courseCodes: ['WD-499'] },
    { blockTitle: 'Capstone: Data Science', courseCodes: ['DS-499'] },
    { blockTitle: 'Capstone: DevOps', courseCodes: ['DO-499'] }
  ],

  edges: [
    { from: "Mathematics", to: "Core I" },
    { from: "General Education", to: "Core I" },
    { from: "Foundations", to: "Core I" },
    { from: "Core I", to: "Core II" },

    // Existing branches
    { from: "Core II", to: "Specializations" },
    { from: "Core II", to: "Architecture" },
    { from: "Specializations", to: "Capstone" },
    { from: "Architecture", to: "Capstone" },

    // New branching to distinct tracks
    { from: "Core II", to: "Track: Web Development" },
    { from: "Core II", to: "Track: Data Science" },
    { from: "Core II", to: "Track: DevOps Engineering" },

    // Track-specific capstones
    { from: "Track: Web Development", to: "Capstone: Web" },
    { from: "Track: Data Science", to: "Capstone: Data Science" },
    { from: "Track: DevOps Engineering", to: "Capstone: DevOps" }
  ]
};

export async function seedEduTreeData() {
  try {
    console.log('Starting edu tree data seeding with comprehensive cleanup...');

    // COMPREHENSIVE CLEANUP: Remove ALL existing edu tree data
    console.log('Cleaning up existing data...');
    
    // Get all existing blocks to clean up properly
    const { data: allExistingBlocks } = await supabase
      .from('requirement_blocks')
      .select('id');
    
    if (allExistingBlocks && allExistingBlocks.length > 0) {
      const allBlockIds = allExistingBlocks.map(b => b.id);
      
      // Get all gates for these blocks
      const { data: allGates } = await supabase
        .from('block_gates')
        .select('id')
        .in('block_id', allBlockIds);
      
      const allGateIds = allGates?.map(g => g.id) ?? [];
      
      // Delete in proper order to avoid foreign key constraints
      if (allGateIds.length > 0) {
        await supabase.from('prereq_to_block').delete().in('source_gate_id', allGateIds);
        await supabase.from('prereq_to_block').delete().in('target_block_id', allBlockIds);
      }
      await supabase.from('block_members').delete().in('block_id', allBlockIds);
      await supabase.from('block_gates').delete().in('block_id', allBlockIds);
      await supabase.from('requirement_blocks').delete().in('id', allBlockIds);
      
      console.log(`Cleaned up ${allExistingBlocks.length} existing blocks`);
    }

    // Also clean up courses with our seed codes to avoid duplicates
    const seedCourseCodes = seedData.courses.map(c => c.code);
    await supabase.from('edu_courses').delete().in('code', seedCourseCodes);
    console.log('Cleaned up existing courses');

    // Fresh insert of all seed data
    const { data: insertedCourses, error: coursesError } = await supabase
      .from('edu_courses')
      .insert(seedData.courses)
      .select();

    if (coursesError) {
      console.error('Error inserting courses:', coursesError);
      return;
    }

    console.log(`Inserted ${insertedCourses?.length} courses`);
    const courseCodeToId = new Map(insertedCourses?.map(course => [course.code, course.id]) || []);

    const blocksToInsert = seedData.blocks.map(block => ({
      title: block.title,
      rule_type: block.rule_type,
      k: (block as any).k ?? null,
      credits_needed: null,
      level_year: block.level_year,
      area: block.area
    }));

    const { data: insertedBlocks, error: blocksError } = await supabase
      .from('requirement_blocks')
      .insert(blocksToInsert)
      .select();

    if (blocksError) {
      console.error('Error inserting blocks:', blocksError);
      return;
    }

    const blockTitleToId = new Map(insertedBlocks?.map(block => [block.title, block.id]) || []);

    // Update parent block relationships
    const specializationsBlockId = blockTitleToId.get('Specializations');
    if (specializationsBlockId) {
      await supabase
        .from('requirement_blocks')
        .update({ parent_block_id: specializationsBlockId })
        .in('title', [
          'Web Development',
          'Mobile Development',
          'Track: Web Development',
          'Track: Data Science',
          'Track: DevOps Engineering'
        ]);
    }

    // Insert block members, gates, and edges
    const membersToInsert: any[] = [];
    seedData.blockCourseRelations.forEach(relation => {
      const blockId = blockTitleToId.get(relation.blockTitle);
      if (blockId) {
        relation.courseCodes.forEach(courseCode => {
          const courseId = courseCodeToId.get(courseCode);
          if (courseId) {
            membersToInsert.push({ block_id: blockId, course_id: courseId });
          }
        });
      }
    });

    await supabase.from('block_members').insert(membersToInsert);
    
    const gatesToInsert = insertedBlocks?.map(block => ({ block_id: block.id })) || [];
    const { data: insertedGates } = await supabase.from('block_gates').insert(gatesToInsert).select();
    
    const blockIdToGateId = new Map(insertedGates?.map(gate => [gate.block_id, gate.id]) || []);
    
    const edgesToInsert: any[] = [];
    seedData.edges.forEach(edge => {
      const sourceBlockId = blockTitleToId.get(edge.from);
      const targetBlockId = blockTitleToId.get(edge.to);
      const sourceGateId = sourceBlockId ? blockIdToGateId.get(sourceBlockId) : null;
      if (sourceGateId && targetBlockId) {
        edgesToInsert.push({ source_gate_id: sourceGateId, target_block_id: targetBlockId });
      }
    });

    await supabase.from('prereq_to_block').insert(edgesToInsert);
    
    console.log('Edu tree data seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
  }
}
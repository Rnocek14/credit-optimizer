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
    // Core curriculum blocks that match path scoring expectations
    { title: "Gen Ed: Composition", rule_type: "ALL", level_year: 1, area: "general-education" },
    { title: "Gen Ed: Quant Reasoning", rule_type: "ALL", level_year: 1, area: "general-education" },
    { title: "Core: Programming I", rule_type: "ALL", level_year: 1, area: "core" },
    { title: "Core: Programming II", rule_type: "ALL", level_year: 2, area: "core" },
    { title: "Web Frontend Foundations", rule_type: "ALL", level_year: 2, area: "specialization" },
    { title: "Data Analytics Intro", rule_type: "ALL", level_year: 2, area: "specialization" },
    { title: "Mathematics for CS", rule_type: "ALL", level_year: 1, area: "mathematics" },
    { title: "DevOps Systems Architecture", rule_type: "ALL", level_year: 3, area: "specialization" },
    
    // Terminal node for degree completion
    { title: "Degree", rule_type: "ALL", level_year: 4, area: "terminal" },
    
    // Legacy blocks for compatibility (can be removed later)
    { title: "Foundations", rule_type: "K_OF_N", k: 2, level_year: 1, area: "foundation" },
    { title: "Mathematics", rule_type: "K_OF_N", k: 2, level_year: 1, area: "mathematics" },
    { title: "General Education", rule_type: "K_OF_N", k: 3, level_year: 1, area: "general_education" },
    { title: "Core I", rule_type: "K_OF_N", k: 2, level_year: 2, area: "core" },
    { title: "Core II", rule_type: "K_OF_N", k: 2, level_year: 3, area: "core" },
    { title: "Specializations", rule_type: "K_OF_N", k: 2, level_year: 3, area: "specialization" }
  ],

  blockCourseRelations: [
    // New multipath-focused mappings
    { blockTitle: 'Gen Ed: Composition', courseCodes: ['ENG-101'] },
    { blockTitle: 'Gen Ed: Quant Reasoning', courseCodes: ['MATH-120'] },
    { blockTitle: 'Core: Programming I', courseCodes: ['CS-101'] },
    { blockTitle: 'Core: Programming II', courseCodes: ['CS-102', 'CS-201'] },
    { blockTitle: 'Web Frontend Foundations', courseCodes: ['WD-201', 'CS-351'] },
    { blockTitle: 'Data Analytics Intro', courseCodes: ['DS-201', 'MATH-210'] },
    { blockTitle: 'Mathematics for CS', courseCodes: ['MATH-111'] },
    { blockTitle: 'DevOps Systems Architecture', courseCodes: ['DO-201', 'DO-301'] },
    { blockTitle: 'Degree', courseCodes: ['CS-499'] },
    
    // Legacy mappings for compatibility
    { blockTitle: 'Foundations', courseCodes: ['CS-101', 'CS-102'] },
    { blockTitle: 'Mathematics', courseCodes: ['MATH-111', 'MATH-120'] },
    { blockTitle: 'General Education', courseCodes: ['ENG-101', 'ENG-102', 'PSY-101'] },
    { blockTitle: 'Core I', courseCodes: ['CS-201', 'CS-202'] },
    { blockTitle: 'Core II', courseCodes: ['CS-301', 'CS-302'] },
    { blockTitle: 'Specializations', courseCodes: ['CS-351', 'CS-361'] }
  ],

  edges: [
    // New multipath-focused edges
    { from: "Gen Ed: Composition", to: "Core: Programming I" },
    { from: "Gen Ed: Quant Reasoning", to: "Core: Programming I" },
    { from: "Core: Programming I", to: "Core: Programming II" },
    { from: "Core: Programming II", to: "Web Frontend Foundations" },
    { from: "Core: Programming II", to: "Data Analytics Intro" },
    { from: "Mathematics for CS", to: "Core: Programming II" },
    { from: "Web Frontend Foundations", to: "Degree" },
    { from: "Data Analytics Intro", to: "Degree" },
    { from: "DevOps Systems Architecture", to: "Degree" },
    
    // Legacy edges for compatibility
    { from: "Mathematics", to: "Core I" },
    { from: "General Education", to: "Core I" },
    { from: "Foundations", to: "Core I" },
    { from: "Core I", to: "Core II" },
    { from: "Core II", to: "Specializations" }
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

    // Update parent block relationships for legacy specializations
    const specializationsBlockId = blockTitleToId.get('Specializations');
    if (specializationsBlockId) {
      await supabase
        .from('requirement_blocks')
        .update({ parent_block_id: specializationsBlockId })
        .in('title', [
          'Web Frontend Foundations',
          'Data Analytics Intro', 
          'DevOps Systems Architecture'
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
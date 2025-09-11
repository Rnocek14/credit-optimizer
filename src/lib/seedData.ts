import { supabase } from '@/integrations/supabase/client';

const seedData = {
  courses: [
    // Exact matching courses for the multipath structure
    { code: "ENG-101", title: "English Composition I", credits: 3, area: "general_education", level_year: 1, is_core: false, is_capstone: false },
    { code: "MATH-120", title: "Quantitative Reasoning", credits: 3, area: "general_education", level_year: 1, is_core: false, is_capstone: false },
    { code: "CS-101", title: "Programming Fundamentals I", credits: 3, area: "core", level_year: 1, is_core: true, is_capstone: false },
    { code: "CS-102", title: "Programming Fundamentals II", credits: 3, area: "core", level_year: 2, is_core: true, is_capstone: false },
    { code: "CS-201", title: "Data Structures", credits: 3, area: "core", level_year: 2, is_core: true, is_capstone: false },
    { code: "WD-201", title: "Web Frontend Foundations", credits: 3, area: "specialization", level_year: 2, is_core: false, is_capstone: false },
    { code: "DS-201", title: "Data Analytics Intro", credits: 3, area: "specialization", level_year: 2, is_core: false, is_capstone: false },
    { code: "MATH-111", title: "Mathematics for Computer Science", credits: 3, area: "mathematics", level_year: 1, is_core: false, is_capstone: false },
    { code: "CS-499", title: "Senior Capstone", credits: 6, area: "capstone", level_year: 4, is_core: false, is_capstone: true },
  ],

  blocks: [
    // Exact structure matching the task specification for multipath
    { title: "Gen Ed: Composition", rule_type: "ALL", level_year: 1, area: "general-education" },
    { title: "Gen Ed: Quant Reasoning", rule_type: "ALL", level_year: 1, area: "general-education" },
    { title: "Core: Programming I", rule_type: "ALL", level_year: 1, area: "core" },
    { title: "Core: Programming II", rule_type: "ALL", level_year: 2, area: "core" },
    { title: "Web Frontend Foundations", rule_type: "ALL", level_year: 2, area: "specialization" },
    { title: "Data Analytics Intro", rule_type: "ALL", level_year: 2, area: "specialization" },
    { title: "Mathematics for CS", rule_type: "ALL", level_year: 1, area: "mathematics" },
    
    // Terminal node for degree completion
    { title: "Degree", rule_type: "ALL", level_year: 4, area: "terminal" },
  ],

  blockCourseRelations: [
    // Exact multipath-focused mappings
    { blockTitle: 'Gen Ed: Composition', courseCodes: ['ENG-101'] },
    { blockTitle: 'Gen Ed: Quant Reasoning', courseCodes: ['MATH-120'] },
    { blockTitle: 'Core: Programming I', courseCodes: ['CS-101'] },
    { blockTitle: 'Core: Programming II', courseCodes: ['CS-102', 'CS-201'] },
    { blockTitle: 'Web Frontend Foundations', courseCodes: ['WD-201'] },
    { blockTitle: 'Data Analytics Intro', courseCodes: ['DS-201'] },
    { blockTitle: 'Mathematics for CS', courseCodes: ['MATH-111'] },
    { blockTitle: 'Degree', courseCodes: ['CS-499'] },
  ],

  edges: [
    // Exact multipath-focused edges matching task specification
    { from: "Gen Ed: Composition", to: "Core: Programming I" },
    { from: "Gen Ed: Quant Reasoning", to: "Core: Programming I" },
    { from: "Core: Programming I", to: "Core: Programming II" },
    { from: "Core: Programming II", to: "Web Frontend Foundations" },
    { from: "Core: Programming II", to: "Data Analytics Intro" },
    { from: "Mathematics for CS", to: "Core: Programming II" },
    { from: "Web Frontend Foundations", to: "Degree" },
    { from: "Data Analytics Intro", to: "Degree" },
  ]
};

export async function seedEduTreeData() {
  try {
    console.log('Starting multipath-focused edu tree data seeding...');

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
    
    console.log('✅ Multipath-focused edu tree data seeding completed successfully!');
    console.log(`Created ${insertedBlocks?.length} blocks with ${edgesToInsert.length} edges for distinct path comparison`);
  } catch (error) {
    console.error('Error during seeding:', error);
  }
}
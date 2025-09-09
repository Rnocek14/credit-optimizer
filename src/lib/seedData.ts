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
    { code: 'CS-499', title: 'Capstone Project', credits: 6, area: 'capstone', level_year: 4, is_core: false, is_capstone: true }
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
    { title: "Capstone", rule_type: "ALL", level_year: 4, area: "capstone" }
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
    { blockTitle: 'Capstone', courseCodes: ['CS-499'] }
  ],

  edges: [
    { from: "Mathematics", to: "Core I" },
    { from: "General Education", to: "Core I" },
    { from: "Foundations", to: "Core I" },
    { from: "Core I", to: "Core II" },
    { from: "Core II", to: "Specializations" },
    { from: "Core II", to: "Architecture" },
    { from: "Specializations", to: "Capstone" },
    { from: "Architecture", to: "Capstone" }
  ]
};

export async function seedEduTreeData() {
  try {
    console.log('Starting edu tree data seeding...');

    // Insert courses
    const { data: insertedCourses, error: coursesError } = await supabase
      .from('edu_courses')
      .insert(seedData.courses)
      .select();

    if (coursesError) {
      console.error('Error inserting courses:', coursesError);
      return;
    }

    // Create mappings and insert blocks, members, gates, edges
    const courseCodeToId = new Map(insertedCourses?.map(course => [course.code, course.id]) || []);

    const blocksToInsert = seedData.blocks.map(block => ({
      title: block.title,
      rule_type: block.rule_type,
      k: block.k || null,
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
        .in('title', ['Web Development', 'Mobile Development']);
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
import { supabase } from '@/integrations/supabase/client';

const seedData = {
  courses: [
    { code: "CS-181", title: "Programming Fundamentals I", credits: 3, area: "programming", level_year: 1, is_core: true },
    { code: "ENG-101", title: "English Composition I", credits: 3, area: "general_education", level_year: 1, is_core: true },
    { code: "MATH-101", title: "College Algebra", credits: 3, area: "mathematics", level_year: 1, is_core: true },
    { code: "PSY-101", title: "General Psychology", credits: 3, area: "general_education", level_year: 1 },

    { code: "CS-182", title: "Programming Fundamentals II", credits: 3, area: "programming", level_year: 2, is_core: true },
    { code: "CS-281", title: "Data Structures and Algorithms", credits: 3, area: "programming", level_year: 2, is_core: true },
    { code: "MATH-210", title: "Discrete Mathematics", credits: 3, area: "mathematics", level_year: 2, is_core: true },
    { code: "ENG-102", title: "English Composition II", credits: 3, area: "general_education", level_year: 2 },

    { code: "CS-301", title: "Operating Systems", credits: 3, area: "systems", level_year: 3, is_core: true },
    { code: "CS-285", title: "Computer Architecture", credits: 3, area: "systems", level_year: 3, is_core: true },
    { code: "CS-318", title: "Software Engineering Principles", credits: 3, area: "software_engineering", level_year: 3, is_core: true },
    { code: "CS-385", title: "Database Management Systems", credits: 3, area: "data", level_year: 3, is_core: true },

    { code: "CS-328", title: "Web Development", credits: 3, area: "programming", level_year: 3 },
    { code: "CS-388", title: "Game Development", credits: 3, area: "programming", level_year: 3 },
    { code: "CS-358", title: "Mobile App Development", credits: 3, area: "programming", level_year: 3 },
    { code: "CS-368", title: "Cybersecurity Fundamentals", credits: 3, area: "security", level_year: 3 },
    { code: "CS-378", title: "Cloud Computing", credits: 3, area: "systems", level_year: 3 },
    { code: "CS-346", title: "Machine Learning Fundamentals", credits: 3, area: "data", level_year: 3 },
    { code: "CS-315", title: "Computer Networks", credits: 3, area: "systems", level_year: 3 },

    { code: "CS-410", title: "Software Architecture & Design", credits: 3, area: "software_engineering", level_year: 4 },
    { code: "CS-499", title: "Software Engineering Capstone", credits: 6, area: "capstone", level_year: 4, is_capstone: true }
  ],

  blocks: [
    { title: "Foundations", rule_type: "K_OF_N", k: 3, credits_needed: null, level_year: 1, area: "foundation", members: ["CS-181", "ENG-101", "MATH-101", "PSY-101"] },
    { title: "Core I", rule_type: "K_OF_N", k: 3, credits_needed: null, level_year: 2, area: "core", members: ["CS-182", "CS-281", "MATH-210", "ENG-102"] },
    { title: "Core II", rule_type: "K_OF_N", k: 3, credits_needed: null, level_year: 3, area: "core", members: ["CS-301", "CS-285", "CS-318", "CS-385"] },
    { title: "Specializations", rule_type: "K_OF_N", k: 2, credits_needed: null, level_year: 3, area: "specialization", members: ["CS-328", "CS-388", "CS-358", "CS-368", "CS-378", "CS-346", "CS-315"] },
    { title: "Architecture Rail", rule_type: "ALL", k: null, credits_needed: null, level_year: 4, area: "software_engineering", members: ["CS-410"] },
    { title: "Capstone", rule_type: "ALL", k: null, credits_needed: null, level_year: 4, area: "capstone", members: ["CS-499"] }
  ],

  edges: [
    { from: "Foundations", to: "Core I" },
    { from: "Core I", to: "Core II" },
    { from: "Core II", to: "Specializations" },
    { from: "Core II", to: "Architecture Rail" },
    { from: "Specializations", to: "Capstone" },
    { from: "Architecture Rail", to: "Capstone" }
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

    console.log(`Inserted ${insertedCourses?.length} courses`);

    // Create course code to ID mapping
    const courseCodeToId = new Map(
      insertedCourses?.map(course => [course.code, course.id]) || []
    );

    // Insert requirement blocks
    const blocksToInsert = seedData.blocks.map(block => ({
      title: block.title,
      rule_type: block.rule_type,
      k: block.k,
      credits_needed: block.credits_needed,
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

    console.log(`Inserted ${insertedBlocks?.length} blocks`);

    // Create block title to ID mapping
    const blockTitleToId = new Map(
      insertedBlocks?.map(block => [block.title, block.id]) || []
    );

    // Insert block members
    const membersToInsert: any[] = [];
    seedData.blocks.forEach(block => {
      const blockId = blockTitleToId.get(block.title);
      if (blockId) {
        block.members.forEach(courseCode => {
          const courseId = courseCodeToId.get(courseCode);
          if (courseId) {
            membersToInsert.push({
              block_id: blockId,
              course_id: courseId
            });
          }
        });
      }
    });

    const { error: membersError } = await supabase
      .from('block_members')
      .insert(membersToInsert);

    if (membersError) {
      console.error('Error inserting block members:', membersError);
      return;
    }

    console.log(`Inserted ${membersToInsert.length} block members`);

    // Insert block gates
    const gatesToInsert = insertedBlocks?.map(block => ({
      block_id: block.id
    })) || [];

    const { data: insertedGates, error: gatesError } = await supabase
      .from('block_gates')
      .insert(gatesToInsert)
      .select();

    if (gatesError) {
      console.error('Error inserting gates:', gatesError);
      return;
    }

    console.log(`Inserted ${insertedGates?.length} gates`);

    // Create block ID to gate ID mapping
    const blockIdToGateId = new Map(
      insertedGates?.map(gate => [gate.block_id, gate.id]) || []
    );

    // Insert edges
    const edgesToInsert: any[] = [];
    seedData.edges.forEach(edge => {
      const sourceBlockId = blockTitleToId.get(edge.from);
      const targetBlockId = blockTitleToId.get(edge.to);
      const sourceGateId = sourceBlockId ? blockIdToGateId.get(sourceBlockId) : null;

      if (sourceGateId && targetBlockId) {
        edgesToInsert.push({
          source_gate_id: sourceGateId,
          target_block_id: targetBlockId
        });
      }
    });

    const { error: edgesError } = await supabase
      .from('prereq_to_block')
      .insert(edgesToInsert);

    if (edgesError) {
      console.error('Error inserting edges:', edgesError);
      return;
    }

    console.log(`Inserted ${edgesToInsert.length} edges`);
    console.log('Edu tree data seeding completed successfully!');

  } catch (error) {
    console.error('Error during seeding:', error);
  }
}
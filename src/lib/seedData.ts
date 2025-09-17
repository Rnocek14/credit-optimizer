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
    // Shared blocks (Y1-Y2)
    { title: "Foundations", rule_type: "K_OF_N", k: 2, level_year: 1, area: "foundation", track_id: null, slug: "foundations" },
    { title: "Mathematics", rule_type: "K_OF_N", k: 2, level_year: 1, area: "mathematics", track_id: null, slug: "mathematics" },
    { title: "General Education", rule_type: "K_OF_N", k: 3, level_year: 2, area: "general_education", track_id: null, slug: "general-education" },
    { title: "Core I", rule_type: "K_OF_N", k: 2, level_year: 2, area: "core", track_id: null, slug: "core-i" },
    { title: "Core II", rule_type: "K_OF_N", k: 2, level_year: 2, area: "core", track_id: null, slug: "core-ii" },
    
    // Software Engineering Track (Y3+)
    { title: "Specializations", rule_type: "K_OF_N", k: 2, level_year: 3, area: "specialization", track_id: "software-engineering", slug: "specializations" },
    { title: "Architecture", rule_type: "ALL", level_year: 4, area: "software_engineering", track_id: "software-engineering", slug: "architecture" },
    { title: "Software Engineering Capstone", rule_type: "ALL", level_year: 4, area: "capstone", track_id: "software-engineering", slug: "capstone-software-engineering" },
    
    // Data Science Track (Y3+)
    { title: "Data Analysis", rule_type: "ALL", level_year: 3, area: "data_science", track_id: "data-science", slug: "data-analysis" },
    { title: "Machine Learning", rule_type: "ALL", level_year: 4, area: "data_science", track_id: "data-science", slug: "machine-learning" },
    { title: "Data Science Capstone", rule_type: "ALL", level_year: 4, area: "capstone", track_id: "data-science", slug: "capstone-data-science" }
  ],

  blockCourseRelations: [
    { blockTitle: 'Foundations', courseCodes: ['CS-101', 'CS-102'] },
    { blockTitle: 'Mathematics', courseCodes: ['MATH-111', 'MATH-120'] },
    { blockTitle: 'General Education', courseCodes: ['ENG-101', 'ENG-102', 'PSY-101'] },
    { blockTitle: 'Core I', courseCodes: ['CS-201', 'CS-202'] },
    { blockTitle: 'Core II', courseCodes: ['CS-301', 'CS-302'] },
    { blockTitle: 'Specializations', courseCodes: ['CS-351', 'CS-361'] },
    { blockTitle: 'Architecture', courseCodes: ['CS-401'] },
    { blockTitle: 'Software Engineering Capstone', courseCodes: ['CS-499'] },
    { blockTitle: 'Data Analysis', courseCodes: ['CS-351'] },
    { blockTitle: 'Machine Learning', courseCodes: ['CS-361'] },
    { blockTitle: 'Data Science Capstone', courseCodes: ['CS-499'] }
  ],

  edges: [
    // Shared foundation connections
    { from: "Mathematics", to: "Core I" },
    { from: "General Education", to: "Core I" },
    { from: "Foundations", to: "Core I" },
    { from: "Core I", to: "Core II" },
    
    // Branching to tracks (Y2 -> Y3)
    { from: "Core II", to: "Specializations" },
    { from: "Core II", to: "Data Analysis" },
    
    // Software Engineering track progression
    { from: "Specializations", to: "Architecture" },
    { from: "Architecture", to: "Software Engineering Capstone" },
    
    // Data Science track progression
    { from: "Data Analysis", to: "Machine Learning" },
    { from: "Machine Learning", to: "Data Science Capstone" }
  ]
};

export async function seedEduTreeData({ destructive = false } = {}) {
  try {
    console.log('Starting edu tree data seeding...');

    if (!destructive) {
      const [{ count: c1 }, { count: c2 }] = await Promise.all([
        supabase.from('requirement_blocks').select('id', { count: 'exact', head: true }),
        supabase.from('edu_courses').select('id', { count: 'exact', head: true })
      ]);
      if ((c1 ?? 0) > 0 && (c2 ?? 0) > 0) {
        console.log('[Seed] Skipping; data already present');
        return;
      }
    }

    console.log('Inserting fresh seed data...');

    // Only clean up if destructive mode is enabled
    if (destructive) {
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
    }

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
      slug: (block as any).slug,
      rule_type: block.rule_type,
      k: (block as any).k ?? null,
      credits_needed: null,
      level_year: block.level_year,
      area: block.area,
      track_id: (block as any).track_id
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

    // Remove legacy parent-child relationship update since we're using track-based branching
    // const specializationsBlockId = blockTitleToId.get('Specializations');
    // if (specializationsBlockId) {
    //   await supabase
    //     .from('requirement_blocks')
    //     .update({ parent_block_id: specializationsBlockId })
    //     .in('title', ['Web Development', 'Mobile Development']);
    // }

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
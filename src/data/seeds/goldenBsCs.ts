/**
 * Golden BS CS Program Seed Data
 * ~120 credits, 6 requirement blocks, high options coverage
 */

export const goldenBsCsRequirements = [
  // Year 1 - General Education (30 credits)
  { program_id: 'bs_cs', name: 'English Composition I', credits_required: 3, year: 1, category: 'general_education' },
  { program_id: 'bs_cs', name: 'English Composition II', credits_required: 3, year: 1, category: 'general_education' },
  { program_id: 'bs_cs', name: 'Public Speaking', credits_required: 3, year: 1, category: 'general_education' },
  { program_id: 'bs_cs', name: 'US History I', credits_required: 3, year: 1, category: 'general_education' },
  { program_id: 'bs_cs', name: 'US History II', credits_required: 3, year: 1, category: 'general_education' },
  { program_id: 'bs_cs', name: 'Introduction to Psychology', credits_required: 3, year: 1, category: 'general_education' },
  { program_id: 'bs_cs', name: 'Introduction to Sociology', credits_required: 3, year: 1, category: 'general_education' },
  { program_id: 'bs_cs', name: 'Introduction to Philosophy', credits_required: 3, year: 1, category: 'general_education' },
  { program_id: 'bs_cs', name: 'Biology I', credits_required: 3, year: 1, category: 'general_education' },
  { program_id: 'bs_cs', name: 'Physics I', credits_required: 3, year: 1, category: 'general_education' },
  
  // Year 1 - Mathematics (9 credits)
  { program_id: 'bs_cs', name: 'College Algebra', credits_required: 3, year: 1, category: 'mathematics' },
  { program_id: 'bs_cs', name: 'Calculus I', credits_required: 3, year: 1, category: 'mathematics' },
  { program_id: 'bs_cs', name: 'Statistics', credits_required: 3, year: 1, category: 'mathematics' },
  
  // Year 2 - Core CS (24 credits)
  { program_id: 'bs_cs', name: 'Introduction to Programming', credits_required: 3, year: 2, category: 'core' },
  { program_id: 'bs_cs', name: 'Object-Oriented Programming', credits_required: 3, year: 2, category: 'core' },
  { program_id: 'bs_cs', name: 'Data Structures', credits_required: 3, year: 2, category: 'core' },
  { program_id: 'bs_cs', name: 'Algorithms', credits_required: 3, year: 2, category: 'core' },
  { program_id: 'bs_cs', name: 'Computer Architecture', credits_required: 3, year: 2, category: 'core' },
  { program_id: 'bs_cs', name: 'Discrete Mathematics', credits_required: 3, year: 2, category: 'core' },
  { program_id: 'bs_cs', name: 'Operating Systems', credits_required: 3, year: 2, category: 'core' },
  { program_id: 'bs_cs', name: 'Calculus II', credits_required: 3, year: 2, category: 'mathematics' },
  
  // Year 3 - Advanced CS (24 credits)
  { program_id: 'bs_cs', name: 'Database Systems', credits_required: 3, year: 3, category: 'core' },
  { program_id: 'bs_cs', name: 'Software Engineering', credits_required: 3, year: 3, category: 'core' },
  { program_id: 'bs_cs', name: 'Computer Networks', credits_required: 3, year: 3, category: 'core' },
  { program_id: 'bs_cs', name: 'Web Development', credits_required: 3, year: 3, category: 'electives' },
  { program_id: 'bs_cs', name: 'Mobile Development', credits_required: 3, year: 3, category: 'electives' },
  { program_id: 'bs_cs', name: 'Machine Learning Basics', credits_required: 3, year: 3, category: 'electives' },
  { program_id: 'bs_cs', name: 'Cybersecurity Fundamentals', credits_required: 3, year: 3, category: 'electives' },
  { program_id: 'bs_cs', name: 'Linear Algebra', credits_required: 3, year: 3, category: 'mathematics' },
  
  // Year 4 - Specialization + Capstone (33 credits)
  { program_id: 'bs_cs', name: 'Software Architecture', credits_required: 3, year: 4, category: 'core' },
  { program_id: 'bs_cs', name: 'Cloud Computing', credits_required: 3, year: 4, category: 'electives' },
  { program_id: 'bs_cs', name: 'DevOps Practices', credits_required: 3, year: 4, category: 'electives' },
  { program_id: 'bs_cs', name: 'AI & Ethics', credits_required: 3, year: 4, category: 'electives' },
  { program_id: 'bs_cs', name: 'Data Science Fundamentals', credits_required: 3, year: 4, category: 'electives' },
  { program_id: 'bs_cs', name: 'Technical Writing', credits_required: 3, year: 4, category: 'general_education' },
  { program_id: 'bs_cs', name: 'Business Analytics', credits_required: 3, year: 4, category: 'electives' },
  { program_id: 'bs_cs', name: 'Capstone Project', credits_required: 6, year: 4, category: 'capstone' },
  { program_id: 'bs_cs', name: 'Free Elective I', credits_required: 3, year: 4, category: 'electives' },
  { program_id: 'bs_cs', name: 'Free Elective II', credits_required: 3, year: 4, category: 'electives' },
];

export const goldenBsCsBlocks = [
  {
    program_id: 'bs_cs',
    slug: 'bs-cs-gen-ed',
    title: 'General Education',
    rule_type: 'K_OF_N',
    k: 6,
    credits_needed: 18,
    level_year: 1,
    area: 'general_education',
    hidden: false,
  },
  {
    program_id: 'bs_cs',
    slug: 'bs-cs-math',
    title: 'Mathematics',
    rule_type: 'ALL',
    k: null,
    credits_needed: 12,
    level_year: 1,
    area: 'mathematics',
    hidden: false,
  },
  {
    program_id: 'bs_cs',
    slug: 'bs-cs-core',
    title: 'CS Core',
    rule_type: 'ALL',
    k: null,
    credits_needed: 30,
    level_year: 2,
    area: 'core',
    hidden: false,
  },
  {
    program_id: 'bs_cs',
    slug: 'bs-cs-electives',
    title: 'CS Electives',
    rule_type: 'K_OF_N',
    k: 5,
    credits_needed: 15,
    level_year: 3,
    area: 'electives',
    hidden: false,
  },
  {
    program_id: 'bs_cs',
    slug: 'bs-cs-free-electives',
    title: 'Free Electives',
    rule_type: 'CREDITS',
    k: null,
    credits_needed: 6,
    level_year: 4,
    area: 'electives',
    hidden: false,
  },
  {
    program_id: 'bs_cs',
    slug: 'bs-cs-capstone',
    title: 'Capstone',
    rule_type: 'ALL',
    k: null,
    credits_needed: 6,
    level_year: 4,
    area: 'capstone',
    hidden: false,
  },
];

// Note: requirement_options schema requires option_kind and option_ref_id
// For now, we'll skip options seeding since we'd need actual course IDs
// Coverage will be added once we have real marketplace data
export const goldenBsCsOptions: any[] = [];

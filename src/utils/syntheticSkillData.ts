// Synthetic data generator for performance testing

interface SyntheticSkill {
  id: string;
  name: string;
  category: string;
  xp_value: number;
  difficulty_level: number;
  description: string;
  slug: string;
}

interface SyntheticSkillEdge {
  prerequisite_skill_id: string;
  skill_id: string;
}

interface SyntheticUserProgress {
  skill_id: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  xp_earned: number;
  cri_score?: number;
}

const CATEGORIES = [
  'Programming', 'Framework', 'Backend', 'Frontend', 'DevOps', 
  'Cloud', 'Database', 'API', 'Security', 'Testing',
  'Design', 'Mobile', 'Data Science', 'AI/ML', 'Blockchain'
];

const SKILL_NAMES = [
  'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Express',
  'Python', 'Django', 'Flask', 'Java', 'Spring', 'C#', 'ASP.NET',
  'PHP', 'Laravel', 'Ruby', 'Rails', 'Go', 'Rust', 'Kotlin',
  'Swift', 'Flutter', 'React Native', 'CSS', 'Sass', 'HTML',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes',
  'AWS', 'Azure', 'GCP', 'Jenkins', 'Git', 'GitHub Actions',
  'Jest', 'Cypress', 'Selenium', 'Figma', 'Sketch', 'Adobe XD',
  'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy',
  'Ethereum', 'Solidity', 'Web3', 'GraphQL', 'REST API', 'gRPC'
];

export function generateSyntheticSkillData(skillCount: number = 150) {
  console.log(`[Benchmark] Generating synthetic data for ${skillCount} skills...`);
  const startTime = performance.now();

  // Generate skills
  const skills: SyntheticSkill[] = [];
  for (let i = 0; i < skillCount; i++) {
    const category = CATEGORIES[i % CATEGORIES.length];
    const baseName = SKILL_NAMES[i % SKILL_NAMES.length];
    const skillName = skillCount > SKILL_NAMES.length ? 
      `${baseName} ${Math.floor(i / SKILL_NAMES.length) + 1}` : baseName;
    
    skills.push({
      id: `skill-${i + 1}`,
      name: skillName,
      category,
      xp_value: Math.floor(Math.random() * 100) + 50,
      difficulty_level: Math.floor(Math.random() * 5) + 1,
      description: `Advanced ${skillName} skills for modern development`,
      slug: skillName.toLowerCase().replace(/\s+/g, '-')
    });
  }

  // Generate skill edges (dependencies) - aim for 200+ edges
  const edges: SyntheticSkillEdge[] = [];
  const targetEdgeCount = Math.max(200, Math.floor(skillCount * 1.5));
  
  for (let i = 0; i < targetEdgeCount && i < skillCount - 1; i++) {
    const skillIndex = Math.floor(Math.random() * (skillCount - 10)) + 10; // Start from skill 10+
    const prerequisiteIndex = Math.floor(Math.random() * skillIndex); // Prerequisite comes before
    
    // Avoid duplicate edges
    const edgeExists = edges.some(edge => 
      edge.skill_id === skills[skillIndex].id && 
      edge.prerequisite_skill_id === skills[prerequisiteIndex].id
    );
    
    if (!edgeExists) {
      edges.push({
        skill_id: skills[skillIndex].id,
        prerequisite_skill_id: skills[prerequisiteIndex].id
      });
    }
  }

  // Generate user progress for about 40% of skills
  const progressCount = Math.floor(skillCount * 0.4);
  const userProgress: SyntheticUserProgress[] = [];
  
  for (let i = 0; i < progressCount; i++) {
    const statuses: Array<'locked' | 'available' | 'in_progress' | 'completed'> = 
      ['locked', 'available', 'in_progress', 'completed'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const skill = skills[i];
    
    userProgress.push({
      skill_id: skill.id,
      status,
      xp_earned: status === 'completed' ? skill.xp_value : 
                 status === 'in_progress' ? Math.floor(skill.xp_value * 0.6) : 0,
      cri_score: Math.random() * 100
    });
  }

  // Generate skills with courses (60 skills)
  const skillsWithCourses = skills.slice(0, 60).map(skill => skill.id);

  const generationTime = performance.now() - startTime;
  console.log(`[Benchmark] Generated ${skills.length} skills, ${edges.length} edges, ${userProgress.length} progress entries in ${generationTime.toFixed(2)}ms`);

  return {
    skills,
    skillEdges: edges,
    userProgress,
    skillsWithCourses,
    categories: CATEGORIES,
    recommendedSkills: skills.slice(0, 10).map(s => s.id),
    goalSkills: skills.slice(10, 20).map(s => s.id)
  };
}

export function benchmarkSkillTreeSize(skillCount: number): string {
  if (skillCount <= 12) return 'Small tree (≤12 skills)';
  if (skillCount <= 50) return 'Medium tree (13-50 skills)';
  if (skillCount <= 100) return 'Large tree (51-100 skills)';
  return 'XL tree (100+ skills)';
}

export function shouldSuggestVirtualization(renderTime: number): boolean {
  return renderTime > 400;
}
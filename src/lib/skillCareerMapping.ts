/**
 * Skill to Career Path Mapping
 * Maps individual skills to relevant career paths for market data matching
 */

export interface SkillCareerMapping {
  [skill: string]: string[];
}

export const SKILL_CAREER_MAP: SkillCareerMapping = {
  // Programming Languages
  "python": ["Data Scientist", "Software Engineer", "DevOps Engineer"],
  "javascript": ["Software Engineer", "Full Stack Developer", "Frontend Developer"],
  "typescript": ["Software Engineer", "Full Stack Developer", "Frontend Developer"],
  "java": ["Software Engineer", "Backend Developer"],
  "r": ["Data Scientist", "Data Analyst"],
  "sql": ["Data Scientist", "Data Analyst", "Database Administrator"],
  "c++": ["Software Engineer", "Systems Developer"],
  "go": ["DevOps Engineer", "Backend Developer", "Software Engineer"],
  
  // Frontend Technologies
  "react": ["Software Engineer", "Frontend Developer", "Full Stack Developer"],
  "vue": ["Software Engineer", "Frontend Developer"],
  "angular": ["Software Engineer", "Frontend Developer"],
  "html": ["Frontend Developer", "UX Designer", "Software Engineer"],
  "css": ["Frontend Developer", "UX Designer", "Software Engineer"],
  
  // Backend & Infrastructure
  "node.js": ["Software Engineer", "Backend Developer", "Full Stack Developer"],
  "express": ["Software Engineer", "Backend Developer"],
  "docker": ["DevOps Engineer", "Software Engineer"],
  "kubernetes": ["DevOps Engineer", "Platform Engineer"],
  "aws": ["DevOps Engineer", "Cloud Engineer", "Software Engineer"],
  "azure": ["DevOps Engineer", "Cloud Engineer"],
  "gcp": ["DevOps Engineer", "Cloud Engineer"],
  
  // Data & Analytics
  "machine learning": ["Data Scientist", "ML Engineer", "AI Engineer"],
  "deep learning": ["Data Scientist", "ML Engineer", "AI Engineer"],
  "pandas": ["Data Scientist", "Data Analyst"],
  "numpy": ["Data Scientist", "Data Analyst"],
  "tensorflow": ["Data Scientist", "ML Engineer"],
  "pytorch": ["Data Scientist", "ML Engineer"],
  "tableau": ["Data Analyst", "Business Analyst"],
  "power bi": ["Data Analyst", "Business Analyst"],
  
  // Design & UX
  "figma": ["UX Designer", "Product Designer"],
  "sketch": ["UX Designer", "Product Designer"],
  "adobe xd": ["UX Designer", "Product Designer"],
  "photoshop": ["UX Designer", "Graphic Designer"],
  "user research": ["UX Designer", "Product Manager"],
  "prototyping": ["UX Designer", "Product Designer"],
  
  // Product & Business
  "product management": ["Product Manager"],
  "agile": ["Product Manager", "Scrum Master", "Software Engineer"],
  "scrum": ["Product Manager", "Scrum Master", "Software Engineer"],
  "analytics": ["Product Manager", "Data Analyst", "Business Analyst"],
  "strategy": ["Product Manager", "Business Analyst"],
  
  // DevOps & Infrastructure
  "ci/cd": ["DevOps Engineer", "Software Engineer"],
  "jenkins": ["DevOps Engineer"],
  "terraform": ["DevOps Engineer", "Infrastructure Engineer"],
  "ansible": ["DevOps Engineer", "Systems Administrator"],
  "monitoring": ["DevOps Engineer", "SRE"],
  "linux": ["DevOps Engineer", "Software Engineer", "Systems Administrator"]
};

/**
 * Find the most relevant career paths for given skills
 */
export function getRelevantCareerPaths(skills: string[]): string[] {
  const careerScores: Record<string, number> = {};
  
  skills.forEach(skill => {
    const normalizedSkill = skill.toLowerCase().trim();
    const matchingCareers = SKILL_CAREER_MAP[normalizedSkill] || [];
    
    matchingCareers.forEach(career => {
      careerScores[career] = (careerScores[career] || 0) + 1;
    });
  });
  
  // Return careers sorted by relevance score
  return Object.entries(careerScores)
    .sort((a, b) => b[1] - a[1])
    .map(([career]) => career);
}

/**
 * Default market data for courses without specific career matches
 */
export const DEFAULT_MARKET_DATA = {
  job_postings: 2500,
  avg_salary: 85000,
  salary_range_min: 65000,
  salary_range_max: 120000,
  growth_rate: 8.5,
  demand_score: 75,
  competition_score: 60,
  location: "Remote/US",
  career_path: "Technology Professional",
  updated_at: new Date().toISOString()
};
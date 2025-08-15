// PR-8: Test Data Fixtures for Skill Tree Testing

export const smallSkillTreeData = {
  nodes: [
    { id: 'html', type: 'skill', title: 'HTML Basics', category: 'Frontend', level: 1 },
    { id: 'css', type: 'skill', title: 'CSS Styling', category: 'Frontend', level: 2 },
    { id: 'js', type: 'skill', title: 'JavaScript', category: 'Frontend', level: 3 },
    { id: 'react', type: 'skill', title: 'React', category: 'Frontend', level: 4 },
    { id: 'course-1', type: 'course', title: 'Web Dev Fundamentals', category: 'Education' },
    { id: 'project-1', type: 'project', title: 'Portfolio Website', category: 'Practice' },
    { id: 'frontend-job', type: 'job', title: 'Frontend Developer', category: 'Career' },
    { id: 'git', type: 'skill', title: 'Git Version Control', category: 'Tools', level: 2 },
    { id: 'deployment', type: 'skill', title: 'Web Deployment', category: 'DevOps', level: 3 },
    { id: 'responsive', type: 'skill', title: 'Responsive Design', category: 'Frontend', level: 3 },
    { id: 'cert-1', type: 'certification', title: 'Frontend Certification', category: 'Credentials' },
    { id: 'step-1', type: 'step', title: 'Complete Basic Training', category: 'Progress' }
  ],
  edges: [
    { source: 'html', target: 'css', type: 'prerequisite' },
    { source: 'css', target: 'js', type: 'prerequisite' },
    { source: 'js', target: 'react', type: 'prerequisite' },
    { source: 'html', target: 'responsive', type: 'prerequisite' },
    { source: 'css', target: 'responsive', type: 'prerequisite' },
    { source: 'course-1', target: 'html', type: 'teaches' },
    { source: 'course-1', target: 'css', type: 'teaches' },
    { source: 'react', target: 'project-1', type: 'supports' },
    { source: 'responsive', target: 'project-1', type: 'supports' },
    { source: 'react', target: 'frontend-job', type: 'qualifies_for' },
    { source: 'project-1', target: 'frontend-job', type: 'qualifies_for' },
    { source: 'git', target: 'project-1', type: 'supports' },
    { source: 'deployment', target: 'frontend-job', type: 'qualifies_for' },
    { source: 'frontend-job', target: 'cert-1', type: 'qualifies_for' },
    { source: 'course-1', target: 'step-1', type: 'supports' }
  ]
};

export const mediumSkillTreeData = {
  nodes: [
    // Frontend Skills
    { id: 'html-basics', type: 'skill', title: 'HTML5 Fundamentals', category: 'Frontend', level: 1 },
    { id: 'css-basics', type: 'skill', title: 'CSS3 & Flexbox', category: 'Frontend', level: 2 },
    { id: 'js-fundamentals', type: 'skill', title: 'JavaScript ES6+', category: 'Frontend', level: 3 },
    { id: 'react-basics', type: 'skill', title: 'React Components', category: 'Frontend', level: 4 },
    { id: 'react-hooks', type: 'skill', title: 'React Hooks', category: 'Frontend', level: 5 },
    { id: 'react-state', type: 'skill', title: 'State Management', category: 'Frontend', level: 5 },
    { id: 'typescript', type: 'skill', title: 'TypeScript', category: 'Frontend', level: 4 },
    { id: 'responsive-design', type: 'skill', title: 'Responsive Design', category: 'Frontend', level: 3 },
    { id: 'web-accessibility', type: 'skill', title: 'Web Accessibility', category: 'Frontend', level: 4 },
    { id: 'performance-opt', type: 'skill', title: 'Performance Optimization', category: 'Frontend', level: 5 },
    
    // Backend Skills
    { id: 'node-basics', type: 'skill', title: 'Node.js Fundamentals', category: 'Backend', level: 3 },
    { id: 'express-js', type: 'skill', title: 'Express.js', category: 'Backend', level: 4 },
    { id: 'rest-apis', type: 'skill', title: 'REST API Design', category: 'Backend', level: 4 },
    { id: 'database-sql', type: 'skill', title: 'SQL Databases', category: 'Backend', level: 3 },
    { id: 'database-nosql', type: 'skill', title: 'NoSQL Databases', category: 'Backend', level: 4 },
    { id: 'authentication', type: 'skill', title: 'Authentication & Authorization', category: 'Backend', level: 5 },
    
    // DevOps Skills
    { id: 'git-basics', type: 'skill', title: 'Git Version Control', category: 'DevOps', level: 2 },
    { id: 'docker-basics', type: 'skill', title: 'Docker Containers', category: 'DevOps', level: 4 },
    { id: 'cloud-deployment', type: 'skill', title: 'Cloud Deployment', category: 'DevOps', level: 5 },
    { id: 'ci-cd', type: 'skill', title: 'CI/CD Pipelines', category: 'DevOps', level: 5 },
    
    // Design Skills
    { id: 'ui-principles', type: 'skill', title: 'UI Design Principles', category: 'Design', level: 2 },
    { id: 'ux-research', type: 'skill', title: 'UX Research', category: 'Design', level: 3 },
    { id: 'prototyping', type: 'skill', title: 'Prototyping', category: 'Design', level: 3 },
    { id: 'design-systems', type: 'skill', title: 'Design Systems', category: 'Design', level: 4 },
    
    // Courses
    { id: 'fullstack-bootcamp', type: 'course', title: 'Full Stack Web Development', category: 'Education' },
    { id: 'react-masterclass', type: 'course', title: 'React Masterclass', category: 'Education' },
    { id: 'backend-fundamentals', type: 'course', title: 'Backend Development', category: 'Education' },
    { id: 'devops-basics', type: 'course', title: 'DevOps Essentials', category: 'Education' },
    { id: 'design-thinking', type: 'course', title: 'Design Thinking', category: 'Education' },
    
    // Projects
    { id: 'portfolio-site', type: 'project', title: 'Personal Portfolio', category: 'Practice' },
    { id: 'todo-app', type: 'project', title: 'Todo Application', category: 'Practice' },
    { id: 'blog-platform', type: 'project', title: 'Blog Platform', category: 'Practice' },
    { id: 'ecommerce-app', type: 'project', title: 'E-commerce Application', category: 'Practice' },
    { id: 'social-media-app', type: 'project', title: 'Social Media App', category: 'Practice' },
    
    // Jobs
    { id: 'frontend-dev', type: 'job', title: 'Frontend Developer', category: 'Career' },
    { id: 'backend-dev', type: 'job', title: 'Backend Developer', category: 'Career' },
    { id: 'fullstack-dev', type: 'job', title: 'Full Stack Developer', category: 'Career' },
    { id: 'ui-designer', type: 'job', title: 'UI Designer', category: 'Career' },
    { id: 'ux-designer', type: 'job', title: 'UX Designer', category: 'Career' },
    { id: 'devops-engineer', type: 'job', title: 'DevOps Engineer', category: 'Career' },
    { id: 'product-designer', type: 'job', title: 'Product Designer', category: 'Career' },
    { id: 'tech-lead', type: 'job', title: 'Technical Lead', category: 'Career' },
    
    // Certifications
    { id: 'aws-cert', type: 'certification', title: 'AWS Cloud Practitioner', category: 'Credentials' },
    { id: 'react-cert', type: 'certification', title: 'React Developer Certification', category: 'Credentials' },
    { id: 'ux-cert', type: 'certification', title: 'Google UX Design Certificate', category: 'Credentials' },
    
    // Steps
    { id: 'step-frontend-basics', type: 'step', title: 'Master Frontend Basics', category: 'Progress' },
    { id: 'step-first-project', type: 'step', title: 'Build First Project', category: 'Progress' },
    { id: 'step-backend-intro', type: 'step', title: 'Learn Backend Development', category: 'Progress' },
    { id: 'step-fullstack-project', type: 'step', title: 'Build Full Stack App', category: 'Progress' },
    { id: 'step-job-ready', type: 'step', title: 'Become Job Ready', category: 'Progress' }
  ],
  edges: [
    // Frontend progression
    { source: 'html-basics', target: 'css-basics', type: 'prerequisite' },
    { source: 'css-basics', target: 'js-fundamentals', type: 'prerequisite' },
    { source: 'js-fundamentals', target: 'react-basics', type: 'prerequisite' },
    { source: 'react-basics', target: 'react-hooks', type: 'prerequisite' },
    { source: 'react-hooks', target: 'react-state', type: 'prerequisite' },
    { source: 'js-fundamentals', target: 'typescript', type: 'prerequisite' },
    { source: 'css-basics', target: 'responsive-design', type: 'prerequisite' },
    { source: 'html-basics', target: 'web-accessibility', type: 'prerequisite' },
    { source: 'react-state', target: 'performance-opt', type: 'prerequisite' },
    
    // Backend progression
    { source: 'js-fundamentals', target: 'node-basics', type: 'prerequisite' },
    { source: 'node-basics', target: 'express-js', type: 'prerequisite' },
    { source: 'express-js', target: 'rest-apis', type: 'prerequisite' },
    { source: 'rest-apis', target: 'authentication', type: 'prerequisite' },
    { source: 'database-sql', target: 'authentication', type: 'prerequisite' },
    
    // Course teachings
    { source: 'fullstack-bootcamp', target: 'html-basics', type: 'teaches' },
    { source: 'fullstack-bootcamp', target: 'css-basics', type: 'teaches' },
    { source: 'fullstack-bootcamp', target: 'js-fundamentals', type: 'teaches' },
    { source: 'react-masterclass', target: 'react-basics', type: 'teaches' },
    { source: 'react-masterclass', target: 'react-hooks', type: 'teaches' },
    { source: 'backend-fundamentals', target: 'node-basics', type: 'teaches' },
    { source: 'backend-fundamentals', target: 'database-sql', type: 'teaches' },
    { source: 'devops-basics', target: 'git-basics', type: 'teaches' },
    { source: 'devops-basics', target: 'docker-basics', type: 'teaches' },
    { source: 'design-thinking', target: 'ui-principles', type: 'teaches' },
    { source: 'design-thinking', target: 'ux-research', type: 'teaches' },
    
    // Project requirements
    { source: 'html-basics', target: 'portfolio-site', type: 'supports' },
    { source: 'css-basics', target: 'portfolio-site', type: 'supports' },
    { source: 'react-basics', target: 'todo-app', type: 'supports' },
    { source: 'react-state', target: 'blog-platform', type: 'supports' },
    { source: 'express-js', target: 'blog-platform', type: 'supports' },
    { source: 'authentication', target: 'ecommerce-app', type: 'supports' },
    { source: 'database-nosql', target: 'social-media-app', type: 'supports' },
    
    // Job qualifications
    { source: 'react-state', target: 'frontend-dev', type: 'qualifies_for' },
    { source: 'typescript', target: 'frontend-dev', type: 'qualifies_for' },
    { source: 'portfolio-site', target: 'frontend-dev', type: 'qualifies_for' },
    { source: 'authentication', target: 'backend-dev', type: 'qualifies_for' },
    { source: 'rest-apis', target: 'backend-dev', type: 'qualifies_for' },
    { source: 'blog-platform', target: 'backend-dev', type: 'qualifies_for' },
    { source: 'frontend-dev', target: 'fullstack-dev', type: 'qualifies_for' },
    { source: 'backend-dev', target: 'fullstack-dev', type: 'qualifies_for' },
    { source: 'design-systems', target: 'ui-designer', type: 'qualifies_for' },
    { source: 'ux-research', target: 'ux-designer', type: 'qualifies_for' },
    { source: 'ci-cd', target: 'devops-engineer', type: 'qualifies_for' },
    { source: 'ui-designer', target: 'product-designer', type: 'qualifies_for' },
    { source: 'ux-designer', target: 'product-designer', type: 'qualifies_for' },
    { source: 'fullstack-dev', target: 'tech-lead', type: 'qualifies_for' },
    
    // Step progressions
    { source: 'css-basics', target: 'step-frontend-basics', type: 'supports' },
    { source: 'js-fundamentals', target: 'step-frontend-basics', type: 'supports' },
    { source: 'portfolio-site', target: 'step-first-project', type: 'supports' },
    { source: 'node-basics', target: 'step-backend-intro', type: 'supports' },
    { source: 'ecommerce-app', target: 'step-fullstack-project', type: 'supports' },
    { source: 'frontend-dev', target: 'step-job-ready', type: 'supports' }
  ]
};

export const largeSkillTreeData = {
  // Generate a large dataset programmatically
  nodes: Array.from({ length: 150 }, (_, i) => ({
    id: `node-${i}`,
    type: ['skill', 'course', 'project', 'job', 'certification', 'step'][i % 6],
    title: `Node ${i}`,
    category: ['Frontend', 'Backend', 'DevOps', 'Design', 'Data', 'Mobile'][i % 6],
    level: (i % 5) + 1
  })),
  edges: Array.from({ length: 200 }, (_, i) => ({
    source: `node-${i % 149}`,
    target: `node-${(i + 1) % 150}`,
    type: ['prerequisite', 'teaches', 'supports', 'qualifies_for'][i % 4]
  }))
};

export const filterTestData = {
  nodes: [
    { id: 'verified-skill', type: 'skill', title: 'Verified Skill', category: 'Frontend', verified: true },
    { id: 'unverified-skill', type: 'skill', title: 'Unverified Skill', category: 'Frontend', verified: false },
    { id: 'track-a-skill', type: 'skill', title: 'Track A Skill', category: 'Frontend', track_id: 'track-a' },
    { id: 'track-b-skill', type: 'skill', title: 'Track B Skill', category: 'Backend', track_id: 'track-b' },
    { id: 'goal-skill', type: 'skill', title: 'Goal Skill', category: 'Career', is_goal: true },
    { id: 'regular-skill', type: 'skill', title: 'Regular Skill', category: 'General' }
  ],
  edges: [
    { source: 'verified-skill', target: 'track-a-skill', type: 'prerequisite' },
    { source: 'unverified-skill', target: 'track-b-skill', type: 'prerequisite' },
    { source: 'track-a-skill', target: 'goal-skill', type: 'qualifies_for' },
    { source: 'track-b-skill', target: 'goal-skill', type: 'qualifies_for' }
  ]
};
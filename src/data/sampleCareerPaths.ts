
// Sample career paths data for initial testing
export const sampleCareerPaths = [
  {
    title: "UX Designer",
    track: "design",
    level: "entry",
    average_salary: 78000,
    roi_score: 1.4,
    required_skill_ids: [], // Will be populated with actual skill IDs
    optional_skill_ids: [],
    checkpoint_skill_id: null,
    description: "Create intuitive and user-friendly digital experiences through research, wireframing, and prototyping.",
    estimated_time: "8-12 months",
    required_skills: [
      "User Research",
      "Wireframing", 
      "Prototyping",
      "Figma",
      "Information Architecture",
      "Usability Testing"
    ]
  },
  {
    title: "Frontend Developer",
    track: "engineering", 
    level: "entry",
    average_salary: 85000,
    roi_score: 1.6,
    required_skill_ids: [],
    optional_skill_ids: [],
    checkpoint_skill_id: null,
    description: "Build responsive and interactive web applications using modern JavaScript frameworks.",
    estimated_time: "10-14 months",
    required_skills: [
      "HTML",
      "CSS", 
      "JavaScript",
      "React",
      "TypeScript",
      "Git",
      "Responsive Design"
    ]
  },
  {
    title: "Data Analyst",
    track: "data",
    level: "entry", 
    average_salary: 72000,
    roi_score: 1.3,
    required_skill_ids: [],
    optional_skill_ids: [],
    checkpoint_skill_id: null,
    description: "Transform raw data into actionable insights using statistical analysis and visualization tools.",
    estimated_time: "6-10 months",
    required_skills: [
      "SQL",
      "Python",
      "Excel",
      "Tableau",
      "Statistics",
      "Data Visualization"
    ]
  },
  {
    title: "Product Manager",
    track: "product",
    level: "mid",
    average_salary: 105000,
    roi_score: 1.7,
    required_skill_ids: [],
    optional_skill_ids: [],
    checkpoint_skill_id: null,
    description: "Drive product strategy and execution by coordinating cross-functional teams and stakeholders.",
    estimated_time: "12-18 months",
    required_skills: [
      "Product Strategy",
      "User Research",
      "Analytics",
      "Agile Methodology",
      "Stakeholder Management",
      "A/B Testing"
    ]
  },
  {
    title: "DevOps Engineer", 
    track: "engineering",
    level: "mid",
    average_salary: 95000,
    roi_score: 1.5,
    required_skill_ids: [],
    optional_skill_ids: [],
    checkpoint_skill_id: null,
    description: "Streamline development and deployment processes through automation and infrastructure management.",
    estimated_time: "14-20 months", 
    required_skills: [
      "Docker",
      "Kubernetes",
      "AWS",
      "CI/CD",
      "Linux",
      "Terraform",
      "Monitoring"
    ]
  },
  {
    title: "Senior UX Designer",
    track: "design",
    level: "senior",
    average_salary: 125000,
    roi_score: 1.8,
    required_skill_ids: [],
    optional_skill_ids: [],
    checkpoint_skill_id: null,
    description: "Lead design strategy and mentor junior designers while creating sophisticated user experiences.",
    estimated_time: "18-24 months",
    required_skills: [
      "Design Systems",
      "Advanced Prototyping",
      "Design Leadership",
      "Service Design",
      "Design Thinking",
      "Accessibility",
      "Design Strategy"
    ]
  }
];

// Track configuration for visual organization
export const trackConfig = {
  design: {
    name: 'Design',
    icon: '🎨',
    color: 'hsl(var(--chart-1))',
    description: 'User experience and visual design'
  },
  engineering: {
    name: 'Engineering', 
    icon: '⚛️',
    color: 'hsl(var(--chart-2))',
    description: 'Software development and technical implementation'
  },
  data: {
    name: 'Data',
    icon: '📊', 
    color: 'hsl(var(--chart-3))',
    description: 'Data analysis and business intelligence'
  },
  product: {
    name: 'Product',
    icon: '🚀',
    color: 'hsl(var(--chart-4))',
    description: 'Product strategy and management'
  },
  marketing: {
    name: 'Marketing',
    icon: '📈',
    color: 'hsl(var(--chart-5))',
    description: 'Growth and customer acquisition'
  },
  security: {
    name: 'Security',
    icon: '🔒',
    color: 'hsl(var(--destructive))',
    description: 'Cybersecurity and risk management'
  },
  general: {
    name: 'General',
    icon: '💼',
    color: 'hsl(var(--muted-foreground))',
    description: 'Cross-functional and soft skills'
  }
};

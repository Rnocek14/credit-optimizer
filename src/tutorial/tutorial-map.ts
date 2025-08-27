export const TIPS = {
  // Dashboard & Overview
  criGauge: "Your Career Readiness Index (0–100). Use it to track progress toward your target role.",
  skillBars: "Each bar shows current vs. target skill proficiency. Focus on gaps first.",
  adaptiveDashboard: "Personalized dashboard that adapts to your learning phase and shows relevant next steps.",
  phaseProgress: "Your current learning phase. Progress through Discovery → Assessment → Planning → Execution → Optimization.",
  mayaInsights: "AI-powered career insights and recommendations based on your profile and goals.",
  
  // Navigation & Hub System
  discoverHub: "Explore courses, skills, market insights, and career opportunities to inform your learning path.",
  planHub: "Set goals, create learning plans, and manage your career roadmap with AI assistance.",
  progressHub: "Track achievements, view certificates, manage projects, and monitor your career development.",
  contributeMenu: "Share knowledge by teaching, partnering as an institution, or contributing as an employer.",
  trackManager: "Switch between different career tracks you're pursuing simultaneously.",
  
  // Discovery Features
  exploreRecommendations: "AI-powered course recommendations based on your career goals and skill gaps.",
  recoOpen: "Opens the course page in a new tab. Only trusted providers are allowed.",
  recoSave: "Save a course to your Learning Plan to track progress and boost CRI projections.",
  skillGaps: "Identified gaps between your current skills and target role requirements.",
  marketInsights: "Real-time data on job demand, salary trends, and skill requirements in your field.",
  mentorConnect: "Connect with industry mentors who can guide your career development.",
  salaryAnalyzer: "Compare salaries across roles, locations, and experience levels in your field.",
  
  // Planning Features
  planProjectedCRI: "Projected CRI assumes you complete the top saved courses.",
  plansSavedCourses: "Courses you've saved from recommendations. Complete them to boost your CRI.",
  careerGoals: "Set and track specific career objectives with measurable milestones.",
  learningPath: "Structured sequence of courses and skills to reach your career goals.",
  mayaPlanner: "AI assistant that creates personalized learning roadmaps based on your goals.",
  workflowEngine: "Automated workflows that guide you through complex career transitions.",
  
  // Progress Tracking
  transcriptExport: "Export a verified transcript you can share with employers or schools.",
  transcriptResume: "View and download your professional transcript as a shareable resume.",
  badgeSystem: "Earn verified badges for completing courses, projects, and achieving milestones.",
  projectPortfolio: "Showcase your completed projects and practical work experience.",
  certificateViewer: "View and manage all your earned certificates and credentials.",
  learningHistory: "Complete history of your courses, progress, and achievements over time.",
  
  // AI & Maya Features
  mayaChat: "Chat with Maya, your AI career assistant, for personalized guidance and insights.",
  aiAnalyzer: "AI-powered analysis of your skills, goals, and market opportunities.",
  semanticMatching: "AI matches your skills with relevant opportunities using advanced language understanding.",
  smartSuggestions: "Intelligent recommendations that adapt based on your behavior and progress.",
  
  // Advanced Features
  multiTrack: "Manage multiple career paths simultaneously, each with its own goals and progress.",
  collaborativeTools: "Work with mentors, peers, and teams on shared learning objectives.",
  analyticsInsights: "Detailed analytics on your learning patterns, progress trends, and optimization opportunities.",
  enterpriseFeatures: "Advanced features for institutions and organizations managing learner cohorts.",
  
  // Profile & Settings
  profileSettings: "Manage your personal information, privacy settings, and account preferences.",
  privacyControls: "Control what information is visible to mentors, employers, and other users.",
  integrationSettings: "Connect external accounts and services to enhance your learning experience.",
  notificationSettings: "Customize how and when you receive updates about your progress and opportunities.",
  
  // Career Profile Card Features
  criScore: "Career Readiness Index (0-100) measures your overall readiness for your target role based on skills, experience, and certifications.",
  criLevel: "Your current readiness level - Beginner, Developing, Intermediate, Advanced, or Expert based on your CRI score.",
  switchReadiness: "Percentage indicating how ready you are to successfully transition to your target career track.",
  riskLevel: "Assessment of career switch risk - Low, Medium, or High based on market conditions, skill gaps, and timeline.",
  roi3Year: "Projected 3-year return on investment from pursuing this career track, based on salary increases and learning costs.",
  breakEvenTime: "Estimated time in months before your career investment pays for itself through increased earnings.",
  lqi: "Location Quality Index - how well your current location supports this career track (job availability, salary, cost of living).",
  nextMilestone: "Your most important upcoming career milestone with estimated completion time.",
  simulateSwitch: "Run advanced scenarios to model different career transition paths and their outcomes.",
  exportResume: "Generate a professional resume highlighting your skills and achievements for this career track.",
  compareTracks: "Side-by-side comparison of multiple career tracks to help you make informed decisions.",
  optimizeLocation: "Find the best locations for your career track based on job market, salary, and living costs.",
  
  // Track Management
  trackSelector: "Switch between different career tracks you're pursuing. Each track has its own goals, progress, and metrics.",
  activeTrack: "Your currently selected career track. All displayed metrics and recommendations are for this track.",
  
  // Plan Management Features
  activePlansTab: "Current milestone plans you're working on. Track progress and complete steps to advance your career.",
  completedPlansTab: "Successfully finished milestone plans. Review your achievements and celebrate your progress.",
  planProgress: "Visual progress indicator showing how many steps you've completed out of the total plan steps.",
  planStatus: "Current state of your milestone plan - Active (in progress) or Completed (finished).",
  planSteps: "Individual actionable tasks within your milestone plan. Check them off as you complete them.",
  planExpansion: "Click to expand and see detailed steps, or collapse to view plan summary.",
  planCompletion: "When you complete all steps, the plan is automatically marked as finished with celebration!",
  
  // Course Management
  savedCoursesList: "Courses you've saved from recommendations. Complete them to boost your CRI and advance your career.",
  courseStatus: "Track whether courses are Saved (bookmarked), Enrolled (started), or Completed (finished).",
  courseProgress: "Monitor your learning progress and see how courses impact your Career Readiness Index.",
  criProjection: "See how completing your saved courses will boost your CRI score and career readiness."
} as const;

export type TipId = keyof typeof TIPS;
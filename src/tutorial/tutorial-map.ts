export const TIPS = {
  criGauge: "Your Career Readiness Index (0–100). Use it to track progress toward your target role.",
  skillBars: "Each bar shows current vs. target skill proficiency. Focus on gaps first.",
  recoOpen: "Opens the course page in a new tab. Only trusted providers are allowed.",
  recoSave: "Save a course to your Learning Plan to track progress and boost CRI projections.",
  planProjectedCRI: "Projected CRI assumes you complete the top saved courses.",
  transcriptExport: "Export a verified transcript you can share with employers or schools.",
  exploreRecommendations: "AI-powered course recommendations based on your career goals and skill gaps.",
  plansSavedCourses: "Courses you've saved from recommendations. Complete them to boost your CRI.",
  transcriptResume: "View and download your professional transcript as a shareable resume."
} as const;

export type TipId = keyof typeof TIPS;
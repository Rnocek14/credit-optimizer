import { supabase } from "@/integrations/supabase/client";

// Test function to simulate pivot path -> roadmap generation workflow
export const testPivotToRoadmapWorkflow = async () => {
  console.log("🔄 Testing Pivot Path -> Roadmap Generation Workflow");
  
  // Simulate a pivot path result (what would come from recommend-pivot-paths)
  const mockPivotPath = {
    new_career: "Product Designer",
    shared_skills: ["Figma", "User Research", "UI Design"],
    missing_skills: ["Business Strategy", "A/B Testing", "Product Analytics"],
    roi_score: 1.4,
    estimated_time: "4 months",
    estimated_cost: "$500",
    reasoning: "Strong overlap with design skills and higher ROI in Europe"
  };

  console.log("📊 Mock Pivot Path:", mockPivotPath);

  try {
    // Step 1: Call generate-roadmap with pivot data
    console.log("🚀 Step 1: Generating roadmap for pivot career...");
    
    const roadmapInput = {
      goal: mockPivotPath.new_career,
      user_skills: mockPivotPath.shared_skills, // Use shared skills as existing skills
      max_time: mockPivotPath.estimated_time,
      max_budget: mockPivotPath.estimated_cost,
      preferred_locations: ["Remote", "Europe"] // Default locations
    };

    console.log("📝 Roadmap Input:", roadmapInput);

    const { data: roadmapData, error: roadmapError } = await supabase.functions.invoke('generate-roadmap', {
      body: roadmapInput
    });

    if (roadmapError) {
      console.error("❌ Roadmap generation failed:", roadmapError);
      return { success: false, error: roadmapError };
    }

    console.log("✅ Roadmap generated successfully:", roadmapData);

    // Step 2: Validate roadmap structure
    const roadmapValidation = validateRoadmapForPivot(roadmapData, mockPivotPath);
    
    if (!roadmapValidation.isValid) {
      console.error("❌ Roadmap validation failed:", roadmapValidation.errors);
      return { success: false, validation: roadmapValidation };
    }

    // Step 3: Analyze roadmap alignment with pivot
    const alignment = analyzeRoadmapPivotAlignment(roadmapData, mockPivotPath);
    console.log("🎯 Roadmap-Pivot Alignment Analysis:", alignment);

    return {
      success: true,
      pivot: mockPivotPath,
      roadmap: roadmapData,
      validation: roadmapValidation,
      alignment
    };

  } catch (error) {
    console.error("❌ Pivot to roadmap workflow failed:", error);
    return { success: false, error };
  }
};

// Validation function specifically for pivot-generated roadmaps
const validateRoadmapForPivot = (roadmap: any, pivot: any) => {
  const errors: string[] = [];
  
  if (!roadmap) {
    errors.push("Roadmap is null or undefined");
    return { isValid: false, errors };
  }

  // Check if roadmap addresses the missing skills from pivot
  const missingSkills = pivot.missing_skills || [];
  let skillsCovered = 0;

  // Check each path for skill coverage
  ['fastest_path', 'lowest_cost_path', 'highest_roi_path'].forEach(pathName => {
    if (roadmap[pathName] && roadmap[pathName].steps) {
      roadmap[pathName].steps.forEach((step: any) => {
        if (step.skills_needed) {
          step.skills_needed.forEach((skill: string) => {
            if (missingSkills.some(missing => 
              skill.toLowerCase().includes(missing.toLowerCase()) ||
              missing.toLowerCase().includes(skill.toLowerCase())
            )) {
              skillsCovered++;
            }
          });
        }
      });
    }
  });

  // Validation criteria
  if (skillsCovered === 0 && missingSkills.length > 0) {
    errors.push("Roadmap doesn't address any of the missing skills from pivot");
  }

  // Check if goal matches pivot career
  if (!roadmap.fastest_path?.steps?.some((step: any) => 
    step.title?.toLowerCase().includes(pivot.new_career.toLowerCase()) ||
    pivot.new_career.toLowerCase().includes(step.title?.toLowerCase())
  )) {
    errors.push("Roadmap doesn't seem to lead toward the pivot career goal");
  }

  return { isValid: errors.length === 0, errors, skillsCoverage: skillsCovered };
};

// Analysis function to check alignment between roadmap and pivot
const analyzeRoadmapPivotAlignment = (roadmap: any, pivot: any) => {
  const analysis = {
    goalAlignment: 0,
    skillCoverage: 0,
    timeAlignment: 0,
    costAlignment: 0,
    recommendations: [] as string[]
  };

  // Goal alignment check
  const hasGoalAlignment = ['fastest_path', 'lowest_cost_path', 'highest_roi_path']
    .some(pathName => {
      return roadmap[pathName]?.steps?.some((step: any) => 
        step.title?.toLowerCase().includes(pivot.new_career.toLowerCase())
      );
    });
  analysis.goalAlignment = hasGoalAlignment ? 1 : 0;

  // Skill coverage analysis
  const missingSkills = pivot.missing_skills || [];
  let coveredSkills = 0;
  
  ['fastest_path', 'lowest_cost_path', 'highest_roi_path'].forEach(pathName => {
    if (roadmap[pathName]?.steps) {
      roadmap[pathName].steps.forEach((step: any) => {
        if (step.skills_needed) {
          step.skills_needed.forEach((skill: string) => {
            if (missingSkills.some(missing => 
              skill.toLowerCase().includes(missing.toLowerCase())
            )) {
              coveredSkills++;
            }
          });
        }
      });
    }
  });
  
  analysis.skillCoverage = missingSkills.length > 0 ? coveredSkills / missingSkills.length : 1;

  // Time alignment
  const pivotTime = extractMonths(pivot.estimated_time);
  const roadmapTime = extractMonths(roadmap.fastest_path?.total_time || "0");
  analysis.timeAlignment = pivotTime > 0 ? Math.min(1, roadmapTime / pivotTime) : 1;

  // Cost alignment
  const pivotCost = extractCost(pivot.estimated_cost);
  const roadmapCost = extractCost(roadmap.lowest_cost_path?.total_cost || "$0");
  analysis.costAlignment = pivotCost > 0 ? Math.min(1, roadmapCost / pivotCost) : 1;

  // Generate recommendations
  if (analysis.goalAlignment === 0) {
    analysis.recommendations.push("Roadmap should include steps leading to " + pivot.new_career);
  }
  if (analysis.skillCoverage < 0.5) {
    analysis.recommendations.push("Roadmap should cover more missing skills: " + missingSkills.join(", "));
  }
  if (analysis.timeAlignment > 1.5) {
    analysis.recommendations.push("Roadmap timeline is longer than pivot estimate");
  }
  if (analysis.costAlignment > 1.5) {
    analysis.recommendations.push("Roadmap cost exceeds pivot estimate");
  }

  return analysis;
};

// Helper functions
const extractMonths = (timeString: string): number => {
  const match = timeString.match(/(\d+)\s*months?/i);
  return match ? parseInt(match[1]) : 0;
};

const extractCost = (costString: string): number => {
  const match = costString.match(/\$?(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

// Test multiple pivot scenarios
export const testMultiplePivotScenarios = async () => {
  console.log("🎭 Testing Multiple Pivot Scenarios");
  
  const scenarios = [
    {
      name: "UX to Product Designer",
      pivot: {
        new_career: "Product Designer",
        shared_skills: ["Figma", "User Research", "UI Design"],
        missing_skills: ["Business Strategy", "A/B Testing"],
        roi_score: 1.4,
        estimated_time: "4 months",
        estimated_cost: "$500"
      }
    },
    {
      name: "UX to Frontend Developer",
      pivot: {
        new_career: "Frontend Developer",
        shared_skills: ["HTML", "CSS", "UI Design"],
        missing_skills: ["JavaScript", "React", "TypeScript"],
        roi_score: 1.6,
        estimated_time: "6 months",
        estimated_cost: "$800"
      }
    },
    {
      name: "UX to Data Analyst",
      pivot: {
        new_career: "Data Analyst",
        shared_skills: ["User Research"],
        missing_skills: ["SQL", "Python", "Statistics", "Data Visualization"],
        roi_score: 1.3,
        estimated_time: "8 months",
        estimated_cost: "$1200"
      }
    }
  ];

  const results = [];

  for (const scenario of scenarios) {
    console.log(`\n🎯 Testing scenario: ${scenario.name}`);
    
    const roadmapInput = {
      goal: scenario.pivot.new_career,
      user_skills: scenario.pivot.shared_skills,
      max_time: scenario.pivot.estimated_time,
      max_budget: scenario.pivot.estimated_cost,
      preferred_locations: ["Remote", "Europe"]
    };

    try {
      const { data: roadmapData, error } = await supabase.functions.invoke('generate-roadmap', {
        body: roadmapInput
      });

      if (error) {
        results.push({ scenario: scenario.name, success: false, error });
        continue;
      }

      const validation = validateRoadmapForPivot(roadmapData, scenario.pivot);
      const alignment = analyzeRoadmapPivotAlignment(roadmapData, scenario.pivot);

      results.push({
        scenario: scenario.name,
        success: true,
        validation,
        alignment,
        roadmap: roadmapData
      });

    } catch (error) {
      results.push({ scenario: scenario.name, success: false, error });
    }
  }

  // Summary analysis
  console.log("\n📊 Multi-Scenario Test Results:");
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.scenario}: Valid=${result.validation.isValid}, Goal Alignment=${(result.alignment.goalAlignment * 100).toFixed(0)}%, Skill Coverage=${(result.alignment.skillCoverage * 100).toFixed(0)}%`);
    } else {
      console.log(`❌ ${result.scenario}: Failed - ${result.error}`);
    }
  });

  return results;
};
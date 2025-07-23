import { supabase } from "@/integrations/supabase/client";

// Test function for recommend-pivot-paths
export const testRecommendPivotPaths = async () => {
  console.log("🧪 Testing recommend-pivot-paths edge function...");
  
  const testInput = {
    current_career: "UX Designer",
    user_skills: ["Figma", "UI Design", "User Research", "HTML", "CSS"],
    preferred_locations: ["Remote", "Europe"]
  };

  try {
    const { data, error } = await supabase.functions.invoke('recommend-pivot-paths', {
      body: testInput
    });

    if (error) {
      console.error("❌ recommend-pivot-paths error:", error);
      return { success: false, error };
    }

    console.log("✅ recommend-pivot-paths response:", data);

    // Validate response structure
    const validation = validatePivotPathsResponse(data);
    if (validation.isValid) {
      console.log("✅ Response structure is valid");
    } else {
      console.error("❌ Response structure validation failed:", validation.errors);
    }

    return { success: true, data, validation };
  } catch (error) {
    console.error("❌ recommend-pivot-paths failed:", error);
    return { success: false, error };
  }
};

// Test function for generate-roadmap
export const testGenerateRoadmap = async () => {
  console.log("🧪 Testing generate-roadmap edge function...");
  
  const testInput = {
    goal: "Senior Data Analyst",
    user_skills: ["SQL", "Excel", "Data Cleaning"],
    max_time: "12 months",
    max_budget: "$500",
    preferred_locations: ["Remote", "Canada"]
  };

  try {
    const { data, error } = await supabase.functions.invoke('generate-roadmap', {
      body: testInput
    });

    if (error) {
      console.error("❌ generate-roadmap error:", error);
      return { success: false, error };
    }

    console.log("✅ generate-roadmap response:", data);

    // Validate response structure
    const validation = validateRoadmapResponse(data);
    if (validation.isValid) {
      console.log("✅ Response structure is valid");
    } else {
      console.error("❌ Response structure validation failed:", validation.errors);
    }

    return { success: true, data, validation };
  } catch (error) {
    console.error("❌ generate-roadmap failed:", error);
    return { success: false, error };
  }
};

// Validation functions
const validatePivotPathsResponse = (data: any) => {
  const errors: string[] = [];
  
  if (!data) {
    errors.push("Response is null or undefined");
    return { isValid: false, errors };
  }

  if (!data.pivots || !Array.isArray(data.pivots)) {
    errors.push("Missing or invalid 'pivots' array");
    return { isValid: false, errors };
  }

  data.pivots.forEach((pivot: any, index: number) => {
    const requiredFields = [
      'new_career',
      'shared_skills',
      'missing_skills',
      'roi_score',
      'estimated_time',
      'estimated_cost',
      'reasoning'
    ];

    requiredFields.forEach(field => {
      if (!(field in pivot)) {
        errors.push(`Pivot ${index}: Missing required field '${field}'`);
      }
    });

    // Validate specific field types
    if (pivot.shared_skills && !Array.isArray(pivot.shared_skills)) {
      errors.push(`Pivot ${index}: 'shared_skills' should be an array`);
    }
    
    if (pivot.missing_skills && !Array.isArray(pivot.missing_skills)) {
      errors.push(`Pivot ${index}: 'missing_skills' should be an array`);
    }

    if (pivot.roi_score && typeof pivot.roi_score !== 'number') {
      errors.push(`Pivot ${index}: 'roi_score' should be a number`);
    }
  });

  return { isValid: errors.length === 0, errors };
};

const validateRoadmapResponse = (data: any) => {
  const errors: string[] = [];
  
  if (!data) {
    errors.push("Response is null or undefined");
    return { isValid: false, errors };
  }

  const requiredPaths = ['fastest_path', 'lowest_cost_path', 'highest_roi_path'];
  
  requiredPaths.forEach(pathName => {
    if (!data[pathName]) {
      errors.push(`Missing required path: '${pathName}'`);
      return;
    }

    const path = data[pathName];
    const requiredPathFields = ['total_time', 'total_cost', 'steps', 'reasoning'];
    
    requiredPathFields.forEach(field => {
      if (!(field in path)) {
        errors.push(`${pathName}: Missing required field '${field}'`);
      }
    });

    if (path.steps && !Array.isArray(path.steps)) {
      errors.push(`${pathName}: 'steps' should be an array`);
    }

    if (path.steps && Array.isArray(path.steps)) {
      path.steps.forEach((step: any, index: number) => {
        const requiredStepFields = ['title', 'skills_needed', 'learning_resources'];
        requiredStepFields.forEach(field => {
          if (!(field in step)) {
            errors.push(`${pathName} step ${index}: Missing required field '${field}'`);
          }
        });
      });
    }
  });

  return { isValid: errors.length === 0, errors };
};

// Test both functions
export const testAllEdgeFunctions = async () => {
  console.log("🚀 Starting comprehensive edge function tests...");
  
  const pivotTest = await testRecommendPivotPaths();
  const roadmapTest = await testGenerateRoadmap();
  
  console.log("\n📊 Test Results Summary:");
  console.log("recommend-pivot-paths:", pivotTest.success ? "✅ PASS" : "❌ FAIL");
  console.log("generate-roadmap:", roadmapTest.success ? "✅ PASS" : "❌ FAIL");
  
  return {
    pivotPaths: pivotTest,
    roadmap: roadmapTest,
    allPassed: pivotTest.success && roadmapTest.success
  };
};
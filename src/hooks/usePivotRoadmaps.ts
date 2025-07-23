import { useState, useCallback } from 'react';

interface PivotPath {
  new_career: string;
  shared_skills: string[];
  missing_skills: string[];
  roi_score: number;
  estimated_time: string;
  estimated_cost: string;
  reasoning: string;
}

interface PivotRoadmapStep {
  id: string;
  title: string;
  description?: string;
  skills_needed?: string[];
  skills_already_have?: string[];
  estimated_time?: string;
  estimated_cost?: string;
  learning_resources?: Array<{
    title: string;
    provider: string;
    cost: string;
    duration: string;
    reasoning: string;
  }>;
  x?: number;
  y?: number;
  pivotSource: string;
}

export const usePivotRoadmaps = () => {
  const [activePivotPaths, setActivePivotPaths] = useState<PivotPath[]>([]);
  const [showPivotOverlay, setShowPivotOverlay] = useState(false);

  // Add a pivot path to active list
  const addPivotPath = useCallback((pivotPath: PivotPath) => {
    setActivePivotPaths(prev => {
      // Avoid duplicates based on career name and ROI
      const pivotKey = `${pivotPath.new_career}_${pivotPath.roi_score}`;
      const exists = prev.some(p => `${p.new_career}_${p.roi_score}` === pivotKey);
      
      if (exists) {
        console.log(`Pivot path already exists: ${pivotPath.new_career}`);
        return prev;
      }
      
      return [...prev, pivotPath];
    });
    
    // Auto-show overlay when first pivot is added
    if (activePivotPaths.length === 0) {
      setShowPivotOverlay(true);
    }
  }, [activePivotPaths.length]);

  // Remove a pivot path
  const removePivotPath = useCallback((careerName: string, roiScore: number) => {
    setActivePivotPaths(prev => 
      prev.filter(p => !(p.new_career === careerName && p.roi_score === roiScore))
    );
  }, []);

  // Clear all pivot paths
  const clearAllPivotPaths = useCallback(() => {
    setActivePivotPaths([]);
    setShowPivotOverlay(false);
  }, []);

  // Toggle overlay visibility
  const togglePivotOverlay = useCallback(() => {
    setShowPivotOverlay(prev => !prev);
  }, []);

  // Mock function to simulate pivot path from skill tree interaction
  const generateMockPivotFromSkill = useCallback((skillName: string): PivotPath => {
    const mockPivots: Record<string, PivotPath> = {
      'JavaScript': {
        new_career: 'Frontend Developer',
        shared_skills: ['JavaScript', 'HTML', 'CSS'],
        missing_skills: ['React', 'TypeScript', 'Testing'],
        roi_score: 1.3,
        estimated_time: '4 months',
        estimated_cost: '$800',
        reasoning: 'Strong foundation in JavaScript makes frontend transition natural'
      },
      'Python': {
        new_career: 'Data Scientist',
        shared_skills: ['Python', 'Statistics', 'Analysis'],
        missing_skills: ['Machine Learning', 'Pandas', 'Jupyter'],
        roi_score: 1.6,
        estimated_time: '6 months',
        estimated_cost: '$1200',
        reasoning: 'Python skills provide excellent foundation for data science career'
      },
      'Design': {
        new_career: 'UX/UI Designer',
        shared_skills: ['Design Thinking', 'Prototyping', 'User Research'],
        missing_skills: ['Figma', 'User Testing', 'Information Architecture'],
        roi_score: 1.4,
        estimated_time: '5 months',
        estimated_cost: '$600',
        reasoning: 'Design background translates well to digital product design'
      },
      'SQL': {
        new_career: 'Data Analyst',
        shared_skills: ['SQL', 'Excel', 'Data Visualization'],
        missing_skills: ['Tableau', 'Power BI', 'Statistics'],
        roi_score: 1.2,
        estimated_time: '3 months',
        estimated_cost: '$400',
        reasoning: 'SQL expertise is core requirement for data analysis roles'
      },
    };

    // Find best match or create a generic pivot
    const matchedKey = Object.keys(mockPivots).find(key => 
      skillName.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(skillName.toLowerCase())
    );

    if (matchedKey) {
      return mockPivots[matchedKey];
    }

    // Generic pivot if no specific match
    return {
      new_career: 'Product Manager',
      shared_skills: [skillName, 'Communication', 'Problem Solving'],
      missing_skills: ['Strategy', 'Analytics', 'Roadmap Planning'],
      roi_score: 1.3,
      estimated_time: '4 months',
      estimated_cost: '$700',
      reasoning: `${skillName} expertise provides good foundation for product management transition`
    };
  }, []);

  return {
    activePivotPaths,
    showPivotOverlay,
    addPivotPath,
    removePivotPath,
    clearAllPivotPaths,
    togglePivotOverlay,
    generateMockPivotFromSkill
  };
};
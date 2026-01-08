import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OptimizedSkillTreeNode } from './OptimizedSkillTreeNode';
import { CareerStepNode } from './CareerStepNode';
import { SkillPivotModal } from './SkillPivotModal';
import { SkillTreeMinimap } from './SkillTreeMinimap';
import { SkillSearchOverlay } from './SkillSearchOverlay';
import { RoadmapOverlay } from './RoadmapOverlay';
import { validateSkillTree, getSafeSkillTreeData, calculateSkillDepthsSafely } from '@/lib/skillTreeValidation';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

// Simplified performance tracking
const performanceTracker = {
  log: (message: string) => {
    console.log(`[SkillTree Performance] ${message}`);
  }
};

// Fixed debounce utility with stable references
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);
  
  return debouncedCallback as T;
}

interface SkillBranch {
  id: string;
  from_skill_id: string;
  to_skill_id: string;
  type: 'pivot' | 'branch' | 'backtrack';
  recommended: boolean;
  reasoning: string;
}

interface RoadmapStepSkill {
  skill_id: string;
  roadmap_step_id: string;
  roadmap_steps: {
    title: string;
    order_index: number;
    is_checkpoint: boolean;
    is_capstone: boolean;
  };
}

interface SkillTreeCanvasProps {
  skills: Array<{
    id: string;
    name: string;
    category: string;
    xp_value: number;
    difficulty_level: number;
    description?: string;
    slug: string;
  }>;
  capstoneSkillIds?: string[];
  userProgress: Array<{
    skill_id: string;
    status: 'locked' | 'available' | 'in_progress' | 'completed';
    xp_earned: number;
    cri_score?: number;
  }>;
  skillEdges: Array<{
    prerequisite_skill_id: string;
    skill_id: string;
  }>;
  filteredSkills: any[];
  recommendedSkills: string[];
  goalSkills?: string[];
  checkpointSkills?: string[];
  availableCategories: string[];
  onSkillClick: (skill: any) => void;
  skillsWithCourses?: string[];
  careerPathName?: string;
  showPivotPaths?: boolean;
  roadmapStepSkills?: RoadmapStepSkill[];
  careerSteps?: Array<{
    id: string;
    title: string;
    level: number;
    prerequisites?: string[];
    is_checkpoint?: boolean;
    is_capstone?: boolean;
    is_terminal?: boolean;
    estimated_duration?: string;
    completed?: boolean;
  }>;
  // New props to expose camera state and positions
  onCameraStateChange?: (state: {
    skillPositions: Map<string, { x: number; y: number }>;
    pivotStepPositions?: Map<string, { x: number; y: number }>;
    zoomLevel: number;
    panOffset: { x: number; y: number };
  }) => void;
  activePivotPaths?: Array<{
    new_career: string;
    shared_skills: string[];
    missing_skills: string[];
    roi_score: number;
    estimated_time: string;
    estimated_cost: string;
    reasoning: string;
  }>;
  pivotStepPositions?: Map<string, { x: number; y: number }>;
  pivotRoadmapSteps?: Array<{
    id: string;
    title: string;
    description?: string;
    skills_needed?: string[];
    skills_already_have?: string[];
    estimated_time?: string;
    estimated_cost?: string;
    learning_resources?: any[];
    x?: number;
    y?: number;
    pivotSource: string;
  }>;
}

export const SkillTreeCanvas: React.FC<SkillTreeCanvasProps> = ({
  skills,
  userProgress,
  skillEdges,
  filteredSkills,
  capstoneSkillIds = [],
  recommendedSkills = [],
  goalSkills = [],
  checkpointSkills = [],
  availableCategories,
  onSkillClick,
  skillsWithCourses = [],
  careerPathName,
  showPivotPaths = false,
  roadmapStepSkills = [],
  careerSteps = [],
  onCameraStateChange,
  activePivotPaths = [],
  pivotStepPositions = new Map(),
  pivotRoadmapSteps = []
}) => {
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 1200, height: 800 });
  const [highlightedSkillPath, setHighlightedSkillPath] = useState<string[]>([]);
  const [hoveredArrows, setHoveredArrows] = useState<string[]>([]);
  const [selectedPivotPath, setSelectedPivotPath] = useState<SkillBranch | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const [searchOverlayVisible, setSearchOverlayVisible] = useState(false);
  const [searchHighlightedSkills, setSearchHighlightedSkills] = useState<string[]>([]);
  const [showRoadmapOverlay, setShowRoadmapOverlay] = useState(false);
  const [showGoalPathOnly, setShowGoalPathOnly] = useState(false);
  const [goalPath, setGoalPath] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const fitToViewRef = useRef<() => void>();

  useEffect(() => {
    console.log("🧩 careerSteps data loaded:", careerSteps);
  }, [careerSteps]);

  // Identify terminal career steps and calculate goal paths
  const terminalSteps = useMemo(() => {
    return careerSteps.filter(step => step.is_terminal);
  }, [careerSteps]);

  // Path tracing logic for career steps
  const getCareerStepPath = useMemo(() => {
    const pathCache = new Map<string, string[]>();
    
    return (stepId: string): string[] => {
      if (pathCache.has(stepId)) {
        return pathCache.get(stepId)!;
      }
      
      const path: string[] = [];
      const visited = new Set<string>();
      
      const dfs = (currentStepId: string) => {
        if (visited.has(currentStepId)) return;
        visited.add(currentStepId);
        path.push(currentStepId);
        
        // Find prerequisites for the current step
        const currentStep = careerSteps.find(s => s.id === currentStepId);
        if (currentStep?.prerequisites) {
          currentStep.prerequisites.forEach(prereqId => {
            dfs(prereqId);
          });
        }
      };
      
      dfs(stepId);
      pathCache.set(stepId, path);
      return path;
    };
  }, [careerSteps]);

  // Calculate goal path when terminal steps are available
  useEffect(() => {
    if (terminalSteps.length > 0) {
      // For now, use the first terminal step as primary goal
      const primaryTerminalStep = terminalSteps[0];
      const path = getCareerStepPath(primaryTerminalStep.id);
      setGoalPath(path);
      console.log("🎯 Goal path calculated:", path.map(id => {
        const step = careerSteps.find(s => s.id === id);
        return `${step?.title} (${id})`;
      }));
    }
  }, [terminalSteps, getCareerStepPath, careerSteps]);

  // Fetch skill branches for pivot paths with proper caching
  const { data: skillBranches = [] } = useQuery({
    queryKey: ['skill-branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill_branches')
        .select('*');
      
      if (error) {
        console.error('Skill branches fetch error:', error);
        return [];
      }
      
      return data as SkillBranch[];
    },
    enabled: showPivotPaths,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Memoized category colors for consistent theming
  const getCategoryColor = useCallback((category: string) => {
    const colors = {
      Programming: '#3b82f6',
      Framework: '#f59e0b', 
      Backend: '#10b981',
      Design: '#ec4899',
      API: '#6366f1',
      Cloud: '#06b6d4',
      DevOps: '#f97316',
      Quality: '#84cc16',
      Styling: '#ef4444',
      Markup: '#eab308'
    };
    return colors[category as keyof typeof colors] || '#9ca3af';
  }, []);

  // Memoized prerequisite path calculation for highlighting
  const getPrerequisitePath = useMemo(() => {
    const pathCache = new Map<string, string[]>();
    
    return (skillId: string): string[] => {
      if (pathCache.has(skillId)) {
        return pathCache.get(skillId)!;
      }
      
      const path: string[] = [];
      const visited = new Set<string>();
      
      const dfs = (currentSkillId: string) => {
        if (visited.has(currentSkillId)) return;
        visited.add(currentSkillId);
        path.push(currentSkillId);
        
        // Find all prerequisites for the current skill
        const prerequisites = skillEdges.filter(edge => edge.skill_id === currentSkillId);
        prerequisites.forEach(edge => {
          dfs(edge.prerequisite_skill_id);
        });
      };
      
      dfs(skillId);
      pathCache.set(skillId, path);
      return path;
    };
  }, [skillEdges]);

  // Skill hover handlers
  const handleSkillHover = useCallback((skillId: string, isHovering: boolean) => {
    if (isHovering) {
      const path = getPrerequisitePath(skillId);
      setHighlightedSkillPath(path);
      
      // Set arrows for animation
      const arrowIds = skillEdges
        .filter(edge => path.includes(edge.skill_id) && path.includes(edge.prerequisite_skill_id))
        .map(edge => `${edge.prerequisite_skill_id}-${edge.skill_id}`);
      setHoveredArrows(arrowIds);
    } else {
      setHighlightedSkillPath([]);
      setHoveredArrows([]);
    }
  }, [getPrerequisitePath, skillEdges]);

  // Data validation with improved error handling
  const validationResult = useMemo(() => {
    return validateSkillTree(filteredSkills, skillEdges);
  }, [filteredSkills, skillEdges]);

  // Update validation errors with user notifications
  useEffect(() => {
    if (validationResult.errors.length > 0) {
      setValidationErrors(validationResult.errors);
      console.warn('Skill tree validation errors:', validationResult.errors);
      
      // Show critical error notification for first error only (to avoid spam)
      if (validationResult.errors.length === 1) {
        console.error(`🚨 Skill Tree Error: ${validationResult.errors[0]}`);
      } else {
        console.error(`🚨 Skill Tree: ${validationResult.errors.length} data integrity issues detected`);
      }
    } else {
      setValidationErrors([]);
    }

    if (validationResult.warnings.length > 0) {
      console.info('Skill tree validation warnings:', validationResult.warnings);
      // Non-critical warnings are just logged for debugging
    }
  }, [validationResult]);

  // Safe skill depth calculation using new validation system
  const getSkillDepthMap = useCallback(() => {
    if (!filteredSkills.length || !skillEdges.length) return new Map();
    
    // Use the safer depth calculation with circular dependency detection
    return calculateSkillDepthsSafely(filteredSkills, skillEdges);
  }, [filteredSkills, skillEdges]);

  // Memoized hierarchical layout generation
  const skillPositions = useMemo(() => {
    if (!filteredSkills.length) return new Map();

    const positions = new Map();
    const depthMap = getSkillDepthMap();

    // Group skills by depth level
    const levelMap = new Map();
    const disconnectedSkills = [];

    filteredSkills.forEach(skill => {
      const depth = depthMap.get(skill.id);
      if (depth !== undefined) {
        if (!levelMap.has(depth)) levelMap.set(depth, []);
        levelMap.get(depth).push(skill);
      } else {
        disconnectedSkills.push(skill);
      }
    });

    const levelHeight = 180;
    const nodeWidth = 120;
    const nodeSpacing = 40;
    const categorySpacing = 15;
    const baseY = 100;
    const canvasWidth = containerDimensions.width;

    // Helper function to sort skills by category within a level
    const sortSkillsByCategory = (skills: any[]) => {
      return skills.sort((a, b) => {
        const categoryA = a.category || 'Unknown';
        const categoryB = b.category || 'Unknown';
        if (categoryA !== categoryB) {
          return categoryA.localeCompare(categoryB);
        }
        return a.name.localeCompare(b.name);
      });
    };

    // Process each depth level
    Array.from(levelMap.entries()).forEach(([depth, skillList]) => {
      const sortedSkills = sortSkillsByCategory(skillList);
      const skillCount = sortedSkills.length;
      
      // Calculate total width including category spacing
      let totalWidth = skillCount * nodeWidth + (skillCount - 1) * nodeSpacing;
      
      let currentCategory = null;
      let categoryTransitions = 0;
      sortedSkills.forEach(skill => {
        if (currentCategory && skill.category !== currentCategory) {
          categoryTransitions++;
        }
        currentCategory = skill.category;
      });
      totalWidth += categoryTransitions * categorySpacing;

      // Center the level horizontally
      const startX = Math.max(50, (canvasWidth - totalWidth) / 2);
      const y = baseY + depth * levelHeight;

      let currentX = startX;
      let lastCategory = null;

      sortedSkills.forEach((skill) => {
        if (lastCategory && skill.category !== lastCategory) {
          currentX += categorySpacing;
        }

        positions.set(skill.id, { x: currentX, y });
        currentX += nodeWidth + nodeSpacing;
        lastCategory = skill.category;
      });
    });

    // Handle disconnected skills at bottom
    if (disconnectedSkills.length > 0) {
      const maxDepth = Math.max(...Array.from(depthMap.values()), -1);
      const disconnectedY = baseY + (maxDepth + 2) * levelHeight;
      
      const sortedDisconnected = sortSkillsByCategory(disconnectedSkills);
      const skillCount = sortedDisconnected.length;
      
      let totalWidth = skillCount * nodeWidth + (skillCount - 1) * nodeSpacing;
      let currentCategory = null;
      let categoryTransitions = 0;
      sortedDisconnected.forEach(skill => {
        if (currentCategory && skill.category !== currentCategory) {
          categoryTransitions++;
        }
        currentCategory = skill.category;
      });
      totalWidth += categoryTransitions * categorySpacing;

      const startX = Math.max(50, (canvasWidth - totalWidth) / 2);
      let currentX = startX;
      let lastCategory = null;

      sortedDisconnected.forEach((skill) => {
        if (lastCategory && skill.category !== lastCategory) {
          currentX += categorySpacing;
        }

        positions.set(skill.id, { x: currentX, y: disconnectedY });
        currentX += nodeWidth + nodeSpacing;
        lastCategory = skill.category;
      });
    }

    return positions;
  }, [filteredSkills, getSkillDepthMap, containerDimensions.width]);

  // Career step positions based on their hierarchical levels
  const careerStepPositions = useMemo(() => {
    if (!careerSteps.length) {
      console.log('🏗️ No career steps available for positioning');
      return new Map();
    }

    console.log('🏗️ Positioning career steps:', careerSteps.length, 'steps');
    console.log('→ Steps data:', careerSteps.map(s => ({ id: s.id, title: s.title, level: s.level, is_terminal: s.is_terminal })));

    const positions = new Map();
    const levelHeight = 200; // More space for career steps
    const stepWidth = 150;
    const stepSpacing = 60;
    const baseY = 50; // Start above skills
    const canvasWidth = containerDimensions.width;

    // Filter steps based on showGoalPathOnly toggle
    let stepsToRender = careerSteps;
    if (showGoalPathOnly && goalPath.length > 0) {
      stepsToRender = careerSteps.filter(step => goalPath.includes(step.id));
      console.log('🎯 Filtering to goal path:', stepsToRender.length, 'steps');
    }

    // Group career steps by level
    const levelMap = new Map();
    stepsToRender.forEach(step => {
      if (!levelMap.has(step.level)) levelMap.set(step.level, []);
      levelMap.get(step.level).push(step);
    });

    console.log('📊 Level mapping:', Array.from(levelMap.entries()).map(([level, steps]) => ({ level, count: steps.length })));
    
    // Position career steps by level
    Array.from(levelMap.entries()).forEach(([level, stepList]) => {
      // Sort steps: terminal steps last within each level
      const sortedSteps = stepList.sort((a, b) => {
        // Terminal steps go last
        if (a.is_terminal && !b.is_terminal) return 1;
        if (!a.is_terminal && b.is_terminal) return -1;
        return a.title.localeCompare(b.title);
      });
      
      const stepCount = sortedSteps.length;
      
      const totalWidth = stepCount * stepWidth + (stepCount - 1) * stepSpacing;
      const startX = Math.max(50, (canvasWidth - totalWidth) / 2);
      const y = baseY + level * levelHeight;

      let currentX = startX;
      sortedSteps.forEach((step) => {
        // Use step.id directly (it's already a string from the database)
        positions.set(step.id.trim(), { x: currentX, y });
        console.log(`📍 Positioned step "${step.title}" (${step.id}) at (${currentX}, ${y})`);
        currentX += stepWidth + stepSpacing;
      });
    });

    console.log('🗺️ Final career step positions:', Array.from(positions.entries()));
    return positions;
  }, [careerSteps, containerDimensions.width, showGoalPathOnly, goalPath]);

  // Helper function to normalize step IDs consistently
  const normalizeStepId = (id: string | number): string => {
    return String(id).trim();
  };

  useEffect(() => {
    console.log("📍 careerStepPositions:", Array.from(careerStepPositions.entries()));
  }, [careerStepPositions]);

  // Auto-scroll to center skill on click
  const handleSkillClick = useCallback((skill: any) => {
    const position = skillPositions.get(skill.id);
    if (position) {
      const targetX = containerDimensions.width / 2 - (position.x + 60) * zoomLevel;
      const targetY = containerDimensions.height / 2 - (position.y + 40) * zoomLevel;
      
      setPanOffset({ x: targetX, y: targetY });
    }
    onSkillClick(skill);
  }, [skillPositions, containerDimensions, zoomLevel, onSkillClick]);

  // Optimized fit-to-view function with stable reference
  const createFitToView = useCallback(() => {
    return () => {
      if (skillPositions.size === 0) return;

      const positions = Array.from(skillPositions.values());
      const xs = positions.map(p => p.x);
      const ys = positions.map(p => p.y);
      
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const contentWidth = maxX - minX + 120;
      const contentHeight = maxY - minY + 100;
      const padding = 50;

      const viewportWidth = containerDimensions.width - padding * 2;
      const viewportHeight = containerDimensions.height - padding * 2;

      const scaleX = viewportWidth / contentWidth;
      const scaleY = viewportHeight / contentHeight;
      const newZoom = Math.min(scaleX, scaleY, 1.2);

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const offsetX = containerDimensions.width / 2 - centerX * newZoom;
      const offsetY = containerDimensions.height / 2 - centerY * newZoom;

      setZoomLevel(newZoom);
      setPanOffset({ x: offsetX, y: offsetY });
    };
  }, [skillPositions, containerDimensions]);

  // Update fit-to-view ref
  useEffect(() => {
    fitToViewRef.current = createFitToView();
  }, [createFitToView]);

  // Debounced fit-to-view for automatic layout changes
  const debouncedFitToView = useDebounce(() => {
    if (fitToViewRef.current) {
      fitToViewRef.current();
    }
  }, 300);

  // Manual fit-to-view for button clicks
  const fitToView = useCallback(() => {
    if (fitToViewRef.current) {
      fitToViewRef.current();
    }
  }, []);

  // Calculate integrated pivot step positions
  const integratedPivotPositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    
    if (pivotRoadmapSteps.length === 0) return positions;
    
    pivotRoadmapSteps.forEach((step, index) => {
      // Find related skills for positioning
      const relatedSkills = [
        ...(step.skills_needed || []),
        ...(step.skills_already_have || [])
      ];
      
      // Find the best skill position to branch from
      let bestPosition = { x: 300, y: 150 }; // default position
      let bestScore = 0;
      
      skillPositions.forEach((position, skillId) => {
        const skill = skills.find(s => s.id === skillId);
        if (!skill) return;
        
        // Score based on skill name matching
        const skillName = skill.name.toLowerCase();
        const matchScore = relatedSkills.reduce((score, neededSkill) => {
          const needed = neededSkill.toLowerCase();
          if (skillName.includes(needed) || needed.includes(skillName)) {
            return score + 2;
          }
          if (skillName.split(' ').some(word => needed.includes(word))) {
            return score + 1;
          }
          return score;
        }, 0);
        
        if (matchScore > bestScore) {
          bestScore = matchScore;
          bestPosition = {
            x: position.x + 200 + (index * 50), // Offset to the right
            y: position.y - 100 - (index * 30)  // Offset above with stacking
          };
        }
      });
      
      positions.set(step.id, bestPosition);
    });
    
    return positions;
  }, [pivotRoadmapSteps, skillPositions, skills]);

  // Notify parent of camera state changes
  useEffect(() => {
    if (onCameraStateChange && skillPositions.size > 0) {
      onCameraStateChange({
        skillPositions,
        zoomLevel,
        panOffset
      });
    }
  }, [onCameraStateChange, skillPositions, zoomLevel, panOffset]);

  // Auto-fit view when first loaded
  useEffect(() => {
    if (filteredSkills.length > 0 && skillPositions.size > 0) {
      const timeoutId = setTimeout(() => {
        fitToViewRef.current?.();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [filteredSkills.length, skillPositions.size]); // Only depend on counts, not functions

  // Container resize handling with stable reference
  const handleResize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerDimensions({ width: rect.width, height: rect.height });
    }
  }, []);

  const debouncedResize = useDebounce(handleResize, 100);

  useEffect(() => {
    // Initial size measurement
    handleResize();
    
    window.addEventListener('resize', debouncedResize);
    return () => window.removeEventListener('resize', debouncedResize);
  }, []); // Empty dependency array - stable functions

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  }, [panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Memoized arrow paths to prevent unnecessary SVG redraws
  const arrowPaths = useMemo(() => {
    const paths = new Map<string, string>();
    
    skillEdges.forEach(edge => {
      const from = skillPositions.get(edge.prerequisite_skill_id);
      const to = skillPositions.get(edge.skill_id);
      if (!from || !to) return;
      
      const fromX = from.x + 60;
      const fromY = from.y + 80;
      const toX = to.x + 60;
      const toY = to.y;
      
      const dx = toX - fromX;
      const dy = toY - fromY;
      
      const controlPoint1X = fromX;
      const controlPoint1Y = fromY + Math.abs(dy) * 0.3;
      const controlPoint2X = toX;
      const controlPoint2Y = toY - Math.abs(dy) * 0.3;
      
      const pathData = `M ${fromX} ${fromY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${toX} ${toY}`;
      paths.set(`${edge.prerequisite_skill_id}-${edge.skill_id}`, pathData);
    });
    
    return paths;
  }, [skillEdges, skillPositions]);

  const careerStepArrows = useMemo(() => {
    const paths = new Map<string, string>();

    careerSteps.forEach((step) => {
      if (!step.prerequisites || step.prerequisites.length === 0) return;

      step.prerequisites.forEach((prereqId) => {
        const from = careerStepPositions.get(prereqId);
        const to = careerStepPositions.get(step.id);
        if (!from || !to) return;

        const fromX = from.x + 75;
        const fromY = from.y + 60;
        const toX = to.x + 75;
        const toY = to.y;

        const dx = toX - fromX;
        const dy = toY - fromY;

        const control1X = fromX;
        const control1Y = fromY + dy * 0.3;
        const control2X = toX;
        const control2Y = toY - dy * 0.3;

        const path = `M ${fromX} ${fromY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${toX} ${toY}`;
        paths.set(`${prereqId}-${step.id}`, path);
      });
    });

    return paths;
  }, [careerSteps, careerStepPositions]);

  // Memoized pivot path arrows
  const pivotPaths = useMemo(() => {
    if (!showPivotPaths) return new Map<string, { path: string; branch: SkillBranch }>();
    
    const paths = new Map<string, { path: string; branch: SkillBranch }>();
    
    skillBranches.forEach(branch => {
      const from = skillPositions.get(branch.from_skill_id);
      const to = skillPositions.get(branch.to_skill_id);
      if (!from || !to) return;
      
      // Different positioning for pivot paths to avoid overlap
      const fromX = from.x + 60;
      const fromY = from.y + 40; // Higher position for pivot paths
      const toX = to.x + 60;
      const toY = to.y + 40;
      
      const dx = toX - fromX;
      const dy = toY - fromY;
      
      // Create curved path for pivot connections
      const controlPoint1X = fromX + dx * 0.3;
      const controlPoint1Y = fromY - 30; // Arc above normal connections
      const controlPoint2X = toX - dx * 0.3;
      const controlPoint2Y = toY - 30;
      
      const pathData = `M ${fromX} ${fromY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${toX} ${toY}`;
      paths.set(`pivot-${branch.from_skill_id}-${branch.to_skill_id}`, { path: pathData, branch });
    });
    
    return paths;
  }, [skillBranches, skillPositions, showPivotPaths]);

  // Memoized pivot roadmap step edges
  const pivotRoadmapEdges = useMemo(() => {
    if (pivotRoadmapSteps.length === 0) return new Map<string, string>();
    
    const edges = new Map<string, string>();
    
    // Group steps by pivot source
    const stepsByPivot = new Map<string, typeof pivotRoadmapSteps>();
    pivotRoadmapSteps.forEach(step => {
      if (!stepsByPivot.has(step.pivotSource)) {
        stepsByPivot.set(step.pivotSource, []);
      }
      stepsByPivot.get(step.pivotSource)!.push(step);
    });
    
    // Create sequential connections within each pivot roadmap
    stepsByPivot.forEach((steps, pivotSource) => {
      const sortedSteps = steps.sort((a, b) => a.title.localeCompare(b.title));
      
      for (let i = 0; i < sortedSteps.length - 1; i++) {
        const from = sortedSteps[i];
        const to = sortedSteps[i + 1];
        
        const fromPos = integratedPivotPositions.get(from.id);
        const toPos = integratedPivotPositions.get(to.id);
        
        if (fromPos && toPos) {
          const fromX = fromPos.x + 75;
          const fromY = fromPos.y + 30;
          const toX = toPos.x + 75;
          const toY = toPos.y;
          
          // Create curved path
          const controlX = (fromX + toX) / 2;
          const controlY = fromY - 40;
          
          const pathData = `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`;
          edges.set(`${from.id}-${to.id}`, pathData);
        }
      }
      
      // Connect first step to related skills
      if (sortedSteps.length > 0) {
        const firstStep = sortedSteps[0];
        const relatedSkills = [
          ...(firstStep.skills_needed || []),
          ...(firstStep.skills_already_have || [])
        ];
        
        skillPositions.forEach((skillPos, skillId) => {
          const skill = skills.find(s => s.id === skillId);
          if (!skill) return;
          
          const isRelated = relatedSkills.some(neededSkill => 
            skill.name.toLowerCase().includes(neededSkill.toLowerCase()) ||
            neededSkill.toLowerCase().includes(skill.name.toLowerCase())
          );
          
          if (isRelated) {
            const stepPos = integratedPivotPositions.get(firstStep.id);
            if (stepPos) {
              const fromX = skillPos.x + 60;
              const fromY = skillPos.y + 20;
              const toX = stepPos.x + 10;
              const toY = stepPos.y + 30;
              
              const controlX = (fromX + toX) / 2;
              const controlY = (fromY + toY) / 2 - 30;
              
              const pathData = `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`;
              edges.set(`skill-${skillId}-${firstStep.id}`, pathData);
            }
          }
        });
      }
    });
    
    return edges;
  }, [pivotRoadmapSteps, integratedPivotPositions, skillPositions, skills]);

  // Handle pivot path click
  const handlePivotPathClick = useCallback((branch: SkillBranch) => {
    setSelectedPivotPath(branch);
  }, []);

  // Minimap and Search handlers
  const skillTreeBounds = useMemo(() => {
    if (skillPositions.size === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    
    const positions = Array.from(skillPositions.values());
    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys)
    };
  }, [skillPositions]);

  const handleZoomToSkill = useCallback((skillId: string) => {
    const skill = filteredSkills.find(s => s.id === skillId);
    if (skill) {
      handleSkillClick(skill);
    }
  }, [filteredSkills, handleSkillClick]);

  const handleSearchToggle = useCallback(() => {
    setSearchOverlayVisible(!searchOverlayVisible);
    if (searchOverlayVisible) {
      setSearchHighlightedSkills([]);
    }
  }, [searchOverlayVisible]);

  const handleSearchSkillSelect = useCallback((skillId: string) => {
    const skill = filteredSkills.find(s => s.id === skillId);
    if (skill) {
      handleSkillClick(skill);
    }
  }, [filteredSkills, handleSkillClick]);

  // Prepare data for components
  const minimapSkills = useMemo(() => {
    return filteredSkills.map(skill => {
      const position = skillPositions.get(skill.id);
      const progress = userProgress.find(p => p.skill_id === skill.id);
      
      return {
        id: skill.id,
        name: skill.name,
        category: skill.category,
        position: position || { x: 0, y: 0 },
        status: progress?.status || 'locked',
      };
    });
  }, [filteredSkills, skillPositions, userProgress]);

  const searchableSkills = useMemo(() => {
    return filteredSkills.map(skill => {
      const position = skillPositions.get(skill.id);
      const progress = userProgress.find(p => p.skill_id === skill.id);
      
      return {
        id: skill.id,
        name: skill.name,
        category: skill.category,
        description: skill.description,
        position: position || { x: 0, y: 0 },
        status: progress?.status || 'locked',
      };
    });
  }, [filteredSkills, skillPositions, userProgress]);

  // Keyboard navigation setup
  const keyboardNavigationItems = useMemo(() => 
    filteredSkills.map(skill => ({ id: skill.id, name: skill.name })),
    [filteredSkills]
  );

  const {
    selectedIndex: keyboardSelectedIndex,
    focusSelectedItem,
    setSelectedIndex: setKeyboardSelectedIndex
  } = useKeyboardNavigation({
    items: keyboardNavigationItems,
    onSelect: (item, index) => {
      const skill = filteredSkills[index];
      if (skill) {
        handleSkillClick(skill);
        setKeyboardFocused(true);
      }
    },
    onEscape: () => {
      setKeyboardFocused(false);
      if (containerRef.current) {
        containerRef.current.focus();
      }
    },
    onSearch: (query) => {
      if (query === '/') {
        // Open search overlay on '/' key
        setSearchOverlayVisible(true);
      } else {
        // Find first skill matching search query
        const matchIndex = filteredSkills.findIndex(skill => 
          skill.name.toLowerCase().startsWith(query.toLowerCase())
        );
        if (matchIndex >= 0) {
          setKeyboardSelectedIndex(matchIndex);
          const skill = filteredSkills[matchIndex];
          handleSkillClick(skill);
        }
      }
    },
    disabled: selectedPivotPath !== null, // Disable when modal is open
    gridColumns: Math.ceil(Math.sqrt(filteredSkills.length)) // Dynamic grid layout
  });

  // Handle container focus for keyboard navigation
  const handleContainerFocus = useCallback(() => {
    setKeyboardFocused(true);
  }, []);

  const handleContainerBlur = useCallback(() => {
    setKeyboardFocused(false);
  }, []);

  // Simplified performance logging
  useEffect(() => {
    performanceTracker.log(`Rendered ${filteredSkills.length} skills`);
  }, [filteredSkills.length]);

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 cursor-grab active:cursor-grabbing" 
      style={{ height: 800, width: '100%' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onFocus={handleContainerFocus}
      onBlur={handleContainerBlur}
      tabIndex={0}
      role="application"
      aria-label="Interactive Skill Tree - Use arrow keys to navigate, Enter to select skills, Escape to exit"
      aria-describedby="skill-tree-instructions"
    >
      {/* Validation Error Display */}
      {validationErrors.length > 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg shadow">
          <strong>Data Issues Detected:</strong>
          <ul className="text-sm mt-1">
            {validationErrors.slice(0, 3).map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
            {validationErrors.length > 3 && (
              <li>• ... and {validationErrors.length - 3} more issues</li>
            )}
          </ul>
        </div>
      )}

      {/* Hidden instructions for screen readers */}
      <div id="skill-tree-instructions" className="sr-only">
        Interactive skill tree with {filteredSkills.length} skills. 
        Use arrow keys to navigate between skills, Enter or Space to select, 
        Escape to exit selection mode. Type to search for skills by name.
        {keyboardFocused && keyboardNavigationItems[keyboardSelectedIndex] && 
          ` Currently focused: ${keyboardNavigationItems[keyboardSelectedIndex].name}`
        }
      </div>
      {/* Zoom Controls */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
        <button
          className="px-3 py-2 bg-white border rounded shadow hover:bg-gray-50 text-sm"
          onClick={() => setZoomLevel(prev => Math.min(prev * 1.2, 3))}
        >
          Zoom In
        </button>
        <button
          className="px-3 py-2 bg-white border rounded shadow hover:bg-gray-50 text-sm"
          onClick={() => setZoomLevel(prev => Math.max(prev * 0.8, 0.2))}
        >
          Zoom Out
        </button>
        <button
          className="px-3 py-2 bg-white border rounded shadow hover:bg-gray-50 text-sm"
          onClick={fitToView}
        >
          Fit to View
        </button>
        <button
          className="px-3 py-2 bg-white border rounded shadow hover:bg-gray-50 text-sm"
          onClick={handleSearchToggle}
          title="Search skills (or press '/' key)"
        >
          Search
        </button>
        {terminalSteps.length > 0 && (
          <button
            className={`px-3 py-2 border rounded shadow text-sm font-medium transition-colors ${
              showGoalPathOnly 
                ? 'bg-yellow-500 text-white border-yellow-600 hover:bg-yellow-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => setShowGoalPathOnly(!showGoalPathOnly)}
            title="Toggle to show only the path to career goals"
          >
            🎯 Focus on Goal Path
          </button>
        )}
      </div>

      {/* Stats Display */}
      <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm border rounded-lg p-3 shadow">
        <div className="text-sm space-y-1">
          <div>Skills: {filteredSkills.length}</div>
          <div>Categories: {availableCategories.length}</div>
          <div>Career Steps: {careerSteps.length}</div>
          {terminalSteps.length > 0 && (
            <div className="text-yellow-600 font-medium">
              🎯 {terminalSteps.length} Goal{terminalSteps.length > 1 ? 's' : ''}
            </div>
          )}
          <div>Zoom: {Math.round(zoomLevel * 100)}%</div>
          {keyboardFocused && (
            <div className="text-blue-600 font-medium">
              Keyboard Mode: {keyboardSelectedIndex + 1}/{filteredSkills.length}
            </div>
          )}
          {validationResult.warnings.length > 0 && (
            <div className="text-amber-600 text-xs">
              ⚠️ {validationResult.warnings.length} warnings
            </div>
          )}
        </div>
      </div>

      {/* SVG Layer for Arrows */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={containerDimensions.width}
        height={containerDimensions.height}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#64748b"
            />
          </marker>
          <marker
            id="pivot-arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#fbbf24"
            />
          </marker>
        </defs>
        
        <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}>
          {Array.from(arrowPaths.entries()).map(([edgeKey, pathData]) => {
            const [prerequisiteId, skillId] = edgeKey.split('-');
            const fromSkill = skills.find(s => s.id === prerequisiteId);
            const toSkill = skills.find(s => s.id === skillId);
            const isHovered = hoveredArrows.includes(edgeKey);
            
            const strokeColor = toSkill ? getCategoryColor(toSkill.category) : '#9ca3af';
            
            return (
              <path
                key={edgeKey}
                d={pathData}
                stroke={strokeColor}
                strokeWidth="2"
                fill="none"
                strokeOpacity={isHovered ? "0.9" : "0.6"}
                className={isHovered ? "skill-arrow-flow" : ""}
                markerEnd="url(#arrowhead)"
              />
            );
          })}
        </g>

        {/* Career Step Arrows */}
        <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}>
          {Array.from(careerStepArrows.entries()).map(([key, pathData]) => (
            <path
              key={`career-${key}`}
              d={pathData}
              stroke="#4b5563"
              strokeWidth="2"
              fill="none"
              strokeOpacity="0.6"
              markerEnd="url(#arrowhead)"
            />
          ))}
        </g>

        {/* Pivot Path Arrows */}
        {showPivotPaths && (
          <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}>
            {Array.from(pivotPaths.entries()).map(([pivotKey, { path: pathData, branch }]) => {
              const typeColors = {
                pivot: '#fbbf24', // Gold/yellow for pivots
                branch: '#10b981', // Green for branches
                backtrack: '#f97316' // Orange for backtrack
              };
              
              const strokeColor = typeColors[branch.type];
              
              return (
                <path
                  key={pivotKey}
                  d={pathData}
                  stroke={strokeColor}
                  strokeWidth="2"
                  fill="none"
                  strokeOpacity="0.8"
                  strokeDasharray="8,4"
                  className="cursor-pointer hover:stroke-opacity-100 pointer-events-auto"
                  markerEnd="url(#pivot-arrowhead)"
                  onClick={() => handlePivotPathClick(branch)}
                />
              );
            })}
          </g>
        )}

        {/* Pivot Roadmap Edges */}
        <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}>
          {Array.from((pivotRoadmapEdges || new Map()).entries()).map(([edgeKey, pathData]) => (
            <path
              key={`pivot-edge-${edgeKey}`}
              d={pathData}
              stroke="#8b5cf6"
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
              markerEnd="url(#pivot-arrowhead)"
              opacity="0.7"
              className="animate-pulse"
            />
          ))}
        </g>
      </svg>

      {/* Optimized Node Layer */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: '0 0'
        }}
      >
        {filteredSkills.map((skill, index) => {
          const position = skillPositions.get(skill.id);
          if (!position) return null;
          
          const progress = userProgress.find(p => p.skill_id === skill.id);
          const isRecommended = recommendedSkills.includes(skill.id);
          const hasCourses = skillsWithCourses.includes(skill.id);
          const isInPath = highlightedSkillPath.includes(skill.id);
          const isSearchHighlighted = searchHighlightedSkills.includes(skill.id);
          const isKeyboardSelected = keyboardFocused && index === keyboardSelectedIndex;
          
          return (
            <div
              key={skill.id}
              data-skill-index={index}
              data-skill-id={skill.id}
              tabIndex={isKeyboardSelected ? 0 : -1}
              className={`focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-lg ${
                isKeyboardSelected ? 'ring-2 ring-blue-400 ring-inset' : ''
              }`}
              style={{
                position: 'absolute',
                left: position.x - 2,
                top: position.y - 2,
                width: 124,
                height: 84,
                zIndex: isKeyboardSelected ? 100 : 10
              }}
              role="button"
              aria-label={`Skill: ${skill.name}, Category: ${skill.category}, Level: ${skill.difficulty_level}${
                progress ? `, Status: ${progress.status}` : ''
              }`}
            >
              <OptimizedSkillTreeNode
                skill={skill}
                userProgress={progress}
                position={{ x: 2, y: 2 }}
                onClick={() => handleSkillClick(skill)}
                categoryColor={getCategoryColor(skill.category)}
                isRecommended={isRecommended}
                isGoalSkill={goalSkills.includes(skill.id)}
                isCheckpoint={checkpointSkills.includes(skill.id)}
                isCapstone={capstoneSkillIds.includes(skill.id)}
                hasCourses={hasCourses}
                size="medium"
                isInPath={isInPath || isKeyboardSelected || isSearchHighlighted}
                onHover={(isHovering) => handleSkillHover(skill.id, isHovering)}
                careerPathName={careerPathName}
              />
            </div>
          );
        })}

        {/* Pivot roadmaps now handled by separate React Flow component */}

        {/* Career Step Nodes */}
        {(showGoalPathOnly ? careerSteps.filter(step => goalPath.includes(step.id)) : careerSteps).map((step, i) => {
          const normalizedId = normalizeStepId(step.id);
          console.log("🧩 Checking step:", step.title, "Raw ID:", step.id, "Normalized ID:", normalizedId);
          console.log("🔍 ID comparison - Raw chars:", JSON.stringify(step.id), "Normalized chars:", JSON.stringify(normalizedId));
          
          let position = careerStepPositions.get(normalizedId);
          
          // Failsafe positioning if position not found
          if (!position) {
            console.warn("❌ Position not found for step:", step.title, "with ID:", step.id);
            console.warn("💡 Available position keys:", Array.from(careerStepPositions.keys()));
            console.warn("🔧 Character-by-character comparison:");
            Array.from(careerStepPositions.keys()).forEach(key => {
              const match = key === normalizedId;
              console.warn(`   Key: "${key}" (${JSON.stringify(key)}) === "${normalizedId}" (${JSON.stringify(normalizedId)}) → ${match}`);
            });
            
            // Fallback positioning to prevent complete disappearance
            const fallbackX = 100 + (i * 200);
            const fallbackY = containerDimensions.height * 0.3 + (step.level || 0) * 120;
            position = { x: fallbackX, y: fallbackY };
            console.warn("🆘 Using fallback position:", position);
          } else {
            console.log("✅ Found position for career step:", step.title, "at", position);
          }

          return (
            <CareerStepNode
              key={step.id}
              step={step}
              position={position}
              isCompleted={step.completed || false}
              isInProgress={false}
              isInPath={goalPath.includes(step.id)}
              onClick={(clickedStep) => {
                console.log("📌 Clicked career step:", clickedStep.title);
                // TODO: Add navigation to career step details
              }}
              zoomLevel={zoomLevel}
            />
          );
        })}
      </div>

      {/* Minimap */}
      <SkillTreeMinimap
        skills={minimapSkills}
        selectedSkillId={keyboardFocused ? keyboardNavigationItems[keyboardSelectedIndex]?.id : undefined}
        zoomLevel={zoomLevel}
        panOffset={panOffset}
        containerDimensions={containerDimensions}
        skillTreeBounds={skillTreeBounds}
        onZoomToSkill={handleZoomToSkill}
        onViewportChange={(zoom, pan) => {
          setZoomLevel(zoom);
          setPanOffset(pan);
        }}
      />

      {/* Search Overlay */}
      <SkillSearchOverlay
        skills={searchableSkills}
        isVisible={searchOverlayVisible}
        onClose={() => {
          setSearchOverlayVisible(false);
          setSearchHighlightedSkills([]);
        }}
        onSkillSelect={handleSearchSkillSelect}
        onHighlightSkills={setSearchHighlightedSkills}
        selectedSkillId={keyboardFocused ? keyboardNavigationItems[keyboardSelectedIndex]?.id : undefined}
      />

      {/* Roadmap Overlay */}
      <RoadmapOverlay
        roadmapStepSkills={roadmapStepSkills}
        skillPositions={skillPositions}
        zoomLevel={zoomLevel}
        panOffset={panOffset}
        showOverlay={showRoadmapOverlay}
        onToggleOverlay={() => setShowRoadmapOverlay(!showRoadmapOverlay)}
      />

      {/* Pivot Path Modal */}
      {selectedPivotPath && (
        <SkillPivotModal
          isOpen={!!selectedPivotPath}
          onClose={() => setSelectedPivotPath(null)}
          fromSkillId={selectedPivotPath.from_skill_id}
          toSkillId={selectedPivotPath.to_skill_id}
          pivotType={selectedPivotPath.type}
          reasoning={selectedPivotPath.reasoning}
          recommended={selectedPivotPath.recommended}
        />
      )}
    </div>
  );
};

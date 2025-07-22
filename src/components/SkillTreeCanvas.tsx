import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OptimizedSkillTreeNode } from './OptimizedSkillTreeNode';
import { SkillPivotModal } from './SkillPivotModal';
import { SkillTreeMinimap } from './SkillTreeMinimap';
import { SkillSearchOverlay } from './SkillSearchOverlay';
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
  // New career-oriented props
  selectedCareerPath?: any;
  careerPaths?: any[];
  getSkillClassification?: (skillId: string) => {
    isRequiredSkill?: boolean;
    isOptionalSkill?: boolean;
    isPivotSkill?: boolean;
  };
  onCareerPathSelect?: (pathId: string) => void;
}

export const SkillTreeCanvas: React.FC<SkillTreeCanvasProps> = memo(({
  skills,
  userProgress,
  skillEdges,
  filteredSkills,
  recommendedSkills,
  goalSkills = [],
  checkpointSkills = [],
  availableCategories,
  onSkillClick,
  skillsWithCourses = [],
  careerPathName,
  showPivotPaths = false,
  // New career-oriented props
  selectedCareerPath,
  careerPaths = [],
  getSkillClassification,
  onCareerPathSelect
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
  const containerRef = useRef<HTMLDivElement>(null);
  const fitToViewRef = useRef<() => void>();

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

  // FIXED: Remove problematic dependency that causes infinite loop
  useEffect(() => {
    if (filteredSkills.length > 0 && skillPositions.size > 0) {
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(() => {
          if (fitToViewRef.current) {
            fitToViewRef.current();
          }
        });
      }, 500);
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
      </div>

      {/* Stats Display */}
      <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm border rounded-lg p-3 shadow">
        <div className="text-sm space-y-1">
          <div>Skills: {filteredSkills.length}</div>
          <div>Categories: {availableCategories.length}</div>
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
              className={`focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg ${
                isKeyboardSelected ? 'ring-2 ring-blue-400 ring-offset-2' : ''
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
                hasCourses={hasCourses}
                size="medium"
                isInPath={isInPath || isKeyboardSelected || isSearchHighlighted}
                onHover={(isHovering) => handleSkillHover(skill.id, isHovering)}
                careerPathName={careerPathName}
              />
            </div>
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
});

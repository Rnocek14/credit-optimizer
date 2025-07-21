
import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedSkillTreeNode } from './EnhancedSkillTreeNode';
import { SkillPivotModal } from './SkillPivotModal';
import { SkillTreeMinimap } from './SkillTreeMinimap';
import { SkillTreeControls } from './SkillTreeControls';

// Enhanced performance tracking with feature monitoring
const performanceTracker = {
  log: (message: string, features?: any) => {
    console.log(`[SkillTree Performance] ${message}`, features || '');
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
  onSkillRate?: (skillId: string) => void;
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
  onSkillRate
}) => {
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 1200, height: 800 });
  const [highlightedSkillPath, setHighlightedSkillPath] = useState<string[]>([]);
  const [hoveredArrows, setHoveredArrows] = useState<string[]>([]);
  const [selectedPivotPath, setSelectedPivotPath] = useState<SkillBranch | null>(null);
  const [showMinimap, setShowMinimap] = useState(true);
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

  // Enhanced category colors for better visual consistency
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

  // Memoized prerequisite path calculation for enhanced highlighting
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

  // Enhanced skill hover handlers with animation triggers
  const handleSkillHover = useCallback((skillId: string, isHovering: boolean) => {
    if (isHovering) {
      const path = getPrerequisitePath(skillId);
      setHighlightedSkillPath(path);
      
      // Enhanced arrow animation
      const arrowIds = skillEdges
        .filter(edge => path.includes(edge.skill_id) && path.includes(edge.prerequisite_skill_id))
        .map(edge => `${edge.prerequisite_skill_id}-${edge.skill_id}`);
      setHoveredArrows(arrowIds);
      
      // Performance tracking for hover interactions
      performanceTracker.log(`Hover activated for skill: ${skillId}`, {
        pathLength: path.length,
        arrowCount: arrowIds.length
      });
    } else {
      setHighlightedSkillPath([]);
      setHoveredArrows([]);
    }
  }, [getPrerequisitePath, skillEdges]);

  // Calculate hierarchical levels for skills based on dependencies
  const getSkillLevels = useCallback(() => {
    const levels = new Map<string, number>();
    const visited = new Set<string>();
    const visiting = new Set<string>();

    // Log filtered skills for debugging
    console.log('🔍 Filtered Skills used in layout:', filteredSkills.map(s => ({ id: s.id, name: s.name })));

    const filteredSkillIds = new Set(filteredSkills.map(s => s.id));
    
    // Try filtered edges first, fallback to all edges if none valid
    let validEdges = skillEdges.filter(
      edge =>
        filteredSkillIds.has(edge.skill_id) &&
        filteredSkillIds.has(edge.prerequisite_skill_id)
    );

    console.log('📊 Valid edges count:', validEdges.length);
    
    // Fallback: if no valid edges, use all edges but skip invalid ones during processing
    if (validEdges.length === 0) {
      console.log('⚠️ No valid filtered edges found, using all skillEdges with runtime filtering');
      validEdges = skillEdges;
    }

    // Helper: calculate depth recursively
    const calculateDepth = (skillId: string): number => {
      if (visited.has(skillId)) return levels.get(skillId) || 0;
      if (visiting.has(skillId)) {
        console.warn(`Cycle detected involving skill ${skillId}`);
        return 0;
      }

      visiting.add(skillId);

      const prereqEdges = validEdges.filter(e => e.skill_id === skillId && filteredSkillIds.has(e.prerequisite_skill_id));
      if (prereqEdges.length === 0) {
        levels.set(skillId, 0);
        visiting.delete(skillId);
        visited.add(skillId);
        return 0;
      }

      let maxDepth = 0;
      for (const edge of prereqEdges) {
        const prereqDepth = calculateDepth(edge.prerequisite_skill_id);
        maxDepth = Math.max(maxDepth, prereqDepth + 1);
      }

      levels.set(skillId, maxDepth);
      visiting.delete(skillId);
      visited.add(skillId);
      return maxDepth;
    };

    // Run for all visible filtered skills
    for (const skill of filteredSkills) {
      if (!visited.has(skill.id)) {
        calculateDepth(skill.id);
      }
    }

    // Check for disconnected skills and root skills
    const rootSkills = filteredSkills.filter(skill => {
      const hasPrerequisites = validEdges.some(edge => 
        edge.skill_id === skill.id && filteredSkillIds.has(edge.prerequisite_skill_id)
      );
      return !hasPrerequisites;
    });
    
    const disconnectedSkills = filteredSkills.filter(skill => !levels.has(skill.id));
    
    console.log('🌱 Root skills (no prerequisites):', rootSkills.map(s => ({ id: s.id, name: s.name })));
    console.log('🔌 Disconnected skills:', disconnectedSkills.map(s => ({ id: s.id, name: s.name })));
    console.log('✅ Skill Levels:', [...levels.entries()]);
    
    return levels;
  }, [filteredSkills, skillEdges]);

  // Hierarchical layout positioning
  const skillPositions = useMemo(() => {
    if (!filteredSkills.length) return new Map();

    const positions = new Map();
    const skillLevels = getSkillLevels();
    
    // Group skills by their hierarchical level
    const skillsByLevel = new Map<number, any[]>();
    let maxLevel = 0;
    
    filteredSkills.forEach(skill => {
      const level = skillLevels.get(skill.id) || 0;
      maxLevel = Math.max(maxLevel, level);
      
      if (!skillsByLevel.has(level)) {
        skillsByLevel.set(level, []);
      }
      skillsByLevel.get(level)!.push(skill);
    });

    // Layout constants
    const nodeWidth = 80;
    const nodeHeight = 80;
    const horizontalSpacing = 120; // Increased spacing between nodes
    const verticalSpacing = 150; // Increased spacing between levels
    const baseX = 60;
    const baseY = 80;
    
    // Position skills level by level
    for (let level = 0; level <= maxLevel; level++) {
      const skillsAtLevel = skillsByLevel.get(level) || [];
      
      if (skillsAtLevel.length === 0) continue;
      
      // Sort skills at this level by category then name for consistent positioning
      skillsAtLevel.sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
      });
      
      // Calculate total width needed for this level
      const totalWidth = skillsAtLevel.length * nodeWidth + (skillsAtLevel.length - 1) * horizontalSpacing;
      const startX = Math.max(baseX, (containerDimensions.width - totalWidth) / 2);
      
      // Position each skill at this level
      skillsAtLevel.forEach((skill, index) => {
        const x = startX + index * (nodeWidth + horizontalSpacing);
        const y = baseY + level * verticalSpacing;
        
        positions.set(skill.id, { x, y });
      });
    }

    const levelStats = Array.from(skillsByLevel.entries()).map(([level, group]) => ({
      level,
      count: group.length
    }));
    console.log('📊 Skill Level Distribution:', levelStats);

    console.log('Hierarchical layout completed:', {
      totalSkills: filteredSkills.length,
      maxLevel,
      levelDistribution: levelStats
    });

    return positions;
  }, [filteredSkills, getSkillLevels, containerDimensions.width]);

  // Enhanced skill click with better centering
  const handleSkillClick = useCallback((skill: any) => {
    const position = skillPositions.get(skill.id);
    if (position) {
      const targetX = containerDimensions.width / 2 - (position.x + 40) * zoomLevel; // Center of 80px node
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

      const contentWidth = maxX - minX + 140;
      const contentHeight = maxY - minY + 120;
      const padding = 60;

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

  useEffect(() => {
    fitToViewRef.current = createFitToView();
  }, [createFitToView]);

  const debouncedFitToView = useDebounce(() => {
    if (fitToViewRef.current) {
      fitToViewRef.current();
    }
  }, 300);

  const fitToView = useCallback(() => {
    if (fitToViewRef.current) {
      fitToViewRef.current();
    }
  }, []);

  // Auto-fit with better timing
  useEffect(() => {
    if (filteredSkills.length > 0 && skillPositions.size > 0) {
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(() => {
          if (fitToViewRef.current) {
            fitToViewRef.current();
          }
        });
      }, 600); // Slightly longer delay for animations to settle
      return () => clearTimeout(timeoutId);
    }
  }, [filteredSkills.length, skillPositions.size]);

  // Container resize handling
  const handleResize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerDimensions({ width: rect.width, height: rect.height });
    }
  }, []);

  const debouncedResize = useDebounce(handleResize, 100);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', debouncedResize);
    return () => window.removeEventListener('resize', debouncedResize);
  }, []);

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
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

  // Enhanced arrow paths with correct node dimensions and hierarchical flow
  const arrowPaths = useMemo(() => {
    const paths = new Map<string, string>();
    
    skillEdges.forEach(edge => {
      const from = skillPositions.get(edge.prerequisite_skill_id);
      const to = skillPositions.get(edge.skill_id);
      if (!from || !to) return;
      
      // Node dimensions: 80px x 80px (w-20 h-20)
      const nodeWidth = 80;
      const nodeHeight = 80;
      
      // Calculate connection points (center bottom of 'from' node to center top of 'to' node)
      const fromX = from.x + nodeWidth / 2;
      const fromY = from.y + nodeHeight; // Bottom of from node
      const toX = to.x + nodeWidth / 2;
      const toY = to.y; // Top of to node
      
      const dx = toX - fromX;
      const dy = toY - fromY;
      
      // Create smooth bezier curve for hierarchical flow
      const controlPoint1X = fromX;
      const controlPoint1Y = fromY + Math.abs(dy) * 0.3;
      const controlPoint2X = toX;
      const controlPoint2Y = toY - Math.abs(dy) * 0.3;
      
      const pathData = `M ${fromX} ${fromY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${toX} ${toY}`;
      paths.set(`${edge.prerequisite_skill_id}-${edge.skill_id}`, pathData);
    });
    
    return paths;
  }, [skillEdges, skillPositions]);

  // Enhanced pivot paths
  const pivotPaths = useMemo(() => {
    if (!showPivotPaths) return new Map<string, { path: string; branch: SkillBranch }>();
    
    const paths = new Map<string, { path: string; branch: SkillBranch }>();
    
    skillBranches.forEach(branch => {
      const from = skillPositions.get(branch.from_skill_id);
      const to = skillPositions.get(branch.to_skill_id);
      if (!from || !to) return;
      
      // Node dimensions: 80px x 80px
      const nodeWidth = 80;
      const nodeHeight = 80;
      
      // Center-to-center connections for pivot paths
      const fromX = from.x + nodeWidth / 2;
      const fromY = from.y + nodeHeight / 2;
      const toX = to.x + nodeWidth / 2;
      const toY = to.y + nodeHeight / 2;
      
      const dx = toX - fromX;
      const dy = toY - fromY;
      
      // Create arched path for pivot connections
      const controlPoint1X = fromX + dx * 0.3;
      const controlPoint1Y = fromY - 50; // Arc upward
      const controlPoint2X = toX - dx * 0.3;
      const controlPoint2Y = toY - 50;
      
      const pathData = `M ${fromX} ${fromY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${toX} ${toY}`;
      paths.set(`pivot-${branch.from_skill_id}-${branch.to_skill_id}`, { path: pathData, branch });
    });
    
    return paths;
  }, [skillBranches, skillPositions, showPivotPaths]);

  const handlePivotPathClick = useCallback((branch: SkillBranch) => {
    setSelectedPivotPath(branch);
  }, []);

  // Enhanced performance logging with feature tracking
  useEffect(() => {
    performanceTracker.log(`Enhanced render complete: ${filteredSkills.length} skills`, {
      animations: true,
      tooltips: true,
      progressBars: true,
      statusRings: true,
      hoverEffects: true,
      goalSkills: goalSkills.length,
      checkpoints: checkpointSkills.length,
      pivotPaths: showPivotPaths ? skillBranches.length : 0
    });
  }, [filteredSkills.length, goalSkills.length, checkpointSkills.length, skillBranches.length, showPivotPaths]);

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 cursor-grab active:cursor-grabbing" 
      style={{ height: 800, width: '100%' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Enhanced Controls */}
      <SkillTreeControls
        zoomLevel={zoomLevel}
        onZoomIn={() => setZoomLevel(prev => Math.min(prev * 1.2, 3))}
        onZoomOut={() => setZoomLevel(prev => Math.max(prev * 0.8, 0.2))}
        onFitToView={fitToView}
        onReset={() => {
          setZoomLevel(0.8);
          setPanOffset({ x: 0, y: 0 });
        }}
        onToggleMinimap={() => setShowMinimap(!showMinimap)}
        showMinimap={showMinimap}
      />

      {/* Enhanced Stats Display */}
      <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span>Skills:</span>
            <span className="font-medium">{filteredSkills.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Categories:</span>
            <span className="font-medium">{availableCategories.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Goals:</span>
            <span className="font-medium text-blue-600">{goalSkills.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Checkpoints:</span>
            <span className="font-medium text-pink-600">{checkpointSkills.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Zoom:</span>
            <span className="font-medium">{Math.round(zoomLevel * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Enhanced SVG Layer for Arrows with better animations */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={containerDimensions.width}
        height={containerDimensions.height}
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: '0 0'
        }}
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
        
        {Array.from(arrowPaths.entries()).map(([edgeKey, pathData]) => {
          const [prerequisiteId, skillId] = edgeKey.split('-');
          const toSkill = skills.find(s => s.id === skillId);
          const isHovered = hoveredArrows.includes(edgeKey);
          
          const strokeColor = toSkill ? getCategoryColor(toSkill.category) : '#9ca3af';
          
          return (
            <path
              key={edgeKey}
              d={pathData}
              stroke={strokeColor}
              strokeWidth={isHovered ? "3" : "2"}
              fill="none"
              strokeOpacity={isHovered ? "0.9" : "0.6"}
              className={isHovered ? "skill-arrow-flow" : "transition-all duration-300"}
              markerEnd="url(#arrowhead)"
            />
          );
        })}

        {/* Enhanced Pivot Path Arrows */}
        {showPivotPaths && Array.from(pivotPaths.entries()).map(([pivotKey, { path: pathData, branch }]) => {
          const typeColors = {
            pivot: '#fbbf24',
            branch: '#10b981',
            backtrack: '#f97316'
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
              className="cursor-pointer hover:stroke-opacity-100 pointer-events-auto transition-all duration-300"
              markerEnd="url(#pivot-arrowhead)"
              onClick={() => handlePivotPathClick(branch)}
            />
          );
        })}
      </svg>

      {/* Enhanced Node Layer with full functionality */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: '0 0'
        }}
      >
        {filteredSkills.map(skill => {
          const position = skillPositions.get(skill.id);
          if (!position) return null;
          
          const progress = userProgress.find(p => p.skill_id === skill.id);
          const isRecommended = recommendedSkills.includes(skill.id);
          const hasCourses = skillsWithCourses.includes(skill.id);
          const isInPath = highlightedSkillPath.includes(skill.id);
          
          return (
            <EnhancedSkillTreeNode
              key={skill.id}
              skill={skill}
              userProgress={progress}
              position={position}
              onClick={() => handleSkillClick(skill)}
              categoryColor={getCategoryColor(skill.category)}
              isRecommended={isRecommended}
              isGoalSkill={goalSkills.includes(skill.id)}
              isCheckpoint={checkpointSkills.includes(skill.id)}
              hasCourses={hasCourses}
              size="medium"
              isInPath={isInPath}
              onHover={(isHovering) => handleSkillHover(skill.id, isHovering)}
              careerPathName={careerPathName}
            />
          );
        })}
      </div>

      {/* Minimap */}
      {showMinimap && (
        <SkillTreeMinimap
          skills={filteredSkills}
          skillPositions={skillPositions}
          userProgress={userProgress}
          goalSkills={goalSkills}
          checkpointSkills={checkpointSkills}
          recommendedSkills={recommendedSkills}
          currentViewport={{
            x: panOffset.x,
            y: panOffset.y,
            zoom: zoomLevel,
            width: containerDimensions.width,
            height: containerDimensions.height
          }}
          onViewportChange={(x, y) => setPanOffset({ x, y })}
        />
      )}

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

SkillTreeCanvas.displayName = 'SkillTreeCanvas';

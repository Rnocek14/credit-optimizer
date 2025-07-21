
import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { SkillTreeNode } from './SkillTreeNode';

// Performance tracking utilities
const performanceTracker = {
  startTime: 0,
  frameCount: 0,
  lastFrameTime: 0,
  
  startTracking() {
    this.startTime = performance.now();
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
  },
  
  trackFrame() {
    this.frameCount++;
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    
    if (this.frameCount % 30 === 0) {
      const avgFrameTime = (currentTime - this.startTime) / this.frameCount;
      const fps = 1000 / deltaTime;
      console.log(`[SkillTree Performance] Avg Frame Time: ${avgFrameTime.toFixed(2)}ms, Current FPS: ${fps.toFixed(1)}`);
    }
  },
  
  endTracking() {
    const totalTime = performance.now() - this.startTime;
    const avgFps = this.frameCount / (totalTime / 1000);
    console.log(`[SkillTree Performance] Total render time: ${totalTime.toFixed(2)}ms, Avg FPS: ${avgFps.toFixed(1)}, Total frames: ${this.frameCount}`);
  }
};

// Debounce utility
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
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
  availableCategories: string[];
  onSkillClick: (skill: any) => void;
  skillsWithCourses?: string[];
}

export const SkillTreeCanvas: React.FC<SkillTreeCanvasProps> = memo(({
  skills,
  userProgress,
  skillEdges,
  filteredSkills,
  recommendedSkills,
  availableCategories,
  onSkillClick,
  skillsWithCourses = []
}) => {
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 1200, height: 800 });
  const [highlightedSkillPath, setHighlightedSkillPath] = useState<string[]>([]);
  const [renderStartTime, setRenderStartTime] = useState<number>(0);
  const [hoveredArrows, setHoveredArrows] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

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


  // Memoized skill depth calculation for hierarchical layout
  const getSkillDepthMap = useCallback(() => {
    if (!filteredSkills.length || !skillEdges.length) return new Map();
    
    const depthMap = new Map();
    const visited = new Set();

    const dfs = (skillId: string, depth: number) => {
      if (visited.has(skillId)) return;
      visited.add(skillId);
      depthMap.set(skillId, depth);
      
      const children = skillEdges.filter(e => e.prerequisite_skill_id === skillId);
      children.forEach(edge => dfs(edge.skill_id, depth + 1));
    };

    // Start DFS from skills with no prerequisites
    const skillsWithPrereqs = new Set(skillEdges.map(e => e.skill_id));
    const rootSkills = filteredSkills.filter(skill => !skillsWithPrereqs.has(skill.id));
    
    rootSkills.forEach(skill => dfs(skill.id, 0));
    
    return depthMap;
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

  // Debounced fit-to-view for performance
  const debouncedFitToView = useDebounce(() => {
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
  }, 150);

  // Immediate fit-to-view for button clicks
  const fitToView = useCallback(() => {
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
  }, [skillPositions, containerDimensions]);

  // Auto-fit on layout changes with debouncing
  useEffect(() => {
    setRenderStartTime(performance.now());
    performanceTracker.startTracking();
    
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        debouncedFitToView();
        performanceTracker.endTracking();
      });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [debouncedFitToView, filteredSkills.length]);

  // Performance tracking for zoom/pan
  useEffect(() => {
    const trackPerformance = () => {
      performanceTracker.trackFrame();
      animationFrameRef.current = requestAnimationFrame(trackPerformance);
    };
    
    if (isDragging || Math.abs(zoomLevel - 0.8) > 0.01) {
      trackPerformance();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDragging, zoomLevel]);

  // Debounced container resize handling
  const debouncedResize = useDebounce(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerDimensions({ width: rect.width, height: rect.height });
    }
  }, 100);

  useEffect(() => {
    const handleResize = () => {
      debouncedResize();
    };

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerDimensions({ width: rect.width, height: rect.height });
    }
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [debouncedResize]);

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

  // Performance benchmark logging
  useEffect(() => {
    if (renderStartTime > 0) {
      const renderTime = performance.now() - renderStartTime;
      console.log(`[SkillTree Benchmark] Rendered ${filteredSkills.length} skills in ${renderTime.toFixed(2)}ms`);
      
      // Benchmark categories
      if (filteredSkills.length <= 12) {
        console.log(`[Benchmark] Small tree (≤12 skills): ${renderTime.toFixed(2)}ms - Target: <100ms`);
      } else if (filteredSkills.length <= 25) {
        console.log(`[Benchmark] Medium tree (13-25 skills): ${renderTime.toFixed(2)}ms - Target: <200ms`);
      } else if (filteredSkills.length <= 50) {
        console.log(`[Benchmark] Large tree (26-50 skills): ${renderTime.toFixed(2)}ms - Target: <400ms`);
      } else {
        console.log(`[Benchmark] XL tree (50+ skills): ${renderTime.toFixed(2)}ms - Consider virtualization`);
      }
      
      setRenderStartTime(0);
    }
  }, [filteredSkills.length, renderStartTime]);

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
      </div>

      {/* Stats Display */}
      <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm border rounded-lg p-3 shadow">
        <div className="text-sm space-y-1">
          <div>Skills: {filteredSkills.length}</div>
          <div>Categories: {availableCategories.length}</div>
          <div>Zoom: {Math.round(zoomLevel * 100)}%</div>
        </div>
      </div>

      {/* SVG Layer for Arrows */}
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
        </defs>
        
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
      </svg>

      {/* Node Layer */}
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
            <SkillTreeNode
              key={skill.id}
              skill={skill}
              userProgress={progress}
              position={position}
              onClick={() => handleSkillClick(skill)}
              categoryColor={getCategoryColor(skill.category)}
              isRecommended={isRecommended}
              hasCourses={hasCourses}
              size="medium"
              isInPath={isInPath}
              onHover={(isHovering) => handleSkillHover(skill.id, isHovering)}
            />
          );
        })}
      </div>
    </div>
  );
});

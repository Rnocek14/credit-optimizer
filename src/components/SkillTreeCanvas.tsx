
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SkillTreeNode } from './SkillTreeNode';

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

export const SkillTreeCanvas: React.FC<SkillTreeCanvasProps> = ({
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
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Auto-fit to view on layout changes
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

  // Auto-fit on layout changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        fitToView();
      });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [fitToView, filteredSkills.length]);

  // Container resize handling
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width: rect.width, height: rect.height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Bezier path calculation for smooth arrows
  const calculateBezierPath = useCallback((fromX: number, fromY: number, toX: number, toY: number) => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    
    const controlPoint1X = fromX;
    const controlPoint1Y = fromY + Math.abs(dy) * 0.3;
    const controlPoint2X = toX;
    const controlPoint2Y = toY - Math.abs(dy) * 0.3;
    
    return `M ${fromX} ${fromY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${toX} ${toY}`;
  }, []);

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
        
        {skillEdges.map(edge => {
          const from = skillPositions.get(edge.prerequisite_skill_id);
          const to = skillPositions.get(edge.skill_id);
          if (!from || !to) return null;
          
          const fromX = from.x + 60;
          const fromY = from.y + 80;
          const toX = to.x + 60;
          const toY = to.y;
          
          const pathData = calculateBezierPath(fromX, fromY, toX, toY);
          
          return (
            <path
              key={`${edge.prerequisite_skill_id}-${edge.skill_id}`}
              d={pathData}
              stroke="#64748b"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#arrowhead)"
              opacity="0.7"
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
          
          return (
            <SkillTreeNode
              key={skill.id}
              skill={skill}
              userProgress={progress}
              position={position}
              onClick={() => onSkillClick(skill)}
              categoryColor={getCategoryColor(skill.category)}
              isRecommended={isRecommended}
              hasCourses={hasCourses}
              size="medium"
            />
          );
        })}
      </div>
    </div>
  );
};

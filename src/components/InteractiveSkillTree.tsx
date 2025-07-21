
import React, { useState, useCallback, useEffect } from 'react';
import { SkillTreeNode } from './SkillTreeNode';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, MapPin, Move } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useToast } from '@/hooks/use-toast';

interface Skill {
  id: string;
  name: string;
  category: string;
  xp_value: number;
  difficulty_level: number;
  description?: string;
}

interface UserProgress {
  skill_id: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  xp_earned: number;
  cri_score?: number;
}

interface SkillEdge {
  prerequisite_skill_id: string;
  skill_id: string;
}

type LayoutMode = 'category' | 'hierarchy' | 'force';

interface InteractiveSkillTreeProps {
  skills: Skill[];
  userProgress: UserProgress[];
  skillEdges: SkillEdge[];
  filteredSkills: Skill[];
  recommendedSkills: string[];
  skillsWithCourses?: string[];
  availableCategories: string[];
  onSkillClick: (skill: Skill) => void;
  className?: string;
  showMinimap?: boolean;
  layoutMode?: LayoutMode;
}

export const InteractiveSkillTree: React.FC<InteractiveSkillTreeProps> = ({
  skills,
  userProgress,
  skillEdges,
  filteredSkills,
  recommendedSkills,
  skillsWithCourses = [],
  availableCategories,
  onSkillClick,
  className,
  showMinimap = true,
  layoutMode = 'hierarchy'
}) => {
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [containerDimensions, setContainerDimensions] = useState({ width: 1200, height: 800 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const { toast } = useToast();

  // Helper function to build skill depth map based on prerequisite chains
  const getSkillDepthMap = useCallback((): Map<string, number> => {
    const depthMap = new Map<string, number>();
    const visited = new Set<string>();
    
    const calculateDepth = (skillId: string): number => {
      if (visited.has(skillId)) return depthMap.get(skillId) || 0;
      visited.add(skillId);
      
      const prerequisites = skillEdges
        .filter(edge => edge.skill_id === skillId)
        .map(edge => edge.prerequisite_skill_id);
      
      if (prerequisites.length === 0) {
        depthMap.set(skillId, 0);
        return 0;
      }
      
      const maxPrereqDepth = Math.max(...prerequisites.map(prereqId => calculateDepth(prereqId)));
      const depth = maxPrereqDepth + 1;
      depthMap.set(skillId, depth);
      return depth;
    };
    
    filteredSkills.forEach(skill => calculateDepth(skill.id));
    return depthMap;
  }, [filteredSkills, skillEdges]);

  // Helper function to generate layered hierarchical layout
  const generateLayeredLayout = useCallback((): Map<string, { x: number; y: number }> => {
    const positions = new Map<string, { x: number; y: number }>();
    const depthMap = getSkillDepthMap();
    
    // Group skills by depth level
    const skillsByLevel = new Map<number, Skill[]>();
    filteredSkills.forEach(skill => {
      const depth = depthMap.get(skill.id) || 0;
      if (!skillsByLevel.has(depth)) {
        skillsByLevel.set(depth, []);
      }
      skillsByLevel.get(depth)!.push(skill);
    });
    
    const maxDepth = Math.max(...Array.from(depthMap.values())) || 0;
    const levelHeight = 150;
    const baseY = 100;
    
    // Position skills in each level
    Array.from(skillsByLevel.entries()).forEach(([level, levelSkills]) => {
      const y = baseY + level * levelHeight;
      const totalWidth = Math.max(800, levelSkills.length * 180);
      const spacing = totalWidth / (levelSkills.length + 1);
      
      // Sort skills by category to maintain some grouping
      levelSkills.sort((a, b) => a.category.localeCompare(b.category));
      
      levelSkills.forEach((skill, index) => {
        const x = spacing * (index + 1) - 50; // Center adjustment
        positions.set(skill.id, { x, y });
      });
    });
    
    return positions;
  }, [filteredSkills, getSkillDepthMap]);

  // Helper function for force-directed layout with repulsion
  const generateForceLayout = useCallback((): Map<string, { x: number; y: number }> => {
    const positions = new Map<string, { x: number; y: number }>();
    
    // Initialize random positions
    filteredSkills.forEach((skill, index) => {
      const angle = (index / filteredSkills.length) * 2 * Math.PI;
      const radius = 200 + Math.random() * 100;
      const x = 500 + Math.cos(angle) * radius;
      const y = 400 + Math.sin(angle) * radius;
      positions.set(skill.id, { x, y });
    });
    
    // Apply force simulation (simplified)
    for (let iteration = 0; iteration < 50; iteration++) {
      const forces = new Map<string, { x: number; y: number }>();
      
      // Initialize forces
      filteredSkills.forEach(skill => {
        forces.set(skill.id, { x: 0, y: 0 });
      });
      
      // Repulsion forces
      filteredSkills.forEach(skill1 => {
        filteredSkills.forEach(skill2 => {
          if (skill1.id === skill2.id) return;
          
          const pos1 = positions.get(skill1.id)!;
          const pos2 = positions.get(skill2.id)!;
          const dx = pos1.x - pos2.x;
          const dy = pos1.y - pos2.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          if (distance < 150) { // Minimum distance
            const repulsionForce = 300 / (distance * distance);
            const fx = (dx / distance) * repulsionForce;
            const fy = (dy / distance) * repulsionForce;
            
            const force1 = forces.get(skill1.id)!;
            force1.x += fx;
            force1.y += fy;
          }
        });
      });
      
      // Attraction forces for connected skills
      skillEdges.forEach(edge => {
        const sourcePos = positions.get(edge.prerequisite_skill_id);
        const targetPos = positions.get(edge.skill_id);
        
        if (!sourcePos || !targetPos) return;
        
        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const attractionForce = distance * 0.01;
        
        const fx = (dx / distance) * attractionForce;
        const fy = (dy / distance) * attractionForce;
        
        const sourceForce = forces.get(edge.prerequisite_skill_id)!;
        const targetForce = forces.get(edge.skill_id)!;
        
        sourceForce.x += fx;
        sourceForce.y += fy;
        targetForce.x -= fx;
        targetForce.y -= fy;
      });
      
      // Apply forces with damping
      filteredSkills.forEach(skill => {
        const pos = positions.get(skill.id)!;
        const force = forces.get(skill.id)!;
        
        pos.x += force.x * 0.1;
        pos.y += force.y * 0.1;
        
        // Keep within bounds
        pos.x = Math.max(50, Math.min(pos.x, containerDimensions.width - 50));
        pos.y = Math.max(50, Math.min(pos.y, containerDimensions.height - 50));
      });
    }
    
    return positions;
  }, [filteredSkills, skillEdges, containerDimensions]);

  // Helper function for category-based layout (legacy)
  const generateCategoryLayout = useCallback((): Map<string, { x: number; y: number }> => {
    const positions = new Map<string, { x: number; y: number }>();
    
    const categorySpacing = 200;
    const skillSpacing = 80;
    const baseX = 100;
    const baseY = 100;
    const categoriesPerRow = Math.min(availableCategories.length, 4);
    
    const skillsByCategory = new Map<string, Skill[]>();
    availableCategories.forEach(category => {
      const categorySkills = filteredSkills.filter(skill => skill.category === category);
      if (categorySkills.length > 0) {
        skillsByCategory.set(category, categorySkills);
      }
    });
    
    const activeCategories = Array.from(skillsByCategory.keys());
    
    activeCategories.forEach((category, categoryIndex) => {
      const categorySkills = skillsByCategory.get(category) || [];
      
      const categoryRow = Math.floor(categoryIndex / categoriesPerRow);
      const categoryCol = categoryIndex % categoriesPerRow;
      
      const categoryBaseX = baseX + categoryCol * categorySpacing;
      const categoryBaseY = baseY + categoryRow * (categorySpacing + 20);
      
      const skillsPerRow = Math.min(Math.ceil(Math.sqrt(categorySkills.length)), 2);
      
      categorySkills.forEach((skill, index) => {
        const skillRow = Math.floor(index / skillsPerRow);
        const skillCol = index % skillsPerRow;
        
        const x = categoryBaseX + skillCol * skillSpacing;
        const y = categoryBaseY + skillRow * skillSpacing;
        
        positions.set(skill.id, { x, y });
      });
    });
    
    return positions;
  }, [filteredSkills, availableCategories]);

  // Calculate optimal container size based on skills and layout
  useEffect(() => {
    const skillCount = filteredSkills.length;
    
    if (layoutMode === 'hierarchy') {
      const depthMap = getSkillDepthMap();
      const maxDepth = Math.max(...Array.from(depthMap.values()).concat([0])) + 1;
      const maxSkillsPerLevel = Math.max(...Array.from(
        Array(maxDepth).fill(0).map((_, level) => 
          Array.from(depthMap.entries()).filter(([_, depth]) => depth === level).length
        ).concat([1])
      ));
      
      const minWidth = Math.max(800, maxSkillsPerLevel * 180 + 200);
      const minHeight = Math.max(600, maxDepth * 150 + 200);
      setContainerDimensions({ width: minWidth, height: minHeight });
    } else if (layoutMode === 'force') {
      const minWidth = Math.max(1000, Math.sqrt(skillCount) * 200);
      const minHeight = Math.max(800, Math.sqrt(skillCount) * 150);
      setContainerDimensions({ width: minWidth, height: minHeight });
    } else {
      const categoryCount = availableCategories.length;
      const minWidth = Math.max(800, Math.min(categoryCount * 160, 1200));
      const minHeight = Math.max(600, Math.min(Math.ceil(skillCount / 4) * 120, 900));
      setContainerDimensions({ width: minWidth, height: minHeight });
    }
  }, [filteredSkills.length, availableCategories.length, layoutMode, getSkillDepthMap]);

  const resetView = () => {
    setZoomLevel(0.8);
    setPanOffset({ x: 0, y: 0 });
  };

  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 2));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.3));
  };

  const fitToView = () => {
    if (filteredSkills.length === 0) return;
    
    const positions = calculateSkillPositions();
    const xPositions = Array.from(positions.values()).map(p => p.x);
    const yPositions = Array.from(positions.values()).map(p => p.y);
    
    const minX = Math.min(...xPositions) - 100;
    const maxX = Math.max(...xPositions) + 100;
    const minY = Math.min(...yPositions) - 100;
    const maxY = Math.max(...yPositions) + 100;
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    const viewportWidth = 800; // Visible area width
    const viewportHeight = 500; // Visible area height
    
    const scaleX = viewportWidth / contentWidth;
    const scaleY = viewportHeight / contentHeight;
    const optimalZoom = Math.min(scaleX, scaleY, 1);
    
    setZoomLevel(optimalZoom);
    setPanOffset({
      x: -(minX + contentWidth / 2) * optimalZoom + viewportWidth / 2,
      y: -(minY + contentHeight / 2) * optimalZoom + viewportHeight / 2
    });
  };

  const getPrerequisitePath = useCallback((skillId: string): string[] => {
    const path: string[] = [];
    const visited = new Set<string>();
    
    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      const prerequisites = skillEdges
        .filter(edge => edge.skill_id === id)
        .map(edge => edge.prerequisite_skill_id);
      
      prerequisites.forEach(prereqId => {
        path.push(prereqId);
        traverse(prereqId);
      });
    };
    
    traverse(skillId);
    return path;
  }, [skillEdges]);

  const handleSkillHover = useCallback((skillId: string, hovered: boolean) => {
    setHoveredSkill(hovered ? skillId : null);
    if (hovered) {
      const path = getPrerequisitePath(skillId);
      setHighlightedPath([skillId, ...path]);
    } else {
      setHighlightedPath([]);
    }
  }, [getPrerequisitePath]);

  const celebrateSkillCompletion = useCallback((skill: Skill) => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    toast({
      title: "🎉 Skill Mastered!",
      description: `You've completed ${skill.name} and earned ${skill.xp_value} XP!`,
    });
  }, [toast]);

  // Master positioning system that delegates to layout algorithms
  const calculateSkillPositions = useCallback((): Map<string, { x: number; y: number }> => {
    if (filteredSkills.length === 0) return new Map();
    
    switch (layoutMode) {
      case 'hierarchy':
        return generateLayeredLayout();
      case 'force':
        return generateForceLayout();
      case 'category':
      default:
        return generateCategoryLayout();
    }
  }, [layoutMode, generateLayeredLayout, generateForceLayout, generateCategoryLayout]);

  // Auto-invoke fitToView on load and when layout changes
  useEffect(() => {
    if (filteredSkills.length > 0) {
      const timeoutId = setTimeout(() => {
        fitToView();
      }, 100); // Small delay to ensure layout calculations are complete
      
      return () => clearTimeout(timeoutId);
    }
  }, [filteredSkills.length, layoutMode]);

  // Helper function to get category color based on skill category
  const getCategoryColor = useCallback((category: string): string => {
    const colors = {
      'frontend': '#3b82f6',     // Blue
      'backend': '#10b981',      // Green  
      'database': '#f59e0b',     // Yellow
      'devops': '#ef4444',       // Red
      'cloud': '#8b5cf6',        // Purple
      'mobile': '#06b6d4',       // Cyan
      'testing': '#84cc16',      // Lime
      'design': '#ec4899',       // Pink
      'security': '#f97316',     // Orange
      'ai': '#6366f1'            // Indigo
    };
    return colors[category.toLowerCase() as keyof typeof colors] || '#6b7280';
  }, []);

  // Helper function to calculate bezier curve for edges
  const calculateBezierPath = useCallback((
    sourceX: number, sourceY: number, 
    targetX: number, targetY: number
  ): string => {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    
    // Control points for smooth curves
    let cp1x, cp1y, cp2x, cp2y;
    
    if (layoutMode === 'hierarchy') {
      // For hierarchical layout, prefer vertical flow
      if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical connection
        cp1x = sourceX;
        cp1y = sourceY + dy * 0.5;
        cp2x = targetX;
        cp2y = targetY - dy * 0.5;
      } else {
        // Horizontal connection
        cp1x = sourceX + dx * 0.5;
        cp1y = sourceY;
        cp2x = targetX - dx * 0.5;
        cp2y = targetY;
      }
    } else {
      // For other layouts, use standard bezier curves
      cp1x = sourceX + dx * 0.3;
      cp1y = sourceY + dy * 0.1;
      cp2x = targetX - dx * 0.3;
      cp2y = targetY - dy * 0.1;
    }
    
    return `M ${sourceX} ${sourceY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetX} ${targetY}`;
  }, [layoutMode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const skillPositions = calculateSkillPositions();
  const visibleSkills = filteredSkills.filter(skill => skills.includes(skill));

  // SVG dimensions that encompass all content
  const svgWidth = containerDimensions.width;
  const svgHeight = containerDimensions.height;

  console.log('Skill positions:', skillPositions);
  console.log('Visible skills:', visibleSkills.length);
  console.log('Container dimensions:', containerDimensions);

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Interactive Skill Tree</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fitToView} title="Fit to View">
              <Move className="h-4 w-4" />
            </Button>
            {showMinimap && (
              <Button variant="outline" size="sm" title="Toggle Minimap">
                <MapPin className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={resetView}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="relative w-full h-[600px] bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden">
          {/* Skill Tree Container */}
          <div 
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: '0 0'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Render skill nodes */}
            {visibleSkills.map((skill) => {
              const position = skillPositions.get(skill.id);
              if (!position) return null;
              
              const progress = userProgress.find(p => p.skill_id === skill.id);
              const isRecommended = recommendedSkills.includes(skill.id);
              const isHighlighted = highlightedPath.includes(skill.id);
              const hasCourses = skillsWithCourses.includes(skill.id);
              
              const prerequisites = skillEdges
                .filter(edge => edge.skill_id === skill.id)
                .map(edge => edge.prerequisite_skill_id);
              
              const uncompletedPrereqs = prerequisites.filter(prereqId => {
                const prereqProgress = userProgress.find(p => p.skill_id === prereqId);
                return prereqProgress?.status !== 'completed';
              });
              
              return (
                <SkillTreeNode
                  key={skill.id}
                  skill={skill}
                  userProgress={progress}
                  position={position}
                  onClick={() => {
                    onSkillClick(skill);
                    if (progress?.status === 'completed') {
                      celebrateSkillCompletion(skill);
                    }
                  }}
                  isRecommended={isRecommended}
                  isHighlighted={isHighlighted}
                  hasCourses={hasCourses}
                  prerequisiteSteps={uncompletedPrereqs.length}
                  onHover={(hovered) => handleSkillHover(skill.id, hovered)}
                  size={zoomLevel < 0.5 ? 'small' : 'medium'}
                  categoryColor={getCategoryColor(skill.category)}
                />
              );
            })}

            {/* SVG for connections */}
            <svg 
              className="absolute inset-0 pointer-events-none"
              width={svgWidth}
              height={svgHeight}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            >
              {skillEdges.map((edge) => {
                const sourcePos = skillPositions.get(edge.prerequisite_skill_id);
                const targetPos = skillPositions.get(edge.skill_id);
                
                if (!sourcePos || !targetPos) return null;
                
                // Only show connections for visible skills
                const sourceVisible = visibleSkills.some(s => s.id === edge.prerequisite_skill_id);
                const targetVisible = visibleSkills.some(s => s.id === edge.skill_id);
                
                if (!sourceVisible || !targetVisible) return null;
                
                const isHighlighted = highlightedPath.includes(edge.prerequisite_skill_id) && 
                                    highlightedPath.includes(edge.skill_id);
                
                // Calculate connection points anchored to node borders
                const nodeWidth = 100;
                const nodeHeight = 80;
                
                // Source: bottom edge for hierarchy, right edge for others
                let sourceX, sourceY, targetX, targetY;
                
                if (layoutMode === 'hierarchy') {
                  // Connect from bottom to top for clear progression
                  sourceX = sourcePos.x + nodeWidth / 2;
                  sourceY = sourcePos.y + nodeHeight;
                  targetX = targetPos.x + nodeWidth / 2;
                  targetY = targetPos.y;
                } else {
                  // Connect from center to center for other layouts
                  sourceX = sourcePos.x + nodeWidth / 2;
                  sourceY = sourcePos.y + nodeHeight / 2;
                  targetX = targetPos.x + nodeWidth / 2;
                  targetY = targetPos.y + nodeHeight / 2;
                }
                
                // Use bezier curves for smoother connections
                const pathData = calculateBezierPath(sourceX, sourceY, targetX, targetY);
                
                return (
                  <path
                    key={`${edge.prerequisite_skill_id}-${edge.skill_id}`}
                    d={pathData}
                    stroke={isHighlighted ? '#3b82f6' : '#94a3b8'}
                    strokeWidth={isHighlighted ? 3 : 2}
                    fill="none"
                    opacity={isHighlighted ? 0.9 : 0.6}
                    markerEnd={`url(#arrowhead${isHighlighted ? '-highlighted' : ''})`}
                  />
                );
              })}
              
              {/* Arrow marker definitions */}
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
                    fill="#94a3b8"
                  />
                </marker>
                <marker
                  id="arrowhead-highlighted"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#3b82f6"
                  />
                </marker>
              </defs>
            </svg>
          </div>

          {/* Enhanced Minimap */}
          {showMinimap && visibleSkills.length > 5 && (
            <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
              <div className="text-xs text-muted-foreground mb-2">Skill Tree Overview</div>
              <div className="w-32 h-24 bg-gradient-to-br from-blue-50 to-purple-50 rounded border relative overflow-hidden">
                {visibleSkills.slice(0, 30).map((skill) => {
                  const position = skillPositions.get(skill.id);
                  if (!position) return null;
                  
                  const progress = userProgress.find(p => p.skill_id === skill.id);
                  const hasCourses = skillsWithCourses.includes(skill.id);
                  
                  // Scale position to minimap
                  const x = (position.x / containerDimensions.width) * 128;
                  const y = (position.y / containerDimensions.height) * 96;
                  
                  return (
                    <div
                      key={skill.id}
                      className={`absolute w-2 h-2 rounded-full ${
                        progress?.status === 'completed' ? 'bg-green-500' :
                        progress?.status === 'in_progress' ? 'bg-blue-500' :
                        hasCourses ? 'bg-purple-400' :
                        'bg-gray-400'
                      }`}
                      style={{ left: Math.max(0, Math.min(x, 126)), top: Math.max(0, Math.min(y, 94)) }}
                      title={skill.name}
                    />
                  );
                })}
                
                {/* Viewport indicator */}
                <div
                  className="absolute border-2 border-blue-500 bg-blue-200/20 rounded"
                  style={{
                    left: Math.max(0, Math.min(-panOffset.x / containerDimensions.width * 128 / zoomLevel, 124)),
                    top: Math.max(0, Math.min(-panOffset.y / containerDimensions.height * 96 / zoomLevel, 92)),
                    width: Math.min(128 / zoomLevel, 128),
                    height: Math.min(96 / zoomLevel, 96)
                  }}
                />
              </div>
              
              <div className="text-xs text-muted-foreground mt-2">
                {visibleSkills.length} skills • Zoom: {Math.round(zoomLevel * 100)}%
              </div>
            </div>
          )}

          {/* No skills message */}
          {visibleSkills.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-lg font-medium">No skills found</p>
                <p className="text-sm">Try adjusting your filters or search term</p>
              </div>
            </div>
          )}

          {/* Zoom level indicator */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm border rounded px-3 py-1 text-xs font-medium">
            Zoom: {Math.round(zoomLevel * 100)}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Navigation, 
  Route, 
  Target,
  Eye,
  EyeOff,
  ArrowRight,
  Play,
  Pause
} from 'lucide-react';
import { OptimizedSkillTreeNode } from './OptimizedSkillTreeNode';
import { CareerStepNode } from './CareerStepNode';
import { useCareerGraph } from '@/hooks/useCareerGraph';

interface EnhancedSkillTreeCanvasProps {
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
  capstoneSkillIds?: string[];
  onSkillClick: (skill: any) => void;
  selectedCareerPath?: string | null;
  focusMode?: boolean;
}

export const EnhancedSkillTreeCanvas: React.FC<EnhancedSkillTreeCanvasProps> = ({
  skills,
  userProgress,
  skillEdges,
  filteredSkills,
  recommendedSkills,
  goalSkills = [],
  checkpointSkills = [],
  capstoneSkillIds = [],
  onSkillClick,
  selectedCareerPath,
  focusMode = false
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  
  // Enhanced camera controls
  const [cameraState, setCameraState] = useState({
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 },
    targetZoom: 1,
    targetPan: { x: 0, y: 0 }
  });
  
  // Animation and interaction states
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPathAnimation, setShowPathAnimation] = useState(false);
  const [animatedPaths, setAnimatedPaths] = useState<Set<string>>(new Set());
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Career graph integration
  const { 
    nodes: graphNodes, 
    edges: graphEdges, 
    findOptimalPaths, 
    findPivotOpportunities,
    loading: graphLoading 
  } = useCareerGraph({ careerPathId: selectedCareerPath });

  // Smooth camera animation
  const animateCamera = useCallback(() => {
    const { zoomLevel, panOffset, targetZoom, targetPan } = cameraState;
    
    const zoomDiff = targetZoom - zoomLevel;
    const panDiffX = targetPan.x - panOffset.x;
    const panDiffY = targetPan.y - panOffset.y;
    
    const threshold = 0.01;
    
    if (Math.abs(zoomDiff) > threshold || Math.abs(panDiffX) > threshold || Math.abs(panDiffY) > threshold) {
      const lerp = 0.1;
      setCameraState(prev => ({
        ...prev,
        zoomLevel: prev.zoomLevel + zoomDiff * lerp,
        panOffset: {
          x: prev.panOffset.x + panDiffX * lerp,
          y: prev.panOffset.y + panDiffY * lerp
        }
      }));
      
      animationRef.current = requestAnimationFrame(animateCamera);
    } else {
      setCameraState(prev => ({
        ...prev,
        zoomLevel: prev.targetZoom,
        panOffset: { ...prev.targetPan }
      }));
      setIsAnimating(false);
    }
  }, [cameraState]);

  // Start camera animation
  useEffect(() => {
    if (isAnimating) {
      animationRef.current = requestAnimationFrame(animateCamera);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, animateCamera]);

  // Enhanced camera controls
  const zoomIn = useCallback(() => {
    setCameraState(prev => ({
      ...prev,
      targetZoom: Math.min(prev.targetZoom * 1.2, 3)
    }));
    setIsAnimating(true);
  }, []);

  const zoomOut = useCallback(() => {
    setCameraState(prev => ({
      ...prev,
      targetZoom: Math.max(prev.targetZoom / 1.2, 0.3)
    }));
    setIsAnimating(true);
  }, []);

  const resetView = useCallback(() => {
    setCameraState(prev => ({
      ...prev,
      targetZoom: 1,
      targetPan: { x: 0, y: 0 }
    }));
    setIsAnimating(true);
  }, []);

  const focusOnSkill = useCallback((skillId: string) => {
    const skillPosition = skillPositions.get(skillId);
    if (skillPosition) {
      setCameraState(prev => ({
        ...prev,
        targetZoom: 1.5,
        targetPan: {
          x: -skillPosition.x + (canvasRef.current?.clientWidth || 800) / 2,
          y: -skillPosition.y + (canvasRef.current?.clientHeight || 600) / 2
        }
      }));
      setIsAnimating(true);
    }
  }, []);

  // Enhanced skill positioning with better algorithm
  const skillPositions = useMemo(() => {
    if (!filteredSkills.length) return new Map();

    const positions = new Map();
    const levelHeight = 200;
    const nodeWidth = 140;
    const nodeSpacing = 60;
    const categorySpacing = 30;
    
    // Calculate skill depths with better algorithm
    const depthMap = new Map();
    const visited = new Set();
    
    const calculateDepth = (skillId: string, currentDepth = 0): number => {
      if (visited.has(skillId)) return currentDepth;
      if (depthMap.has(skillId)) return depthMap.get(skillId);
      
      visited.add(skillId);
      
      const prerequisites = skillEdges.filter(edge => edge.skill_id === skillId);
      if (prerequisites.length === 0) {
        depthMap.set(skillId, 0);
        return 0;
      }
      
      const maxPrereqDepth = Math.max(
        ...prerequisites.map(edge => calculateDepth(edge.prerequisite_skill_id, currentDepth + 1))
      );
      
      const depth = maxPrereqDepth + 1;
      depthMap.set(skillId, depth);
      return depth;
    };

    // Calculate depths for all skills
    filteredSkills.forEach(skill => calculateDepth(skill.id));

    // Group by depth and category
    const levelMap = new Map();
    filteredSkills.forEach(skill => {
      const depth = depthMap.get(skill.id) || 0;
      if (!levelMap.has(depth)) levelMap.set(depth, new Map());
      
      const categoryMap = levelMap.get(depth);
      if (!categoryMap.has(skill.category)) categoryMap.set(skill.category, []);
      categoryMap.get(skill.category).push(skill);
    });

    // Position skills by level and category
    Array.from(levelMap.entries()).forEach(([depth, categoryMap]) => {
      const categories = Array.from(categoryMap.entries());
      const totalCategories = categories.length;
      
      let globalX = 100;
      const y = 100 + depth * levelHeight;
      
      categories.forEach(([category, categorySkills], categoryIndex) => {
        const skillCount = categorySkills.length;
        const categoryWidth = skillCount * nodeWidth + (skillCount - 1) * nodeSpacing;
        
        let currentX = globalX;
        
        categorySkills
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
          .forEach((skill: any, skillIndex: number) => {
            positions.set(skill.id, { 
              x: currentX, 
              y,
              category: skill.category,
              depth: depth
            });
            currentX += nodeWidth + nodeSpacing;
          });
        
        globalX += categoryWidth + categorySpacing;
      });
    });

    return positions;
  }, [filteredSkills, skillEdges]);

  // Find optimal learning paths
  const getOptimalPath = useCallback((fromSkillId: string, toSkillId: string) => {
    if (graphNodes.length === 0) return [];
    
    try {
      const paths = findOptimalPaths('skill', fromSkillId, 'skill', toSkillId, 'time');
      return paths[0]?.nodes.map(node => node.id) || [];
    } catch (error) {
      console.error('Error finding optimal path:', error);
      return [];
    }
  }, [graphNodes, findOptimalPaths]);

  // Animate learning paths
  const animateLearningPath = useCallback((skillIds: string[]) => {
    setAnimatedPaths(new Set());
    setShowPathAnimation(true);
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < skillIds.length) {
        setAnimatedPaths(prev => new Set([...prev, skillIds[currentIndex]]));
        currentIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => setShowPathAnimation(false), 2000);
      }
    }, 500);
  }, []);

  // Enhanced skill hover with path highlighting
  const handleSkillHover = useCallback((skillId: string, isHovering: boolean) => {
    if (isHovering && goalSkills.length > 0) {
      // Find shortest path to nearest goal skill
      const nearestGoal = goalSkills[0]; // Simplified - could be improved
      const path = getOptimalPath(skillId, nearestGoal);
      setHighlightedPath(path);
    } else {
      setHighlightedPath([]);
    }
  }, [goalSkills, getOptimalPath]);

  // Enhanced skill click with path animation
  const handleSkillClick = useCallback((skill: any) => {
    onSkillClick(skill);
    
    // If in focus mode, animate path to this skill
    if (focusMode && goalSkills.length > 0) {
      const path = getOptimalPath(skill.id, goalSkills[0]);
      if (path.length > 0) {
        animateLearningPath(path);
      }
    }
    
    // Focus camera on clicked skill
    focusOnSkill(skill.id);
  }, [onSkillClick, focusMode, goalSkills, getOptimalPath, animateLearningPath, focusOnSkill]);

  // Mouse interaction handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setCameraState(prev => ({
        ...prev,
        targetPan: {
          x: prev.panOffset.x + deltaX,
          y: prev.panOffset.y + deltaY
        }
      }));
      
      setDragStart({ x: e.clientX, y: e.clientY });
      setIsAnimating(true);
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setCameraState(prev => ({
      ...prev,
      targetZoom: Math.max(0.3, Math.min(3, prev.targetZoom * zoomFactor))
    }));
    setIsAnimating(true);
  }, []);

  // Render connection lines with animations
  const renderConnections = useCallback(() => {
    if (!skillEdges.length || !skillPositions.size) return null;

    return skillEdges.map(edge => {
      const fromPos = skillPositions.get(edge.prerequisite_skill_id);
      const toPos = skillPositions.get(edge.skill_id);
      
      if (!fromPos || !toPos) return null;

      const isHighlighted = highlightedPath.includes(edge.prerequisite_skill_id) && 
                           highlightedPath.includes(edge.skill_id);
      const isAnimated = animatedPaths.has(edge.prerequisite_skill_id) && 
                        animatedPaths.has(edge.skill_id);

      return (
        <g key={`${edge.prerequisite_skill_id}-${edge.skill_id}`}>
          <line
            x1={fromPos.x + 70}
            y1={fromPos.y + 35}
            x2={toPos.x + 70}
            y2={toPos.y + 35}
            stroke={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--border))"}
            strokeWidth={isHighlighted ? 3 : 1}
            strokeDasharray={isAnimated ? "5,5" : "none"}
            className={isAnimated ? "animate-pulse" : ""}
            markerEnd="url(#arrowhead)"
          />
        </g>
      );
    });
  }, [skillEdges, skillPositions, highlightedPath, animatedPaths]);

  if (graphLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-background rounded-lg border overflow-hidden">
      {/* Enhanced Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <Card className="p-2">
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={zoomIn}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={zoomOut}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetView}
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </Card>
        
        <Card className="p-2">
          <div className="flex gap-1">
            <Button
              variant={showMinimap ? "default" : "outline"}
              size="sm"
              onClick={() => setShowMinimap(!showMinimap)}
              className="h-8 w-8 p-0"
            >
              {showMinimap ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button
              variant={showPathAnimation ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPathAnimation(!showPathAnimation)}
              className="h-8 w-8 p-0"
            >
              {showPathAnimation ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
        </Card>
      </div>

      {/* Status Information */}
      <div className="absolute top-4 right-4 z-10">
        <Card className="p-3">
          <div className="text-sm space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                Zoom: {(cameraState.zoomLevel * 100).toFixed(0)}%
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Skills: {filteredSkills.length}
              </Badge>
              <Badge variant="outline">
                Goals: {goalSkills.length}
              </Badge>
            </div>
            {highlightedPath.length > 0 && (
              <Badge className="flex items-center gap-1">
                <Route className="h-3 w-3" />
                Path: {highlightedPath.length} steps
              </Badge>
            )}
          </div>
        </Card>
      </div>

      {/* Main Canvas */}
      <div
        ref={canvasRef}
        className="w-full h-full cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          width="100%"
          height="100%"
          style={{
            transform: `translate(${cameraState.panOffset.x}px, ${cameraState.panOffset.y}px) scale(${cameraState.zoomLevel})`
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
                fill="hsl(var(--border))"
              />
            </marker>
          </defs>
          
          {renderConnections()}
        </svg>

        {/* Skill Nodes */}
        <div
          style={{
            transform: `translate(${cameraState.panOffset.x}px, ${cameraState.panOffset.y}px) scale(${cameraState.zoomLevel})`
          }}
        >
          {filteredSkills.map(skill => {
            const position = skillPositions.get(skill.id);
            if (!position) return null;

            const progress = userProgress.find(p => p.skill_id === skill.id);
            const isRecommended = recommendedSkills.includes(skill.id);
            const isGoal = goalSkills.includes(skill.id);
            const isCheckpoint = checkpointSkills.includes(skill.id);
            const isCapstone = capstoneSkillIds.includes(skill.id);
            const isHighlighted = highlightedPath.includes(skill.id);
            const isAnimated = animatedPaths.has(skill.id);

            return (
              <div
                key={skill.id}
                style={{
                  position: 'absolute',
                  left: position.x,
                  top: position.y,
                  zIndex: isHighlighted ? 20 : isGoal ? 15 : 10
                }}
              >
                <OptimizedSkillTreeNode
                  skill={skill}
                  userProgress={progress}
                  isRecommended={isRecommended}
                  isCheckpoint={isCheckpoint}
                  isCapstone={isCapstone}
                  onClick={() => handleSkillClick(skill)}
                  onHover={(isHovering: boolean) => handleSkillHover(skill.id, isHovering)}
                  zoomLevel={cameraState.zoomLevel}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Minimap */}
      {showMinimap && (
        <div className="absolute bottom-4 right-4 z-10">
          <Card className="p-2 w-48 h-32 bg-muted/80">
            <div className="text-xs font-medium mb-2">Overview</div>
            <div className="relative w-full h-full bg-background/50 rounded">
              {/* Simplified minimap view */}
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                {filteredSkills.length} skills
              </div>
              {/* Viewport indicator */}
              <div 
                className="absolute border border-primary rounded"
                style={{
                  width: `${Math.min(100, 100 / cameraState.zoomLevel)}%`,
                  height: `${Math.min(100, 100 / cameraState.zoomLevel)}%`,
                  left: `${Math.max(0, Math.min(100 - 100 / cameraState.zoomLevel, -cameraState.panOffset.x / 10))}%`,
                  top: `${Math.max(0, Math.min(100 - 100 / cameraState.zoomLevel, -cameraState.panOffset.y / 10))}%`
                }}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
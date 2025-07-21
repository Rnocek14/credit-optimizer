
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
  showMinimap = true
}) => {
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [containerDimensions, setContainerDimensions] = useState({ width: 1200, height: 800 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const { toast } = useToast();

  // Calculate optimal container size based on skills
  useEffect(() => {
    const skillCount = filteredSkills.length;
    const categoryCount = availableCategories.length;
    
    // Dynamic sizing based on content
    const minWidth = Math.max(1200, categoryCount * 200);
    const minHeight = Math.max(800, Math.ceil(skillCount / 6) * 150);
    
    setContainerDimensions({ width: minWidth, height: minHeight });
  }, [filteredSkills.length, availableCategories.length]);

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
    
    const viewportWidth = 1000; // Visible area width
    const viewportHeight = 600; // Visible area height
    
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

  // Improved positioning system with proper bounds and centering
  const calculateSkillPositions = () => {
    const positions = new Map<string, { x: number; y: number }>();
    
    if (filteredSkills.length === 0) return positions;
    
    // Compact layout parameters
    const categorySpacing = 280;
    const skillSpacing = 100;
    const baseX = 150;
    const baseY = 150;
    
    // Organize categories in a grid that fits well
    const categoriesPerRow = Math.min(Math.ceil(Math.sqrt(availableCategories.length)), 4);
    
    availableCategories.forEach((category, categoryIndex) => {
      const categorySkills = filteredSkills.filter(skill => skill.category === category);
      if (categorySkills.length === 0) return;
      
      // Calculate category position
      const categoryRow = Math.floor(categoryIndex / categoriesPerRow);
      const categoryCol = categoryIndex % categoriesPerRow;
      
      const categoryBaseX = baseX + categoryCol * categorySpacing;
      const categoryBaseY = baseY + categoryRow * (categorySpacing + 50);
      
      // Organize skills within category
      const skillsPerRow = Math.min(Math.ceil(Math.sqrt(categorySkills.length)), 3);
      
      categorySkills.forEach((skill, index) => {
        const skillRow = Math.floor(index / skillsPerRow);
        const skillCol = index % skillsPerRow;
        
        const x = categoryBaseX + skillCol * skillSpacing;
        const y = categoryBaseY + skillRow * skillSpacing;
        
        positions.set(skill.id, { x, y });
      });
    });
    
    return positions;
  };

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
        
        <div className="relative w-full h-[700px] bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden">
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
                
                // Calculate connection points (center of nodes)
                const sourceX = sourcePos.x + 50; // Half node width
                const sourceY = sourcePos.y + 40; // Half node height
                const targetX = targetPos.x + 50;
                const targetY = targetPos.y + 40;
                
                return (
                  <line
                    key={`${edge.prerequisite_skill_id}-${edge.skill_id}`}
                    x1={sourceX}
                    y1={sourceY}
                    x2={targetX}
                    y2={targetY}
                    stroke={isHighlighted ? '#3b82f6' : '#94a3b8'}
                    strokeWidth={isHighlighted ? 3 : 2}
                    opacity={isHighlighted ? 0.9 : 0.6}
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
              
              {/* Arrow marker definition */}
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

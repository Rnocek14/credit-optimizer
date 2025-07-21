
import React, { useState, useCallback } from 'react';
import { SkillTreeNode } from './SkillTreeNode';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, MapPin } from 'lucide-react';
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
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const { toast } = useToast();

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 3));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.3));
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

  // Calculate positions for skills using the actual categories from the database
  const calculateSkillPositions = () => {
    const positions = new Map<string, { x: number; y: number }>();
    
    // Use the actual categories from the database
    const categoriesPerRow = Math.ceil(Math.sqrt(availableCategories.length));
    const categorySpacing = 250; // Horizontal spacing between categories
    const skillSpacing = 120; // Spacing between skills within a category
    
    availableCategories.forEach((category, categoryIndex) => {
      const categorySkills = filteredSkills.filter(skill => skill.category === category);
      const skillsPerRow = Math.ceil(Math.sqrt(categorySkills.length));
      
      // Calculate category position in a grid layout
      const categoryRow = Math.floor(categoryIndex / categoriesPerRow);
      const categoryCol = categoryIndex % categoriesPerRow;
      
      const categoryBaseX = categoryCol * categorySpacing + 150;
      const categoryBaseY = categoryRow * (categorySpacing + 50) + 150;
      
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

  const skillPositions = calculateSkillPositions();

  // Filter skills to show only those that match current filters
  const visibleSkills = filteredSkills.filter(skill => skills.includes(skill));

  console.log('Visible skills:', visibleSkills.length);
  console.log('Filtered skills:', filteredSkills.length);
  console.log('All skills:', skills.length);
  console.log('Available categories:', availableCategories);

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Interactive Skill Tree</h3>
          <div className="flex items-center gap-2">
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
        
        <div className="relative w-full h-96 bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden">
          {/* Skill Tree Container */}
          <div 
            className="absolute inset-0 transition-transform duration-300"
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: 'center center'
            }}
          >
            {/* Render skill nodes */}
            {visibleSkills.map((skill) => {
              const position = skillPositions.get(skill.id) || { x: 100, y: 100 };
              const progress = userProgress.find(p => p.skill_id === skill.id);
              const isRecommended = recommendedSkills.includes(skill.id);
              const isHighlighted = highlightedPath.includes(skill.id);
              const hasCourses = skillsWithCourses.includes(skill.id);
              
              // Calculate prerequisite steps
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
                  size={window.innerWidth < 768 ? 'small' : 'medium'}
                />
              );
            })}

            {/* Draw connections between skills */}
            <svg 
              className="absolute inset-0 pointer-events-none"
              style={{ width: '100%', height: '100%' }}
            >
              {skillEdges.map((edge) => {
                const sourcePos = skillPositions.get(edge.prerequisite_skill_id);
                const targetPos = skillPositions.get(edge.skill_id);
                
                if (!sourcePos || !targetPos) return null;
                
                const isHighlighted = highlightedPath.includes(edge.prerequisite_skill_id) && 
                                    highlightedPath.includes(edge.skill_id);
                
                return (
                  <line
                    key={`${edge.prerequisite_skill_id}-${edge.skill_id}`}
                    x1={sourcePos.x}
                    y1={sourcePos.y}
                    x2={targetPos.x}
                    y2={targetPos.y}
                    stroke={isHighlighted ? '#3b82f6' : '#94a3b8'}
                    strokeWidth={isHighlighted ? 3 : 2}
                    opacity={isHighlighted ? 0.9 : 0.6}
                  />
                );
              })}
            </svg>
          </div>

          {/* Minimap */}
          {showMinimap && visibleSkills.length > 10 && (
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
              <div className="text-xs text-muted-foreground mb-1">Minimap</div>
              <div className="w-24 h-16 bg-muted rounded relative overflow-hidden">
                {visibleSkills.slice(0, 20).map((skill, index) => {
                  const progress = userProgress.find(p => p.skill_id === skill.id);
                  const hasCourses = skillsWithCourses.includes(skill.id);
                  const x = (index % 8) * 3;
                  const y = Math.floor(index / 8) * 3;
                  return (
                    <div
                      key={skill.id}
                      className={`absolute w-2 h-2 rounded-full ${
                        progress?.status === 'completed' ? 'bg-green-500' :
                        progress?.status === 'in_progress' ? 'bg-blue-500' :
                        hasCourses ? 'bg-purple-400' :
                        'bg-gray-300'
                      }`}
                      style={{ left: x, top: y }}
                      title={skill.name}
                    />
                  );
                })}
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
        </div>
      </CardContent>
    </Card>
  );
};

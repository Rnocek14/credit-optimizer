
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
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
  onSkillClick,
  className,
  showMinimap = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const { toast } = useToast();

  // Create hierarchy data structure
  const createHierarchyData = () => {
    const skillMap = new Map();
    skills.forEach(skill => skillMap.set(skill.id, skill));
    
    const progressMap = new Map();
    userProgress.forEach(p => progressMap.set(p.skill_id, p));
    
    // Find root skills (skills with no prerequisites)
    const rootSkills = skills.filter(skill => 
      !skillEdges.some(edge => edge.skill_id === skill.id)
    );

    // Build tree structure
    const buildTree = (skill: Skill): any => {
      const children = skillEdges
        .filter(edge => edge.prerequisite_skill_id === skill.id)
        .map(edge => skillMap.get(edge.skill_id))
        .filter(Boolean)
        .map(childSkill => buildTree(childSkill!));

      return {
        id: skill.id,
        name: skill.name,
        category: skill.category,
        data: skill,
        userProgress: progressMap.get(skill.id),
        children: children.length > 0 ? children : null
      };
    };

    return {
      name: 'Skills',
      children: rootSkills.map(skill => buildTree(skill))
    };
  };

  const resetView = () => {
    setTransform({ x: 0, y: 0, k: 1 });
  };

  const zoomIn = () => {
    setTransform(prev => ({ ...prev, k: Math.min(prev.k * 1.5, 3) }));
  };

  const zoomOut = () => {
    setTransform(prev => ({ ...prev, k: Math.max(prev.k / 1.5, 0.1) }));
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

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    
    // Update dimensions
    const rect = container.getBoundingClientRect();
    setDimensions({ width: rect.width, height: rect.height });

    // Clear previous content
    svg.selectAll('*').remove();

    const width = rect.width;
    const height = rect.height;

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        setTransform({
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k
        });
      });

    svg.call(zoom as any);

    // Create hierarchy
    const hierarchyData = createHierarchyData();
    const root = d3.hierarchy(hierarchyData);

    // Create tree layout
    const treeLayout = d3.tree<any>()
      .size([width - 100, height - 100])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

    treeLayout(root);

    // Create group for zoomable content
    const g = svg.append('g')
      .attr('transform', `translate(${transform.x}, ${transform.y}) scale(${transform.k})`);

    // Draw links
    const links = g.selectAll('.link')
      .data(root.links())
      .enter().append('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal()
        .x((d: any) => d.y + 50)
        .y((d: any) => d.x + 50)
      )
      .attr('stroke', (d: any) => 
        highlightedPath.includes(d.source.data?.id) && highlightedPath.includes(d.target.data?.id)
          ? '#3b82f6' : '#94a3b8'
      )
      .attr('stroke-width', (d: any) => 
        highlightedPath.includes(d.source.data?.id) && highlightedPath.includes(d.target.data?.id)
          ? 3 : 2
      )
      .attr('fill', 'none')
      .attr('opacity', (d: any) => 
        highlightedPath.includes(d.source.data?.id) && highlightedPath.includes(d.target.data?.id)
          ? 0.9 : 0.6
      )
      .style('filter', (d: any) => 
        highlightedPath.includes(d.source.data?.id) && highlightedPath.includes(d.target.data?.id)
          ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))' : 'none'
      );

    // Apply current transform
    g.attr('transform', `translate(${transform.x}, ${transform.y}) scale(${transform.k})`);

  }, [skills, userProgress, skillEdges, filteredSkills, transform]);

  // Filter skills to show only those that match current filters
  const visibleSkills = filteredSkills.filter(skill => skills.includes(skill));

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
        
        <div 
          ref={containerRef}
          className="relative w-full h-96 bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden"
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className="cursor-move"
          />
          
          {/* Render skill nodes as React components */}
          {visibleSkills.map((skill, index) => {
            const progress = userProgress.find(p => p.skill_id === skill.id);
            const isRecommended = recommendedSkills.includes(skill.id);
            const isHighlighted = highlightedPath.includes(skill.id);
            
            // Calculate prerequisite steps
            const prerequisites = skillEdges
              .filter(edge => edge.skill_id === skill.id)
              .map(edge => edge.prerequisite_skill_id);
            
            const uncompletedPrereqs = prerequisites.filter(prereqId => {
              const prereqProgress = userProgress.find(p => p.skill_id === prereqId);
              return prereqProgress?.status !== 'completed';
            });
            
            // Calculate position based on category and index for now
            // In a real implementation, this would use the D3 tree layout positions
            const x = (index % 4) * 200 + 100;
            const y = Math.floor(index / 4) * 150 + 100;
            
            return (
              <SkillTreeNode
                key={skill.id}
                skill={skill}
                userProgress={progress}
                position={{ x, y }}
                onClick={() => {
                  onSkillClick(skill);
                  if (progress?.status === 'completed') {
                    celebrateSkillCompletion(skill);
                  }
                }}
                isRecommended={isRecommended}
                isHighlighted={isHighlighted}
                prerequisiteSteps={uncompletedPrereqs.length}
                onHover={(hovered) => handleSkillHover(skill.id, hovered)}
                size={window.innerWidth < 768 ? 'small' : 'medium'}
              />
            );
          })}

          {/* Minimap */}
          {showMinimap && visibleSkills.length > 10 && (
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
              <div className="text-xs text-muted-foreground mb-1">Minimap</div>
              <div className="w-24 h-16 bg-muted rounded relative overflow-hidden">
                {visibleSkills.slice(0, 20).map((skill, index) => {
                  const progress = userProgress.find(p => p.skill_id === skill.id);
                  const x = (index % 8) * 3;
                  const y = Math.floor(index / 8) * 3;
                  return (
                    <div
                      key={skill.id}
                      className={`absolute w-2 h-2 rounded-full ${
                        progress?.status === 'completed' ? 'bg-green-500' :
                        progress?.status === 'in_progress' ? 'bg-blue-500' :
                        'bg-gray-300'
                      }`}
                      style={{ left: x, top: y }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

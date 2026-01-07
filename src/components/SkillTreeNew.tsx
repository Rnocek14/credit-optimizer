import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

// Custom Node Types
import { SkillTreeStepNode } from './SkillTreeStepNode';
import { SkillTreeSkillNode } from './SkillTreeSkillNode';

const nodeTypes = {
  careerStep: SkillTreeStepNode,
  skill: SkillTreeSkillNode,
};

interface CareerPath {
  id: string;
  title: string;
  description: string;
}

interface CareerStep {
  id: string;
  title: string;
  description: string;
  level: number;
  is_terminal: boolean;
  estimated_duration: string;
  prerequisites: string[];
}

interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface StepSkillMapping {
  step_id: string;
  skill_id: string;
  importance_score: number;
}

export const SkillTreeNew: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [careerPaths, setCareerPaths] = useState<CareerPath[]>([]);
  const [selectedCareerPath, setSelectedCareerPath] = useState<string>('');
  const [careerSteps, setCareerSteps] = useState<CareerStep[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [stepSkillMappings, setStepSkillMappings] = useState<StepSkillMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSkills, setShowSkills] = useState(true);
  const [showPivots, setShowPivots] = useState(false);

  // Load career paths on mount
  useEffect(() => {
    loadCareerPaths();
  }, []);

  const loadCareerPaths = async () => {
    try {
      // Only load career paths that have steps
      const { data, error } = await supabase
        .from('career_paths')
        .select(`
          id, 
          title, 
          summary,
          career_steps!inner(id)
        `)
        .order('title');

      if (error) throw error;
      
      // Filter to only paths with steps and remove duplicates
      const pathsWithSteps = (data || [])
        .reduce((acc, item) => {
          if (!acc.find(p => p.id === item.id)) {
            acc.push({
              id: item.id,
              title: item.title,
              description: item.summary || ''
            });
          }
          return acc;
        }, [] as CareerPath[]);
      
      setCareerPaths(pathsWithSteps);
      
      console.log('Loaded career paths with steps:', pathsWithSteps.length);
    } catch (error) {
      console.error('Error loading career paths:', error);
      toast.error('Failed to load career paths');
    }
  };

  const loadCareerData = async (careerPathId: string) => {
    setLoading(true);
    try {
      // Load career steps with levels
      const { data: stepsData, error: stepsError } = await supabase
        .rpc('calculate_career_step_levels', { career_path_id_param: careerPathId });

      if (stepsError) throw stepsError;

      // Load skills
      const { data: skillsData, error: skillsError } = await supabase
        .from('skills')
        .select('*')
        .order('category, name');

      if (skillsError) throw skillsError;

      // Load step-skill mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('career_step_skills')
        .select('*')
        .in('step_id', stepsData?.map(s => s.id) || []);

      if (mappingsError) throw mappingsError;

      setCareerSteps(stepsData || []);
      setSkills(skillsData || []);
      setStepSkillMappings(mappingsData || []);

      console.log('Loaded career data:', {
        steps: stepsData?.length,
        skills: skillsData?.length,
        mappings: mappingsData?.length
      });

      // Show message if no steps found
      if (!stepsData || stepsData.length === 0) {
        toast.error('No career steps found for this path. Try generating a new path or select a different one.');
      }

    } catch (error) {
      console.error('Error loading career data:', error);
      toast.error('Failed to load career data');
    } finally {
      setLoading(false);
    }
  };

  // Generate nodes and edges when data changes
  useEffect(() => {
    if (careerSteps.length > 0) {
      generateNodesAndEdges();
    }
  }, [careerSteps, skills, stepSkillMappings, showSkills, showPivots]);

  const generateNodesAndEdges = useCallback(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Calculate layout parameters
    const LEVEL_HEIGHT = 200;
    const NODE_WIDTH = 250;
    const SKILL_OFFSET_Y = 100;

    // Group steps by level
    const stepsByLevel = careerSteps.reduce((acc, step) => {
      if (!acc[step.level]) acc[step.level] = [];
      acc[step.level].push(step);
      return acc;
    }, {} as Record<number, CareerStep[]>);

    // Create step nodes
    Object.entries(stepsByLevel).forEach(([level, steps]) => {
      const levelNum = parseInt(level);
      const y = levelNum * LEVEL_HEIGHT;

      steps.forEach((step, index) => {
        const x = (index - (steps.length - 1) / 2) * (NODE_WIDTH + 50);
        
        newNodes.push({
          id: step.id,
          type: 'careerStep',
          position: { x, y },
          data: {
            title: step.title,
            description: step.description,
            level: step.level,
            isTerminal: step.is_terminal,
            estimatedDuration: step.estimated_duration,
            prerequisites: step.prerequisites,
            skills: stepSkillMappings
              .filter(m => m.step_id === step.id)
              .map(m => {
                const skill = skills.find(s => s.id === m.skill_id);
                return skill ? { ...skill, importance: m.importance_score } : null;
              })
              .filter(Boolean)
          },
        });

        // Add prerequisite edges
        step.prerequisites?.forEach(prereqId => {
          newEdges.push({
            id: `${prereqId}-${step.id}`,
            source: prereqId,
            target: step.id,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: 'var(--primary)' },
          });
        });
      });
    });

    // Add skill nodes if enabled
    if (showSkills) {
      const skillCategories = [...new Set(skills.map(s => s.category))];
      
      skillCategories.forEach((category, catIndex) => {
        const categorySkills = skills.filter(s => s.category === category);
        
        categorySkills.forEach((skill, skillIndex) => {
          const x = (skillIndex - (categorySkills.length - 1) / 2) * 200;
          const y = -150 - (catIndex * 100);
          
          newNodes.push({
            id: `skill-${skill.id}`,
            type: 'skill',
            position: { x, y },
            data: {
              name: skill.name,
              category: skill.category,
              description: skill.description,
            },
          });

          // Connect skills to steps
          stepSkillMappings
            .filter(m => m.skill_id === skill.id)
            .forEach(mapping => {
              newEdges.push({
                id: `skill-${skill.id}-${mapping.step_id}`,
                source: `skill-${skill.id}`,
                target: mapping.step_id,
                type: 'smoothstep',
                style: { 
                  stroke: 'var(--muted-foreground)',
                  strokeDasharray: '5,5',
                  opacity: 0.6
                },
              });
            });
        });
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [careerSteps, skills, stepSkillMappings, showSkills]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleCareerPathChange = (careerPathId: string) => {
    setSelectedCareerPath(careerPathId);
    loadCareerData(careerPathId);
  };

  const generateNewCareerPath = async () => {
    const pathTitle = prompt('Enter career path title (e.g., "Frontend Developer"):');
    if (!pathTitle) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-skill-tree', {
        body: {
          career_title: pathTitle,
          create_comprehensive: true
        }
      });

      if (error) throw error;

      toast.success(`Generated new career path: ${pathTitle} with ${data.steps_created} steps and ${data.skills_total} skills`);
      await loadCareerPaths();
      
      // Select the newly created path
      if (data.career_path) {
        setSelectedCareerPath(data.career_path.id);
        await loadCareerData(data.career_path.id);
      }
    } catch (error) {
      console.error('Error generating career path:', error);
      toast.error('Failed to generate career path');
    } finally {
      setLoading(false);
    }
  };

  const selectedCareerData = careerPaths.find(p => p.id === selectedCareerPath);

  return (
    <div className="h-screen flex flex-col">
      {/* Header Controls */}
      <div className="p-4 border-b border-border bg-background">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-2xl font-bold">Skill Tree Builder</h1>
          <Button onClick={generateNewCareerPath} disabled={loading}>
            Generate New Path
          </Button>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label>Career Path:</label>
            <Select value={selectedCareerPath} onValueChange={handleCareerPathChange}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a career path" />
              </SelectTrigger>
              <SelectContent>
                {careerPaths.map(path => (
                  <SelectItem key={path.id} value={path.id}>
                    {path.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showSkills"
              checked={showSkills}
              onChange={(e) => setShowSkills(e.target.checked)}
            />
            <label htmlFor="showSkills">Show Skills</label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showPivots"
              checked={showPivots}
              onChange={(e) => setShowPivots(e.target.checked)}
            />
            <label htmlFor="showPivots">Show Pivot Paths</label>
          </div>

          {selectedCareerData && (
            <Badge variant="outline">
              {careerSteps.length} steps, {skills.length} skills
            </Badge>
          )}
        </div>

        {selectedCareerData && (
          <p className="text-sm text-muted-foreground mt-2">
            {selectedCareerData.description}
          </p>
        )}
      </div>

      {/* Tree Visualization */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {!selectedCareerPath && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Select a Career Path</h3>
              <p className="text-muted-foreground">Choose a career path from the dropdown above to view its skill tree.</p>
            </div>
          </div>
        )}

        {selectedCareerPath && careerSteps.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">No Steps Found</h3>
              <p className="text-muted-foreground mb-4">This career path doesn't have any steps yet.</p>
              <Button onClick={generateNewCareerPath}>
                Generate Steps for This Path
              </Button>
            </div>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
};
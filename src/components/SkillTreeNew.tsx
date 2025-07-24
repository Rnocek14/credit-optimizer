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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Custom Node Types - Complete 6-node architecture
import { SkillTreeStepNode } from './SkillTreeStepNode';
import { SkillTreeSkillNode } from './SkillTreeSkillNode';
import { JobNode } from './SkillTree/JobNode';
import { CourseNode } from './SkillTree/CourseNode';
import { ProjectNode } from './SkillTree/ProjectNode';
import { CertificationNode } from './SkillTree/CertificationNode';

// Hooks for complete functionality
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { usePivotRecommendations } from '@/hooks/usePivotRecommendations';

const nodeTypes = {
  careerStep: SkillTreeStepNode,
  skill: SkillTreeSkillNode,
  job: JobNode,
  course: CourseNode,
  project: ProjectNode,
  certification: CertificationNode,
};

interface CareerPath {
  id: string;
  title: string;
  description: string;
  average_salary?: number;
  roi_score?: number;
  growth_outlook?: string;
  industry?: string;
  level?: string;
}

interface CareerStep {
  id: string;
  title: string;
  description: string;
  level: number;
  is_terminal: boolean;
  estimated_duration: string;
  prerequisites: string[];
  step_type?: string;
  estimated_cost?: string;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty_level?: number;
  xp_value?: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  platform: string;
  cost: string;
  difficulty: string;
  skill_tags: string[];
  url?: string;
  is_ai_recommended?: boolean;
}

interface Project {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimated_time: string;
  skills_demonstrated: string[];
  project_type: string;
  github_url?: string;
  live_url?: string;
}

interface Certification {
  id: string;
  title: string;
  issuer: string;
  description: string;
  cost: string;
  validity_years: number;
  skills_validated: string[];
  exam_duration?: string;
  industry_recognition: 'high' | 'medium' | 'low';
  registration_url?: string;
}

interface StepSkillMapping {
  step_id: string;
  skill_id: string;
  importance_score: number;
}

interface GraphLayout {
  type: 'hierarchical' | 'force' | 'circular';
  direction: 'vertical' | 'horizontal';
}

export const SkillTreeNew: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [careerPaths, setCareerPaths] = useState<CareerPath[]>([]);
  const [selectedCareerPath, setSelectedCareerPath] = useState<string>('');
  const [careerSteps, setCareerSteps] = useState<CareerStep[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [stepSkillMappings, setStepSkillMappings] = useState<StepSkillMapping[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Graph display controls
  const [showSkills, setShowSkills] = useState(true);
  const [showCourses, setShowCourses] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showCertifications, setShowCertifications] = useState(false);
  const [showJobs, setShowJobs] = useState(false);
  const [showPivots, setShowPivots] = useState(false);
  const [showProgress, setShowProgress] = useState(true);
  const [graphLayout, setGraphLayout] = useState<GraphLayout>({ type: 'hierarchical', direction: 'vertical' });
  
  // User data - Get current user's skills and progress
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userSkills, setUserSkills] = useState<string[]>([]);

  // Career Readiness Integration
  const { 
    criScore, 
    userProgress, 
    isCriLoading,
    markCompleted,
    isCompleted,
    isInProgress,
    getProgressStatus 
  } = useCareerReadiness({ userId: currentUser?.id, targetJobId: selectedCareerPath, enabled: !!currentUser?.id });

  // Pivot Recommendations Integration
  const selectedPath = careerPaths.find(p => p.id === selectedCareerPath);
  const { 
    data: pivotRecommendations, 
    isLoading: pivotLoading 
  } = usePivotRecommendations({
    current_career: selectedPath?.title || '',
    user_skills: userSkills,
    preferred_locations: ['remote'], // Could be dynamic
    enabled: showPivots && !!selectedPath
  });

  // Load user and career paths on mount
  useEffect(() => {
    loadCurrentUser();
    loadCareerPaths();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    
    if (user) {
      // Load user's skills from profile or skill progress
      const { data: profile } = await supabase
        .from('profiles')
        .select('skills')
        .eq('user_id', user.id)
        .single();
      
      setUserSkills(profile?.skills || []);
    }
  };

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

      // Load courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('recommended_courses')
        .select('*')
        .eq('active', true)
        .order('title');

      if (coursesError) console.warn('Error loading courses:', coursesError);

      // Load step-skill mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('career_step_skills')
        .select('*')
        .in('step_id', stepsData?.map(s => s.id) || []);

      if (mappingsError) throw mappingsError;

      // Mock data for projects and certifications (these would come from real tables)
      const mockProjects: Project[] = stepsData?.slice(0, 3).map((step, index) => ({
        id: `project-${step.id}`,
        title: `${step.title} Project`,
        description: `Build a practical project to demonstrate ${step.title} skills`,
        difficulty: step.level > 2 ? 'advanced' : step.level > 1 ? 'intermediate' : 'beginner',
        estimated_time: '2-4 weeks',
        skills_demonstrated: ['React', 'TypeScript', 'Node.js'],
        project_type: 'portfolio',
        github_url: 'https://github.com',
        live_url: 'https://demo.com'
      })) || [];

      const mockCertifications: Certification[] = [
        {
          id: 'aws-cert',
          title: 'AWS Solutions Architect',
          issuer: 'Amazon',
          description: 'Validates expertise in designing distributed systems on AWS',
          cost: '$150',
          validity_years: 3,
          skills_validated: ['Cloud Architecture', 'AWS Services', 'Security'],
          exam_duration: '130 minutes',
          industry_recognition: 'high',
          registration_url: 'https://aws.amazon.com/certification'
        }
      ];

      setCareerSteps(stepsData || []);
      setSkills(skillsData || []);
      setCourses(coursesData || []);
      setProjects(mockProjects);
      setCertifications(mockCertifications);
      setStepSkillMappings(mappingsData || []);

      console.log('Loaded career data:', {
        steps: stepsData?.length,
        skills: skillsData?.length,
        courses: coursesData?.length,
        projects: mockProjects.length,
        certifications: mockCertifications.length,
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
  }, [careerSteps, skills, courses, projects, certifications, stepSkillMappings, 
      showSkills, showCourses, showProjects, showCertifications, showJobs, 
      showPivots, showProgress, graphLayout, userProgress]);

  const generateNodesAndEdges = useCallback(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Calculate layout parameters based on graph type
    const LEVEL_HEIGHT = graphLayout.direction === 'vertical' ? 300 : 200;
    const LEVEL_WIDTH = graphLayout.direction === 'horizontal' ? 400 : 300;
    const NODE_SPACING = 50;

    // Group steps by level
    const stepsByLevel = careerSteps.reduce((acc, step) => {
      if (!acc[step.level]) acc[step.level] = [];
      acc[step.level].push(step);
      return acc;
    }, {} as Record<number, CareerStep[]>);

    // Create job nodes if enabled (representing career milestones)
    if (showJobs && careerPaths.length > 0) {
      const selectedPath = careerPaths.find(p => p.id === selectedCareerPath);
      if (selectedPath) {
        const maxLevel = Math.max(...careerSteps.map(s => s.level));
        const jobY = graphLayout.direction === 'vertical' ? (maxLevel + 1) * LEVEL_HEIGHT : 0;
        
        newNodes.push({
          id: `job-${selectedPath.id}`,
          type: 'job',
          position: { x: 0, y: jobY },
          data: {
            title: selectedPath.title,
            description: selectedPath.description || '',
            level: selectedPath.level || 'Senior',
            industry: selectedPath.industry || 'Technology',
            averageSalary: selectedPath.average_salary || 120000,
            roiScore: selectedPath.roi_score || 8.5,
            growthOutlook: selectedPath.growth_outlook || 'Excellent',
            requiredSkillIds: skills.slice(0, 8).map(s => s.id),
            isGoal: true
          },
        });
      }
    }

    // Create step nodes with progress indicators
    Object.entries(stepsByLevel).forEach(([level, steps]) => {
      const levelNum = parseInt(level);
      const baseY = graphLayout.direction === 'vertical' ? levelNum * LEVEL_HEIGHT : 0;
      const baseX = graphLayout.direction === 'horizontal' ? levelNum * LEVEL_WIDTH : 0;

      steps.forEach((step, index) => {
        const offsetX = graphLayout.direction === 'vertical' 
          ? (index - (steps.length - 1) / 2) * (300 + NODE_SPACING)
          : baseX;
        const offsetY = graphLayout.direction === 'horizontal'
          ? (index - (steps.length - 1) / 2) * (200 + NODE_SPACING)
          : baseY;

        // Get user progress for this step
        const stepProgress = showProgress ? userProgress?.find(p => p.stepId === step.id) : null;
        const isStepCompleted = stepProgress?.status === 'completed';
        const isStepInProgress = stepProgress?.status === 'in_progress';
        
        newNodes.push({
          id: step.id,
          type: 'careerStep',
          position: { x: offsetX, y: offsetY },
          data: {
            title: step.title,
            description: step.description,
            level: step.level,
            isTerminal: step.is_terminal,
            estimatedDuration: step.estimated_duration,
            estimatedCost: step.estimated_cost,
            stepType: step.step_type,
            prerequisites: step.prerequisites,
            isCompleted: isStepCompleted,
            isInProgress: isStepInProgress,
            progress: stepProgress,
            criContribution: 0, // This would be calculated from criScore breakdown if available
            skills: stepSkillMappings
              .filter(m => m.step_id === step.id)
              .map(m => {
                const skill = skills.find(s => s.id === m.skill_id);
                const skillProgress = showProgress ? userProgress?.find(p => p.skillId === skill?.id) : null;
                return skill ? { 
                  ...skill, 
                  importance: m.importance_score,
                  isCompleted: skillProgress?.status === 'completed',
                  progress: skillProgress
                } : null;
              })
              .filter(Boolean),
            onMarkCompleted: () => {
              if (markCompleted) {
                markCompleted(step.id, 'step');
              }
            }
          },
        });

        // Add prerequisite edges with enhanced styling
        step.prerequisites?.forEach(prereqId => {
          const isUnlocked = isStepCompleted || !step.prerequisites || 
            step.prerequisites.every(id => userProgress?.find(p => p.stepId === id)?.status === 'completed');
          
          newEdges.push({
            id: `${prereqId}-${step.id}`,
            source: prereqId,
            target: step.id,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { 
              stroke: isUnlocked ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              strokeWidth: isUnlocked ? 2 : 1,
              opacity: isUnlocked ? 1 : 0.5
            },
            data: { label: 'prerequisite', unlocked: isUnlocked }
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
          const x = (skillIndex - (categorySkills.length - 1) / 2) * 250;
          const y = -200 - (catIndex * 120);
          
          const skillProgress = showProgress ? userProgress?.find(p => p.skillId === skill.id) : null;
          const isSkillCompleted = skillProgress?.status === 'completed';
          
          newNodes.push({
            id: `skill-${skill.id}`,
            type: 'skill',
            position: { x, y },
            data: {
              name: skill.name,
              category: skill.category,
              description: skill.description,
              difficultyLevel: skill.difficulty_level,
              xpValue: skill.xp_value,
              isCompleted: isSkillCompleted,
              progress: skillProgress,
              onMarkCompleted: () => {
                if (markCompleted) {
                  markCompleted(skill.id, 'skill');
                }
              }
            },
          });

          // Connect skills to steps with importance-based styling
          stepSkillMappings
            .filter(m => m.skill_id === skill.id)
            .forEach(mapping => {
              const importance = mapping.importance_score || 1;
              const opacity = Math.max(0.3, importance / 5);
              
              newEdges.push({
                id: `skill-${skill.id}-${mapping.step_id}`,
                source: `skill-${skill.id}`,
                target: mapping.step_id,
                type: 'smoothstep',
                style: { 
                  stroke: 'hsl(var(--muted-foreground))',
                  strokeDasharray: '5,5',
                  opacity,
                  strokeWidth: importance > 3 ? 2 : 1
                },
                data: { 
                  label: `Importance: ${importance}/5`,
                  importance 
                }
              });
            });
        });
      });
    }

    // Add course nodes if enabled
    if (showCourses && courses.length > 0) {
      courses.forEach((course, index) => {
        const x = (index - (courses.length - 1) / 2) * 300;
        const y = -400;
        
        newNodes.push({
          id: `course-${course.id}`,
          type: 'course',
          position: { x, y },
          data: {
            title: course.title,
            description: course.description,
            platform: course.platform,
            cost: course.cost,
            difficulty: course.difficulty,
            skillTags: course.skill_tags,
            url: course.url,
            isRecommended: course.is_ai_recommended,
            userProgress: 'not_started' // This would come from user progress data
          },
        });
      });
    }

    // Add project nodes if enabled
    if (showProjects && projects.length > 0) {
      projects.forEach((project, index) => {
        const x = (index - (projects.length - 1) / 2) * 350;
        const y = -600;
        
        newNodes.push({
          id: `project-${project.id}`,
          type: 'project',
          position: { x, y },
          data: {
            title: project.title,
            description: project.description,
            difficulty: project.difficulty,
            estimatedTime: project.estimated_time,
            skillsDemonstrated: project.skills_demonstrated,
            projectType: project.project_type,
            isCompleted: false, // This would come from user progress
            isInProgress: false,
            githubUrl: project.github_url,
            liveUrl: project.live_url
          },
        });
      });
    }

    // Add certification nodes if enabled
    if (showCertifications && certifications.length > 0) {
      certifications.forEach((cert, index) => {
        const x = (index - (certifications.length - 1) / 2) * 350;
        const y = -800;
        
        newNodes.push({
          id: `cert-${cert.id}`,
          type: 'certification',
          position: { x, y },
          data: {
            title: cert.title,
            issuer: cert.issuer,
            description: cert.description,
            cost: cert.cost,
            validityYears: cert.validity_years,
            skillsValidated: cert.skills_validated,
            examDuration: cert.exam_duration,
            industryRecognition: cert.industry_recognition,
            isEarned: false, // This would come from user progress
            registrationUrl: cert.registration_url
          },
        });
      });
    }

    // Add pivot path edges if enabled
    if (showPivots && pivotRecommendations?.length) {
      pivotRecommendations.forEach((pivot, index) => {
        // Create pivot nodes and connect them (simplified for now)
        const pivotNodeId = `pivot-${index}`;
        newNodes.push({
          id: pivotNodeId,
          type: 'careerStep',
          position: { x: 600, y: index * 150 },
          data: {
            title: pivot.new_career,
            description: `Pivot opportunity with ${pivot.shared_skills?.length || 0} shared skills`,
            level: 0,
            isPivot: true,
            roiScore: pivot.roi_score,
            estimatedTime: pivot.estimated_time,
            sharedSkills: pivot.shared_skills,
            missingSkills: pivot.missing_skills
          }
        });
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [
    careerSteps, skills, courses, projects, certifications, stepSkillMappings, 
    showSkills, showCourses, showProjects, showCertifications, showJobs,
    showPivots, showProgress, graphLayout, userProgress, criScore, 
    pivotRecommendations, selectedCareerPath, careerPaths,
    isCompleted, isInProgress, getProgressStatus, markCompleted
  ]);

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
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column - Path Selection and CRI */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label>Career Path:</Label>
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

            {/* CRI Score Display */}
            {criScore && showProgress && (
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Career Readiness Index</span>
                  <Badge variant={criScore.overall >= 80 ? 'default' : criScore.overall >= 60 ? 'secondary' : 'outline'}>
                    {criScore.overall}/100
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>Skills: {criScore.skillsScore}/100</div>
                  <div>Steps: {criScore.stepsScore}/100</div>
                  <div>Experience: {criScore.experienceScore}/100</div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Display Controls */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Switch id="showSkills" checked={showSkills} onCheckedChange={setShowSkills} />
                <Label htmlFor="showSkills">Skills</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="showCourses" checked={showCourses} onCheckedChange={setShowCourses} />
                <Label htmlFor="showCourses">Courses</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="showProjects" checked={showProjects} onCheckedChange={setShowProjects} />
                <Label htmlFor="showProjects">Projects</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="showCertifications" checked={showCertifications} onCheckedChange={setShowCertifications} />
                <Label htmlFor="showCertifications">Certifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="showJobs" checked={showJobs} onCheckedChange={setShowJobs} />
                <Label htmlFor="showJobs">Career Goals</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="showProgress" checked={showProgress} onCheckedChange={setShowProgress} />
                <Label htmlFor="showProgress">Progress</Label>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch id="showPivots" checked={showPivots} onCheckedChange={setShowPivots} />
              <Label htmlFor="showPivots">Pivot Opportunities</Label>
              {pivotLoading && <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent" />}
            </div>

            {/* Graph Layout Controls */}
            <div className="flex items-center gap-2">
              <Label>Layout:</Label>
              <Select 
                value={`${graphLayout.type}-${graphLayout.direction}`} 
                onValueChange={(value) => {
                  const [type, direction] = value.split('-');
                  setGraphLayout({ type: type as any, direction: direction as any });
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hierarchical-vertical">Hierarchical (Vertical)</SelectItem>
                  <SelectItem value="hierarchical-horizontal">Hierarchical (Horizontal)</SelectItem>
                  <SelectItem value="force-vertical">Force Layout</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        {selectedCareerData && (
          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant="outline">
              {careerSteps.length} steps
            </Badge>
            <Badge variant="outline">
              {skills.length} skills
            </Badge>
            {showCourses && (
              <Badge variant="outline">
                {courses.length} courses
              </Badge>
            )}
            {showProjects && (
              <Badge variant="outline">
                {projects.length} projects
              </Badge>
            )}
            {showCertifications && (
              <Badge variant="outline">
                {certifications.length} certifications
              </Badge>
            )}
            {showPivots && pivotRecommendations && (
              <Badge variant="outline">
                {pivotRecommendations.length} pivot opportunities
              </Badge>
            )}
          </div>
        )}

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
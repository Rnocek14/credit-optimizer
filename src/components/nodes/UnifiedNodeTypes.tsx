// UNIFIED NODE COMPONENTS: All 7 node types for the career graph
// Replaces fragmented node components with unified system

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { type GraphNode, type JobData, type SkillData, type CourseData, type ProjectData, type CertificationData, type StepData } from '@/lib/careerGraph';

// Common props for all node types
interface BaseNodeProps {
  data: GraphNode & {
    style?: {
      color: string;
      bgColor: string;
      icon: string;
      width?: number;
      height?: number;
    };
    userProgress?: {
      status: 'locked' | 'available' | 'in_progress' | 'completed' | 'verified';
      progress_percentage: number;
    };
    selected?: boolean;
    onClick?: () => void;
  };
  selected?: boolean;
}

// Job Node Component 💼
const JobNode = memo<BaseNodeProps>(({ data, selected }) => {
  const jobData = (data.data || {}) as JobData;
  const style = data.style || {};
  const progress = data.userProgress;

  const formatSalary = (salary?: number) => {
    if (!salary) return 'Salary varies';
    if (salary >= 1000000) return `$${(salary / 1000000).toFixed(1)}M`;
    if (salary >= 1000) return `$${(salary / 1000).toFixed(0)}K`;
    return `$${salary.toLocaleString()}`;
  };

  const getProgressColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'available': return 'bg-yellow-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      <Card 
        className={`p-4 cursor-pointer transition-all duration-200 ${
          selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
        }`}
        style={{ 
          backgroundColor: (style as any)?.bgColor || 'white',
          borderColor: (style as any)?.color || '#ccc',
          minWidth: (style as any)?.width || 280,
          minHeight: (style as any)?.height || 140
        }}
        onClick={data.onClick}
        data-testid="skill-node"
        data-node-type={data.type}
        data-node-id={data.id}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{(style as any)?.icon || '💼'}</span>
            <div>
              <h3 className="font-semibold text-sm leading-tight">{data.title}</h3>
              {jobData.level && (
                <Badge variant="secondary" className="text-xs mt-1">
                  {jobData.level}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Salary & Growth */}
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Salary:</span>
            <span className="font-medium">{formatSalary(jobData.average_salary)}</span>
          </div>
          {jobData.growth_outlook && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Outlook:</span>
              <span className="font-medium">{jobData.growth_outlook}</span>
            </div>
          )}
        </div>

        {/* Skills Preview */}
        {jobData.required_skills && jobData.required_skills.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-muted-foreground mb-1">Key Skills:</div>
            <div className="flex flex-wrap gap-1">
              {jobData.required_skills.slice(0, 3).map(skill => (
                <Badge key={skill} variant="outline" className="text-xs px-1 py-0">
                  {skill.length > 10 ? skill.substring(0, 10) + '...' : skill}
                </Badge>
              ))}
              {jobData.required_skills.length > 3 && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  +{jobData.required_skills.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Progress */}
        {progress && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Progress</span>
              <span>{progress.progress_percentage}%</span>
            </div>
            <Progress 
              value={progress.progress_percentage} 
              className="h-2"
            />
          </div>
        )}
      </Card>
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </>
  );
});

// Skill Node Component 🎯
const SkillNode = memo<BaseNodeProps>(({ data, selected }) => {
  const skillData = (data.data || {}) as SkillData;
  const style = data.style || {};
  const progress = data.userProgress;

  const getDifficultyColor = (level?: number) => {
    switch (level) {
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      <Card 
        className={`p-3 cursor-pointer transition-all duration-200 ${
          selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
        }`}
        style={{ 
          backgroundColor: (style as any)?.bgColor || 'white',
          borderColor: (style as any)?.color || '#ccc',
          minWidth: (style as any)?.width || 200,
          minHeight: (style as any)?.height || 100
        }}
        onClick={data.onClick}
        data-testid="skill-node"
        data-node-type={data.type}
        data-node-id={data.id}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{(style as any)?.icon || '🎯'}</span>
          <div>
            <h3 className="font-semibold text-sm leading-tight">{data.title}</h3>
            {skillData.category && (
              <div className="text-xs text-muted-foreground">{skillData.category}</div>
            )}
          </div>
        </div>

        {/* Difficulty & XP */}
        <div className="flex justify-between items-center mb-2">
          {skillData.difficulty_level && (
            <Badge 
              className={`text-xs ${getDifficultyColor(skillData.difficulty_level)}`}
              variant="secondary"
            >
              Level {skillData.difficulty_level}
            </Badge>
          )}
          {skillData.xp_value && (
            <span className="text-xs font-medium text-muted-foreground">
              {skillData.xp_value} XP
            </span>
          )}
        </div>

        {/* Progress */}
        {progress && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Mastery</span>
              <span>{progress.progress_percentage}%</span>
            </div>
            <Progress value={progress.progress_percentage} className="h-2" />
          </div>
        )}
      </Card>
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </>
  );
});

// Course Node Component 📚
const CourseNode = memo<BaseNodeProps>(({ data, selected }) => {
  const courseData = (data.data || {}) as CourseData;
  const style = data.style || {};
  const progress = data.userProgress;

  const formatCost = (cost?: number) => {
    if (!cost) return 'Free';
    if (cost >= 1000) return `$${(cost / 1000).toFixed(1)}K`;
    return `$${cost}`;
  };

  return (
    <>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      <Card 
        className={`p-3 cursor-pointer transition-all duration-200 ${
          selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
        }`}
        style={{ 
          backgroundColor: (style as any)?.bgColor || 'white',
          borderColor: (style as any)?.color || '#ccc',
          minWidth: (style as any)?.width || 240,
          minHeight: (style as any)?.height || 110
        }}
        onClick={data.onClick}
        data-testid="skill-node"
        data-node-type={data.type}
        data-node-id={data.id}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{(style as any)?.icon || '📚'}</span>
            <div>
              <h3 className="font-semibold text-sm leading-tight">{data.title}</h3>
              <div className="text-xs text-muted-foreground">{courseData.platform}</div>
            </div>
          </div>
        </div>

        {/* Cost & Duration */}
        <div className="flex justify-between text-xs mb-2">
          <span className="text-muted-foreground">Cost:</span>
          <span className="font-medium">{formatCost(courseData.cost)}</span>
        </div>

        {/* Skills Taught */}
        {courseData.skill_tags && courseData.skill_tags.length > 0 && (
          <div className="mb-2">
            <div className="text-xs text-muted-foreground mb-1">Skills:</div>
            <div className="flex flex-wrap gap-1">
              {courseData.skill_tags.slice(0, 2).map(skill => (
                <Badge key={skill} variant="outline" className="text-xs px-1 py-0">
                  {skill.length > 8 ? skill.substring(0, 8) + '...' : skill}
                </Badge>
              ))}
              {courseData.skill_tags.length > 2 && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  +{courseData.skill_tags.length - 2}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Progress & Action */}
        <div className="flex justify-between items-center">
          {progress ? (
            <div className="flex-1 mr-2">
              <Progress value={progress.progress_percentage} className="h-2" />
            </div>
          ) : null}
          {courseData.url && (
            <Button size="sm" variant="outline" className="text-xs px-2 py-1 h-6">
              View
            </Button>
          )}
        </div>
      </Card>
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </>
  );
});

// Project Node Component 🛠️
const ProjectNode = memo<BaseNodeProps>(({ data, selected }) => {
  const projectData = (data.data || {}) as ProjectData;
  const style = data.style || {};
  const progress = data.userProgress;

  const getProjectTypeColor = (type: string) => {
    switch (type) {
      case 'portfolio': return 'bg-blue-100 text-blue-800';
      case 'professional': return 'bg-green-100 text-green-800';
      case 'open_source': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      <Card 
        className={`p-3 cursor-pointer transition-all duration-200 ${
          selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
        }`}
        style={{ 
          backgroundColor: (style as any)?.bgColor || 'white',
          borderColor: (style as any)?.color || '#ccc',
          minWidth: (style as any)?.width || 260,
          minHeight: (style as any)?.height || 120
        }}
        onClick={data.onClick}
        data-testid="skill-node"
        data-node-type={data.type}
        data-node-id={data.id}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{(style as any)?.icon || '🛠️'}</span>
            <div>
              <h3 className="font-semibold text-sm leading-tight">{data.title}</h3>
              <Badge 
                className={`text-xs mt-1 ${getProjectTypeColor(projectData.project_type)}`}
                variant="secondary"
              >
                {projectData.project_type}
              </Badge>
            </div>
          </div>
        </div>

        {/* Time Estimate */}
        {data.estimated_time_hours && (
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground">Time:</span>
            <span className="font-medium">{data.estimated_time_hours}h</span>
          </div>
        )}

        {/* Technologies */}
        {projectData.technologies && projectData.technologies.length > 0 && (
          <div className="mb-2">
            <div className="text-xs text-muted-foreground mb-1">Tech:</div>
            <div className="flex flex-wrap gap-1">
              {projectData.technologies.slice(0, 3).map(tech => (
                <Badge key={tech} variant="outline" className="text-xs px-1 py-0">
                  {tech}
                </Badge>
              ))}
              {projectData.technologies.length > 3 && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  +{projectData.technologies.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Links & Progress */}
        <div className="flex justify-between items-center">
          <div className="flex gap-1">
            {projectData.github_url && (
              <Button size="sm" variant="outline" className="text-xs px-2 py-1 h-6">
                Code
              </Button>
            )}
            {projectData.demo_url && (
              <Button size="sm" variant="outline" className="text-xs px-2 py-1 h-6">
                Demo
              </Button>
            )}
          </div>
          {progress && (
            <div className="text-xs font-medium">
              {progress.status === 'completed' ? '✅' : '🔨'}
            </div>
          )}
        </div>
      </Card>
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </>
  );
});

// Certification Node Component 🏆
const CertificationNode = memo<BaseNodeProps>(({ data, selected }) => {
  const certData = (data.data || {}) as CertificationData;
  const style = data.style || {};
  const progress = data.userProgress;

  const getRecognitionColor = (level?: string) => {
    switch (level) {
      case 'expert': return 'bg-gold-100 text-gold-800';
      case 'professional': return 'bg-blue-100 text-blue-800';
      case 'entry': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      <Card 
        className={`p-3 cursor-pointer transition-all duration-200 ${
          selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
        }`}
        style={{ 
          backgroundColor: (style as any)?.bgColor || 'white',
          borderColor: (style as any)?.color || '#ccc',
          minWidth: (style as any)?.width || 220,
          minHeight: (style as any)?.height || 100
        }}
        onClick={data.onClick}
        data-testid="skill-node"
        data-node-type={data.type}
        data-node-id={data.id}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{(style as any)?.icon || '🏆'}</span>
          <div>
            <h3 className="font-semibold text-sm leading-tight">{data.title}</h3>
            <div className="text-xs text-muted-foreground">{certData.issuer}</div>
          </div>
        </div>

        {/* Recognition Level */}
        {certData.industry_recognition && (
          <div className="mb-2">
            <Badge 
              className={`text-xs ${getRecognitionColor(certData.industry_recognition)}`}
              variant="secondary"
            >
              {certData.industry_recognition} level
            </Badge>
          </div>
        )}

        {/* Cost & Prep Time */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
          {certData.cost && (
            <div>
              <span className="text-muted-foreground">Cost:</span>
              <div className="font-medium">${certData.cost}</div>
            </div>
          )}
          {certData.prep_time_hours && (
            <div>
              <span className="text-muted-foreground">Prep:</span>
              <div className="font-medium">{certData.prep_time_hours}h</div>
            </div>
          )}
        </div>

        {/* Progress & Validity */}
        <div className="flex justify-between items-center">
          {progress ? (
            <div className="flex-1 mr-2">
              <div className="text-xs">
                {progress.status === 'completed' ? '✅ Certified' : 'In Progress'}
              </div>
            </div>
          ) : null}
          {certData.validity_years && (
            <div className="text-xs text-muted-foreground">
              Valid {certData.validity_years}y
            </div>
          )}
        </div>
      </Card>
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </>
  );
});

// Step Node Component 📋
const StepNode = memo<BaseNodeProps>(({ data, selected }) => {
  const stepData = (data.data || {}) as StepData;
  const style = data.style || {};
  const progress = data.userProgress;

  const getStepTypeColor = (type: string) => {
    switch (type) {
      case 'education': return 'bg-blue-100 text-blue-800';
      case 'certification': return 'bg-purple-100 text-purple-800';
      case 'project': return 'bg-green-100 text-green-800';
      case 'job': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      <Card 
        className={`p-3 cursor-pointer transition-all duration-200 ${
          selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
        }`}
        style={{ 
          backgroundColor: (style as any)?.bgColor || 'white',
          borderColor: (style as any)?.color || '#ccc',
          minWidth: (style as any)?.width || 200,
          minHeight: (style as any)?.height || 90
        }}
        onClick={data.onClick}
        data-testid="skill-node"
        data-node-type={data.type}
        data-node-id={data.id}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{(style as any)?.icon || '📋'}</span>
          <div>
            <h3 className="font-semibold text-sm leading-tight">{data.title}</h3>
            <Badge 
              className={`text-xs mt-1 ${getStepTypeColor(stepData.step_type)}`}
              variant="secondary"
            >
              Step {stepData.step_order}
            </Badge>
          </div>
        </div>

        {/* Time Estimate */}
        {data.estimated_time_hours && (
          <div className="text-xs text-muted-foreground mb-2">
            Est. {data.estimated_time_hours}h
          </div>
        )}

        {/* Progress */}
        {progress && (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Progress value={progress.progress_percentage} className="h-2" />
            </div>
            <div className="text-xs font-medium">
              {progress.status === 'completed' ? '✅' : 
               progress.status === 'in_progress' ? '🔄' : 
               progress.status === 'available' ? '🔓' : '🔒'}
            </div>
          </div>
        )}
      </Card>
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </>
  );
});

// Node type mapping for React Flow
export const nodeTypes = {
  job: JobNode,
  skill: SkillNode,
  course: CourseNode,
  project: ProjectNode,
  certification: CertificationNode,
  step: StepNode,
  // Add fallback for unknown types
  default: SkillNode
};

// Export individual components
export { JobNode, SkillNode, CourseNode, ProjectNode, CertificationNode, StepNode };
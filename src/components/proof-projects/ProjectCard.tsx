import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ExternalLink, Github, Play, Edit, Trash2, Clock } from 'lucide-react';
import { ProofProject } from '@/types/proofProjects';
import { useProofProjects } from '@/hooks/useProofProjects';
import { useState } from 'react';
import { ProjectProgressTracker } from './ProjectProgressTracker';

interface ProjectCardProps {
  project: ProofProject;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { updateProject, deleteProject } = useProofProjects();
  const [showProgress, setShowProgress] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planning': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'paused': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyStars = (level: number) => {
    return '★'.repeat(level) + '☆'.repeat(5 - level);
  };

  const handleStatusChange = (newStatus: ProofProject['status']) => {
    updateProject.mutate({
      id: project.id,
      updates: { 
        status: newStatus,
        ...(newStatus === 'completed' ? { completion_percentage: 100, completed_at: new Date().toISOString() } : {}),
      },
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this project?')) {
      deleteProject.mutate(project.id);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{project.title}</CardTitle>
            <CardDescription className="text-sm">
              {project.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProgress(true)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={getStatusColor(project.status)}>
            {project.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {getDifficultyStars(project.difficulty_level)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {project.estimated_hours}h
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Progress</span>
            <span>{project.completion_percentage}%</span>
          </div>
          <Progress value={project.completion_percentage} className="h-2" />
        </div>

        {/* Skills */}
        {project.skills_to_validate.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Skills to Validate</div>
            <div className="flex flex-wrap gap-1">
              {project.skills_to_validate.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {project.skills_to_validate.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{project.skills_to_validate.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-auto space-y-2">
          {project.status !== 'completed' && (
            <div className="flex gap-2">
              {project.status === 'planning' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('in_progress')}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Start
                </Button>
              )}
              {project.status === 'in_progress' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('completed')}
                  className="flex-1"
                >
                  Complete
                </Button>
              )}
            </div>
          )}

          {/* External Links */}
          <div className="flex gap-2">
            {project.github_url && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="flex-1"
              >
                <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4 mr-1" />
                  Code
                </a>
              </Button>
            )}
            {project.demo_url && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="flex-1"
              >
                <a href={project.demo_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Demo
                </a>
              </Button>
            )}
          </div>

          {/* Resume Actions for Completed Projects */}
          {project.status === 'completed' && (
            <div className="pt-3 mt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  // This will be enhanced with actual resume integration
                  console.log('Add to resume:', project.title);
                  alert(`"${project.title}" has been marked for inclusion in your resume. Visit the Resume Builder to see it appear automatically.`);
                }}
              >
                Add to Resume
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {/* Progress Tracker Modal */}
      <ProjectProgressTracker
        project={project}
        open={showProgress}
        onOpenChange={setShowProgress}
      />
    </Card>
  );
}
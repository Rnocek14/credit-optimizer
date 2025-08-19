import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Plus } from 'lucide-react';
import { useProofProjects } from '@/hooks/useProofProjects';
import { ProofProject, ProjectMilestone } from '@/types/proofProjects';

interface ProjectProgressTrackerProps {
  project: ProofProject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectProgressTracker({ project, open, onOpenChange }: ProjectProgressTrackerProps) {
  const { updateProject, addProjectMilestone } = useProofProjects();
  const [formData, setFormData] = useState({
    title: project.title,
    description: project.description || '',
    completion_percentage: project.completion_percentage,
    github_url: project.github_url || '',
    demo_url: project.demo_url || '',
    status: project.status,
  });
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '' });

  // Reset form when project changes
  useEffect(() => {
    setFormData({
      title: project.title,
      description: project.description || '',
      completion_percentage: project.completion_percentage,
      github_url: project.github_url || '',
      demo_url: project.demo_url || '',
      status: project.status,
    });
  }, [project]);

  const handleSave = () => {
    updateProject.mutate({
      id: project.id,
      updates: formData,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleAddMilestone = () => {
    if (newMilestone.title.trim()) {
      addProjectMilestone.mutate({
        project_id: project.id,
        title: newMilestone.title,
        description: newMilestone.description,
        milestone_order: (project.proof_project_milestones?.length || 0) + 1,
        status: 'pending',
      }, {
        onSuccess: () => {
          setNewMilestone({ title: '', description: '' });
        },
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'planning': return 'text-orange-600';
      case 'paused': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Track Project Progress</DialogTitle>
          <DialogDescription>
            Update your project details and track milestones
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Project Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          {/* Progress Tracking */}
          <div className="space-y-4">
            <div>
              <Label>Completion Progress: {formData.completion_percentage}%</Label>
              <div className="mt-2 mb-4">
                <Progress value={formData.completion_percentage} className="h-3" />
              </div>
              <Slider
                value={[formData.completion_percentage]}
                onValueChange={(value) => setFormData(prev => ({ ...prev, completion_percentage: value[0] }))}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="status">Project Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full mt-1 p-2 border border-border rounded-md bg-background"
              >
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>

          {/* Project Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="github">GitHub URL</Label>
              <Input
                id="github"
                type="url"
                value={formData.github_url}
                onChange={(e) => setFormData(prev => ({ ...prev, github_url: e.target.value }))}
                placeholder="https://github.com/..."
              />
            </div>

            <div>
              <Label htmlFor="demo">Demo URL</Label>
              <Input
                id="demo"
                type="url"
                value={formData.demo_url}
                onChange={(e) => setFormData(prev => ({ ...prev, demo_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Skills Validation */}
          <div>
            <Label>Skills to Validate</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {project.skills_to_validate.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div>
            <Label>Project Milestones</Label>
            <div className="space-y-3 mt-3">
              {project.proof_project_milestones?.map((milestone) => (
                <div key={milestone.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className={`mt-1 ${getStatusColor(milestone.status)}`}>
                    {milestone.status === 'completed' ? 
                      <CheckCircle className="h-5 w-5" /> : 
                      <Circle className="h-5 w-5" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{milestone.title}</div>
                    {milestone.description && (
                      <div className="text-sm text-muted-foreground">{milestone.description}</div>
                    )}
                    <Badge variant="outline" className="mt-1">
                      {milestone.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Milestone */}
            <div className="mt-4 p-4 border-2 border-dashed border-border rounded-lg">
              <div className="space-y-3">
                <Input
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Milestone title..."
                />
                <Input
                  value={newMilestone.description}
                  onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description (optional)..."
                />
                <Button
                  type="button"
                  onClick={handleAddMilestone}
                  disabled={!newMilestone.title.trim() || addProjectMilestone.isPending}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              </div>
            </div>
          </div>

          {/* Portfolio Actions */}
          {formData.status === 'completed' && (
            <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800">Project Portfolio Options</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('Export project:', project.title);
                    alert(`Exporting "${project.title}" as portfolio item...`);
                  }}
                >
                  Export as Portfolio Item
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('Add to resume:', project.title);
                    alert(`"${project.title}" will appear in your Resume Builder automatically.`);
                  }}
                >
                  Add to Resume
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateProject.isPending}
              className="flex-1"
            >
              {updateProject.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
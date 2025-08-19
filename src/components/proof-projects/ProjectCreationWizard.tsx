import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { useProofProjects } from '@/hooks/useProofProjects';
import { ProofProject, ProjectTemplate } from '@/types/proofProjects';

interface ProjectCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId?: string | null;
  templateData?: ProjectTemplate | null;
  template?: ProjectTemplate | null;
}

export function ProjectCreationWizard({ open, onOpenChange, trackId, templateData, template }: ProjectCreationWizardProps) {
  const { createProject } = useProofProjects();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_type: 'personal' as 'personal' | 'course' | 'certification' | 'challenge',
    difficulty_level: 1 as 1 | 2 | 3 | 4 | 5,
    estimated_hours: 10,
    github_url: '',
    demo_url: '',
    skills_to_validate: [] as string[],
  });
  const [newSkill, setNewSkill] = useState('');

  // Update form when template changes
  useEffect(() => {
    const activeTemplate = template || templateData;
    if (activeTemplate && open) {
      console.log('🎯 Loading template data:', activeTemplate);
      setFormData({
        title: activeTemplate.title,
        description: activeTemplate.description,
        project_type: activeTemplate.project_type as 'personal' | 'course' | 'certification' | 'challenge' || 'personal',
        difficulty_level: activeTemplate.difficulty_level as 1 | 2 | 3 | 4 | 5,
        estimated_hours: activeTemplate.estimated_hours,
        skills_to_validate: [...activeTemplate.skills_to_validate],
        github_url: '',
        demo_url: '',
      });
      console.log('✅ Form data updated with template:', {
        title: activeTemplate.title,
        skills: activeTemplate.skills_to_validate
      });
    } else if (open && !activeTemplate) {
      console.log('🔄 Resetting form data');
      setFormData({
        title: '',
        description: '',
        project_type: 'personal',
        difficulty_level: 1,
        estimated_hours: 10,
        github_url: '',
        demo_url: '',
        skills_to_validate: [],
      });
    }
  }, [template, templateData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const projectData: Omit<ProofProject, 'id' | 'created_at' | 'updated_at'> = {
      ...formData,
      user_id: '', // Will be set in the hook
      track_id: trackId || undefined,
      status: 'planning',
      completion_percentage: 0,
      validation_criteria: [],
      project_data: {},
    };

    createProject.mutate(projectData, {
      onSuccess: () => {
        onOpenChange(false);
        setFormData({
          title: '',
          description: '',
          project_type: 'personal',
          difficulty_level: 1,
          estimated_hours: 10,
          github_url: '',
          demo_url: '',
          skills_to_validate: [],
        });
      },
    });
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills_to_validate.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills_to_validate: [...prev.skills_to_validate, newSkill.trim()],
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills_to_validate: prev.skills_to_validate.filter(s => s !== skill),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {(template || templateData) ? `Create Project: ${(template || templateData)?.title}` : 'Create New Proof Project'}
          </DialogTitle>
          <DialogDescription>
            {(template || templateData) 
              ? 'Using template to create a project that validates your skills and builds your portfolio'
              : 'Create a project that validates your skills and builds your portfolio'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                placeholder="e.g., Customer Churn Prediction Model"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this project will accomplish and demonstrate..."
                rows={3}
              />
            </div>
          </div>

          {/* Project Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="type">Project Type</Label>
              <Select
                value={formData.project_type}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, project_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="course">Course Project</SelectItem>
                  <SelectItem value="certification">Certification</SelectItem>
                  <SelectItem value="challenge">Challenge</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select
                value={formData.difficulty_level.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty_level: parseInt(value) as 1 | 2 | 3 | 4 | 5 }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">★☆☆☆☆ Beginner</SelectItem>
                  <SelectItem value="2">★★☆☆☆ Easy</SelectItem>
                  <SelectItem value="3">★★★☆☆ Intermediate</SelectItem>
                  <SelectItem value="4">★★★★☆ Advanced</SelectItem>
                  <SelectItem value="5">★★★★★ Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="hours">Estimated Hours</Label>
              <Input
                id="hours"
                type="number"
                min="1"
                max="1000"
                value={formData.estimated_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: parseInt(e.target.value) || 10 }))}
              />
            </div>
          </div>

          {/* Skills to Validate */}
          <div>
            <Label>Skills to Validate</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add a skill..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              />
              <Button type="button" onClick={addSkill} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {formData.skills_to_validate.map((skill) => (
                <Badge key={skill} variant="secondary" className="pr-1">
                  {skill}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 ml-1"
                    onClick={() => removeSkill(skill)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>

          {/* URLs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="github">GitHub URL (optional)</Label>
              <Input
                id="github"
                type="url"
                value={formData.github_url}
                onChange={(e) => setFormData(prev => ({ ...prev, github_url: e.target.value }))}
                placeholder="https://github.com/..."
              />
            </div>

            <div>
              <Label htmlFor="demo">Demo URL (optional)</Label>
              <Input
                id="demo"
                type="url"
                value={formData.demo_url}
                onChange={(e) => setFormData(prev => ({ ...prev, demo_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>

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
              type="submit"
              disabled={createProject.isPending || !formData.title.trim()}
              className="flex-1"
            >
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
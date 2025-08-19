import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Filter } from 'lucide-react';
import { useProofProjects } from '@/hooks/useProofProjects';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { ProjectCard } from './ProjectCard';
import { ProjectCreationWizard } from './ProjectCreationWizard';
import { TrackPortfolioView } from './TrackPortfolioView';
import { AIProjectRecommendations } from './AIProjectRecommendations';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function TrackProofProjectManager() {
  const { activeTrackId } = useActiveTrackStore();
  const { projects, isLoading } = useProofProjects(activeTrackId || undefined);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const filteredProjects = projects.filter(project => 
    statusFilter === 'all' || project.status === statusFilter
  );

  const statusCounts = {
    planning: projects.filter(p => p.status === 'planning').length,
    in_progress: projects.filter(p => p.status === 'in_progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Proof Projects</h2>
          <p className="text-muted-foreground">
            Build projects that validate your track skills
          </p>
        </div>
        <Button onClick={() => setShowCreateWizard(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{projects.length}</div>
            <div className="text-sm text-muted-foreground">Total Projects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{statusCounts.planning}</div>
            <div className="text-sm text-muted-foreground">Planning</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.in_progress}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{statusCounts.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
          <AIProjectRecommendations 
            trackId={activeTrackId}
            onUseTemplate={(template) => {
              console.log('Using template:', template);
              // Close any existing wizard first
              setShowCreateWizard(false);
              // Set template data
              setSelectedTemplate(template);
              // Small delay to ensure state is updated before opening
              setTimeout(() => {
                setShowCreateWizard(true);
              }, 100);
            }}
          />

      {/* Filter Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filter:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first proof project to start building your portfolio
            </p>
            <Button onClick={() => setShowCreateWizard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Portfolio View */}
      {projects.some(p => p.status === 'completed') && (
        <div className="mt-8">
          <TrackPortfolioView trackId={activeTrackId} />
        </div>
      )}

      {/* Creation Wizard */}
      <ProjectCreationWizard
        open={showCreateWizard}
        onOpenChange={(open) => {
          setShowCreateWizard(open);
          if (!open) setSelectedTemplate(null);
        }}
        trackId={activeTrackId}
        templateData={selectedTemplate}
      />
    </div>
  );
}
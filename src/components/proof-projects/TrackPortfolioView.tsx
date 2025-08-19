import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Github, Download, Eye, Star } from 'lucide-react';
import { useProofProjects } from '@/hooks/useProofProjects';
import { ProofProject } from '@/types/proofProjects';

interface TrackPortfolioViewProps {
  trackId?: string | null;
}

export function TrackPortfolioView({ trackId }: TrackPortfolioViewProps) {
  const { projects } = useProofProjects(trackId);
  
  const completedProjects = projects.filter(p => p.status === 'completed');

  const getDifficultyStars = (level: number) => {
    return '★'.repeat(level) + '☆'.repeat(5 - level);
  };

  const handleExportProject = (project: ProofProject) => {
    const portfolioData = {
      title: project.title,
      description: project.description,
      skills: project.skills_to_validate,
      type: project.project_type,
      difficulty: project.difficulty_level,
      estimatedHours: project.estimated_hours,
      githubUrl: project.github_url,
      demoUrl: project.demo_url,
      completedAt: project.completed_at,
      milestones: project.proof_project_milestones?.length || 0,
    };
    
    const blob = new Blob([JSON.stringify(portfolioData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '_')}_portfolio.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (completedProjects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Track Portfolio
          </CardTitle>
          <CardDescription>
            Showcase your completed projects from this track
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No completed projects yet</p>
            <p className="text-sm">Complete some projects to build your portfolio!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Track Portfolio ({completedProjects.length} projects)
        </CardTitle>
        <CardDescription>
          Showcase your completed projects and export them for your portfolio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {completedProjects.map((project) => (
            <div key={project.id} className="border rounded-lg p-4 bg-muted/20">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{project.title}</h4>
                  <p className="text-muted-foreground text-sm mt-1">
                    {project.description}
                  </p>
                </div>
                <Badge variant="outline" className="ml-3">
                  {getDifficultyStars(project.difficulty_level)}
                </Badge>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <Badge>{project.project_type}</Badge>
                <Badge variant="outline">{project.estimated_hours}h</Badge>
                <Badge variant="secondary">100% Complete</Badge>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Skills Demonstrated:</div>
                <div className="flex flex-wrap gap-1">
                  {project.skills_to_validate.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {project.github_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4 mr-1" />
                      Code
                    </a>
                  </Button>
                )}
                {project.demo_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={project.demo_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Demo
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportProject(project)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 className="font-medium text-blue-800 mb-2">Portfolio Integration</h5>
          <p className="text-sm text-blue-700 mb-3">
            All completed projects automatically appear in your Resume Builder and can be included in targeted resumes.
          </p>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            View in Resume Builder
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
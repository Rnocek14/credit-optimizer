import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useProjectsStore } from '@/state/projectsStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ExternalLink, Trash2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const Projects: React.FC = () => {
  const { items, removeProject, toggleVerified } = useProjectsStore();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Proof Projects | Learning Portfolio</title>
        <meta name="description" content="Manage your proof projects and showcase your learning achievements" />
        <link rel="canonical" href="/projects" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Proof Projects</h1>
          <p className="text-muted-foreground">
            Showcase your learning achievements and skill development projects
          </p>
        </div>

        {items.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-6xl mb-4">📂</div>
              <h3 className="text-xl font-semibold mb-2">No proof projects yet</h3>
              <p className="text-muted-foreground mb-6">
                Start building your portfolio by attaching projects to your skills
              </p>
              <Button asChild>
                <Link to="/skill-tree">
                  <Plus className="h-4 w-4 mr-2" />
                  Attach Proof Project
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div data-testid="projects-list" className="grid gap-6">
            {items.map((project) => (
              <Card key={project.id} data-testid="project-item" className="w-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-xl">{project.title}</CardTitle>
                      <CardDescription>
                        Created: {new Date(project.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label htmlFor={`verified-${project.id}`} className="text-sm font-medium">
                          Verified
                        </label>
                        <Switch
                          id={`verified-${project.id}`}
                          data-testid="verified-toggle"
                          checked={project.verified}
                          onCheckedChange={() => toggleVerified(project.id)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProject(project.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Skills */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {project.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Links */}
                    {project.links.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Project Links</h4>
                        <div className="space-y-2">
                          {project.links.map((link, index) => (
                            <a
                              key={index}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {link}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Verification Status */}
                    <div className="pt-2 border-t">
                      <Badge variant={project.verified ? "default" : "outline"}>
                        {project.verified ? "✅ Verified" : "📋 Unverified"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
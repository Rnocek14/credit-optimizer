import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Briefcase, Trophy, Clock } from 'lucide-react';
import { Skill, EntryRole, PortfolioProject } from '@/lib/types/eduTree';

interface DegreeOutcomePanelProps {
  isVisible: boolean;
  skills: Skill[];
  roles: EntryRole[];
  projects: PortfolioProject[];
  completionProgress: number;
}

export function DegreeOutcomePanel({ 
  isVisible, 
  skills, 
  roles, 
  projects, 
  completionProgress 
}: DegreeOutcomePanelProps) {
  if (!isVisible) return null;

  return (
    <div className="w-80 h-full border-l bg-background p-4 overflow-y-auto">
      <div className="space-y-6">
        {/* Program Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="w-5 h-5" />
              B.S. Software Engineering
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              120 credits target
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(completionProgress)}%</span>
              </div>
              <Progress value={completionProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Core Competencies */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="w-4 h-4" />
              Core Competencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill.id} variant="secondary" className="text-xs">
                  {skill.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Entry Roles */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="w-4 h-4" />
              Career Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {roles.map((role) => (
              <div key={role.id} className="p-3 rounded-lg border bg-muted/50">
                <div className="font-medium text-sm">{role.name}</div>
                {role.avg_salary_range && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {role.avg_salary_range}
                  </div>
                )}
                {role.description && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {role.description}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Portfolio Projects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4" />
              Portfolio Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.map((project) => (
              <div key={project.id} className="p-3 rounded-lg border bg-muted/50">
                <div className="font-medium text-sm">{project.name}</div>
                {project.description && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {project.description}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {project.estimated_hours && (
                    <span>{project.estimated_hours}h</span>
                  )}
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    Level {project.difficulty_level}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Key Milestones */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key Milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span>Year 1: Foundation complete</span>
                <Badge variant={completionProgress >= 25 ? "default" : "secondary"} className="text-xs">
                  {completionProgress >= 25 ? "✓" : "○"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Year 2: Apply for internships</span>
                <Badge variant={completionProgress >= 50 ? "default" : "secondary"} className="text-xs">
                  {completionProgress >= 50 ? "✓" : "○"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Year 3: Specialization focus</span>
                <Badge variant={completionProgress >= 75 ? "default" : "secondary"} className="text-xs">
                  {completionProgress >= 75 ? "✓" : "○"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Year 4: Capstone & graduation</span>
                <Badge variant={completionProgress >= 100 ? "default" : "secondary"} className="text-xs">
                  {completionProgress >= 100 ? "✓" : "○"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
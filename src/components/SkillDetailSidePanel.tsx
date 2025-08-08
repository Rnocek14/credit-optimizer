
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Target, Award, TrendingUp, X, Plus } from 'lucide-react';
import { CourseCard } from './CourseCard';
import { useProjectsStore } from '@/state/projectsStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface SkillDetailSidePanelProps {
  skill: {
    id: string;
    name: string;
    category: string;
    xp_value: number;
    difficulty_level: number;
    description?: string;
  } | null;
  userProgress?: {
    status: 'locked' | 'available' | 'in_progress' | 'completed';
    xp_earned: number;
    cri_score?: number;
    verification_source?: string;
  };
  prerequisites?: Array<{
    id: string;
    name: string;
    completed: boolean;
  }>;
  open: boolean;
  onClose: () => void;
  onPlanSkill: (skillId: string) => void;
}

const categoryColors = {
  'Programming': { bg: 'bg-blue-100', text: 'text-blue-800', icon: '💻' },
  'Framework': { bg: 'bg-green-100', text: 'text-green-800', icon: '⚡' },
  'Backend': { bg: 'bg-purple-100', text: 'text-purple-800', icon: '🔧' },
  'API': { bg: 'bg-orange-100', text: 'text-orange-800', icon: '🔗' },
  'Cloud': { bg: 'bg-cyan-100', text: 'text-cyan-800', icon: '☁️' },
  'DevOps': { bg: 'bg-red-100', text: 'text-red-800', icon: '🚀' },
  'Design': { bg: 'bg-pink-100', text: 'text-pink-800', icon: '🎨' },
  'Quality': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '✅' },
  'Styling': { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: '🎭' },
  'Markup': { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: '📝' },
  'default': { bg: 'bg-gray-100', text: 'text-gray-800', icon: '📚' }
};

export const SkillDetailSidePanel: React.FC<SkillDetailSidePanelProps> = ({
  skill,
  userProgress,
  prerequisites = [],
  open,
  onClose,
  onPlanSkill
}) => {
  const [projectModalOpen, setProjectModalOpen] = React.useState(false);
  const [projectTitle, setProjectTitle] = React.useState('');
  const [projectSkills, setProjectSkills] = React.useState('');
  const [projectLinks, setProjectLinks] = React.useState('');
  const { addProject } = useProjectsStore();
  const { toast } = useToast();
  // Fetch related courses for this skill
  const { data: relatedCourses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['skill-courses', skill?.id],
    queryFn: async () => {
      if (!skill?.id) return [];
      
      const { data, error } = await supabase
        .from('course_skill_map')
        .select(`
          course_id,
          recommended_courses (
            id,
            title,
            platform,
            url,
            difficulty,
            cost,
            description,
            skill_tags
          )
        `)
        .eq('skill_id', skill.id);
      
      if (error) throw error;
      return data.map(item => item.recommended_courses).filter(Boolean);
    },
    enabled: !!skill?.id && open
  });

  const handleSaveProject = () => {
    if (!projectTitle.trim()) return;
    
    const skills = projectSkills.split(',').map(s => s.trim()).filter(Boolean);
    const links = projectLinks.split('\n').map(l => l.trim()).filter(Boolean);
    
    addProject({
      id: `project-${Date.now()}`,
      title: projectTitle,
      skills: skills.length > 0 ? skills : [skill.name],
      links,
      verified: false,
      created_at: new Date().toISOString()
    });
    
    toast({
      title: "Project added to Proof Projects",
      description: "Your project has been saved successfully",
    });
    
    setProjectModalOpen(false);
    setProjectTitle('');
    setProjectSkills('');
    setProjectLinks('');
  };

  React.useEffect(() => {
    if (skill && projectModalOpen) {
      setProjectTitle(`${skill.name} — Proof Project`);
      setProjectSkills(skill.name);
    }
  }, [skill, projectModalOpen]);

  if (!skill) return null;

  const progressPercent = userProgress ? (userProgress.xp_earned / skill.xp_value) * 100 : 0;
  const canPlan = userProgress?.status === 'available' || userProgress?.status === 'in_progress';
  const categoryData = categoryColors[skill.category as keyof typeof categoryColors] || categoryColors.default;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <span className="text-2xl">{categoryData.icon}</span>
              <div>
                <div className="text-xl font-bold">{skill.name}</div>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className={`${categoryData.bg} ${categoryData.text}`}>
                    {skill.category}
                  </Badge>
                  <Badge variant="outline">
                    Level {skill.difficulty_level}
                  </Badge>
                  {relatedCourses.length > 0 && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {relatedCourses.length} course{relatedCourses.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </SheetTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Overview */}
          {userProgress && (
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Progress</span>
                    <Badge variant={
                      userProgress.status === 'completed' ? 'default' :
                      userProgress.status === 'in_progress' ? 'secondary' :
                      'outline'
                    }>
                      {userProgress.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{userProgress.xp_earned} / {skill.xp_value} XP</span>
                    <span>{Math.round(progressPercent)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </SheetHeader>

        <Tabs defaultValue="overview" className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="progress" className="text-xs">Progress</TabsTrigger>
            <TabsTrigger value="prereqs" className="text-xs">Prerequisites</TabsTrigger>
            <TabsTrigger value="resources" className="text-xs">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {skill.description || 'No description available for this skill.'}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">XP Reward</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{skill.xp_value}</div>
                  <p className="text-xs text-muted-foreground">Points when mastered</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Difficulty</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">Level {skill.difficulty_level}</div>
                  <p className="text-xs text-muted-foreground">
                    {skill.difficulty_level <= 2 ? 'Beginner' : 
                     skill.difficulty_level <= 4 ? 'Intermediate' : 'Advanced'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              {canPlan && (
                <Button 
                  onClick={() => onPlanSkill(skill.id)}
                  className="w-full"
                  size="lg"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Plan This Skill with Maya
                </Button>
              )}
              
              <Dialog open={projectModalOpen} onOpenChange={setProjectModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className="w-full"
                    size="lg"
                    data-testid="attach-proof-skill"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Attach Proof Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Attach Proof Project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="project-title">Title</Label>
                      <Input
                        id="project-title"
                        placeholder="Project title"
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-skills">Skills (comma-separated)</Label>
                      <Input
                        id="project-skills"
                        placeholder="React, TypeScript, CSS"
                        value={projectSkills}
                        onChange={(e) => setProjectSkills(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-links">Links (one per line)</Label>
                      <Textarea
                        id="project-links"
                        placeholder="https://github.com/user/project&#10;https://demo.project.com"
                        value={projectLinks}
                        onChange={(e) => setProjectLinks(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveProject} className="flex-1">
                        Save
                      </Button>
                      <Button variant="outline" onClick={() => setProjectModalOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Progress Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userProgress?.cri_score && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">CRI Score</div>
                    <div className="text-2xl font-bold text-primary">
                      {userProgress.cri_score.toFixed(1)}
                    </div>
                  </div>
                )}

                {userProgress?.verification_source && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Verified By</div>
                    <Badge variant="outline">{userProgress.verification_source}</Badge>
                  </div>
                )}

                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="text-sm font-medium mb-2">XP Breakdown</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Current XP:</span>
                      <span className="font-mono">{userProgress?.xp_earned || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total XP:</span>
                      <span className="font-mono">{skill.xp_value}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Remaining:</span>
                      <span className="font-mono">{skill.xp_value - (userProgress?.xp_earned || 0)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prereqs" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Prerequisites</CardTitle>
                <CardDescription>
                  Skills you need to master before tackling this one
                </CardDescription>
              </CardHeader>
              <CardContent>
                {prerequisites.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🎉</div>
                    <p className="text-muted-foreground">No prerequisites required!</p>
                    <p className="text-sm text-muted-foreground">You can start learning this skill right away.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {prerequisites.map((prereq) => (
                      <div key={prereq.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          prereq.completed ? 'bg-green-500' : 'bg-gray-300'
                        }`}>
                          {prereq.completed && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div className="flex-1">
                          <span className={prereq.completed ? 'text-green-700 font-medium' : 'text-muted-foreground'}>
                            {prereq.name}
                          </span>
                        </div>
                        {prereq.completed && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Completed
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Learning Resources
                </CardTitle>
                <CardDescription>
                  Recommended courses and materials for this skill
                </CardDescription>
              </CardHeader>
              <CardContent>
                {coursesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-20 bg-gray-200 rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : relatedCourses.length > 0 ? (
                  <div className="space-y-3">
                    {relatedCourses.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        compact={true}
                        onStartCourse={(courseId) => {
                          console.log('Starting course:', courseId);
                          // TODO: Track course engagement
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-2">📚</div>
                    <p className="mb-2">No courses found for this skill yet.</p>
                    <p className="text-sm">Check back later for new recommendations!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

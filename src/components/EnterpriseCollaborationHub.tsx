import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Share2, TrendingUp, Award, Calendar, MessageSquare } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  skillsProgress: number;
  currentPath: string;
  lastActive: string;
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  creator: string;
  sharedWith: string[];
  completions: number;
  avgRating: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
}

interface OrganizationMetrics {
  totalLearners: number;
  completedPaths: number;
  avgProgress: number;
  topSkills: string[];
  engagementRate: number;
}

export const EnterpriseCollaborationHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('team');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  // Mock team data
  const teamMembers = useMemo<TeamMember[]>(() => [
    {
      id: '1',
      name: 'Sarah Chen',
      role: 'Senior Developer',
      avatar: '',
      skillsProgress: 87,
      currentPath: 'React Advanced Patterns',
      lastActive: '2 hours ago'
    },
    {
      id: '2', 
      name: 'Marcus Johnson',
      role: 'Product Manager',
      avatar: '',
      skillsProgress: 64,
      currentPath: 'Data Analytics Fundamentals',
      lastActive: '1 day ago'
    },
    {
      id: '3',
      name: 'Emma Rodriguez',
      role: 'UX Designer',
      avatar: '',
      skillsProgress: 92,
      currentPath: 'Design Systems Mastery',
      lastActive: '30 minutes ago'
    },
    {
      id: '4',
      name: 'James Wilson',
      role: 'DevOps Engineer',
      avatar: '',
      skillsProgress: 78,
      currentPath: 'Kubernetes Administration',
      lastActive: '4 hours ago'
    }
  ], []);

  const sharedPaths = useMemo<LearningPath[]>(() => [
    {
      id: '1',
      title: 'Frontend Mastery Track',
      description: 'Comprehensive journey from React basics to advanced architecture patterns',
      creator: 'Sarah Chen',
      sharedWith: ['team-frontend', 'team-fullstack'],
      completions: 23,
      avgRating: 4.8,
      difficulty: 'intermediate',
      estimatedTime: '6 weeks'
    },
    {
      id: '2',
      title: 'Product Strategy Essentials',
      description: 'Learn to build winning product strategies and roadmaps',
      creator: 'Marcus Johnson',
      sharedWith: ['team-product', 'leadership'],
      completions: 15,
      avgRating: 4.6,
      difficulty: 'beginner',
      estimatedTime: '4 weeks'
    },
    {
      id: '3',
      title: 'Cloud-Native DevOps',
      description: 'Modern DevOps practices with containers, orchestration, and monitoring',
      creator: 'James Wilson',
      sharedWith: ['team-platform', 'team-infrastructure'],
      completions: 18,
      avgRating: 4.9,
      difficulty: 'advanced',
      estimatedTime: '8 weeks'
    }
  ], []);

  const orgMetrics = useMemo<OrganizationMetrics>(() => ({
    totalLearners: 147,
    completedPaths: 89,
    avgProgress: 73,
    topSkills: ['React', 'TypeScript', 'AWS', 'Python', 'Kubernetes'],
    engagementRate: 84
  }), []);

  const handleSharePath = useCallback((pathId: string) => {
    console.log(`Sharing path: ${pathId}`);
  }, []);

  const handleInviteTeammate = useCallback(() => {
    console.log('Inviting team member');
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Organization Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Organization Learning Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{orgMetrics.totalLearners}</p>
              <p className="text-sm text-muted-foreground">Active Learners</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{orgMetrics.completedPaths}</p>
              <p className="text-sm text-muted-foreground">Paths Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{orgMetrics.avgProgress}%</p>
              <p className="text-sm text-muted-foreground">Avg Progress</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{orgMetrics.engagementRate}%</p>
              <p className="text-sm text-muted-foreground">Engagement</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">4.7★</p>
              <p className="text-sm text-muted-foreground">Satisfaction</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="paths" className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Shared Paths
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Team Progress</CardTitle>
              <Button onClick={handleInviteTeammate} variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                      <p className="text-xs text-muted-foreground">Current: {member.currentPath}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="flex items-center gap-2">
                      <Progress value={member.skillsProgress} className="w-20" />
                      <span className="text-sm font-medium">{member.skillsProgress}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Active {member.lastActive}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paths" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shared Learning Paths</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sharedPaths.map((path) => (
                <div key={path.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium">{path.title}</h3>
                      <p className="text-sm text-muted-foreground">{path.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={getDifficultyColor(path.difficulty)}>
                          {path.difficulty}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {path.estimatedTime} • {path.completions} completions
                        </span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleSharePath(path.id)}
                      variant="outline" 
                      size="sm"
                    >
                      <Share2 className="h-3 w-3 mr-1" />
                      Share
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Created by {path.creator}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{path.avgRating}★</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Shared with {path.sharedWith.length} teams
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Skills in Demand</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orgMetrics.topSkills.map((skill, index) => (
                    <div key={skill} className="flex items-center justify-between">
                      <span className="text-sm">{skill}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={(5 - index) * 20} className="w-16" />
                        <span className="text-xs text-muted-foreground">
                          {Math.floor(Math.random() * 50) + 30} learners
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Learning Engagement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Daily Active Users</span>
                    <span className="font-medium">89%</span>
                  </div>
                  <Progress value={89} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Path Completion Rate</span>
                    <span className="font-medium">76%</span>
                  </div>
                  <Progress value={76} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Knowledge Retention</span>
                    <span className="font-medium">84%</span>
                  </div>
                  <Progress value={84} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Peer Collaboration</span>
                    <span className="font-medium">67%</span>
                  </div>
                  <Progress value={67} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Team Insights & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <p className="text-sm font-medium">Skills Gap Alert</p>
                <p className="text-sm text-muted-foreground">
                  Your team shows strong frontend skills but could benefit from backend development training.
                </p>
              </div>
              
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <p className="text-sm font-medium">High Engagement</p>
                <p className="text-sm text-muted-foreground">
                  React Advanced Patterns path has 95% completion rate - consider creating similar content.
                </p>
              </div>
              
              <div className="border-l-4 border-yellow-500 pl-4 py-2">
                <p className="text-sm font-medium">Collaboration Opportunity</p>
                <p className="text-sm text-muted-foreground">
                  Consider pairing Emma (Design Systems) with Marcus (Product Strategy) for cross-functional learning.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, TrendingUp, Target, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PivotMilestone {
  id: string;
  title: string;
  description: string;
  progress: number;
  estimatedCompletion: string;
  actualCompletion?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  skills: string[];
  xpAwarded: number;
}

interface ActivePivot {
  id: string;
  targetCareer: string;
  startDate: string;
  estimatedDuration: string;
  actualProgress: number;
  milestones: PivotMilestone[];
  skillsAcquired: number;
  totalSkills: number;
  roi_score: number;
}

interface PivotProgressTrackerProps {
  userId: string;
  activePivots?: ActivePivot[];
}

export function PivotProgressTracker({ userId, activePivots = [] }: PivotProgressTrackerProps) {
  const [selectedPivot, setSelectedPivot] = useState<string>(activePivots[0]?.id || '');
  const { toast } = useToast();

  // Demo data for active pivots
  const mockPivots: ActivePivot[] = activePivots.length > 0 ? activePivots : [
    {
      id: '1',
      targetCareer: 'Product Manager',
      startDate: '2024-07-01',
      estimatedDuration: '4 months',
      actualProgress: 65,
      skillsAcquired: 4,
      totalSkills: 7,
      roi_score: 85,
      milestones: [
        {
          id: 'm1',
          title: 'Product Strategy Fundamentals',
          description: 'Complete product strategy course and apply learnings',
          progress: 100,
          estimatedCompletion: '2024-07-15',
          actualCompletion: '2024-07-12',
          status: 'completed',
          skills: ['Product Strategy', 'Market Analysis'],
          xpAwarded: 50
        },
        {
          id: 'm2',
          title: 'Analytics & Data Skills',
          description: 'Master analytics tools and data interpretation',
          progress: 80,
          estimatedCompletion: '2024-08-15',
          status: 'in_progress',
          skills: ['Analytics', 'Data Interpretation'],
          xpAwarded: 0
        },
        {
          id: 'm3',
          title: 'User Research Methods',
          description: 'Learn user research and interview techniques',
          progress: 30,
          estimatedCompletion: '2024-09-15',
          status: 'in_progress',
          skills: ['User Research', 'Interview Techniques'],
          xpAwarded: 0
        },
        {
          id: 'm4',
          title: 'Product Launch Project',
          description: 'Complete capstone product launch simulation',
          progress: 0,
          estimatedCompletion: '2024-10-30',
          status: 'pending',
          skills: ['Project Management', 'Launch Strategy'],
          xpAwarded: 0
        }
      ]
    },
    {
      id: '2',
      targetCareer: 'AI/ML Engineer',
      startDate: '2024-08-01',
      estimatedDuration: '6 months',
      actualProgress: 25,
      skillsAcquired: 2,
      totalSkills: 8,
      roi_score: 92,
      milestones: [
        {
          id: 'm5',
          title: 'Machine Learning Foundations',
          description: 'Complete ML fundamentals and math prerequisites',
          progress: 100,
          estimatedCompletion: '2024-08-30',
          actualCompletion: '2024-08-28',
          status: 'completed',
          skills: ['Machine Learning', 'Statistics'],
          xpAwarded: 60
        },
        {
          id: 'm6',
          title: 'Deep Learning Specialization',
          description: 'Master neural networks and deep learning',
          progress: 45,
          estimatedCompletion: '2024-10-15',
          status: 'in_progress',
          skills: ['Deep Learning', 'Neural Networks'],
          xpAwarded: 0
        }
      ]
    }
  ];

  const currentPivot = mockPivots.find(p => p.id === selectedPivot) || mockPivots[0];

  const handleMilestoneAction = (milestoneId: string, action: string) => {
    toast({
      title: `Milestone ${action}`,
      description: `Taking action on milestone: ${milestoneId}`,
      variant: "default"
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'blocked':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Target className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'blocked':
        return 'bg-red-500/10 text-red-700 border-red-200';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Pivot Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Pivot Progress Tracker</h3>
                <p className="text-sm text-muted-foreground">Monitor your career transition progress</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-gradient-to-r from-primary/10 to-accent/10">
              {mockPivots.length} Active Pivot{mockPivots.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedPivot} onValueChange={setSelectedPivot}>
            <TabsList className="grid w-full grid-cols-2">
              {mockPivots.map((pivot) => (
                <TabsTrigger key={pivot.id} value={pivot.id} className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {pivot.targetCareer}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {currentPivot && (
        <>
          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Overall Progress</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={currentPivot.actualProgress} className="flex-1" />
                      <span className="text-sm font-medium">{currentPivot.actualProgress}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Skills Acquired</p>
                    <p className="text-lg font-semibold">
                      {currentPivot.skillsAcquired}/{currentPivot.totalSkills}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time Remaining</p>
                    <p className="text-lg font-semibold">{currentPivot.estimatedDuration}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Milestone Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Milestone Timeline - {currentPivot.targetCareer}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentPivot.milestones.map((milestone, index) => (
                  <div key={milestone.id} className="relative">
                    {index < currentPivot.milestones.length - 1 && (
                      <div className="absolute left-6 top-12 w-0.5 h-16 bg-border"></div>
                    )}
                    
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                        milestone.status === 'completed' ? 'bg-green-500/10 border-green-500' :
                        milestone.status === 'in_progress' ? 'bg-blue-500/10 border-blue-500' :
                        milestone.status === 'blocked' ? 'bg-red-500/10 border-red-500' :
                        'bg-muted border-muted-foreground'
                      }`}>
                        {getStatusIcon(milestone.status)}
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{milestone.title}</h4>
                            <p className="text-sm text-muted-foreground">{milestone.description}</p>
                          </div>
                          <Badge className={getStatusColor(milestone.status)}>
                            {milestone.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">Progress</span>
                              <span className="text-xs font-medium">{milestone.progress}%</span>
                            </div>
                            <Progress value={milestone.progress} className="h-2" />
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            {milestone.actualCompletion ? 
                              `Completed: ${milestone.actualCompletion}` : 
                              `Due: ${milestone.estimatedCompletion}`
                            }
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1">
                            {milestone.skills.map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                          
                          {milestone.status === 'in_progress' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleMilestoneAction(milestone.id, 'update')}
                            >
                              Update Progress
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
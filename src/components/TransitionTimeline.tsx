import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, DollarSign, Target, TrendingUp } from 'lucide-react';

interface TimelineMilestone {
  id: string;
  title: string;
  description: string;
  duration: string;
  cost: number;
  successRate: number;
  skills: string[];
  resources: string[];
}

interface TransitionTimelineProps {
  milestones: TimelineMilestone[];
}

export function TransitionTimeline({ milestones }: TransitionTimelineProps) {
  const totalCost = milestones.reduce((sum, milestone) => sum + milestone.cost, 0);
  const averageSuccessRate = milestones.reduce((sum, milestone) => sum + milestone.successRate, 0) / milestones.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Transition Timeline Overview
          </CardTitle>
          <CardDescription>
            Visual representation of your career transition journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Milestones</p>
                <p className="font-semibold">{milestones.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Investment</p>
                <p className="font-semibold">${totalCost.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="font-semibold">{averageSuccessRate.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>
            
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div key={milestone.id} className="relative flex items-start gap-6">
                  {/* Timeline dot */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium z-10 relative">
                      {index + 1}
                    </div>
                    {index < milestones.length - 1 && (
                      <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-border"></div>
                    )}
                  </div>
                  
                  {/* Milestone content */}
                  <div className="flex-1 min-w-0">
                    <Card className="mb-4">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{milestone.title}</CardTitle>
                            <CardDescription className="mt-1">
                              {milestone.description}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="ml-2">
                            Phase {index + 1}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{milestone.duration}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>${milestone.cost.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span>{milestone.successRate.toFixed(0)}% success</span>
                          </div>
                        </div>

                        {/* Progress indicator */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Completion Progress</span>
                            <span>{milestone.successRate.toFixed(0)}%</span>
                          </div>
                          <Progress value={milestone.successRate} className="h-2" />
                        </div>

                        {/* Skills */}
                        {milestone.skills.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-2">Skills to Develop:</h5>
                            <div className="flex flex-wrap gap-1">
                              {milestone.skills.map(skill => (
                                <Badge key={skill} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Resources */}
                        {milestone.resources.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-2">Resources Needed:</h5>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {milestone.resources.map((resource, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <CheckCircle className="h-3 w-3 mt-0.5 text-green-600 flex-shrink-0" />
                                  <span>{resource}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
            </div>

            {/* Completion indicator */}
            <div className="relative flex items-start gap-6 mt-8">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white z-10 relative">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="flex-1 pt-2">
                <h4 className="font-medium text-green-700">Career Transition Complete!</h4>
                <p className="text-sm text-muted-foreground">
                  You've successfully transitioned to your target role with enhanced skills and experience.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
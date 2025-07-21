import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowRight, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Star, 
  MapPin,
  BookOpen,
  Target,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface SkillPivotModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromSkillId: string;
  toSkillId: string;
  pivotType: 'pivot' | 'branch' | 'backtrack';
  reasoning: string;
  recommended: boolean;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  xp_value: number;
  difficulty_level: number;
  description?: string;
}

interface Location {
  id: string;
  label: string;
  emoji: string;
  salary_multiplier: number;
  cost_of_living: number;
  job_market: string;
}

export const SkillPivotModal: React.FC<SkillPivotModalProps> = ({
  isOpen,
  onClose,
  fromSkillId,
  toSkillId,
  pivotType,
  reasoning,
  recommended
}) => {
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch skill details
  const { data: fromSkill } = useQuery({
    queryKey: ['skill', fromSkillId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('id', fromSkillId)
        .single();
      
      if (error) throw error;
      return data as Skill;
    },
    enabled: !!fromSkillId && isOpen
  });

  const { data: toSkill } = useQuery({
    queryKey: ['skill', toSkillId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('id', toSkillId)
        .single();
      
      if (error) throw error;
      return data as Skill;
    },
    enabled: !!toSkillId && isOpen
  });

  // Fetch top locations for ROI comparison
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, label, emoji, salary_multiplier, cost_of_living, job_market')
        .eq('active', true)
        .order('salary_multiplier', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as Location[];
    },
    enabled: isOpen
  });

  if (!fromSkill || !toSkill) {
    return null;
  }

  const pivotTypeConfig = {
    pivot: {
      icon: ArrowRight,
      color: 'bg-yellow-500',
      label: 'Pivot Path',
      description: 'Switch your focus to a new skill direction'
    },
    branch: {
      icon: TrendingUp,
      color: 'bg-green-500',
      label: 'Branch Path',
      description: 'Expand your skillset in a complementary direction'
    },
    backtrack: {
      icon: AlertTriangle,
      color: 'bg-orange-500',
      label: 'Backtrack Path',
      description: 'Return to fundamentals for a stronger foundation'
    }
  };

  const config = pivotTypeConfig[pivotType];
  const Icon = config.icon;

  // Calculate estimated metrics
  const difficultyDifference = toSkill.difficulty_level - fromSkill.difficulty_level;
  const estimatedWeeks = Math.max(2, toSkill.difficulty_level * 2 + difficultyDifference);
  const estimatedCost = estimatedWeeks * 50; // $50 per week avg
  const currentSalary = 65000; // Mock current salary
  const salaryUplift = toSkill.xp_value * 100; // Mock calculation

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.color}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {config.label}
                {recommended && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <Star className="h-3 w-3 mr-1" />
                    Recommended
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-normal">
                {config.description}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Skill Transition Overview */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <Badge variant="outline" className="mb-2">
                    {fromSkill.category}
                  </Badge>
                  <h3 className="font-semibold text-lg">{fromSkill.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Level {fromSkill.difficulty_level} • {fromSkill.xp_value} XP
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                </div>
                
                <div className="text-center">
                  <Badge variant="outline" className="mb-2">
                    {toSkill.category}
                  </Badge>
                  <h3 className="font-semibold text-lg">{toSkill.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Level {toSkill.difficulty_level} • {toSkill.xp_value} XP
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reasoning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Why This Path?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{reasoning}</p>
            </CardContent>
          </Card>

          {/* Tabs for detailed information */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="roi-analysis">ROI Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Estimated Time</span>
                    </div>
                    <p className="text-2xl font-bold">{estimatedWeeks} weeks</p>
                    <p className="text-xs text-muted-foreground">
                      Based on difficulty and learning curve
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Estimated Cost</span>
                    </div>
                    <p className="text-2xl font-bold">${estimatedCost}</p>
                    <p className="text-xs text-muted-foreground">
                      Including courses and resources
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Difficulty</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={(toSkill.difficulty_level / 5) * 100} className="flex-1" />
                      <span className="text-sm">{toSkill.difficulty_level}/5</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {difficultyDifference > 0 ? 'More challenging' : 
                       difficultyDifference < 0 ? 'Less challenging' : 
                       'Similar difficulty'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="requirements" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Learning Path Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Foundation in {fromSkill.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Your current skill provides a solid foundation
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">Dedicated Learning Time</p>
                        <p className="text-sm text-muted-foreground">
                          Commit 10-15 hours per week for {estimatedWeeks} weeks
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Budget for Resources</p>
                        <p className="text-sm text-muted-foreground">
                          Approximately ${estimatedCost} for courses and materials
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roi-analysis" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    ROI Analysis by Region
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {locations.map((location) => {
                      const projectedSalary = currentSalary + (salaryUplift * location.salary_multiplier);
                      const netUplift = projectedSalary - currentSalary;
                      const roi = (netUplift / estimatedCost) * 100;
                      const adjustedROI = roi / location.cost_of_living;

                      return (
                        <div key={location.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{location.emoji}</span>
                              <span className="font-medium">{location.label}</span>
                              <Badge variant="outline" className="text-xs">
                                {location.job_market} Market
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">
                                {adjustedROI.toFixed(0)}% ROI
                              </p>
                              <p className="text-xs text-muted-foreground">
                                COL Adjusted
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Projected Salary</p>
                              <p className="font-medium">${projectedSalary.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Net Uplift</p>
                              <p className="font-medium text-green-600">
                                +${netUplift.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Payback Period</p>
                              <p className="font-medium">
                                {Math.ceil(estimatedCost / (netUplift / 12))} months
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline">
                Save to Goals
              </Button>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                Start Learning Path
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
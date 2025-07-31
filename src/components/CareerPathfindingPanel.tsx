import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Route, Target, TrendingUp, Clock, DollarSign, Brain } from 'lucide-react';
import type { GraphNode, GraphEdge } from '@/lib/careerGraph';

interface CareerPathfindingPanelProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  findOptimalPaths: (
    startType: 'job' | 'skill' | 'step' | 'course' | 'project' | 'certification',
    startId: string,
    goalType: 'job' | 'skill' | 'step' | 'course' | 'project' | 'certification',
    goalId: string,
    criteria?: 'time' | 'cost' | 'difficulty' | 'roi'
  ) => any[];
  findPivotOpportunities: (fromJobId: string, toJobId: string) => Promise<any[]>;
  calculateCRI: (userId: string, targetJobId: string) => Promise<any>;
}

export const CareerPathfindingPanel: React.FC<CareerPathfindingPanelProps> = ({
  nodes,
  edges,
  findOptimalPaths,
  findPivotOpportunities,
  calculateCRI
}) => {
  const [startNode, setStartNode] = useState<string>('');
  const [goalNode, setGoalNode] = useState<string>('');
  const [criteria, setCriteria] = useState<'time' | 'cost' | 'difficulty' | 'roi'>('time');
  const [paths, setPaths] = useState<any[]>([]);
  const [pivotPaths, setPivotPaths] = useState<any[]>([]);
  const [criScore, setCriScore] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get nodes by type for dropdowns
  const skills = nodes.filter(n => n.type === 'skill');
  const jobs = nodes.filter(n => n.type === 'job');
  const courses = nodes.filter(n => n.type === 'course');

  const handleFindPaths = async () => {
    if (!startNode || !goalNode) return;

    setIsLoading(true);
    try {
      const startNodeData = nodes.find(n => n.id === startNode);
      const goalNodeData = nodes.find(n => n.id === goalNode);
      
      if (startNodeData && goalNodeData) {
        const optimalPaths = findOptimalPaths(
          startNodeData.type as any,
          startNode,
          goalNodeData.type as any,
          goalNode,
          criteria
        );
        setPaths(optimalPaths);

        // If both are jobs, also find pivot opportunities
        if (startNodeData.type === 'job' && goalNodeData.type === 'job') {
          const pivots = await findPivotOpportunities(startNode, goalNode);
          setPivotPaths(pivots);
        }
      }
    } catch (error) {
      console.error('Error finding paths:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculateCRI = async () => {
    if (!goalNode) return;

    const goalNodeData = nodes.find(n => n.id === goalNode);
    if (goalNodeData?.type === 'job') {
      setIsLoading(true);
      try {
        // For demo, use a mock user ID
        const cri = await calculateCRI('demo-user', goalNode);
        setCriScore(cri);
      } catch (error) {
        console.error('Error calculating CRI:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getCriteriaIcon = (criteria: string) => {
    switch (criteria) {
      case 'time': return <Clock className="h-4 w-4" />;
      case 'cost': return <DollarSign className="h-4 w-4" />;
      case 'difficulty': return <Brain className="h-4 w-4" />;
      case 'roi': return <TrendingUp className="h-4 w-4" />;
      default: return <Route className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Career Pathfinding
        </CardTitle>
        <CardDescription>
          Find optimal paths between skills, jobs, and courses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Path Configuration */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Start Point</label>
            <Select value={startNode} onValueChange={setStartNode}>
              <SelectTrigger>
                <SelectValue placeholder="Select starting point" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" disabled>Skills</SelectItem>
                {skills.slice(0, 10).map(skill => (
                  <SelectItem key={skill.id} value={skill.id}>
                    {skill.title}
                  </SelectItem>
                ))}
                <Separator />
                <SelectItem value="" disabled>Jobs</SelectItem>
                {jobs.slice(0, 10).map(job => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Goal</label>
            <Select value={goalNode} onValueChange={setGoalNode}>
              <SelectTrigger>
                <SelectValue placeholder="Select goal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" disabled>Skills</SelectItem>
                {skills.slice(0, 10).map(skill => (
                  <SelectItem key={skill.id} value={skill.id}>
                    {skill.title}
                  </SelectItem>
                ))}
                <Separator />
                <SelectItem value="" disabled>Jobs</SelectItem>
                {jobs.slice(0, 10).map(job => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Optimization Criteria</label>
            <Select value={criteria} onValueChange={(value: any) => setCriteria(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Shortest Time
                  </div>
                </SelectItem>
                <SelectItem value="cost">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Lowest Cost
                  </div>
                </SelectItem>
                <SelectItem value="difficulty">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Easiest Path
                  </div>
                </SelectItem>
                <SelectItem value="roi">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Best ROI
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleFindPaths} 
            disabled={!startNode || !goalNode || isLoading}
            className="flex-1"
          >
            {getCriteriaIcon(criteria)}
            Find Paths
          </Button>
          <Button 
            onClick={handleCalculateCRI} 
            disabled={!goalNode || isLoading}
            variant="outline"
          >
            Calculate CRI
          </Button>
        </div>

        {/* Results */}
        {paths.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Optimal Paths ({paths.length})</h4>
            {paths.slice(0, 3).map((path, index) => (
              <div key={index} className="p-3 border rounded-lg text-sm">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">Path {index + 1}</Badge>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>{path.estimatedTime || 'N/A'}</span>
                    <span>•</span>
                    <span>${path.estimatedCost || 0}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {path.steps?.length || 0} steps • Score: {path.totalWeight || 0}
                </div>
              </div>
            ))}
          </div>
        )}

        {pivotPaths.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Career Pivots ({pivotPaths.length})</h4>
            {pivotPaths.slice(0, 2).map((pivot, index) => (
              <div key={index} className="p-3 border rounded-lg text-sm">
                <div className="font-medium mb-1">{pivot.title || `Pivot Option ${index + 1}`}</div>
                <div className="text-xs text-muted-foreground">
                  Skill overlap: {pivot.skillOverlap || 0}% • Time: {pivot.estimatedTime || 'N/A'}
                </div>
              </div>
            ))}
          </div>
        )}

        {criScore && (
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">Career Readiness Index</h4>
            <div className="text-2xl font-bold">{criScore.score || 0}%</div>
            <div className="text-xs text-muted-foreground">
              Based on current skills and experience
            </div>
          </div>
        )}

        {/* Graph Stats */}
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Graph: {nodes.length} nodes, {edges.length} connections</div>
            <div>Skills: {skills.length} • Jobs: {jobs.length} • Courses: {courses.length}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
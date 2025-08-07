import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowRight, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Target, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Calendar,
  Zap
} from 'lucide-react';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence';

interface PathData {
  name: string;
  timeline: string;
  cost: string;
  salary_range: string;
  cri_current: number;
  cri_projected: number;
  skills_required: string[];
  skills_existing: string[];
  market_demand: 'High' | 'Medium' | 'Low';
  risk_level: 'Low' | 'Medium' | 'High';
  roi_score: number;
}

interface CrossPathComparisonPanelProps {
  userId: string;
  currentPath?: PathData;
  pivotPath?: any;
  onGenerateRoadmap?: (path: PathData) => void;
  onClose?: () => void;
}

export function CrossPathComparisonPanel({ 
  userId, 
  currentPath,
  pivotPath,
  onGenerateRoadmap,
  onClose 
}: CrossPathComparisonPanelProps) {
  const [comparisonMode, setComparisonMode] = useState<'overview' | 'timeline' | 'financial' | 'risk'>('overview');
  const [selectedPath, setSelectedPath] = useState<'current' | 'pivot'>('current');

  const { criScore } = useCareerReadiness({ userId });
  const { getSalaryInsights } = useMarketIntelligence();

  // Mock current path data (would come from user profile in real app)
  const defaultCurrentPath: PathData = {
    name: currentPath?.name || "Current Software Developer Path",
    timeline: "Ongoing",
    cost: "$2,000/year (upskilling)",
    salary_range: "$90K - $120K",
    cri_current: criScore?.overall || 75,
    cri_projected: (criScore?.overall || 75) + 5,
    skills_required: ["React", "TypeScript", "Node.js", "AWS", "Docker"],
    skills_existing: ["React", "TypeScript", "Node.js"],
    market_demand: 'High',
    risk_level: 'Low',
    roi_score: 85
  };

  // Convert pivot data to PathData format
  const convertedPivotPath: PathData = pivotPath ? {
    name: pivotPath.new_career,
    timeline: pivotPath.estimated_time,
    cost: pivotPath.estimated_cost,
    salary_range: "$120K - $160K", // Mock data
    cri_current: criScore?.overall || 75,
    cri_projected: (criScore?.overall || 75) + Math.round(pivotPath.roi_score / 5),
    skills_required: [...(pivotPath.shared_skills || []), ...(pivotPath.missing_skills || [])],
    skills_existing: pivotPath.shared_skills || [],
    market_demand: 'High',
    risk_level: pivotPath.roi_score > 80 ? 'Low' : pivotPath.roi_score > 60 ? 'Medium' : 'High',
    roi_score: pivotPath.roi_score
  } : defaultCurrentPath;

  const paths = {
    current: currentPath || defaultCurrentPath,
    pivot: convertedPivotPath
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-600 bg-green-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'High': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getDemandColor = (demand: string) => {
    switch (demand) {
      case 'High': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const renderPathCard = (pathType: 'current' | 'pivot', path: PathData) => {
    const skillsMatch = path.skills_existing.length / path.skills_required.length * 100;
    const criGain = path.cri_projected - path.cri_current;

    return (
      <Card className={`transition-all ${selectedPath === pathType ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{path.name}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getRiskColor(path.risk_level)}>
                  {path.risk_level} Risk
                </Badge>
                <Badge variant="outline">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  ROI: {path.roi_score}
                </Badge>
              </div>
            </div>
            <Button 
              variant={selectedPath === pathType ? "default" : "outline"} 
              size="sm"
              onClick={() => setSelectedPath(pathType)}
            >
              {selectedPath === pathType ? 'Selected' : 'Select'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{path.timeline}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span>{path.cost}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>CRI Score</span>
              <span className="font-medium">
                {path.cri_current} → {path.cri_projected} 
                <span className="text-green-600 ml-1">(+{criGain})</span>
              </span>
            </div>
            <Progress value={(path.cri_projected / 100) * 100} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Skills Match</span>
              <span>{Math.round(skillsMatch)}%</span>
            </div>
            <Progress value={skillsMatch} className="h-2" />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>Market Demand</span>
            <span className={`font-medium ${getDemandColor(path.market_demand)}`}>
              {path.market_demand}
            </span>
          </div>

          <div className="text-center pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => onGenerateRoadmap?.(path)}
            >
              Generate Roadmap
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTimelineComparison = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Timeline Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Path Timeline */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              Current Path ({paths.current.name})
            </h4>
            <div className="pl-6 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Continue current role progression</span>
                <Badge variant="outline" className="ml-auto">Ongoing</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span>Skills enhancement & certifications</span>
                <Badge variant="outline" className="ml-auto">6-12 months</Badge>
              </div>
            </div>
          </div>

          {/* Pivot Path Timeline */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              Pivot Path ({paths.pivot.name})
            </h4>
            <div className="pl-6 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Learning phase (new skills)</span>
                <Badge variant="outline" className="ml-auto">{paths.pivot.timeline}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-green-600" />
                <span>Career transition & job search</span>
                <Badge variant="outline" className="ml-auto">2-4 months</Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderFinancialComparison = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Financial Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Investment Required</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded">
                <span className="text-sm">Current Path</span>
                <span className="font-medium">{paths.current.cost}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded">
                <span className="text-sm">Pivot Path</span>
                <span className="font-medium">{paths.pivot.cost}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Salary Projection</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded">
                <span className="text-sm">Current Path</span>
                <span className="font-medium">{paths.current.salary_range}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded">
                <span className="text-sm">Pivot Path</span>
                <span className="font-medium text-green-600">{paths.pivot.salary_range}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="font-medium text-green-800">ROI Analysis</span>
          </div>
          <p className="text-sm text-green-700">
            Pivot path shows 30-40% salary increase potential within 2 years, 
            offsetting transition costs with positive ROI expected in 18 months.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderRiskAssessment = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Risk Assessment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Current Path Risks</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Stable employment</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span>Limited growth potential</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>Market saturation risk</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Pivot Path Risks</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>High growth potential</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span>Learning curve required</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span>Job search uncertainty</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{paths.current.roi_score}%</div>
              <div className="text-sm text-muted-foreground">Current Path Success Rate</div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{paths.pivot.roi_score}%</div>
              <div className="text-sm text-muted-foreground">Pivot Path Success Rate</div>
            </div>
          </Card>
        </div>
      </CardContent>
    </Card>
  );

  if (!pivotPath) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cross-Path Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No Pivot Path Selected</h3>
            <p className="text-muted-foreground">Select a pivot option to compare career paths</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Cross-Path Comparison
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <XCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <Tabs value={comparisonMode} onValueChange={(value) => setComparisonMode(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderPathCard('current', paths.current)}
            {renderPathCard('pivot', paths.pivot)}
          </div>
          
          <Card className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium mb-1">Recommended Action</h3>
                <p className="text-sm text-muted-foreground">
                  Based on your profile and market trends
                </p>
              </div>
              <Button className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Generate Action Plan
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          {renderTimelineComparison()}
        </TabsContent>

        <TabsContent value="financial">
          {renderFinancialComparison()}
        </TabsContent>

        <TabsContent value="risk">
          {renderRiskAssessment()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
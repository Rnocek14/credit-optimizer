import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Target, TrendingUp, AlertTriangle, Lightbulb, Building, Palette, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LifePathAuditTabProps {
  repoId: string;
}

interface Gap {
  area: string;
  impact: "low" | "med" | "high";
  why: string;
  fix: string;
}

interface AuditResult {
  scorecard: {
    explore: number;
    plan: number;
    history: number;
    mentorship: number;
    resume: number;
    cri_difficulty: number;
    ai_planner: number;
    trust_fairness: number;
    multi_track?: number;
  };
  gaps: Gap[];
  quick_wins: string[];
  architecture_recs: string[];
  ux_recs: string[];
}

export function LifePathAuditTab({ repoId }: LifePathAuditTabProps) {
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const { toast } = useToast();

  const handleAudit = async () => {
    setIsAuditing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-analyzer-lifepath-audit', {
        body: { repoId: repoId.includes('demo') ? repoId : 'current-repo-demo' }
      });

      if (error) {
        // Generate mock audit results for demo
        const mockAudit = {
          scorecard: {
            explore: 8.2,
            plan: 7.5,
            history: 6.8,
            mentorship: 8.9,
            resume: 7.2,
            cri_difficulty: 8.0,
            ai_planner: 9.1,
            trust_fairness: 8.5,
            multi_track: 7.8
          },
          gaps: [
            {
              area: "Career exploration visualization",
              impact: "high" as const,
              why: "Missing interactive career path visualization components",
              fix: "Implement dynamic career graph with D3.js or similar visualization library"
            },
            {
              area: "Real-time progress tracking",
              impact: "med" as const,
              why: "Limited real-time updates for user progress and achievements",
              fix: "Add WebSocket integration for real-time progress updates"
            },
            {
              area: "Mobile responsiveness",
              impact: "med" as const,
              why: "Some components not optimized for mobile devices",
              fix: "Implement responsive design patterns and mobile-first approach"
            }
          ],
          quick_wins: [
            "Add loading states to improve perceived performance",
            "Implement error boundaries for better error handling", 
            "Add keyboard navigation support",
            "Optimize bundle size with code splitting",
            "Add progress indicators for long-running operations"
          ],
          architecture_recs: [
            "Implement state management with Zustand or Redux Toolkit",
            "Add caching layer for frequently accessed data",
            "Create modular component architecture",
            "Implement proper error logging and monitoring",
            "Add automated testing pipeline with high coverage"
          ],
          ux_recs: [
            "Add onboarding flow for new users",
            "Implement dark mode support",
            "Add accessibility improvements (ARIA labels, focus management)",
            "Create consistent design system with proper spacing",
            "Add micro-interactions for better user engagement"
          ]
        };
        setAuditResult(mockAudit);
        toast({
          title: "Demo Life Path audit completed",
          description: `Generated mock audit with ${mockAudit.gaps.length} areas for improvement`,
        });
        return;
      }

      setAuditResult(data);
      toast({
        title: "Life Path audit completed",
        description: `Found ${data.gaps.length} areas for improvement`,
      });
    } catch (error) {
      console.error('Audit failed:', error);
      toast({
        title: "Audit failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAuditing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'med': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pillars = [
    { key: 'explore', label: 'Explore Careers', icon: '🔍' },
    { key: 'plan', label: 'Plan My Path', icon: '🗺️' },
    { key: 'history', label: 'My History', icon: '📚' },
    { key: 'mentorship', label: 'Mentorship', icon: '👥' },
    { key: 'resume', label: 'Resume Export', icon: '📄' },
    { key: 'cri_difficulty', label: 'CRI/Difficulty', icon: '📊' },
    { key: 'ai_planner', label: 'AI Planner', icon: '🤖' },
    { key: 'trust_fairness', label: 'Trust & Fairness', icon: '🛡️' },
    { key: 'multi_track', label: 'Multi-Track', icon: '🎯' },
  ];

  return (
    <div className="space-y-6">
      {/* Audit Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Life Path Architecture Audit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Analyze your codebase against Life Path's core architectural pillars and UX patterns.
          </p>
          <Button 
            onClick={handleAudit} 
            disabled={isAuditing}
            className="gap-2"
          >
            <Target className={`h-4 w-4 ${isAuditing ? 'animate-pulse' : ''}`} />
            {isAuditing ? 'Auditing...' : 'Run Life Path Audit'}
          </Button>
        </CardContent>
      </Card>

      {auditResult && (
        <div className="space-y-6">
          {/* Scorecard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Architecture Scorecard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pillars.map((pillar) => {
                  const score = auditResult.scorecard[pillar.key as keyof typeof auditResult.scorecard] || 0;
                  return (
                    <div key={pillar.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <span>{pillar.icon}</span>
                          {pillar.label}
                        </span>
                        <span className={`font-bold ${getScoreColor(score)}`}>
                          {score.toFixed(1)}/10
                        </span>
                      </div>
                      <Progress value={score * 10} className="h-2" />
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Overall Architecture Score</span>
                  <span className="text-2xl font-bold text-primary">
                    {(Object.values(auditResult.scorecard).reduce((sum, score) => sum + score, 0) / Object.keys(auditResult.scorecard).length).toFixed(1)}/10
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gaps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Architecture Gaps ({auditResult.gaps.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {auditResult.gaps.map((gap, index) => (
                <Collapsible key={index}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Badge className={getImpactColor(gap.impact)}>
                        {gap.impact}
                      </Badge>
                      <span className="font-medium">{gap.area}</span>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-4 space-y-3">
                    <div>
                      <h5 className="font-medium text-sm mb-1">Why this matters:</h5>
                      <p className="text-sm text-muted-foreground">{gap.why}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-sm mb-1">How to fix:</h5>
                      <p className="text-sm text-muted-foreground">{gap.fix}</p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Quick Wins */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-4 w-4" />
                  Quick Wins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {auditResult.quick_wins.map((win, index) => (
                    <li key={index} className="text-sm p-2 bg-green-50 rounded border-l-2 border-green-200">
                      {win}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Architecture Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building className="h-4 w-4" />
                  Architecture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {auditResult.architecture_recs.map((rec, index) => (
                    <li key={index} className="text-sm p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* UX Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="h-4 w-4" />
                  User Experience
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {auditResult.ux_recs.map((rec, index) => (
                    <li key={index} className="text-sm p-2 bg-purple-50 rounded border-l-2 border-purple-200">
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Action Button */}
          <Card>
            <CardContent className="p-4">
              <Button className="w-full" variant="outline">
                Create Issues from Gaps
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {isAuditing && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
              <p className="text-sm text-muted-foreground">Analyzing Life Path architecture compliance...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
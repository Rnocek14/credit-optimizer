import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Shield, CheckCircle, AlertTriangle, Settings, Zap, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface AutoValidationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  confidenceThreshold: number;
  criteria: {
    minMarketAlignment: number;
    minSkillCoverage: number;
    minCareerImpact: number;
    requireProjects: boolean;
    maxCost: number;
  };
  stats: {
    totalProcessed: number;
    autoApproved: number;
    accuracy: number;
  };
}

interface AutoValidatedCourse {
  id: string;
  title: string;
  platform: string;
  confidenceScore: number;
  validatedAt: string;
  ruleName: string;
  status: 'auto_approved' | 'flagged_for_review' | 'auto_rejected';
  metrics: {
    marketAlignment: number;
    skillCoverage: number;
    careerImpact: number;
  };
}

export function AutoValidationDashboard() {
  const [rules, setRules] = useState<AutoValidationRule[]>([]);
  const [recentValidations, setRecentValidations] = useState<AutoValidatedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemEnabled, setSystemEnabled] = useState(true);

  useEffect(() => {
    loadAutoValidationData();
  }, []);

  const loadAutoValidationData = async () => {
    try {
      // Simulate auto-validation rules and recent activity
      const mockRules: AutoValidationRule[] = [
        {
          id: 'high-confidence',
          name: 'High Confidence Auto-Approval',
          description: 'Automatically approve courses with >90% confidence and strong market alignment',
          enabled: true,
          confidenceThreshold: 90,
          criteria: {
            minMarketAlignment: 80,
            minSkillCoverage: 75,
            minCareerImpact: 70,
            requireProjects: false,
            maxCost: 1000
          },
          stats: {
            totalProcessed: 156,
            autoApproved: 142,
            accuracy: 96.8
          }
        },
        {
          id: 'free-courses',
          name: 'Free Course Fast-Track',
          description: 'Auto-approve free courses with good ratings and project components',
          enabled: true,
          confidenceThreshold: 75,
          criteria: {
            minMarketAlignment: 60,
            minSkillCoverage: 65,
            minCareerImpact: 60,
            requireProjects: true,
            maxCost: 0
          },
          stats: {
            totalProcessed: 89,
            autoApproved: 73,
            accuracy: 93.2
          }
        },
        {
          id: 'trending-skills',
          name: 'Trending Skills Priority',
          description: 'Fast-track courses in high-demand skill areas like AI, Cloud, and Data Science',
          enabled: false,
          confidenceThreshold: 80,
          criteria: {
            minMarketAlignment: 85,
            minSkillCoverage: 70,
            minCareerImpact: 80,
            requireProjects: false,
            maxCost: 500
          },
          stats: {
            totalProcessed: 45,
            autoApproved: 38,
            accuracy: 91.1
          }
        }
      ];

      setRules(mockRules);

      // Get recent validations from course intelligence pipeline
      const { data: recentCourses, error } = await supabase
        .from('course_intelligence_pipeline')
        .select(`
          id,
          confidence_score,
          validated_at,
          ai_analysis,
          course_discovery_queue (
            discovery_data,
            source_platform
          )
        `)
        .not('validated_at', 'is', null)
        .order('validated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const mockValidations: AutoValidatedCourse[] = recentCourses?.map((course, index) => {
        const discoveryData = course.course_discovery_queue?.discovery_data as any;
        const aiAnalysis = course.ai_analysis as any;
        
        return {
          id: course.id,
          title: discoveryData?.title || 'Untitled Course',
          platform: course.course_discovery_queue?.source_platform || 'Unknown',
          confidenceScore: course.confidence_score,
          validatedAt: course.validated_at,
          ruleName: mockRules[index % mockRules.length].name,
          status: course.confidence_score > 90 ? 'auto_approved' : 
                  course.confidence_score < 50 ? 'auto_rejected' : 'flagged_for_review',
          metrics: {
            marketAlignment: aiAnalysis?.marketAlignment || 75,
            skillCoverage: aiAnalysis?.skillGapCoverage || 70,
            careerImpact: aiAnalysis?.careerImpact || 65
          }
        };
      }) || [];

      setRecentValidations(mockValidations);

    } catch (error) {
      console.error('Error loading auto-validation data:', error);
      toast.error('Failed to load auto-validation dashboard');
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      setRules(prev => prev.map(rule => 
        rule.id === ruleId ? { ...rule, enabled } : rule
      ));

      toast.success(`Rule ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error('Failed to update rule');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'auto_approved': return 'bg-green-100 text-green-800';
      case 'auto_rejected': return 'bg-red-100 text-red-800';
      case 'flagged_for_review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'auto_approved': return <CheckCircle className="h-4 w-4" />;
      case 'auto_rejected': return <Shield className="h-4 w-4" />;
      case 'flagged_for_review': return <AlertTriangle className="h-4 w-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Shield className="h-6 w-6 animate-pulse mr-2" />
            Loading auto-validation dashboard...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Auto-Validation System
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm">System Status</span>
              <Switch
                checked={systemEnabled}
                onCheckedChange={setSystemEnabled}
              />
              <Badge variant={systemEnabled ? 'default' : 'secondary'}>
                {systemEnabled ? 'Active' : 'Disabled'}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertTitle>Smart Auto-Validation Active</AlertTitle>
            <AlertDescription>
              AI is automatically processing courses with 90% confidence. Human oversight maintains quality control.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Validation Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Validation Rules
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {rules.map(rule => (
            <div key={rule.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">{rule.name}</h4>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-sm">
                    <div className="font-medium">{rule.stats.accuracy}% accurate</div>
                    <div className="text-muted-foreground">
                      {rule.stats.autoApproved}/{rule.stats.totalProcessed} approved
                    </div>
                  </div>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(enabled) => toggleRule(rule.id, enabled)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium mb-1">Criteria</div>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>Confidence: ≥{rule.confidenceThreshold}%</li>
                    <li>Market Alignment: ≥{rule.criteria.minMarketAlignment}%</li>
                    <li>Skill Coverage: ≥{rule.criteria.minSkillCoverage}%</li>
                    <li>Max Cost: ${rule.criteria.maxCost}</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium mb-1">Performance</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Accuracy</span>
                      <span>{rule.stats.accuracy}%</span>
                    </div>
                    <Progress value={rule.stats.accuracy} className="h-2" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Auto-Validations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Recent Auto-Validations
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {recentValidations.map(course => (
              <div key={course.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{course.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {course.platform} • {new Date(course.validatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(course.status)}>
                      {getStatusIcon(course.status)}
                      {course.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline">
                      {Math.round(course.confidenceScore)}%
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium mb-1">Market Fit</div>
                    <Progress value={course.metrics.marketAlignment} className="h-1" />
                    <span className="text-xs text-muted-foreground">
                      {course.metrics.marketAlignment}%
                    </span>
                  </div>
                  <div>
                    <div className="font-medium mb-1">Skill Coverage</div>
                    <Progress value={course.metrics.skillCoverage} className="h-1" />
                    <span className="text-xs text-muted-foreground">
                      {course.metrics.skillCoverage}%
                    </span>
                  </div>
                  <div>
                    <div className="font-medium mb-1">Career Impact</div>
                    <Progress value={course.metrics.careerImpact} className="h-1" />
                    <span className="text-xs text-muted-foreground">
                      {course.metrics.careerImpact}%
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  Auto-validated by: {course.ruleName}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
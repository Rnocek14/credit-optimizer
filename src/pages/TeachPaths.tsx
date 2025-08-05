import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Route, 
  TrendingUp, 
  Users, 
  Brain,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Star,
  Zap,
  Target,
  BookOpen,
  Award
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';
import { HubNavigation } from '@/components/HubNavigation';
import { useToast } from '@/hooks/use-toast';

interface PathDashboardStats {
  totalCoursesCurated: number;
  approvedCourses: number;
  pathIntegrations: number;
  recentActivity: Array<{
    type: string;
    title: string;
    timestamp: string;
    status: string;
  }>;
}

interface LearningPath {
  id: string;
  path_name: string;
  path_description: string;
  target_career: string;
  skill_level: string;
  estimated_duration_weeks: number;
  course_sequence: any;
  completion_rate: number;
  average_outcome_score: number;
  ai_confidence: number;
  created_at: string;
}

interface PathValidation {
  pathId: string;
  pathName: string;
  validation: {
    isValid: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
  };
  needsAttention: boolean;
}

export default function TeachPaths() {
  const [stats, setStats] = useState<PathDashboardStats | null>(null);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [pathValidations, setPathValidations] = useState<PathValidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
  
  const { state } = useUnifiedData();
  const { toast } = useToast();

  useEffect(() => {
    if (state.user?.id) {
      loadDashboardData();
    }
  }, [state.user?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load mentor dashboard stats
      const { data: dashboardData, error: dashboardError } = await supabase.functions.invoke('course-path-integrator', {
        body: {
          action: 'get_mentor_path_dashboard',
          data: { mentorId: state.user?.id }
        }
      });
      
      if (dashboardError) throw dashboardError;
      setStats(dashboardData.stats);

      // Load learning paths
      const { data: pathsData, error: pathsError } = await supabase
        .from('maya_learning_paths')
        .select('*')
        .order('ai_confidence', { ascending: false })
        .limit(20);
      
      if (pathsError) throw pathsError;
      setLearningPaths(pathsData || []);

      // Load path validations
      const { data: validationData, error: validationError } = await supabase.functions.invoke('course-path-integrator', {
        body: {
          action: 'validate_learning_paths',
          data: { mentorId: state.user?.id }
        }
      });
      
      if (validationError) throw validationError;
      setPathValidations(validationData.validationResults || []);

    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePathSequence = async (pathId: string, newSequence: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('course-path-integrator', {
        body: {
          action: 'update_learning_path_sequence',
          data: {
            pathId,
            newSequence,
            mentorId: state.user?.id
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Path Updated",
        description: "Learning path sequence updated successfully"
      });

      // Refresh data
      loadDashboardData();

    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update learning path",
        variant: "destructive"
      });
    }
  };

  const getValidationColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (confidence >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <HubNavigation />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading path management dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Learning Path Manager
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage and optimize AI-curated learning paths with course integrations
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Courses Curated</p>
                    <p className="text-2xl font-bold">{stats.totalCoursesCurated}</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Approved Courses</p>
                    <p className="text-2xl font-bold">{stats.approvedCourses}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Path Integrations</p>
                    <p className="text-2xl font-bold">{stats.pathIntegrations}</p>
                  </div>
                  <Route className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Paths</p>
                    <p className="text-2xl font-bold">{learningPaths.length}</p>
                  </div>
                  <Target className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="paths" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="paths">Learning Paths</TabsTrigger>
            <TabsTrigger value="validation">Path Validation</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="paths" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Learning Paths Overview
                </CardTitle>
                <CardDescription>
                  Manage Maya-generated learning paths and course sequences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {learningPaths.map((path) => (
                    <div
                      key={path.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedPath?.id === path.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedPath(path)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium line-clamp-1">{path.path_name}</h4>
                            {getConfidenceIcon(path.ai_confidence)}
                            <Badge variant="outline" className={getValidationColor(path.ai_confidence)}>
                              {Math.round(path.ai_confidence)}% confidence
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {path.path_description}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {path.target_career}
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              {path.skill_level}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {path.estimated_duration_weeks} weeks
                            </span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {Array.isArray(path.course_sequence) ? path.course_sequence.length : 0} courses
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {Math.round(path.completion_rate * 100)}% completion
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Score: {Math.round(path.average_outcome_score)}/100
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Selected Path Details */}
            {selectedPath && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Path Details: {selectedPath.path_name}</span>
                    <Button variant="outline" size="sm">
                      <Zap className="h-3 w-3 mr-1" />
                      Optimize Sequence
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium mb-2">Course Sequence</h5>
                      {Array.isArray(selectedPath.course_sequence) && selectedPath.course_sequence.length > 0 ? (
                        <div className="space-y-2">
                          {selectedPath.course_sequence.map((course: any, index: number) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{course.title || `Course ${index + 1}`}</div>
                                <div className="text-xs text-muted-foreground">
                                  {course.platform} • {course.difficulty || 'Unknown difficulty'}
                                  {course.duration_hours && ` • ${course.duration_hours}h`}
                                </div>
                              </div>
                              {course.added_by_mentor && (
                                <Badge variant="secondary" className="text-xs">
                                  <Award className="h-3 w-3 mr-1" />
                                  Mentor Added
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No courses in sequence yet</p>
                          <p className="text-xs">Curated courses will be automatically integrated</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="validation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Path Validation Results
                </CardTitle>
                <CardDescription>
                  Review and fix learning path structure issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pathValidations.map((validation) => (
                    <div
                      key={validation.pathId}
                      className={`p-4 border rounded-lg ${
                        validation.needsAttention ? 'border-yellow-200 bg-yellow-50/50' : 'border-green-200 bg-green-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-medium">{validation.pathName}</h5>
                            <Badge 
                              variant="outline" 
                              className={getValidationColor(validation.validation.score)}
                            >
                              {validation.validation.score}% valid
                            </Badge>
                          </div>
                          
                          {validation.validation.issues.length > 0 && (
                            <div className="mb-2">
                              <p className="text-sm font-medium text-red-600 mb-1">Issues:</p>
                              <ul className="text-xs text-red-600 space-y-1">
                                {validation.validation.issues.map((issue, index) => (
                                  <li key={index}>• {issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {validation.validation.suggestions.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-blue-600 mb-1">Suggestions:</p>
                              <ul className="text-xs text-blue-600 space-y-1">
                                {validation.validation.suggestions.map((suggestion, index) => (
                                  <li key={index}>• {suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        {validation.needsAttention && (
                          <Button variant="outline" size="sm">
                            Fix Issues
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {pathValidations.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>All paths validated successfully</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Your latest curation and path management activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.type === 'course_curation' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                      }`}>
                        {activity.type === 'course_curation' ? (
                          <Brain className="h-4 w-4" />
                        ) : (
                          <Route className="h-4 w-4" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString()} • Status: {activity.status}
                        </p>
                      </div>
                      
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                  
                  {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
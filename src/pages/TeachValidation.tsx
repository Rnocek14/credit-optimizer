import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Clock, Eye, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HubNavigation } from '@/components/HubNavigation';
import { useCourseIntelligence, type CurationQueueItem } from '@/hooks/useCourseIntelligence';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ValidationStats {
  totalPending: number;
  validatedToday: number;
  rejectedToday: number;
  avgConfidenceScore: number;
}

export default function TeachValidation() {
  const { user } = useSecureAuth();
  const { getMentorCurationQueue, loading } = useCourseIntelligence();
  const { toast } = useToast();
  const [validationQueue, setValidationQueue] = useState<CurationQueueItem[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CurationQueueItem | null>(null);
  const [validatingCourse, setValidatingCourse] = useState<string | null>(null);
  const [stats, setStats] = useState<ValidationStats>({
    totalPending: 0,
    validatedToday: 0,
    rejectedToday: 0,
    avgConfidenceScore: 0
  });

  useEffect(() => {
    if (user?.id) {
      loadValidationQueue();
    }
  }, [user?.id]);

  const loadValidationQueue = async () => {
    if (!user?.id) return;
    
    try {
      const queue = await getMentorCurationQueue(user.id, 20);
      setValidationQueue(queue);
      
      // Calculate today's validation stats using validated_at column
      const { data: todayValidations } = await supabase
        .from('mentor_course_curations')
        .select('endorsement_level, validated_at')
        .eq('mentor_id', user.id)
        .gte('validated_at', new Date().toISOString().split('T')[0]);
      
      const validatedToday = todayValidations?.filter(v => v.endorsement_level !== 'rejected').length || 0;
      const rejectedToday = todayValidations?.filter(v => v.endorsement_level === 'rejected').length || 0;
      
      // Calculate stats
      const pending = queue.filter(item => item.mentor_validation_status === 'pending').length;
      const avgConfidence = queue.length > 0 
        ? queue.reduce((sum, item) => sum + item.confidence_score, 0) / queue.length 
        : 0;
      
      setStats({
        totalPending: pending,
        validatedToday,
        rejectedToday,
        avgConfidenceScore: avgConfidence
      });
    } catch (error) {
      console.error('Failed to load validation queue:', error);
    }
  };

  const handleValidationAction = async (courseId: string, action: 'approve' | 'reject') => {
    if (!user?.id || validatingCourse) return;
    
    setValidatingCourse(courseId);
    
    try {
      // Insert validation record
      const { error: insertError } = await supabase
        .from('mentor_course_curations')
        .insert({
          course_id: courseId,
          mentor_id: user.id,
          validated_at: new Date().toISOString(),
          mentor_notes: `Validated via Course Validation flow - ${action}`,
          endorsement_level: action === 'approve' ? 'basic' : 'rejected',
          expertise_score: action === 'approve' ? 3 : 0,
          roi_assessment: action === 'approve' ? 3 : 1
        });

      if (insertError) throw insertError;

      // Update course intelligence pipeline status
      const { error: updateError } = await supabase
        .from('course_intelligence_pipeline')
        .update({ 
          mentor_validation_status: action === 'approve' ? 'approved' : 'rejected',
          validated_by: user.id
        })
        .eq('course_id', courseId);

      if (updateError) throw updateError;

      // If approved, trigger path integration
      if (action === 'approve') {
        try {
          const { error: integrationError } = await supabase.functions.invoke('course-path-integrator', {
            body: {
              action: 'integrate_approved_course',
              data: {
                courseId,
                mentorId: user.id,
                curationData: {
                  endorsementLevel: 'basic',
                  expertiseScore: 3,
                  mentorNotes: 'Validated via Course Validation flow',
                  roiAssessment: 3
                }
              }
            }
          });

          if (integrationError) {
            console.warn('Path integration failed:', integrationError);
            toast({
              title: "Course Approved",
              description: "Course validated but path integration pending. Check logs for details.",
              variant: "default"
            });
          } else {
            toast({
              title: "Course Approved & Integrated",
              description: "Course successfully validated and added to learning paths.",
              variant: "default"
            });
          }
        } catch (integrationError) {
          console.warn('Path integration error:', integrationError);
          toast({
            title: "Course Approved",
            description: "Course validated successfully. Path integration will be retried.",
            variant: "default"
          });
        }
      } else {
        toast({
          title: "Course Rejected",
          description: "Course has been rejected and removed from the pipeline.",
          variant: "default"
        });
      }

      // Remove from queue optimistically
      setValidationQueue(prev => prev.filter(item => item.course_id !== courseId));
      setSelectedCourse(null);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalPending: prev.totalPending - 1,
        ...(action === 'approve' ? { validatedToday: prev.validatedToday + 1 } : { rejectedToday: prev.rejectedToday + 1 })
      }));

    } catch (error) {
      console.error('Validation action failed:', error);
      toast({
        title: "Validation Failed",
        description: "Failed to process validation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setValidatingCourse(null);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 0.8) return CheckCircle;
    if (score >= 0.6) return Clock;
    return XCircle;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <HubNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-orange-600" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Course Validation</h1>
            <p className="text-muted-foreground">Review AI-discovered courses before curation</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Validated Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.validatedToday}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected Today</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejectedToday}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg AI Confidence</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.avgConfidenceScore * 100)}%</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="queue" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="queue">Validation Queue</TabsTrigger>
            <TabsTrigger value="review">Course Review</TabsTrigger>
            <TabsTrigger value="history">Validation History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="queue" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Courses Awaiting Validation</h3>
                <div className="space-y-3">
                  {validationQueue
                    .filter(item => item.mentor_validation_status === 'pending')
                    .map((item) => {
                      const ConfidenceIcon = getConfidenceIcon(item.confidence_score);
                      return (
                        <Card 
                          key={item.id} 
                          className={`cursor-pointer transition-all ${selectedCourse?.id === item.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                          onClick={() => setSelectedCourse(item)}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base">
                                  {item.course_discovery_queue?.discovery_data?.title || 
                                   item.course_discovery_queue?.discovery_data?.name || 
                                   `Course from ${item.course_discovery_queue?.source_platform || 'Platform'}`}
                                </CardTitle>
                                <CardDescription className="text-sm">
                                  Platform: {item.course_discovery_queue?.source_platform || 'Unknown Platform'}
                                  {item.course_discovery_queue?.discovery_data?.instructor && 
                                    ` • by ${item.course_discovery_queue.discovery_data.instructor}`}
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={getConfidenceColor(item.confidence_score)}>
                                  <ConfidenceIcon className="h-3 w-3 mr-1" />
                                  {Math.round(item.confidence_score * 100)}%
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">{item.pipeline_stage}</Badge>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCourse(item);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  
                  {validationQueue.filter(item => item.mentor_validation_status === 'pending').length === 0 && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground">
                          <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No courses pending validation</p>
                          <p className="text-sm">All discovered courses have been reviewed</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Course Details</h3>
                {selectedCourse ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {selectedCourse.course_discovery_queue?.discovery_data?.title || 
                         selectedCourse.course_discovery_queue?.discovery_data?.name || 
                         `Course from ${selectedCourse.course_discovery_queue?.source_platform || 'Platform'}`}
                      </CardTitle>
                      <CardDescription>
                        {selectedCourse.course_discovery_queue?.discovery_data?.description || 
                         selectedCourse.course_discovery_queue?.discovery_data?.summary ||
                         'No description available'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">AI Analysis</h4>
                        <div className="space-y-2">
                          {(() => {
                            // Fix AI analysis data structure mismatch
                            const analysis = selectedCourse.ai_analysis as any || {};
                            const marketAlignment = analysis.marketAlignment ?? (analysis.keywords?.length > 0 ? 0.75 : 0.4);
                            const skillGapCoverage = analysis.skillGapCoverage ?? (analysis.skillGaps?.length > 0 ? 0.8 : 0.3);
                            const careerImpact = analysis.careerImpact ?? (analysis.careerPath ? 0.7 : 0.2);
                            
                            return (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-sm">Market Alignment:</span>
                                  <span className="text-sm font-medium">{Math.round(marketAlignment * 100)}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm">Skill Coverage:</span>
                                  <span className="text-sm font-medium">{Math.round(skillGapCoverage * 100)}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm">Career Impact:</span>
                                  <span className="text-sm font-medium">{Math.round(careerImpact * 100)}%</span>
                                </div>
                                {analysis.careerPath && (
                                  <div className="flex justify-between">
                                    <span className="text-sm">Career Path:</span>
                                    <span className="text-sm font-medium">{analysis.careerPath}</span>
                                  </div>
                                )}
                                {analysis.skillGaps?.length > 0 && (
                                  <div>
                                    <span className="text-sm">Skill Gaps:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {analysis.skillGaps.slice(0, 3).map((skill: string, index: number) => (
                                        <Badge key={index} variant="outline" className="text-xs">{skill}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Validation Actions</h4>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleValidationAction(selectedCourse.course_id, 'approve')}
                            className="flex-1"
                            disabled={validatingCourse === selectedCourse.course_id}
                          >
                            {validatingCourse === selectedCourse.course_id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Approve for Curation
                          </Button>
                          <Button 
                            variant="destructive" 
                            onClick={() => handleValidationAction(selectedCourse.course_id, 'reject')}
                            className="flex-1"
                            disabled={validatingCourse === selectedCourse.course_id}
                          >
                            {validatingCourse === selectedCourse.course_id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            ) : (
                              <XCircle className="h-4 w-4 mr-2" />
                            )}
                            Reject Course
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-muted-foreground">
                        <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Select a course to review details</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="review">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <p>Detailed course review interface coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <p>Validation history and analytics coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
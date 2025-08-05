import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Clock, Eye, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HubNavigation } from '@/components/HubNavigation';
import { useCourseIntelligence, type CurationQueueItem } from '@/hooks/useCourseIntelligence';
import { useSecureAuth } from '@/hooks/useSecureAuth';

interface ValidationStats {
  totalPending: number;
  validatedToday: number;
  rejectedToday: number;
  avgConfidenceScore: number;
}

export default function TeachValidation() {
  const { user } = useSecureAuth();
  const { getMentorCurationQueue, loading } = useCourseIntelligence();
  const [validationQueue, setValidationQueue] = useState<CurationQueueItem[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CurationQueueItem | null>(null);
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
      
      // Calculate stats
      const pending = queue.filter(item => item.mentor_validation_status === 'pending').length;
      const avgConfidence = queue.length > 0 
        ? queue.reduce((sum, item) => sum + item.confidence_score, 0) / queue.length 
        : 0;
      
      setStats({
        totalPending: pending,
        validatedToday: 0, // TODO: Calculate from today's data
        rejectedToday: 0,  // TODO: Calculate from today's data
        avgConfidenceScore: avgConfidence
      });
    } catch (error) {
      console.error('Failed to load validation queue:', error);
    }
  };

  const handleValidationAction = async (courseId: string, action: 'approve' | 'reject') => {
    // TODO: Implement validation action
    console.log(`${action} course:`, courseId);
    
    // Remove from queue optimistically
    setValidationQueue(prev => prev.filter(item => item.course_id !== courseId));
    setSelectedCourse(null);
    
    // Update stats
    setStats(prev => ({
      ...prev,
      totalPending: prev.totalPending - 1,
      ...(action === 'approve' ? { validatedToday: prev.validatedToday + 1 } : { rejectedToday: prev.rejectedToday + 1 })
    }));
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
                                <CardTitle className="text-base">{item.course_discovery_queue.discovery_data?.title || 'Course Title'}</CardTitle>
                                <CardDescription className="text-sm">
                                  Platform: {item.course_discovery_queue.source_platform}
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
                      <CardTitle>{selectedCourse.course_discovery_queue.discovery_data?.title || 'Course Title'}</CardTitle>
                      <CardDescription>
                        {selectedCourse.course_discovery_queue.discovery_data?.description || 'No description available'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">AI Analysis</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Market Alignment:</span>
                            <span className="text-sm font-medium">{Math.round((selectedCourse.ai_analysis?.marketAlignment || 0) * 100)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Skill Coverage:</span>
                            <span className="text-sm font-medium">{Math.round((selectedCourse.ai_analysis?.skillGapCoverage || 0) * 100)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Career Impact:</span>
                            <span className="text-sm font-medium">{Math.round((selectedCourse.ai_analysis?.careerImpact || 0) * 100)}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Validation Actions</h4>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleValidationAction(selectedCourse.course_id, 'approve')}
                            className="flex-1"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve for Curation
                          </Button>
                          <Button 
                            variant="destructive" 
                            onClick={() => handleValidationAction(selectedCourse.course_id, 'reject')}
                            className="flex-1"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
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
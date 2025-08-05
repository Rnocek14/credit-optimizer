import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  ThumbsUp, 
  ThumbsDown, 
  Clock, 
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { useCourseIntelligence, type CurationQueueItem } from '@/hooks/useCourseIntelligence';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';
import { HubNavigation } from '@/components/HubNavigation';
import { supabase } from '@/integrations/supabase/client';

export default function CourseCuration() {
  const [curationQueue, setCurationQueue] = useState<CurationQueueItem[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CurationQueueItem | null>(null);
  const [endorsementLevel, setEndorsementLevel] = useState<string>('neutral');
  const [expertiseScore, setExpertiseScore] = useState<number[]>([70]);
  const [mentorNotes, setMentorNotes] = useState('');
  const [roiAssessment, setRoiAssessment] = useState<number[]>([75]);

  const { 
    getMentorCurationQueue, 
    submitMentorCuration, 
    loading, 
    error 
  } = useCourseIntelligence();
  const { state } = useUnifiedData();

  useEffect(() => {
    console.log('🔍 CourseCuration: Component mounted, user state:', state.user);
    loadCurationQueue();
  }, [state.user?.id]);

  const loadCurationQueue = async () => {
    console.log('📋 CourseCuration: Loading curation queue, user:', state.user);
    
    if (!state.user?.id) {
      console.warn('⚠️ CourseCuration: No user ID available, skipping queue load');
      return;
    }
    
    console.log('🚀 CourseCuration: Calling getMentorCurationQueue with userId:', state.user.id);
    const queue = await getMentorCurationQueue(state.user.id, 20);
    console.log('✅ CourseCuration: Received queue:', queue);
    setCurationQueue(queue);
  };

  const triggerPathIntegration = async (courseId: string) => {
    try {
      console.log('🔗 Triggering path integration for approved course:', courseId);
      
      const { data, error } = await supabase.functions.invoke('course-path-integrator', {
        body: {
          action: 'integrate_approved_course',
          data: {
            courseId,
            mentorId: state.user?.id,
            curationData: {
              endorsementLevel,
              expertiseScore: expertiseScore[0],
              mentorNotes,
              roiAssessment: roiAssessment[0]
            }
          }
        }
      });

      if (error) throw error;

      console.log('✅ Path integration completed:', data);
      
      // Show integration results to user
      if (data.integratedPaths > 0) {
        console.log(`🎯 Course integrated into ${data.integratedPaths} learning paths`);
      }
      
    } catch (error: any) {
      console.error('❌ Path integration failed:', error);
      // Don't block the curation workflow if integration fails
    }
  };

  const handleCuration = async () => {
    if (!selectedCourse || !state.user?.id) return;

    const curation = await submitMentorCuration(
      state.user.id,
      selectedCourse.course_id,
      {
        endorsementLevel,
        expertiseScore: expertiseScore[0],
        mentorNotes,
        roiAssessment: roiAssessment[0]
      }
    );

    if (curation) {
      // If course was approved, trigger path integration
      if (endorsementLevel === 'strong' || endorsementLevel === 'moderate') {
        await triggerPathIntegration(selectedCourse.course_id);
      }
      
      // Remove from queue and reset form
      setCurationQueue(prev => prev.filter(item => item.id !== selectedCourse.id));
      setSelectedCourse(null);
      resetForm();
    }
  };

  const resetForm = () => {
    setEndorsementLevel('neutral');
    setExpertiseScore([70]);
    setMentorNotes('');
    setRoiAssessment([75]);
  };

  const getEndorsementColor = (level: string) => {
    switch (level) {
      case 'strong': return 'text-green-600 bg-green-50';
      case 'moderate': return 'text-blue-600 bg-blue-50';
      case 'neutral': return 'text-gray-600 bg-gray-50';
      case 'not_recommended': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (confidence >= 60) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Course Curation
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Review and validate AI-discovered courses with your expert insight
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Curation Queue */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Curation Queue
                  </span>
                  <Badge variant="outline">
                    {curationQueue.length} pending
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Courses waiting for mentor validation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading curation queue...</p>
                  </div>
                )}

                {error && (
                  <div className="text-center py-8 text-destructive">
                    <p>{error}</p>
                  </div>
                )}

                {!loading && curationQueue.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                    <p className="text-muted-foreground">
                      No courses pending curation at the moment.
                    </p>
                  </div>
                )}

                {curationQueue.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedCourse?.id === item.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedCourse(item)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium line-clamp-2">
                          {item.course_discovery_queue.discovery_data.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.course_discovery_queue.source_platform} • 
                          {item.course_discovery_queue.discovery_data.difficulty || 'Unknown difficulty'}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getConfidenceIcon(item.confidence_score)}
                        <span className="text-sm text-muted-foreground">
                          {Math.round(item.confidence_score)}%
                        </span>
                      </div>
                    </div>

                    {item.ai_analysis && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Market: {item.ai_analysis.marketAlignment}% • 
                        Skills: {item.ai_analysis.skillGapCoverage}% • 
                        Impact: {item.ai_analysis.careerImpact}%
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Curation Panel */}
          <div>
            {selectedCourse ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Course Review</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedCourse.course_discovery_queue.course_url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Course
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    {selectedCourse.course_discovery_queue.discovery_data.title}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Course Details */}
                  <div>
                    <h4 className="font-medium mb-2">Course Information</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Platform:</strong> {selectedCourse.course_discovery_queue.source_platform}</p>
                      <p><strong>Difficulty:</strong> {selectedCourse.course_discovery_queue.discovery_data.difficulty || 'Not specified'}</p>
                      {selectedCourse.course_discovery_queue.discovery_data.duration_hours && (
                        <p>
                          <strong>Duration:</strong> {selectedCourse.course_discovery_queue.discovery_data.duration_hours} hours
                        </p>
                      )}
                    </div>
                  </div>

                  {/* AI Analysis */}
                  {selectedCourse.ai_analysis && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        Maya's Analysis
                      </h4>
                      <div className="bg-primary/5 p-4 rounded-lg space-y-3">
                        <p className="text-sm">{selectedCourse.ai_analysis.reasoning}</p>
                        
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <div className="font-medium">Market Alignment</div>
                            <div className="text-muted-foreground">
                              {selectedCourse.ai_analysis.marketAlignment}%
                            </div>
                          </div>
                          <div>
                            <div className="font-medium">Skill Coverage</div>
                            <div className="text-muted-foreground">
                              {selectedCourse.ai_analysis.skillGapCoverage}%
                            </div>
                          </div>
                          <div>
                            <div className="font-medium">Career Impact</div>
                            <div className="text-muted-foreground">
                              {selectedCourse.ai_analysis.careerImpact}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Curation Form */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Your Assessment</h4>
                    
                    {/* Endorsement Level */}
                    <div>
                      <Label htmlFor="endorsement">Endorsement Level</Label>
                      <Select value={endorsementLevel} onValueChange={setEndorsementLevel}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="strong">
                            <div className="flex items-center gap-2">
                              <ThumbsUp className="h-3 w-3" />
                              Strongly Recommend
                            </div>
                          </SelectItem>
                          <SelectItem value="moderate">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-3 w-3" />
                              Moderately Recommend
                            </div>
                          </SelectItem>
                          <SelectItem value="neutral">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              Neutral / Needs Review
                            </div>
                          </SelectItem>
                          <SelectItem value="not_recommended">
                            <div className="flex items-center gap-2">
                              <ThumbsDown className="h-3 w-3" />
                              Not Recommended
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Expertise Score */}
                    <div>
                      <Label>Your Expertise in This Domain: {expertiseScore[0]}%</Label>
                      <Slider
                        value={expertiseScore}
                        onValueChange={setExpertiseScore}
                        max={100}
                        step={5}
                        className="mt-2"
                      />
                    </div>

                    {/* ROI Assessment */}
                    <div>
                      <Label>ROI Assessment: {roiAssessment[0]}%</Label>
                      <Slider
                        value={roiAssessment}
                        onValueChange={setRoiAssessment}
                        max={100}
                        step={5}
                        className="mt-2"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <Label htmlFor="notes">Mentor Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Share your insights about this course..."
                        value={mentorNotes}
                        onChange={(e) => setMentorNotes(e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <Button 
                      onClick={handleCuration}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? 'Submitting...' : 'Submit Curation'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a Course</h3>
                  <p className="text-muted-foreground">
                    Choose a course from the queue to start curation.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
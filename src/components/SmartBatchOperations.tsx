import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';
import { CheckCircle, XCircle, Zap, Brain, Target, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BatchCourse {
  id: string;
  course_id: string;
  pipeline_stage: string;
  confidence_score: number;
  ai_analysis: any;
  course_discovery_queue: {
    discovery_data: any;
    source_platform: string;
  };
  suggested_action: 'approve' | 'reject' | 'review';
  ai_reasoning: string;
}

export function SmartBatchOperations() {
  const [courses, setCourses] = useState<BatchCourse[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [batchAction, setBatchAction] = useState<string>('');

  useEffect(() => {
    loadPendingCourses();
  }, []);

  const loadPendingCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('course_intelligence_pipeline')
        .select(`
          id,
          course_id,
          pipeline_stage,
          confidence_score,
          ai_analysis,
          course_discovery_queue (
            discovery_data,
            source_platform
          )
        `)
        .eq('mentor_validation_status', 'pending')
        .order('confidence_score', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Enhance with AI suggestions
      const enhancedCourses = data?.map(course => ({
        ...course,
        suggested_action: getSuggestedAction(course.confidence_score, course.ai_analysis),
        ai_reasoning: getAIReasoning(course.confidence_score, course.ai_analysis)
      })) || [];

      setCourses(enhancedCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Failed to load pending courses');
    } finally {
      setLoading(false);
    }
  };

  const getSuggestedAction = (confidence: number, analysis: any): 'approve' | 'reject' | 'review' => {
    if (confidence >= 85 && analysis?.marketAlignment >= 80) return 'approve';
    if (confidence <= 40 || analysis?.marketAlignment <= 30) return 'reject';
    return 'review';
  };

  const getAIReasoning = (confidence: number, analysis: any): string => {
    if (confidence >= 85) {
      return `High confidence (${confidence}%) with strong market alignment. Recommended for immediate approval.`;
    }
    if (confidence <= 40) {
      return `Low confidence (${confidence}%) with poor market fit. Consider rejection.`;
    }
    return `Medium confidence (${confidence}%) requires manual review for quality assessment.`;
  };

  const handleSelectAll = (action: 'approve' | 'reject' | 'review') => {
    const filteredCourses = courses.filter(course => course.suggested_action === action);
    const newSelection = new Set([...selectedCourses]);
    
    filteredCourses.forEach(course => {
      if (selectedCourses.has(course.id)) {
        newSelection.delete(course.id);
      } else {
        newSelection.add(course.id);
      }
    });
    
    setSelectedCourses(newSelection);
  };

  const processBatchAction = async () => {
    if (!batchAction || selectedCourses.size === 0) {
      toast.error('Please select courses and an action');
      return;
    }

    setProcessing(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // Use the auth helper to get current user (supports both dev and real users)
      const currentUser = await getCurrentUser();
      
      if (!currentUser?.id) {
        throw new Error('No authenticated user found. Please log in and try again.');
      }

      console.log('Processing batch with user:', currentUser.id, 'role:', currentUser.role, 'action:', batchAction);

      // Process each course individually with error isolation
      for (const courseId of selectedCourses) {
        try {
          const { error } = await supabase
            .from('course_intelligence_pipeline')
            .update({
              mentor_validation_status: batchAction,
              validated_by: currentUser.id,
              validated_at: new Date().toISOString(),
              pipeline_stage: batchAction === 'approved' ? 'completed' : 'rejected'
            })
            .eq('id', courseId);

          if (error) {
            console.error(`Error updating course ${courseId}:`, error);
            errors.push(`Course ${courseId.slice(0, 8)}: ${error.message}`);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (courseError) {
          console.error(`Exception for course ${courseId}:`, courseError);
          errors.push(`Course ${courseId.slice(0, 8)}: Unexpected error`);
          errorCount++;
        }
      }

      // Provide detailed feedback
      if (successCount > 0 && errorCount === 0) {
        toast.success(`Successfully ${batchAction} ${successCount} courses`);
      } else if (successCount > 0 && errorCount > 0) {
        toast.success(`Processed ${successCount} courses successfully, ${errorCount} failed`);
        console.warn('Batch errors:', errors);
      } else {
        toast.error(`Failed to process all ${errorCount} courses`);
        console.error('All batch operations failed:', errors);
      }

      // Clear selections and refresh regardless of partial failures
      if (successCount > 0) {
        setSelectedCourses(new Set());
        setBatchAction('');
        loadPendingCourses();
      }

    } catch (error) {
      console.error('Batch operation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process batch operation');
    } finally {
      setProcessing(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'approve': return 'bg-green-100 text-green-800';
      case 'reject': return 'bg-red-100 text-red-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approve': return <CheckCircle className="h-4 w-4" />;
      case 'reject': return <XCircle className="h-4 w-4" />;
      case 'review': return <Brain className="h-4 w-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading smart batch operations...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Smart Batch Operations
          <Badge variant="secondary">{courses.length} courses pending</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* AI Suggestions Summary */}
        <div className="grid grid-cols-3 gap-4">
          {['approve', 'reject', 'review'].map(action => {
            const count = courses.filter(c => c.suggested_action === action).length;
            const selectedCount = courses.filter(c => 
              c.suggested_action === action && selectedCourses.has(c.id)
            ).length;
            
            return (
              <div key={action} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getActionIcon(action)}
                    <span className="font-medium capitalize">{action}</span>
                  </div>
                  <Badge className={getActionColor(action)}>
                    {selectedCount}/{count}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAll(action as any)}
                  className="w-full"
                >
                  {selectedCount === count && count > 0 ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Batch Action Controls */}
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="flex-1">
            <p className="text-sm font-medium">
              {selectedCourses.size} courses selected
            </p>
            <p className="text-xs text-muted-foreground">
              AI suggestions help you process courses faster with confidence
            </p>
          </div>
          
          <Select value={batchAction} onValueChange={setBatchAction}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Choose action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="approved">Approve</SelectItem>
              <SelectItem value="rejected">Reject</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={processBatchAction}
            disabled={processing || selectedCourses.size === 0 || !batchAction}
            className="flex items-center gap-2"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Target className="h-4 w-4" />
            )}
            Process Batch
          </Button>
        </div>

        {/* Course List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {courses.map(course => (
            <div
              key={course.id}
              className={`p-4 border rounded-lg ${selectedCourses.has(course.id) ? 'bg-primary/5 border-primary' : ''}`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedCourses.has(course.id)}
                  onCheckedChange={(checked) => {
                    const newSelection = new Set(selectedCourses);
                    if (checked) {
                      newSelection.add(course.id);
                    } else {
                      newSelection.delete(course.id);
                    }
                    setSelectedCourses(newSelection);
                  }}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium truncate">
                      {course.course_discovery_queue?.discovery_data?.title || 'Untitled Course'}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Badge className={getActionColor(course.suggested_action)}>
                        {getActionIcon(course.suggested_action)}
                        {course.suggested_action}
                      </Badge>
                      <Badge variant="outline">
                        {Math.round(course.confidence_score)}%
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    Platform: {course.course_discovery_queue?.source_platform}
                  </p>
                  
                  <div className="bg-muted/50 p-2 rounded text-xs">
                    <strong>AI Reasoning:</strong> {course.ai_reasoning}
                  </div>
                  
                  {course.confidence_score && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Confidence Score</span>
                        <span>{Math.round(course.confidence_score)}%</span>
                      </div>
                      <Progress value={course.confidence_score} className="h-1" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {courses.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">No courses pending review. Great work!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
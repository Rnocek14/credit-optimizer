import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { useFeatureFlags } from '@/lib/featureFlags';
import { useToast } from '@/hooks/use-toast';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Plus, Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SkillTagsFallback } from '@/components/SkillTagsFallback';
import { AlternativeCourse, UserAltCourseUsage, AltCourseResolveResponse, Provider } from '@/types/alternativeCourses';

export function AlternativeCoursesList() {
  const { activeTrackId } = useActiveTrackStore();
  const { altCoursesEnabled, skillTreeForceTagsFallback } = useFeatureFlags();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pasteUrl, setPasteUrl] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolvedCourse, setResolvedCourse] = useState<AlternativeCourse | null>(null);

  // Debug logging
  console.log('[alt] flags', { altCoursesEnabled, skillTreeForceTagsFallback });

  // Fetch alternative courses catalog
  const { data: catalog = [], isLoading: catalogLoading } = useQuery<AlternativeCourse[]>({
    queryKey: ['alt-catalog', activeTrackId],
    queryFn: async (): Promise<AlternativeCourse[]> => {
      const { data, error } = await supabase
        .from('alternative_courses')
        .select('id, provider, external_id, title, url, creator_name, published_at, estimated_hours, difficulty, cri_score, skills, created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      console.log('[alt] catalog', data?.length);
      return data || [];
    },
    enabled: altCoursesEnabled && !!activeTrackId
  });

  // Fetch user's alt course usage for this track
  const { data: usage = [], isLoading: usageLoading } = useQuery<UserAltCourseUsage[]>({
    queryKey: ['alt-usage', activeTrackId],
    queryFn: async (): Promise<UserAltCourseUsage[]> => {
      if (!activeTrackId) return [];
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_alt_course_usage')
        .select('id, alt_course_id, note, created_at')
        .eq('user_id', user.id)
        .eq('track_id', activeTrackId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      console.log('[alt] usage', data?.length);
      return data || [];
    },
    enabled: altCoursesEnabled && !!activeTrackId
  });

  const isAlreadyTagged = (altCourseId: string) =>
    usage.some(u => u.alt_course_id === altCourseId);

  // Add course to track
  const addMutation = useMutation({
    mutationFn: async ({ altCourseId, note }: { altCourseId: string; note?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !activeTrackId) throw new Error('Missing user or track');
      
      const { data, error } = await supabase
        .from('user_alt_course_usage')
        .insert({ 
          user_id: user.id, 
          track_id: activeTrackId, 
          alt_course_id: altCourseId, 
          note: note || null 
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['alt-usage', activeTrackId] });
      toast({ title: 'Added to track', description: 'Alternative course tagged successfully.' });
      trackTelemetryEvent({ 
        task: 'alt_course_tag_added', 
        complexity: { track_id: activeTrackId, alt_course_id: variables.altCourseId } 
      });
      setResolvedCourse(null);
      setPasteUrl('');
    },
    onError: (err: any) => {
      const isDuplicate = err?.code === '23505';
      toast({
        title: isDuplicate ? 'Already added' : 'Failed to add',
        description: isDuplicate 
          ? 'This course is already in your track.' 
          : (err?.message || 'Unknown error'),
        variant: 'destructive'
      });
    }
  });

  // Remove course from track
  const removeMutation = useMutation({
    mutationFn: async (usageId: string) => {
      const { error } = await supabase
        .from('user_alt_course_usage')
        .delete()
        .eq('id', usageId);
      
      if (error) throw error;
      return usageId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alt-usage', activeTrackId] });
      toast({ title: 'Removed', description: 'Alternative course untagged.' });
      trackTelemetryEvent({ 
        task: 'alt_course_tag_removed', 
        complexity: { track_id: activeTrackId } 
      });
    },
    onError: (err: any) => {
      toast({ 
        title: 'Failed to remove', 
        description: err?.message || 'Unknown error', 
        variant: 'destructive' 
      });
    }
  });

  // Resolve URL to course metadata
  const handleResolveUrl = async () => {
    if (!pasteUrl.trim()) return;

    setResolving(true);
    trackTelemetryEvent({ task: 'alt_resolve_started', complexity: { url: pasteUrl } });

    try {
      const { data, error } = await supabase.functions.invoke<AltCourseResolveResponse>('alt-resolve', {
        body: { url: pasteUrl.trim() }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to resolve course');

      console.log('[alt-resolve] success:', data.course?.id);
      setResolvedCourse(data.course!);
      trackTelemetryEvent({ 
        task: 'alt_resolve_succeeded', 
        complexity: { 
          provider: data.course!.provider,
          cached: data.cached 
        } 
      });
      
      if (data.cached) {
        toast({ title: 'Course found', description: 'Using existing course data.' });
      }
    } catch (error: any) {
      console.error('URL resolution failed:', error);
      trackTelemetryEvent({ 
        task: 'alt_resolve_failed', 
        complexity: { url: pasteUrl, error: error.message } 
      });
      toast({
        title: 'Could not resolve URL',
        description: error.message || 'Please check the URL and try again.',
        variant: 'destructive'
      });
    } finally {
      setResolving(false);
    }
  };

  const handleOpenCourse = (course: AlternativeCourse) => {
    trackTelemetryEvent({ 
      task: 'alt_course_clicked', 
      complexity: { alt_course_id: course.id, provider: course.provider } 
    });
    window.open(course.url, '_blank', 'noopener,noreferrer');
  };

  if (!altCoursesEnabled) {
    return null;
  }

  if (!activeTrackId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alternative Learning Resources</CardTitle>
          <CardDescription>
            Select an active track to view alternative courses
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (catalogLoading || usageLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alternative Learning Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Alternative Learning Resources</CardTitle>
          <CardDescription>
            Expand your learning with courses from multiple platforms
          </CardDescription>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Alternative Course</DialogTitle>
              <DialogDescription>
                Discover, paste a link, or import courses from various platforms
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="discover" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="discover">Discover</TabsTrigger>
                <TabsTrigger value="paste">Paste Link</TabsTrigger>
                <TabsTrigger value="import">Import Playlist</TabsTrigger>
              </TabsList>
              
              <TabsContent value="discover" className="space-y-4">
                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {catalog.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      isTagged={isAlreadyTagged(course.id)}
                      onAdd={() => addMutation.mutate({ altCourseId: course.id })}
                      onOpen={() => handleOpenCourse(course)}
                      isAdding={addMutation.isPending}
                    />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="paste" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="course-url">Course URL</Label>
                    <Input
                      id="course-url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={pasteUrl}
                      onChange={(e) => setPasteUrl(e.target.value)}
                      disabled={resolving}
                    />
                  </div>
                  <Button 
                    onClick={handleResolveUrl} 
                    disabled={!pasteUrl.trim() || resolving}
                    className="w-full"
                  >
                    {resolving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Resolving...
                      </>
                    ) : (
                      'Preview Course'
                    )}
                  </Button>
                  
                  {resolvedCourse && (
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{resolvedCourse.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {resolvedCourse.creator_name || 'External Course'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {resolvedCourse.provider}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        {resolvedCourse.cri_score && (
                          <Badge variant="secondary">
                            CRI {resolvedCourse.cri_score}
                          </Badge>
                        )}
                        {resolvedCourse.difficulty && (
                          <span className="text-muted-foreground">
                            {'★'.repeat(resolvedCourse.difficulty)}{'☆'.repeat(5-resolvedCourse.difficulty)}
                          </span>
                        )}
                        {resolvedCourse.estimated_hours && (
                          <span className="text-muted-foreground">
                            {resolvedCourse.estimated_hours}h
                          </span>
                        )}
                      </div>

                      {skillTreeForceTagsFallback && (
                        <SkillTagsFallback skills={resolvedCourse.skills || []} maxDisplay={6} />
                      )}
                      
                      <Button 
                        onClick={() => addMutation.mutate({ altCourseId: resolvedCourse.id })}
                        disabled={addMutation.isPending || isAlreadyTagged(resolvedCourse.id)}
                        className="w-full"
                      >
                        {addMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : isAlreadyTagged(resolvedCourse.id) ? (
                          'Already in Track'
                        ) : (
                          'Add to Track'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="import" className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <p>Playlist import coming soon!</p>
                  <p className="text-sm mt-1">Bulk import YouTube playlists and course collections</p>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {usage.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No alternative courses added yet.</p>
            <p className="text-sm mt-1">Click "Add Course" to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {usage.map((item) => {
              const course = catalog.find(c => c.id === item.alt_course_id);
              if (!course) return null;
              
              return (
                <CourseCard
                  key={item.id}
                  course={course}
                  isTagged={true}
                  onRemove={() => removeMutation.mutate(item.id)}
                  onOpen={() => handleOpenCourse(course)}
                  isRemoving={removeMutation.isPending}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CourseCardProps {
  course: AlternativeCourse;
  isTagged: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  onOpen: () => void;
  isAdding?: boolean;
  isRemoving?: boolean;
}

function CourseCard({ 
  course, 
  isTagged, 
  onAdd, 
  onRemove, 
  onOpen, 
  isAdding, 
  isRemoving 
}: CourseCardProps) {
  const { skillTreeForceTagsFallback } = useFeatureFlags();
  
  const providerColors: Record<Provider, string> = {
    youtube: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    udemy: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    coursera: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    edx: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    masterclass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{course.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">
            {course.creator_name || 'External Course'}
          </p>
        </div>
        <Badge 
          variant="outline" 
          className={`text-xs ml-2 ${providerColors[course.provider as Provider] || providerColors.other}`}
        >
          {course.provider}
        </Badge>
      </div>
      
      <div className="flex items-center gap-4 text-sm">
        {course.cri_score && (
          <Badge variant="secondary" className="text-xs">
            CRI {course.cri_score}
          </Badge>
        )}
        {course.difficulty && (
          <span className="text-muted-foreground">
            {'★'.repeat(course.difficulty)}{'☆'.repeat(5-course.difficulty)}
          </span>
        )}
        {course.estimated_hours && (
          <span className="text-muted-foreground">
            {course.estimated_hours}h
          </span>
        )}
      </div>

      {skillTreeForceTagsFallback && (
        <SkillTagsFallback skills={course.skills || []} maxDisplay={6} />
      )}
      
      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onOpen}
          className="flex-1"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Open Course
        </Button>
        {isTagged ? (
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={onRemove}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        ) : (
          <Button 
            size="sm" 
            onClick={onAdd}
            disabled={isAdding}
          >
            {isAdding ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
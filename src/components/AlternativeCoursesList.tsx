import { useFeatureFlags } from '@/lib/featureFlags';
import { useAltCourses } from '@/hooks/useAltCourses';
import { useAltTranscript } from '@/hooks/useAltTranscript';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';

const providerColors = {
  YouTube: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  Masterclass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  Udemy: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  HustlersU: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  Other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
};

export function AlternativeCoursesList() {
  const { altCoursesEnabled } = useFeatureFlags();
  const { activeTrackId } = useActiveTrackStore();
  const { catalog, isLoading, clickCourse } = useAltCourses(activeTrackId);
  const { 
    usage, 
    isAlreadyTagged, 
    tagAltCourse, 
    untagAltCourse, 
    isTagging, 
    isUntagging 
  } = useAltTranscript(activeTrackId);

  if (!altCoursesEnabled || !activeTrackId) return null;

  const usedCourseIds = new Set(usage.map(u => u.alt_course_id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Alternative Learning</h3>
        <div className="text-sm text-muted-foreground">
          YouTube, Masterclass, Udemy & more
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading alternative courses...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((course) => {
            const isTagged = usedCourseIds.has(course.id);
            const usageRecord = usage.find(u => u.alt_course_id === course.id);
            
            return (
              <div key={course.id} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium leading-tight">{course.title}</h4>
                  <span className={`text-xs rounded-full px-2 py-1 font-medium whitespace-nowrap ${
                    providerColors[course.provider as keyof typeof providerColors] || providerColors.Other
                  }`}>
                    {course.provider}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {course.estimated_hours && (
                    <span>~{course.estimated_hours}h</span>
                  )}
                  {course.cri_score && (
                    <span>CRI {course.cri_score}</span>
                  )}
                  {course.difficulty && (
                    <span>Level {course.difficulty}/5</span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    className="text-sm font-medium text-primary hover:underline"
                    onClick={() => clickCourse(course.url, course.id)}
                  >
                    Open Course
                  </button>
                  
                  {!isTagged ? (
                    <button
                      className="text-sm rounded-md bg-primary px-3 py-1 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      onClick={() => tagAltCourse({ altCourseId: course.id })}
                      disabled={isTagging}
                    >
                      {isTagging ? 'Adding...' : 'Add to Track'}
                    </button>
                  ) : (
                    <button
                      className="text-sm rounded-md bg-secondary px-3 py-1 text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
                      onClick={() => {
                        if (usageRecord) {
                          untagAltCourse(usageRecord.id);
                        }
                      }}
                      disabled={isUntagging}
                    >
                      {isUntagging ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {catalog.length === 0 && !isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No alternative courses available yet.</p>
          <p className="text-sm">Check back soon for YouTube playlists, Masterclass courses, and more!</p>
        </div>
      )}
    </div>
  );
}
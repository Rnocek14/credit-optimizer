import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, BookOpen } from "lucide-react";
import { format } from "date-fns";
import TrackSelector from "@/components/tracks/TrackSelector";
import { useActiveTrackStore } from "@/stores/useActiveTrackStore";

interface Course {
  id: string;
  title: string;
  platform: string;
  difficulty?: string;
  cost?: string;
  skill_tags: string[];
  url?: string;
  status: "Saved" | "In Progress" | "Completed";
  source: "AI Recommended" | "Saved by You";
  created_at: string;
}

// Demo course history for Aisha Khan
const demoCoursesHistory: Course[] = [
  {
    id: "1",
    title: "Advanced React Patterns",
    platform: "Udemy",
    difficulty: "Advanced",
    cost: "$89.99",
    skill_tags: ["React", "JavaScript", "Frontend", "Hooks"],
    url: "https://udemy.com/react-patterns",
    status: "Completed",
    source: "Saved by You",
    created_at: "2024-01-15T10:00:00Z"
  },
  {
    id: "2", 
    title: "Node.js Backend Development",
    platform: "Coursera",
    difficulty: "Intermediate",
    cost: "Free",
    skill_tags: ["Node.js", "Backend", "API", "Express"],
    url: "https://coursera.org/nodejs",
    status: "In Progress",
    source: "AI Recommended",
    created_at: "2024-02-01T14:30:00Z"
  },
  {
    id: "3",
    title: "Full Stack Web Development Bootcamp",
    platform: "FreeCodeCamp",
    difficulty: "Beginner",
    cost: "Free",
    skill_tags: ["HTML", "CSS", "JavaScript", "MongoDB", "React"],
    url: "https://freecodecamp.org/fullstack",
    status: "Completed",
    source: "Saved by You", 
    created_at: "2023-11-20T09:15:00Z"
  },
  {
    id: "4",
    title: "TypeScript Fundamentals",
    platform: "Pluralsight",
    difficulty: "Intermediate",
    cost: "$29/month",
    skill_tags: ["TypeScript", "JavaScript", "Frontend"],
    status: "Saved",
    source: "AI Recommended",
    created_at: "2024-03-10T16:45:00Z"
  }
];

export default function CourseHistory() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'active'>('all');
  const activeTrackId = useActiveTrackStore(s => s.activeTrackId);

  useEffect(() => {
    fetchCourseHistory();
  }, []);

  const fetchCourseHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Use demo data for Aisha Khan
        setCourses(demoCoursesHistory);
        setLoading(false);
        return;
      }

      // Fetch saved courses
      const { data: savedCourses } = await supabase
        .from('saved_courses')
        .select(`
          id,
          created_at,
          course_id,
          recommended_courses!inner (
            id,
            title,
            platform,
            difficulty,
            cost,
            skill_tags,
            url,
            is_ai_recommended
          )
        `)
        .eq('user_id', user.id);

      // Transform saved courses data
      const transformedCourses: Course[] = (savedCourses || []).map(saved => ({
        id: saved.course_id,
        title: saved.recommended_courses.title,
        platform: saved.recommended_courses.platform,
        difficulty: saved.recommended_courses.difficulty,
        cost: saved.recommended_courses.cost,
        skill_tags: saved.recommended_courses.skill_tags || [],
        url: saved.recommended_courses.url,
        status: "Saved" as const,
        source: saved.recommended_courses.is_ai_recommended ? "AI Recommended" : "Saved by You",
        created_at: saved.created_at
      }));

      setCourses(transformedCourses.length > 0 ? transformedCourses : demoCoursesHistory);
    } catch (error) {
      console.error('Error fetching course history:', error);
      setCourses(demoCoursesHistory);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Saved':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">📘 Course History</h1>
            <p className="text-muted-foreground mt-2">
              Review your saved and completed courses, including skill tags and learning status
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeTrackId && (
              <span data-testid="track-chip" className="text-xs px-2 py-1 rounded bg-muted">Track: {activeTrackId.slice(0,8)}</span>
            )}
            <div className="flex items-center gap-1">
              <Button variant={filterMode === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterMode('all')}>All</Button>
              <Button variant={filterMode === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setFilterMode('active')}>Active Track</Button>
            </div>
            <TrackSelector />
          </div>
        </div>
      </div>

      {courses.length === 0 ? (
        <Card className="p-8 text-center">
          <CardContent className="pt-6">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
            <p className="text-muted-foreground mb-4">
              Start building your learning journey by exploring and saving courses!
            </p>
            <Button>Explore Courses</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="shadow-sm hover:shadow-md transition-shadow border rounded-md">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className={getStatusColor(course.status)}>
                    {course.status}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {course.source}
                  </Badge>
                </div>
                <CardTitle className="text-lg leading-tight">{course.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{course.platform}</p>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    {course.difficulty && (
                      <Badge variant="outline" className={getDifficultyColor(course.difficulty)}>
                        {course.difficulty}
                      </Badge>
                    )}
                    {course.cost && (
                      <span className="text-sm font-medium text-muted-foreground">
                        {course.cost}
                      </span>
                    )}
                  </div>

                  {course.skill_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {course.skill_tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {course.skill_tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{course.skill_tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-muted-foreground">
                      Added {format(new Date(course.created_at), 'MMM dd, yyyy')}
                    </span>
                    {course.url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={course.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
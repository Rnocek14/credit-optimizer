import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, BookOpen, Star, Clock, DollarSign, GraduationCap, TrendingUp } from 'lucide-react';
import { HubNavigation } from '@/components/HubNavigation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CourseCard } from '@/components/CourseCard';
import { CourseDetailModal } from '@/components/CourseDetailModal';

interface Course {
  id: string;
  title: string;
  platform: string;
  url?: string;
  difficulty?: string;
  cost?: string;
  description?: string;
  skill_tags?: string[];
  cri_score?: number;
  duration_hours?: number;
  instructor_name?: string;
  instructor_rating?: number;
  created_at?: string;
}

interface CourseFilters {
  platform: string;
  difficulty: string;
  costRange: string;
  skillTag: string;
  sortBy: string;
}

export default function ExploreCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState<CourseFilters>({
    platform: 'all',
    difficulty: 'all',
    costRange: 'all',
    skillTag: 'all',
    sortBy: 'cri_high'
  });
  const { toast } = useToast();

  // Get unique values for filter options
  const platforms = Array.from(new Set(courses.map(c => c.platform).filter(Boolean)));
  const difficulties = Array.from(new Set(courses.map(c => c.difficulty).filter(Boolean)));
  const skillTags = Array.from(new Set(courses.flatMap(c => c.skill_tags || []).filter(Boolean)));

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [courses, searchQuery, filters]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('recommended_courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: 'Error loading courses',
        description: 'Please try again later',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...courses];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(query) ||
        course.description?.toLowerCase().includes(query) ||
        course.platform.toLowerCase().includes(query) ||
        course.skill_tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Platform filter
    if (filters.platform !== 'all') {
      filtered = filtered.filter(course => course.platform === filters.platform);
    }

    // Difficulty filter
    if (filters.difficulty !== 'all') {
      filtered = filtered.filter(course => course.difficulty === filters.difficulty);
    }

    // Cost range filter
    if (filters.costRange !== 'all') {
      if (filters.costRange === 'free') {
        filtered = filtered.filter(course => 
          !course.cost || course.cost.toLowerCase().includes('free') || course.cost === '$0'
        );
      } else if (filters.costRange === 'paid') {
        filtered = filtered.filter(course => 
          course.cost && !course.cost.toLowerCase().includes('free') && course.cost !== '$0'
        );
      }
    }

    // Skill tag filter
    if (filters.skillTag !== 'all') {
      filtered = filtered.filter(course =>
        course.skill_tags?.includes(filters.skillTag)
      );
    }

    // Sorting
    switch (filters.sortBy) {
      case 'cri_high':
        filtered.sort((a, b) => (b.cri_score || 0) - (a.cri_score || 0));
        break;
      case 'cri_low':
        filtered.sort((a, b) => (a.cri_score || 0) - (b.cri_score || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        break;
      case 'duration_short':
        filtered.sort((a, b) => (a.duration_hours || 0) - (b.duration_hours || 0));
        break;
      case 'duration_long':
        filtered.sort((a, b) => (b.duration_hours || 0) - (a.duration_hours || 0));
        break;
      default:
        break;
    }

    setFilteredCourses(filtered);
  };

  const handleSaveCourse = async (courseId: string) => {
    // Implementation for saving courses to user's saved list
    toast({
      title: 'Course saved',
      description: 'Course added to your saved list'
    });
  };

  const handleViewDetails = (course: Course) => {
    setSelectedCourse(course);
    setShowDetailModal(true);
  };

  const getCRIBadgeColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-800';
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getDurationText = (hours?: number) => {
    if (!hours) return '';
    if (hours < 10) return 'Short course';
    if (hours < 40) return 'Medium course';
    return 'Long course';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <HubNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading courses...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Explore Courses</h1>
          <p className="text-muted-foreground">Discover high-quality courses to advance your career</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {/* Search */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses, skills, platforms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Select value={filters.platform} onValueChange={(value) => setFilters({...filters, platform: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {platforms.map(platform => (
                    <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.difficulty} onValueChange={(value) => setFilters({...filters, difficulty: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {difficulties.map(difficulty => (
                    <SelectItem key={difficulty} value={difficulty}>{difficulty}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.costRange} onValueChange={(value) => setFilters({...filters, costRange: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Cost" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  <SelectItem value="free">Free Courses</SelectItem>
                  <SelectItem value="paid">Paid Courses</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.skillTag} onValueChange={(value) => setFilters({...filters, skillTag: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Skill" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Skills</SelectItem>
                  {skillTags.slice(0, 20).map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.sortBy} onValueChange={(value) => setFilters({...filters, sortBy: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cri_high">Highest CRI</SelectItem>
                  <SelectItem value="cri_low">Lowest CRI</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="duration_short">Shortest</SelectItem>
                  <SelectItem value="duration_long">Longest</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('');
                  setFilters({
                    platform: 'all',
                    difficulty: 'all',
                    costRange: 'all',
                    skillTag: 'all',
                    sortBy: 'cri_high'
                  });
                }}
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-muted-foreground">
            Showing {filteredCourses.length} of {courses.length} courses
          </p>
        </div>

        {/* Course Grid */}
        {filteredCourses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No courses found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search or filters</p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('');
                  setFilters({
                    platform: 'all',
                    difficulty: 'all',
                    costRange: 'all',
                    skillTag: 'all',
                    sortBy: 'cri_high'
                  });
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2 flex-1">{course.title}</CardTitle>
                    {course.cri_score && (
                      <Badge className={`${getCRIBadgeColor(course.cri_score)} text-xs font-semibold`}>
                        {Math.round(course.cri_score)}% CRI
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{course.platform}</span>
                    {course.instructor_name && (
                      <>
                        <span>•</span>
                        <span>{course.instructor_name}</span>
                      </>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  {course.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {course.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    {course.difficulty && (
                      <Badge variant="outline" className="text-xs">
                        {course.difficulty}
                      </Badge>
                    )}
                    {course.duration_hours && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{course.duration_hours}h</span>
                      </div>
                    )}
                    {course.cost && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>{course.cost}</span>
                      </div>
                    )}
                    {course.instructor_rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current text-yellow-500" />
                        <span>{course.instructor_rating}</span>
                      </div>
                    )}
                  </div>

                  {course.skill_tags && course.skill_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {course.skill_tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {course.skill_tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{course.skill_tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleViewDetails(course)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      View Details
                    </Button>
                    <Button 
                      onClick={() => window.open(course.url, '_blank')}
                      size="sm"
                      className="flex-1"
                      disabled={!course.url}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Course Detail Modal */}
        <CourseDetailModal
          course={selectedCourse}
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
        />
      </div>
    </div>
  );
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HubNavigation } from "@/components/HubNavigation";
import { useState, useEffect } from "react";
import { Search, Star, Clock, DollarSign, ExternalLink, Filter, Award, Users, TrendingUp, BookOpen } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCourseMarketplace } from "@/hooks/useCourseMarketplace";
import { LoadingState } from "@/components/LoadingState";

export default function CourseMarketplace() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [mentorEndorsedOnly, setMentorEndorsedOnly] = useState(false);
  
  const { 
    courses, 
    stats, 
    loading, 
    error, 
    loadMarketplaceCourses,
    getPlatforms,
    getDifficultyLevels,
    addToLearningPath
  } = useCourseMarketplace();

  // Reload courses when filters change
  useEffect(() => {
    const filters = {
      search: searchTerm || undefined,
      platform: filterPlatform !== "all" ? filterPlatform : undefined,
      difficulty: filterDifficulty !== "all" ? filterDifficulty : undefined,
      mentorEndorsedOnly
    };
    
    loadMarketplaceCourses(filters);
  }, [searchTerm, filterPlatform, filterDifficulty, mentorEndorsedOnly, loadMarketplaceCourses]);

  const getValidationColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-yellow-600";
    return "text-red-600";
  };

  const legacyGetDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRateCourse = (courseId: string) => {
    // TODO: Implement course rating modal
    console.log('Rate course:', courseId);
  };

  const handleViewDetails = (courseId: string) => {
    // TODO: Navigate to course details page
    console.log('View course details:', courseId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <HubNavigation />
        <LoadingState message="Loading marketplace courses..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Course Marketplace</h1>
          <p className="text-muted-foreground mb-6">
            Discover mentor-validated courses with proven career outcomes.
          </p>
          
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalCourses}</p>
                    <p className="text-xs text-muted-foreground">Total Courses</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.mentorEndorsed}</p>
                    <p className="text-xs text-muted-foreground">Mentor Endorsed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.averageValidationScore}%</p>
                    <p className="text-xs text-muted-foreground">Avg Validation</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.recentlyAdded}</p>
                    <p className="text-xs text-muted-foreground">Added This Week</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses or skills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    {getPlatforms().map(platform => (
                      <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {getDifficultyLevels().map(level => (
                      <SelectItem key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant={mentorEndorsedOnly ? "default" : "outline"}
                  onClick={() => setMentorEndorsedOnly(!mentorEndorsedOnly)}
                  className="whitespace-nowrap"
                >
                  <Award className="h-4 w-4 mr-2" />
                  Mentor Endorsed
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {course.platform} • {course.instructor_name || 'Unknown Instructor'}
                    </CardDescription>
                  </div>
                  {course.mentor_endorsed && (
                    <Badge variant="default" className="ml-2">
                      Mentor Endorsed
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {course.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm">
                    {course.instructor_rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{course.instructor_rating.toFixed(1)}</span>
                      </div>
                    )}
                    <Badge className={legacyGetDifficultyColor(course.difficulty || 'intermediate')}>
                      {course.difficulty || 'intermediate'}
                    </Badge>
                    {course.mentor_endorsement_count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {course.mentor_endorsement_count} mentor{course.mentor_endorsement_count > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{course.duration_hours ? `${course.duration_hours}h` : 'Self-paced'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{course.cost ? `$${course.cost}` : 'Free'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Validation Score:</span>
                      <span className={getValidationColor(course.validation_score)}>
                        {course.validation_score}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>CRI Prediction:</span>
                      <span className={getValidationColor(course.cri_prediction)}>
                        {course.cri_prediction}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Job Placement:</span>
                      <span className="text-muted-foreground">{course.job_placement_rate}%</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {(course.skill_tags || []).slice(0, 4).map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1" variant="outline">
                      View Details
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline"
                      onClick={() => course.url && window.open(course.url, '_blank')}
                      disabled={!course.url}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {courses.length === 0 && !loading && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Courses Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or browse all courses.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
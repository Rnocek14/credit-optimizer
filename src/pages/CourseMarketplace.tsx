import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { HubNavigation } from "@/components/HubNavigation";
import { CourseIntelligenceCard } from "@/components/CourseIntelligenceCard";
import { useState, useEffect, useMemo } from "react";
import { Search, Star, Clock, DollarSign, ExternalLink, Filter, Award, Users, TrendingUp, BookOpen, X, ChevronLeft, ChevronRight } from "lucide-react";
import { safeOpenExternal } from '@/components/ui/SafeExternalLink';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCourseMarketplace } from "@/hooks/useCourseMarketplace";
import useCourseIntelligenceEngine from "@/hooks/useCourseIntelligenceEngine";
import { LoadingState } from "@/components/LoadingState";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

export default function CourseMarketplace() {
  // Enhanced/Legacy toggle state
  const [enhancedMode, setEnhancedMode] = useState(() => {
    return sessionStorage.getItem('course-marketplace-enhanced') === 'true';
  });

  // Legacy filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [mentorEndorsedOnly, setMentorEndorsedOnly] = useState(false);

  // Enhanced filters
  const [criRange, setCriRange] = useState([0, 100]);
  const [prestigeTier, setPrestigeTier] = useState("all");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  
  const { 
    courses: legacyCourses, 
    stats, 
    loading: legacyLoading, 
    error: legacyError, 
    loadMarketplaceCourses,
    getPlatforms,
    getDifficultyLevels,
    addToLearningPath
  } = useCourseMarketplace();

  const { 
    useEnhancedCourses,
    getCRIColor,
    getDifficultyColor,
    getPrestigeBadgeColor,
    formatStars
  } = useCourseIntelligenceEngine();

  // Enhanced courses with pagination
  const enhancedFilters = useMemo(() => ({
    page: currentPage,
    limit: pageSize,
    search: searchTerm || undefined,
    cri_min: criRange[0] > 0 ? criRange[0] : undefined,
    cri_max: criRange[1] < 100 ? criRange[1] : undefined,
    prestige_tier: prestigeTier !== "all" ? prestigeTier : undefined,
    skills: selectedSkills.length > 0 ? selectedSkills : undefined
  }), [currentPage, pageSize, searchTerm, criRange, prestigeTier, selectedSkills]);

  const { 
    data: enhancedData, 
    isLoading: enhancedLoading, 
    error: enhancedError 
  } = useEnhancedCourses(enhancedFilters);

  // Choose data source based on mode
  const courses = enhancedMode ? (enhancedData?.courses || []) : legacyCourses;
  const loading = enhancedMode ? enhancedLoading : legacyLoading;
  const error = enhancedMode ? enhancedError : legacyError;
  const totalCount = enhancedMode ? (enhancedData?.totalCount || 0) : legacyCourses.length;
  const hasMore = enhancedMode ? (enhancedData?.hasMore || false) : false;

  // Handle enhanced mode toggle
  useEffect(() => {
    sessionStorage.setItem('course-marketplace-enhanced', enhancedMode.toString());
  }, [enhancedMode]);

  // Reload legacy courses when filters change
  useEffect(() => {
    if (!enhancedMode) {
      const filters = {
        search: searchTerm || undefined,
        platform: filterPlatform !== "all" ? filterPlatform : undefined,
        difficulty: filterDifficulty !== "all" ? filterDifficulty : undefined,
        mentorEndorsedOnly
      };
      
      loadMarketplaceCourses(filters);
    }
  }, [enhancedMode, searchTerm, filterPlatform, filterDifficulty, mentorEndorsedOnly, loadMarketplaceCourses]);

  // Reset pagination when filters change in enhanced mode
  useEffect(() => {
    if (enhancedMode) {
      setCurrentPage(1);
    }
  }, [searchTerm, criRange, prestigeTier, selectedSkills, enhancedMode]);

  const getValidationColor = (score?: number) => {
    if (typeof score !== 'number') return "text-muted-foreground";
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
    console.log('Rate course:', courseId);
  };

  const handleViewDetails = (courseId: string) => {
    console.log('View course details:', courseId);
  };

  const clearAllFilters = () => {
    if (enhancedMode) {
      setCriRange([0, 100]);
      setPrestigeTier("all");
      setSelectedSkills([]);
    } else {
      setFilterPlatform("all");
      setFilterDifficulty("all");
      setMentorEndorsedOnly(false);
    }
    setSearchTerm("");
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const prestigeTiers = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
  const availableSkills = ["React", "TypeScript", "Node.js", "Python", "Machine Learning", "Data Science", "DevOps", "Cloud Computing"];

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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Course Marketplace</h1>
              <p className="text-muted-foreground">
                Discover mentor-validated courses with proven career outcomes.
              </p>
            </div>
            
            {/* Enhanced Mode Toggle */}
            <div className="flex items-center gap-3">
              <Label htmlFor="enhanced-mode" className="text-sm font-medium">
                Enhanced Intelligence
              </Label>
              <Switch
                id="enhanced-mode"
                checked={enhancedMode}
                onCheckedChange={setEnhancedMode}
              />
            </div>
          </div>
          
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
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={enhancedMode ? "Search courses with AI intelligence..." : "Search courses or skills..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {enhancedMode ? (
                /* Enhanced Filters */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* CRI Score Range */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">CRI Score Range</Label>
                      <div className="px-3">
                        <Slider
                          value={criRange}
                          onValueChange={setCriRange}
                          max={100}
                          min={0}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{criRange[0]}</span>
                          <span>{criRange[1]}</span>
                        </div>
                      </div>
                    </div>

                    {/* Prestige Tier */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Instructor Prestige</Label>
                      <Select value={prestigeTier} onValueChange={setPrestigeTier}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any Tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Tier</SelectItem>
                          {prestigeTiers.map(tier => (
                            <SelectItem key={tier} value={tier.toLowerCase()}>{tier}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Skills Filter */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Skills Focus</Label>
                      <Select
                        value={selectedSkills[0] || "all"}
                        onValueChange={(value) => {
                          if (value === "all") {
                            setSelectedSkills([]);
                          } else {
                            setSelectedSkills(prev => 
                              prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
                            );
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Any Skills" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Skills</SelectItem>
                          {availableSkills.map(skill => (
                            <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Selected Skills */}
                  {selectedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedSkills.map(skill => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => setSelectedSkills(prev => prev.filter(s => s !== skill))}
                        >
                          {skill}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Clear Filters Button */}
                  <div className="flex justify-between items-center">
                    <Button variant="outline" size="sm" onClick={clearAllFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear All Enhanced Filters
                    </Button>
                    
                    {/* Page Size Selector */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Show:</Label>
                      <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12">12</SelectItem>
                          <SelectItem value="24">24</SelectItem>
                          <SelectItem value="48">48</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                /* Legacy Filters */
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex gap-2 flex-wrap">
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

                    <Button variant="outline" size="sm" onClick={clearAllFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        {enhancedMode && totalCount > 0 && (
          <div className="flex justify-between items-center mb-4 text-sm text-muted-foreground">
            <span>
              Showing {startItem} - {endItem} of {totalCount} courses
            </span>
            {hasMore && (
              <span className="text-primary">More available with pagination</span>
            )}
          </div>
        )}

        {/* Course Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => 
            enhancedMode ? (
              <CourseIntelligenceCard
                key={course.id}
                course={course}
                onRateCourse={handleRateCourse}
                onViewDetails={handleViewDetails}
                showFullDetails={false}
              />
            ) : (
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
                      {typeof course.instructor_rating === 'number' && (
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
                          {typeof course.validation_score === 'number' ? `${course.validation_score}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>CRI Prediction:</span>
                        <span className={getValidationColor(course.cri_prediction)}>
                          {typeof course.cri_prediction === 'number' ? `${course.cri_prediction}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Job Placement:</span>
                        <span className="text-muted-foreground">
                          {typeof course.job_placement_rate === 'number' ? `${course.job_placement_rate}%` : 'N/A'}
                        </span>
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
                      <Button className="flex-1" variant="outline" onClick={() => handleViewDetails(course.id)}>
                        View Details
                      </Button>
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => safeOpenExternal(course.url)}
                        disabled={!course.url}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* Pagination Controls */}
        {enhancedMode && totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {courses.length === 0 && !loading && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Courses Found</h3>
              <p className="text-muted-foreground mb-4">
                {enhancedMode 
                  ? "Try adjusting your enhanced filters or search criteria."
                  : "Try adjusting your search criteria or browse all courses."
                }
              </p>
              <Button variant="outline" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Brain, 
  TrendingUp, 
  Clock, 
  Star, 
  ExternalLink,
  Sparkles,
  Filter,
  Plus
} from 'lucide-react';
import { useCourseIntelligence, type DiscoveredCourse } from '@/hooks/useCourseIntelligence';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';
// HubNavigation now provided by AppShell at route level
import { safeOpenExternal } from '@/components/ui/SafeExternalLink';

export default function CourseDiscovery() {
  const [keywords, setKeywords] = useState('');
  const [selectedCareer, setSelectedCareer] = useState('');
  const [customSkills, setCustomSkills] = useState('');
  const [platform, setPlatform] = useState('coursera');
  const [discoveredCourses, setDiscoveredCourses] = useState<DiscoveredCourse[]>([]);

  const { discoverCourses, loading, error } = useCourseIntelligence();
  const { state } = useUnifiedData();

  const handleDiscovery = async () => {
    if (!keywords.trim()) return;

    const skillGaps = customSkills
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0);

    const courses = await discoverCourses(
      keywords,
      skillGaps,
      selectedCareer || undefined,
      platform
    );

    setDiscoveredCourses(courses);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getAnalysisInsight = (course: DiscoveredCourse) => {
    if (!course.analysis) return 'Analysis pending...';
    
    const { marketAlignment, skillGapCoverage, careerImpact } = course.analysis;
    const highestScore = Math.max(marketAlignment, skillGapCoverage, careerImpact);
    
    if (highestScore === marketAlignment) return 'Strong market alignment';
    if (highestScore === skillGapCoverage) return 'Excellent skill gap coverage';
    return 'High career impact potential';
  };

  return (
    <div className="min-h-screen bg-background">
      
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            AI Course Discovery
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover and analyze courses with Maya's intelligence engine
          </p>
        </div>

        {/* Discovery Controls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Course Discovery Engine
            </CardTitle>
            <CardDescription>
              Enter keywords and criteria to discover relevant courses with AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="keywords">Keywords / Topic</Label>
                  <Input
                    id="keywords"
                    placeholder="e.g., React development, data science, machine learning"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="skills">Skill Gaps (comma-separated)</Label>
                  <Textarea
                    id="skills"
                    placeholder="e.g., JavaScript, Python, TypeScript, AWS"
                    value={customSkills}
                    onChange={(e) => setCustomSkills(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="career">Target Career (optional)</Label>
                  <Input
                    id="career"
                    placeholder="e.g., Full Stack Developer, Data Scientist"
                    value={selectedCareer}
                    onChange={(e) => setSelectedCareer(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="platform">Platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coursera">Coursera</SelectItem>
                      <SelectItem value="edx">edX</SelectItem>
                      <SelectItem value="udacity">Udacity</SelectItem>
                      <SelectItem value="pluralsight">Pluralsight</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleDiscovery}
              disabled={loading || !keywords.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Brain className="h-4 w-4 mr-2 animate-pulse" />
                  Discovering & Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Discover Courses with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-8 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Discovered Courses */}
        {discoveredCourses.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                Discovered Courses ({discoveredCourses.length})
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Brain className="h-4 w-4" />
                AI Analyzed
              </div>
            </div>

            <div className="grid gap-6">
              {discoveredCourses.map((course, index) => (
                <Card key={course.queueId || index} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">
                          {course.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {course.platform} • {course.difficulty || 'Unknown difficulty'}
                          {course.duration_hours && (
                            <>
                              {' • '}
                              <Clock className="inline h-3 w-3 mr-1" />
                              {course.duration_hours}h
                            </>
                          )}
                        </CardDescription>
                      </div>
                      
                      {course.analysis && (
                        <Badge className={getConfidenceColor(course.analysis.confidence)}>
                          {course.analysis.confidence}% confidence
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* AI Analysis Summary */}
                    {course.analysis && (
                      <div className="bg-primary/5 p-4 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          Maya's Analysis
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {getAnalysisInsight(course)} • {course.analysis.reasoning}
                        </p>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="font-medium">Market Alignment</div>
                            <div className="text-muted-foreground">
                              {course.analysis.marketAlignment}%
                            </div>
                          </div>
                          <div>
                            <div className="font-medium">Skill Coverage</div>
                            <div className="text-muted-foreground">
                              {course.analysis.skillGapCoverage}%
                            </div>
                          </div>
                          <div>
                            <div className="font-medium">Career Impact</div>
                            <div className="text-muted-foreground">
                              {course.analysis.careerImpact}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Course Description */}
                    {course.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {course.description}
                      </p>
                    )}

                    {/* Skills */}
                    {course.skill_tags && course.skill_tags.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium mb-2">Skills Covered:</h5>
                        <div className="flex flex-wrap gap-1">
                          {course.skill_tags.slice(0, 6).map((skill, skillIndex) => (
                            <Badge key={skillIndex} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {course.skill_tags.length > 6 && (
                            <Badge variant="secondary" className="text-xs">
                              +{course.skill_tags.length - 6} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {course.priorityScore && (
                          <Badge variant="outline" className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {Math.round(course.priorityScore)}% match
                          </Badge>
                        )}
                        {course.has_projects && (
                          <Badge variant="outline" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Projects
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          import('@/state/planStore').then(({ usePlanStore }) => {
                            const add = usePlanStore.getState().addCourseToPlan;
                            add({ title: course.title, provider: (course as any).provider || (course as any).platform, url: (course as any).url });
                            import('sonner').then(({ toast }) => toast.success('Added to Plan (demo)'));
                          });
                        }}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add to Path
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => safeOpenExternal(course.url)}
                          disabled={!course.url}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Course
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && discoveredCourses.length === 0 && keywords && (
          <Card>
            <CardContent className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No courses found</h3>
              <p className="text-muted-foreground">
                Try different keywords or adjust your search criteria.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
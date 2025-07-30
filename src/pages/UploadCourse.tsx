import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, BookOpen, TrendingUp, Award, Clock, Users } from 'lucide-react';
import { calculateCourseCRI, type CourseCRIBreakdown } from '@/lib/criCourseIntegration';
import { toast } from 'sonner';

interface CourseFormData {
  title: string;
  description: string;
  platform: string;
  difficulty: string;
  duration_hours: number;
  cost: string;
  instructor_name: string;
  instructor_rating: number;
  has_projects: boolean;
  skill_tags: string[];
  course_url?: string;
}

const UploadCourse = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('basic');
  const [criBreakdown, setCriBreakdown] = useState<CourseCRIBreakdown | null>(null);
  const [isCalculatingCRI, setIsCalculatingCRI] = useState(false);
  const [currentSkillInput, setCurrentSkillInput] = useState('');
  
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    platform: '',
    difficulty: '',
    duration_hours: 0,
    cost: '',
    instructor_name: '',
    instructor_rating: 0,
    has_projects: false,
    skill_tags: [],
    course_url: ''
  });

  // Calculate CRI in real-time when form data changes
  useEffect(() => {
    const calculateRealTimeCRI = async () => {
      if (!formData.title || !formData.platform) return;
      
      setIsCalculatingCRI(true);
      try {
        const breakdown = await calculateCourseCRI(formData);
        setCriBreakdown(breakdown);
      } catch (error) {
        console.error('Error calculating CRI:', error);
      } finally {
        setIsCalculatingCRI(false);
      }
    };

    const timeoutId = setTimeout(calculateRealTimeCRI, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [formData]);

  const handleInputChange = (field: keyof CourseFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSkillTag = () => {
    if (currentSkillInput.trim() && !formData.skill_tags.includes(currentSkillInput.trim())) {
      handleInputChange('skill_tags', [...formData.skill_tags, currentSkillInput.trim()]);
      setCurrentSkillInput('');
    }
  };

  const removeSkillTag = (skillToRemove: string) => {
    handleInputChange('skill_tags', formData.skill_tags.filter(skill => skill !== skillToRemove));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.platform || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Here you would submit to your course submissions table
      toast.success('Course submitted for review!');
      navigate('/teach');
    } catch (error) {
      toast.error('Failed to submit course');
    }
  };

  const getCRIColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getCRISuggestions = () => {
    if (!criBreakdown) return [];
    
    const suggestions = [];
    if (criBreakdown.skillCoverage < 70) {
      suggestions.push('Add more relevant skill tags to improve skill coverage score');
    }
    if (criBreakdown.projectRigor < 60) {
      suggestions.push('Include hands-on projects or practical exercises');
    }
    if (criBreakdown.difficultyScore < 50) {
      suggestions.push('Consider increasing course difficulty or duration');
    }
    if (criBreakdown.outcomeConversion < 70) {
      suggestions.push('Focus on in-demand skills like React, Python, or Cloud technologies');
    }
    
    return suggestions;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Upload New Course</h1>
        <p className="text-muted-foreground">
          Create a high-quality course with real-time CRI scoring to maximize student outcomes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Course Form */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="content">Content & Skills</TabsTrigger>
              <TabsTrigger value="instructor">Instructor</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Course Basics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Course Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="e.g., Complete React Developer Course"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="platform">Platform *</Label>
                    <Select value={formData.platform} onValueChange={(value) => handleInputChange('platform', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coursera">Coursera</SelectItem>
                        <SelectItem value="udemy">Udemy</SelectItem>
                        <SelectItem value="edx">edX</SelectItem>
                        <SelectItem value="pluralsight">Pluralsight</SelectItem>
                        <SelectItem value="udacity">Udacity</SelectItem>
                        <SelectItem value="linkedin-learning">LinkedIn Learning</SelectItem>
                        <SelectItem value="mit-opencourseware">MIT OpenCourseWare</SelectItem>
                        <SelectItem value="stanford-online">Stanford Online</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="difficulty">Difficulty Level</Label>
                      <Select value={formData.difficulty} onValueChange={(value) => handleInputChange('difficulty', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="duration">Duration (Hours)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={formData.duration_hours || ''}
                        onChange={(e) => handleInputChange('duration_hours', parseInt(e.target.value) || 0)}
                        placeholder="e.g., 40"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cost">Cost</Label>
                    <Input
                      id="cost"
                      value={formData.cost}
                      onChange={(e) => handleInputChange('cost', e.target.value)}
                      placeholder="e.g., $49.99, Free"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="url">Course URL</Label>
                    <Input
                      id="url"
                      value={formData.course_url || ''}
                      onChange={(e) => handleInputChange('course_url', e.target.value)}
                      placeholder="https://..."
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Content & Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="description">Course Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Detailed description of what students will learn..."
                      rows={4}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Skills Covered</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={currentSkillInput}
                        onChange={(e) => setCurrentSkillInput(e.target.value)}
                        placeholder="Add a skill..."
                        onKeyPress={(e) => e.key === 'Enter' && addSkillTag()}
                      />
                      <Button onClick={addSkillTag} type="button">Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.skill_tags.map((skill, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeSkillTag(skill)}
                        >
                          {skill} ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has-projects"
                      checked={formData.has_projects}
                      onCheckedChange={(checked) => handleInputChange('has_projects', checked)}
                    />
                    <Label htmlFor="has-projects">Includes hands-on projects</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="instructor" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Instructor Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="instructor-name">Instructor Name</Label>
                    <Input
                      id="instructor-name"
                      value={formData.instructor_name}
                      onChange={(e) => handleInputChange('instructor_name', e.target.value)}
                      placeholder="Your name"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="instructor-rating">Instructor Rating (1-5)</Label>
                    <Input
                      id="instructor-rating"
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={formData.instructor_rating || ''}
                      onChange={(e) => handleInputChange('instructor_rating', parseFloat(e.target.value) || 0)}
                      placeholder="e.g., 4.8"
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex gap-4">
            <Button onClick={handleSubmit} className="flex-1">
              Submit Course for Review
            </Button>
            <Button variant="outline" onClick={() => navigate('/teach')}>
              Cancel
            </Button>
          </div>
        </div>

        {/* CRI Preview Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                CRI Score Preview
              </CardTitle>
              <CardDescription>
                Real-time Career Readiness Index scoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isCalculatingCRI ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 animate-spin" />
                  Calculating CRI...
                </div>
              ) : criBreakdown ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getCRIColor(criBreakdown.overall)}`}>
                      {criBreakdown.overall}
                    </div>
                    <div className="text-sm text-muted-foreground">Overall CRI Score</div>
                  </div>

                  <Progress value={criBreakdown.overall} className="w-full" />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Difficulty</span>
                      <span className={getCRIColor(criBreakdown.difficultyScore)}>{criBreakdown.difficultyScore}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Skill Coverage</span>
                      <span className={getCRIColor(criBreakdown.skillCoverage)}>{criBreakdown.skillCoverage}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Project Rigor</span>
                      <span className={getCRIColor(criBreakdown.projectRigor)}>{criBreakdown.projectRigor}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Outcome Conversion</span>
                      <span className={getCRIColor(criBreakdown.outcomeConversion)}>{criBreakdown.outcomeConversion}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Instructor Rating</span>
                      <span className={getCRIColor(criBreakdown.instructorRating)}>{criBreakdown.instructorRating}%</span>
                    </div>
                  </div>

                  {getCRISuggestions().length > 0 && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        <AlertCircle className="h-4 w-4" />
                        Improvement Suggestions
                      </div>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        {getCRISuggestions().map((suggestion, index) => (
                          <li key={index}>• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm">
                  Fill in course details to see CRI preview
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UploadCourse;
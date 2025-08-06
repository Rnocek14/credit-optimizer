import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { 
  User, 
  Target, 
  Brain, 
  Clock, 
  BookOpen, 
  TrendingUp,
  Award,
  CheckCircle,
  Settings,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserExperienceLevel } from '@/hooks/useUserExperienceLevel';

interface EnhancedUserProfileProps {
  userId: string;
  onProfileUpdated?: () => void;
}

interface LearningStyle {
  visual: number;
  auditory: number;
  kinesthetic: number;
  reading: number;
}

interface SkillAssessment {
  id: string;
  skillName: string;
  currentLevel: number;
  targetLevel: number;
  confidence: number;
  lastAssessed: string;
}

interface ProfileData {
  learningStyle: LearningStyle;
  availableHoursPerWeek: number;
  preferredLearningTimes: string[];
  careerGoals: string[];
  skillAssessments: SkillAssessment[];
  motivationalFactors: string[];
  learningPreferences: {
    projectBased: boolean;
    theoretical: boolean;
    practical: boolean;
    collaborative: boolean;
    selfPaced: boolean;
  };
}

export function EnhancedUserProfile({ userId, onProfileUpdated }: EnhancedUserProfileProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  const { experienceLevel, updateExperienceLevel } = useUserExperienceLevel();

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('enhanced_user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile({
          learningStyle: data.learning_style || { visual: 25, auditory: 25, kinesthetic: 25, reading: 25 },
          availableHoursPerWeek: data.available_hours_per_week || 10,
          preferredLearningTimes: data.preferred_learning_times || [],
          careerGoals: data.career_goals || [],
          skillAssessments: data.skill_assessments || [],
          motivationalFactors: data.motivational_factors || [],
          learningPreferences: data.learning_preferences || {
            projectBased: true,
            theoretical: false,
            practical: true,
            collaborative: false,
            selfPaced: true
          }
        });
      } else {
        // Initialize with defaults
        setProfile({
          learningStyle: { visual: 25, auditory: 25, kinesthetic: 25, reading: 25 },
          availableHoursPerWeek: 10,
          preferredLearningTimes: [],
          careerGoals: [],
          skillAssessments: [],
          motivationalFactors: [],
          learningPreferences: {
            projectBased: true,
            theoretical: false,
            practical: true,
            collaborative: false,
            selfPaced: true
          }
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('enhanced_user_profiles')
        .upsert({
          user_id: userId,
          learning_style: profile.learningStyle,
          available_hours_per_week: profile.availableHoursPerWeek,
          preferred_learning_times: profile.preferredLearningTimes,
          career_goals: profile.careerGoals,
          skill_assessments: profile.skillAssessments,
          motivational_factors: profile.motivationalFactors,
          learning_preferences: profile.learningPreferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Profile Saved",
        description: "Your learning profile has been updated successfully",
      });

      onProfileUpdated?.();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateLearningStyle = (style: keyof LearningStyle, value: number) => {
    if (!profile) return;
    
    const total = Object.values(profile.learningStyle).reduce((sum, val) => sum + val, 0) - profile.learningStyle[style];
    const remaining = 100 - total;
    
    if (value <= remaining) {
      setProfile({
        ...profile,
        learningStyle: {
          ...profile.learningStyle,
          [style]: value
        }
      });
    }
  };

  const addSkillAssessment = (skillName: string) => {
    if (!profile || !skillName.trim()) return;

    const newAssessment: SkillAssessment = {
      id: `skill_${Date.now()}`,
      skillName: skillName.trim(),
      currentLevel: 1,
      targetLevel: 3,
      confidence: 50,
      lastAssessed: new Date().toISOString()
    };

    setProfile({
      ...profile,
      skillAssessments: [...profile.skillAssessments, newAssessment]
    });
  };

  const updateSkillAssessment = (id: string, updates: Partial<SkillAssessment>) => {
    if (!profile) return;

    setProfile({
      ...profile,
      skillAssessments: profile.skillAssessments.map(skill => 
        skill.id === id ? { ...skill, ...updates } : skill
      )
    });
  };

  const getProfileCompleteness = () => {
    if (!profile) return 0;
    
    let score = 0;
    if (profile.availableHoursPerWeek > 0) score += 15;
    if (profile.preferredLearningTimes.length > 0) score += 15;
    if (profile.careerGoals.length > 0) score += 20;
    if (profile.skillAssessments.length > 0) score += 20;
    if (profile.motivationalFactors.length > 0) score += 15;
    if (Object.values(profile.learningPreferences).some(Boolean)) score += 15;
    
    return score;
  };

  if (isLoading) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Enhanced Learning Profile
              </CardTitle>
              <CardDescription>
                Personalize your learning experience with detailed preferences
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{getProfileCompleteness()}%</div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>
          <Progress value={getProfileCompleteness()} className="mt-4" />
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="learning">Learning Style</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Weekly Time</span>
                </div>
                <div className="text-2xl font-bold">{profile?.availableHoursPerWeek || 0}h</div>
                <div className="text-xs text-muted-foreground">Available for learning</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Career Goals</span>
                </div>
                <div className="text-2xl font-bold">{profile?.careerGoals.length || 0}</div>
                <div className="text-xs text-muted-foreground">Active goals</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Skills Tracked</span>
                </div>
                <div className="text-2xl font-bold">{profile?.skillAssessments.length || 0}</div>
                <div className="text-xs text-muted-foreground">Skills assessed</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Experience Level</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Badge variant={
                  experienceLevel === 'beginner' ? 'secondary' :
                  experienceLevel === 'intermediate' ? 'default' : 'destructive'
                }>
                  {experienceLevel}
                </Badge>
                <Select value={experienceLevel} onValueChange={updateExperienceLevel}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning Style Assessment</CardTitle>
              <CardDescription>
                Adjust sliders to reflect your preferred learning methods (total must equal 100%)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {profile && Object.entries(profile.learningStyle).map(([style, value]) => (
                <div key={style} className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="capitalize">{style} Learning</Label>
                    <span className="text-sm font-medium">{value}%</span>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={([newValue]) => updateLearningStyle(style as keyof LearningStyle, newValue)}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground">
                    {style === 'visual' && 'Charts, diagrams, videos, and visual aids'}
                    {style === 'auditory' && 'Podcasts, lectures, discussions, and audio content'}
                    {style === 'kinesthetic' && 'Hands-on projects, labs, and interactive exercises'}
                    {style === 'reading' && 'Books, articles, documentation, and written materials'}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning Schedule</CardTitle>
              <CardDescription>
                Define when and how much time you can dedicate to learning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Available Hours per Week</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Slider
                    value={[profile?.availableHoursPerWeek || 10]}
                    onValueChange={([value]) => profile && setProfile({...profile, availableHoursPerWeek: value})}
                    max={40}
                    min={1}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium min-w-[3rem]">
                    {profile?.availableHoursPerWeek || 10}h
                  </span>
                </div>
              </div>

              <div>
                <Label>Preferred Learning Times</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {['Morning', 'Afternoon', 'Evening', 'Weekends', 'Lunch breaks', 'Commute'].map((time) => (
                    <Button
                      key={time}
                      variant={profile?.preferredLearningTimes.includes(time) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        if (!profile) return;
                        const times = profile.preferredLearningTimes.includes(time)
                          ? profile.preferredLearningTimes.filter(t => t !== time)
                          : [...profile.preferredLearningTimes, time];
                        setProfile({...profile, preferredLearningTimes: times});
                      }}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Skill Assessments</CardTitle>
              <CardDescription>
                Track your current skill levels and learning targets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill to assess..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addSkillAssessment(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Button 
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Add a skill to assess..."]') as HTMLInputElement;
                    if (input?.value) {
                      addSkillAssessment(input.value);
                      input.value = '';
                    }
                  }}
                >
                  Add
                </Button>
              </div>

              <div className="space-y-3">
                {profile?.skillAssessments.map((skill) => (
                  <Card key={skill.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{skill.skillName}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!profile) return;
                          setProfile({
                            ...profile,
                            skillAssessments: profile.skillAssessments.filter(s => s.id !== skill.id)
                          });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs">Current Level</Label>
                        <Select
                          value={skill.currentLevel.toString()}
                          onValueChange={(value) => updateSkillAssessment(skill.id, { currentLevel: parseInt(value) })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Beginner</SelectItem>
                            <SelectItem value="2">Basic</SelectItem>
                            <SelectItem value="3">Intermediate</SelectItem>
                            <SelectItem value="4">Advanced</SelectItem>
                            <SelectItem value="5">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Target Level</Label>
                        <Select
                          value={skill.targetLevel.toString()}
                          onValueChange={(value) => updateSkillAssessment(skill.id, { targetLevel: parseInt(value) })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Beginner</SelectItem>
                            <SelectItem value="2">Basic</SelectItem>
                            <SelectItem value="3">Intermediate</SelectItem>
                            <SelectItem value="4">Advanced</SelectItem>
                            <SelectItem value="5">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Confidence</Label>
                        <div className="text-center text-sm">{skill.confidence}%</div>
                        <Slider
                          value={[skill.confidence]}
                          onValueChange={([value]) => updateSkillAssessment(skill.id, { confidence: value })}
                          max={100}
                          step={10}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning Preferences</CardTitle>
              <CardDescription>
                Configure how you prefer to learn and be motivated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium">Learning Methods</Label>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {profile && Object.entries(profile.learningPreferences).map(([key, value]) => (
                    <Button
                      key={key}
                      variant={value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setProfile({
                        ...profile,
                        learningPreferences: {
                          ...profile.learningPreferences,
                          [key]: !value
                        }
                      })}
                      className="justify-start"
                    >
                      {value && <CheckCircle className="w-4 h-4 mr-2" />}
                      {key === 'projectBased' && 'Project-Based'}
                      {key === 'theoretical' && 'Theoretical'}
                      {key === 'practical' && 'Practical'}
                      {key === 'collaborative' && 'Collaborative'}
                      {key === 'selfPaced' && 'Self-Paced'}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">Career Goals</Label>
                <Textarea
                  placeholder="Enter your career goals, one per line..."
                  value={profile?.careerGoals.join('\n') || ''}
                  onChange={(e) => {
                    if (!profile) return;
                    setProfile({
                      ...profile,
                      careerGoals: e.target.value.split('\n').filter(goal => goal.trim())
                    });
                  }}
                  className="mt-2"
                  rows={4}
                />
              </div>

              <div>
                <Label className="text-base font-medium">Motivational Factors</Label>
                <Textarea
                  placeholder="What motivates you to learn? (e.g., career advancement, personal growth, salary increase)"
                  value={profile?.motivationalFactors.join('\n') || ''}
                  onChange={(e) => {
                    if (!profile) return;
                    setProfile({
                      ...profile,
                      motivationalFactors: e.target.value.split('\n').filter(factor => factor.trim())
                    });
                  }}
                  className="mt-2"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={loadProfile}>
          Reset Changes
        </Button>
        <Button onClick={saveProfile} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
}
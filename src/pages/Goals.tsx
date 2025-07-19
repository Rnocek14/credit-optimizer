import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Target, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Circle,
  Edit,
  Trash2,
  BookOpen,
  TrendingUp,
  Clock
} from "lucide-react";

interface CareerGoal {
  id: string;
  title: string;
  description: string;
  target_role: string;
  target_date: string;
  created_at: string;
  progress: GoalProgress[];
}

interface GoalProgress {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completed_at: string;
  course_id: string;
  order_index: number;
  course?: {
    title: string;
    platform: string;
  };
}

interface SavedCourse {
  id: string;
  title: string;
  platform: string;
}

export default function Goals() {
  const [goals, setGoals] = useState<CareerGoal[]>([]);
  const [savedCourses, setSavedCourses] = useState<SavedCourse[]>([]);
  const [roadmapSteps, setRoadmapSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [showNewStepForm, setShowNewStepForm] = useState<string | null>(null);
  const { toast } = useToast();

  // New goal form state
  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    target_role: "",
    target_date: ""
  });

  // New step form state
  const [newStep, setNewStep] = useState({
    title: "",
    description: "",
    course_id: ""
  });

  useEffect(() => {
    fetchGoals();
    fetchSavedCourses();
    fetchRoadmapSteps();
  }, []);

  const fetchGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: goalsData, error: goalsError } = await supabase
        .from('career_goals')
        .select(`
          id,
          title,
          description,
          target_role,
          target_date,
          created_at
        `)
        .eq('user_id', user.id)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      // Get progress for each goal
      const goalsWithProgress = await Promise.all(
        (goalsData || []).map(async (goal) => {
          const { data: progressData } = await supabase
            .from('goal_progress')
            .select(`
              id,
              title,
              description,
              completed,
              completed_at,
              course_id,
              order_index,
              course:recommended_courses (
                title,
                platform
              )
            `)
            .eq('goal_id', goal.id)
            .order('order_index', { ascending: true });

          return {
            ...goal,
            progress: progressData || []
          };
        })
      );

      setGoals(goalsWithProgress);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast({
        title: "Error",
        description: "Failed to load goals.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: savedData } = await supabase
        .from('saved_courses')
        .select(`
          course:recommended_courses (
            id,
            title,
            platform
          )
        `)
        .eq('user_id', user.id);

      const courses = (savedData || [])
        .map(item => item.course)
        .filter(Boolean);

      setSavedCourses(courses);
    } catch (error) {
      console.error('Error fetching saved courses:', error);
    }
  };

  const fetchRoadmapSteps = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: stepsData } = await supabase
        .from('roadmap_steps')
        .select('id, title, description')
        .eq('user_id', user.id)
        .eq('completed', false)
        .limit(10);

      setRoadmapSteps(stepsData || []);
    } catch (error) {
      console.error('Error fetching roadmap steps:', error);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('career_goals')
        .insert({
          user_id: user.id,
          title: newGoal.title,
          description: newGoal.description,
          target_role: newGoal.target_role,
          target_date: newGoal.target_date || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Goal created successfully!",
      });

      setNewGoal({
        title: "",
        description: "",
        target_role: "",
        target_date: ""
      });
      setShowNewGoalForm(false);
      fetchGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: "Error",
        description: "Failed to create goal.",
        variant: "destructive",
      });
    }
  };

  const handleAddStep = async (goalId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current max order index
      const { data: existingSteps } = await supabase
        .from('goal_progress')
        .select('order_index')
        .eq('goal_id', goalId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextIndex = (existingSteps?.[0]?.order_index || 0) + 1;

      const { error } = await supabase
        .from('goal_progress')
        .insert({
          goal_id: goalId,
          title: newStep.title,
          description: newStep.description,
          course_id: newStep.course_id || null,
          order_index: nextIndex
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Step added successfully!",
      });

      setNewStep({
        title: "",
        description: "",
        course_id: ""
      });
      setShowNewStepForm(null);
      fetchGoals();
    } catch (error) {
      console.error('Error adding step:', error);
      toast({
        title: "Error",
        description: "Failed to add step.",
        variant: "destructive",
      });
    }
  };

  const handleToggleStep = async (stepId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('goal_progress')
        .update({
          completed: !completed,
          completed_at: !completed ? new Date().toISOString() : null
        })
        .eq('id', stepId);

      if (error) throw error;

      fetchGoals();
    } catch (error) {
      console.error('Error updating step:', error);
      toast({
        title: "Error",
        description: "Failed to update step.",
        variant: "destructive",
      });
    }
  };

  const calculateProgress = (steps: GoalProgress[]) => {
    if (steps.length === 0) return 0;
    const completed = steps.filter(step => step.completed).length;
    return Math.round((completed / steps.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading your goals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Target className="h-8 w-8 text-primary mr-3" />
            <span className="text-lg font-semibold text-primary tracking-wide">CAREER GOALS</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Your Career Journey
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Set clear goals, track your progress, and achieve your career aspirations step by step.
          </p>
        </div>

        {/* New Goal Button */}
        <div className="flex justify-center mb-8">
          <Button 
            onClick={() => setShowNewGoalForm(true)}
            size="lg"
            className="group"
          >
            <Plus className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
            Create New Goal
          </Button>
        </div>

        {/* New Goal Form */}
        {showNewGoalForm && (
          <Card className="mb-8 border-2 border-primary/20">
            <CardHeader>
              <CardTitle>Create New Career Goal</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div>
                  <Label htmlFor="title">Goal Title *</Label>
                  <Input
                    id="title"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                    placeholder="e.g., Become a Senior Frontend Developer"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                    placeholder="Describe what you want to achieve..."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="target_role">Target Role</Label>
                    <Input
                      id="target_role"
                      value={newGoal.target_role}
                      onChange={(e) => setNewGoal({...newGoal, target_role: e.target.value})}
                      placeholder="Senior Developer, Product Manager, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="target_date">Target Date</Label>
                    <Input
                      id="target_date"
                      type="date"
                      value={newGoal.target_date}
                      onChange={(e) => setNewGoal({...newGoal, target_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit">Create Goal</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowNewGoalForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Goals Grid */}
        {goals.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Target className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-4">No career goals yet</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Start your journey by setting your first career goal and breaking it down into actionable steps.
            </p>
            <Button 
              onClick={() => setShowNewGoalForm(true)}
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Goal
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {goals.map((goal) => {
              const progress = calculateProgress(goal.progress);
              const isOverdue = goal.target_date && new Date(goal.target_date) < new Date();
              
              return (
                <Card key={goal.id} className="hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{goal.title}</CardTitle>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {goal.target_role && (
                            <Badge variant="outline">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {goal.target_role}
                            </Badge>
                          )}
                          {goal.target_date && (
                            <Badge variant={isOverdue ? "destructive" : "secondary"}>
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(goal.target_date).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm text-muted-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {goal.progress.filter(s => s.completed).length} of {goal.progress.length} steps completed
                      </p>
                    </div>

                    {/* Progress Steps */}
                    <div className="space-y-3 mb-4">
                      {goal.progress.map((step) => (
                        <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg border">
                          <Checkbox
                            checked={step.completed}
                            onCheckedChange={() => handleToggleStep(step.id, step.completed)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium ${step.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {step.title}
                            </h4>
                            {step.description && (
                              <p className={`text-sm ${step.completed ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                                {step.description}
                              </p>
                            )}
                            {step.course && (
                              <div className="flex items-center gap-2 mt-2">
                                <BookOpen className="h-3 w-3 text-primary" />
                                <span className="text-xs text-primary font-medium">
                                  {step.course.title} - {step.course.platform}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Step Form */}
                    {showNewStepForm === goal.id ? (
                      <div className="border-t pt-4 space-y-3">
                        <div>
                          <Input
                            placeholder="Step title"
                            value={newStep.title}
                            onChange={(e) => setNewStep({...newStep, title: e.target.value})}
                          />
                        </div>
                        <div>
                          <Textarea
                            placeholder="Step description (optional)"
                            value={newStep.description}
                            onChange={(e) => setNewStep({...newStep, description: e.target.value})}
                            className="h-20"
                          />
                        </div>
                        <div>
                          <Select value={newStep.course_id} onValueChange={(value) => setNewStep({...newStep, course_id: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Link to course (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No course</SelectItem>
                              {savedCourses.map((course) => (
                                <SelectItem key={course.id} value={course.id}>
                                  {course.title} - {course.platform}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleAddStep(goal.id)}
                            disabled={!newStep.title}
                          >
                            Add Step
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setShowNewStepForm(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowNewStepForm(goal.id)}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Step
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
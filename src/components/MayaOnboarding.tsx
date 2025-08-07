import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, CheckCircle, Target, Brain, Zap } from "lucide-react";
import { useUserJourney } from "@/contexts/UserJourneyContext";
import { useModelRouter } from "@/hooks/useModelRouter";
import { useToast } from "@/hooks/use-toast";

interface MayaOnboardingProps {
  onComplete: () => void;
}

export function MayaOnboarding({ onComplete }: MayaOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [userResponses, setUserResponses] = useState<Record<string, any>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { state, actions } = useUserJourney();
  const { callRouter } = useModelRouter();
  const { toast } = useToast();

  const steps = [
    {
      id: 'intro',
      title: 'Meet Maya, Your AI Career Guide',
      component: IntroStep,
    },
    {
      id: 'role-discovery',
      title: 'Tell Me About Yourself',
      component: RoleDiscoveryStep,
    },
    {
      id: 'goals-setting',
      title: 'What Are Your Goals?',
      component: GoalsSettingStep,
    },
    {
      id: 'quick-analysis',
      title: 'Quick Skills Analysis',
      component: QuickAnalysisStep,
    },
    {
      id: 'personalization',
      title: 'Personalizing Your Experience',
      component: PersonalizationStep,
    }
  ];

  const handleStepComplete = async (stepData: any) => {
    setUserResponses(prev => ({ ...prev, [steps[currentStep].id]: stepData }));
    
    // Track completion of critical steps
    const stepId = steps[currentStep].id;
    console.log(`📝 Completing onboarding step: ${stepId}`, stepData);
    
    // Track specific milestones
    if (stepId === 'role-discovery') {
      await actions.completeStep('profile-setup');
      await actions.trackMilestone('profileComplete', stepData);
    } else if (stepId === 'quick-analysis') {
      await actions.completeStep('first-assessment');
      await actions.trackMilestone('firstAssessment', stepData);
    } else if (stepId === 'goals-setting') {
      await actions.completeStep('first-plan');
      await actions.trackMilestone('firstPlan', stepData);
      
      // Add goals to user journey
      if (stepData.goals && Array.isArray(stepData.goals)) {
        for (const goal of stepData.goals) {
          await actions.addGoal(goal);
        }
      }
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    setIsAnalyzing(true);
    console.log('🎯 Completing Maya onboarding with responses:', userResponses);
    
    // Debug authentication state
    console.log('🔐 Auth state check:', {
      hasUser: !!state.user,
      userId: state.user?.id,
      isAuthenticated: state.isAuthenticated
    });
    
    try {
      // Call the AI router to generate personalized career strategy
      console.log('🧠 Calling AI Router for onboarding analysis...');
      
      const analysisPrompt = `
        Based on the user's onboarding responses, create a personalized career strategy:
        
        Role: ${userResponses['role-discovery']?.role}
        Goals: ${userResponses['goals-setting']?.goals?.join(', ')}
        Skills: ${userResponses['quick-analysis']?.skills?.join(', ')}
        Experience Level: ${userResponses['role-discovery']?.experience}
        
        Provide:
        1. Recommended starting phase (discovery/assessment/planning/execution/optimization)
        2. Top 3 immediate action items
        3. Suggested Maya personality (friendly/professional/encouraging)
        4. Feature recommendations based on their goals
        
        Return as JSON with keys: recommendedPhase, actionItems, personality, features
      `;

      const analysis = await callRouter({
        task: 'json',
        messages: [
          {
            role: 'system',
            content: 'You are Maya, an expert career strategist. Generate a personalized career strategy based on the user\'s onboarding responses. Return a JSON object with career recommendations, next steps, and personalized insights.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        json_schema: {
          type: 'object',
          properties: {
            recommendedPhase: { type: 'string' },
            actionItems: { type: 'array', items: { type: 'string' } },
            personality: { type: 'string' },
            features: { type: 'array', items: { type: 'string' } }
          },
          additionalProperties: false
        }
      });

      console.log('📥 AI onboarding analysis response:', analysis);

      // Update user journey based on Maya's analysis
      if (userResponses['role-discovery']?.role) {
        actions.setUserRole(userResponses['role-discovery'].role);
      }

      if (analysis) {
        try {
          // Handle both parsed objects and string responses
          const strategyData = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
          
          // Update user journey with AI-generated insights
          await actions.updateMayaContext(strategyData);
          
          // Set the recommended phase
          if (strategyData.recommendedPhase) {
            await actions.setCurrentPhase(strategyData.recommendedPhase);
          }
          
          console.log('✅ Applied AI strategy recommendations:', strategyData);
        } catch (parseError) {
          console.warn('⚠️ Failed to parse AI response, using fallback phase');
          await actions.setCurrentPhase('assessment');
        }
      } else {
        console.warn('⚠️ No AI analysis response, using fallback');
        await actions.setCurrentPhase('assessment');
      }

      // Complete onboarding AFTER all steps are tracked
      actions.updatePreference('onboardingComplete', true);
      actions.updatePreference('mayaIntroComplete', true);
      await actions.completeStep('maya-onboarding');

      toast({
        title: "Welcome to your personalized career journey!",
        description: "Maya has created a custom plan just for you.",
      });

      onComplete();
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      
      // Fallback to default phase progression
      await actions.setCurrentPhase('assessment');
      await actions.completeStep('maya-onboarding');
      
      toast({
        title: "Welcome to your career journey!",
        description: "I've set up your profile. Let's continue building your path!",
      });
      
      onComplete();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(((currentStep + 1) / steps.length) * 100)}% complete
            </span>
          </div>
          <div className="w-full bg-secondary/20 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <Card className="border-primary/20 shadow-xl">
          <CardContent className="p-8">
            <CurrentStepComponent 
              onNext={handleStepComplete}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Step Components
function IntroStep({ onNext }: { onNext: (data: any) => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
        <Sparkles className="h-10 w-10 text-white" />
      </div>
      
      <div className="space-y-3">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Hi! I'm Maya 👋
        </h1>
        <p className="text-lg text-muted-foreground">
          Your AI-powered career companion
        </p>
      </div>
      
      <div className="space-y-4 text-left">
        <div className="flex items-start gap-3">
          <Brain className="h-5 w-5 text-primary mt-1" />
          <div>
            <h3 className="font-semibold">Personalized Guidance</h3>
            <p className="text-sm text-muted-foreground">
              I'll analyze your skills, goals, and market trends to create a custom career roadmap
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <Target className="h-5 w-5 text-primary mt-1" />
          <div>
            <h3 className="font-semibold">Smart Recommendations</h3>
            <p className="text-sm text-muted-foreground">
              Get AI-powered course suggestions, skill assessments, and career insights
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-primary mt-1" />
          <div>
            <h3 className="font-semibold">Continuous Learning</h3>
            <p className="text-sm text-muted-foreground">
              I adapt to your progress and keep you on track toward your goals
            </p>
          </div>
        </div>
      </div>
      
      <Button 
        onClick={() => onNext({})} 
        className="w-full bg-gradient-to-r from-primary to-primary/80"
        size="lg"
      >
        Let's Get Started
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function RoleDiscoveryStep({ onNext }: { onNext: (data: any) => void }) {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [experience, setExperience] = useState<string>('');

  const roles = [
    { id: 'learner', label: 'Student/Learner', description: 'Building foundational skills' },
    { id: 'professional', label: 'Working Professional', description: 'Advancing current career' },
    { id: 'career_changer', label: 'Career Changer', description: 'Transitioning to new field' },
    { id: 'employer', label: 'Employer/Recruiter', description: 'Finding and developing talent' },
  ];

  const experienceLevels = [
    { id: 'beginner', label: 'Beginner', description: 'Just starting out' },
    { id: 'intermediate', label: 'Intermediate', description: 'Some experience' },
    { id: 'advanced', label: 'Advanced', description: 'Highly experienced' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Tell me about yourself</h2>
        <p className="text-muted-foreground">
          This helps me understand how to best support your journey
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-3">What describes you best?</h3>
          <div className="grid gap-3">
            {roles.map((role) => (
              <Card 
                key={role.id} 
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  selectedRole === role.id ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedRole(role.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{role.label}</h4>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                    {selectedRole === role.id && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Experience level?</h3>
          <div className="grid grid-cols-3 gap-3">
            {experienceLevels.map((level) => (
              <Card 
                key={level.id} 
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  experience === level.id ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setExperience(level.id)}
              >
                <CardContent className="p-3 text-center">
                  <h4 className="font-medium">{level.label}</h4>
                  <p className="text-xs text-muted-foreground">{level.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Button 
        onClick={() => onNext({ role: selectedRole, experience })} 
        disabled={!selectedRole || !experience}
        className="w-full"
        size="lg"
      >
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function GoalsSettingStep({ onNext }: { onNext: (data: any) => void }) {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const goalOptions = [
    'Learn new skills',
    'Advance in current role',
    'Change careers',
    'Increase salary',
    'Build a portfolio',
    'Get certified',
    'Network professionally',
    'Start a business',
    'Find a mentor',
    'Improve work-life balance',
  ];

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">What are your goals?</h2>
        <p className="text-muted-foreground">
          Select all that apply - I'll help you achieve them
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {goalOptions.map((goal) => (
          <Badge
            key={goal}
            variant={selectedGoals.includes(goal) ? "default" : "outline"}
            className="cursor-pointer p-3 text-center justify-center hover:bg-primary/10 transition-colors"
            onClick={() => toggleGoal(goal)}
          >
            {goal}
          </Badge>
        ))}
      </div>

      <Button 
        onClick={() => onNext({ goals: selectedGoals })} 
        disabled={selectedGoals.length === 0}
        className="w-full"
        size="lg"
      >
        Continue ({selectedGoals.length} selected)
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function QuickAnalysisStep({ onNext }: { onNext: (data: any) => void }) {
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');

  const skillSuggestions = [
    'JavaScript', 'Python', 'React', 'Leadership', 'Project Management',
    'Data Analysis', 'Marketing', 'Design', 'Sales', 'Communication',
    'Teaching', 'Writing', 'Finance', 'Operations', 'Strategy'
  ];

  const addSkill = (skill: string) => {
    if (!skills.includes(skill)) {
      setSkills(prev => [...prev, skill]);
    }
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !skills.includes(customSkill.trim())) {
      setSkills(prev => [...prev, customSkill.trim()]);
      setCustomSkill('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">What skills do you have?</h2>
        <p className="text-muted-foreground">
          Help me understand your current capabilities
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-3">Select from common skills:</h3>
          <div className="flex flex-wrap gap-2">
            {skillSuggestions.map((skill) => (
              <Badge
                key={skill}
                variant={skills.includes(skill) ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => addSkill(skill)}
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Add custom skill:</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              placeholder="Type a skill..."
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
            />
            <Button onClick={addCustomSkill} variant="outline">
              Add
            </Button>
          </div>
        </div>

        {skills.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Your skills ({skills.length}):</h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                  <button
                    onClick={() => setSkills(prev => prev.filter(s => s !== skill))}
                    className="ml-2 text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button 
        onClick={() => onNext({ skills })} 
        disabled={skills.length === 0}
        className="w-full"
        size="lg"
      >
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function PersonalizationStep({ onNext }: { onNext: (data: any) => void }) {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  useEffect(() => {
    if (!isAnalyzing) return;
    
    // Simulate analysis time
    const timer = setTimeout(() => {
      onNext({});
    }, 3000);

    return () => clearTimeout(timer);
  }, [isAnalyzing, onNext]);

  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
        <Brain className="h-10 w-10 text-white animate-pulse" />
      </div>
      
      <div className="space-y-3">
        <h2 className="text-2xl font-bold">Maya is analyzing your profile...</h2>
        <p className="text-muted-foreground">
          Creating your personalized career strategy
        </p>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span>Analyzing your skills and goals</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-300" />
          <span>Researching market opportunities</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-500" />
          <span>Crafting your learning path</span>
        </div>
      </div>
    </div>
  );
}
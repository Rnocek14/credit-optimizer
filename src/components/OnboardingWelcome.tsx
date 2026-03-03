import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, BookOpen, TrendingUp, Brain, Users, GraduationCap, 
  ArrowRight, CheckCircle, Star, Zap 
} from "lucide-react";
import { ExperienceLevel } from "@/hooks/useUserExperienceLevel";

interface OnboardingWelcomeProps {
  onExperienceLevelSelect: (level: ExperienceLevel) => void;
  onComplete: () => void;
}

const experienceLevels = [
  {
    level: 'beginner' as ExperienceLevel,
    title: "I'm New to Career Planning",
    description: "Just starting my career journey and need guidance",
    features: [
      "Simple goal setting",
      "Guided exploration",
      "Basic skill tracking",
      "Essential career insights"
    ],
    icon: GraduationCap,
    color: "from-green-500 to-emerald-500",
    badge: "Recommended for students"
  },
  {
    level: 'intermediate' as ExperienceLevel,
    title: "I Have Some Experience",
    description: "Looking to advance my career or change directions",
    features: [
      "Advanced skill trees",
      "Course recommendations",
      "Learning workflows",
      "AI-powered roadmaps",
      "Career pivot analysis"
    ],
    icon: Target,
    color: "from-blue-500 to-cyan-500",
    badge: "Most popular"
  },
  {
    level: 'advanced' as ExperienceLevel,
    title: "I'm an Experienced Professional",
    description: "Seeking advanced analytics and strategic insights",
    features: [
      "Market intelligence",
      "Salary analysis",
      "Career readiness metrics",
      "Maya AI automation",
      "Advanced analytics",
      "Team features"
    ],
    icon: TrendingUp,
    color: "from-purple-500 to-violet-500",
    badge: "Full feature access"
  }
];

export default function OnboardingWelcome({ onExperienceLevelSelect, onComplete }: OnboardingWelcomeProps) {
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const handleLevelSelect = (level: ExperienceLevel) => {
    setSelectedLevel(level);
    onExperienceLevelSelect(level);
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mx-auto">
          <Star className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold">Welcome to Pivot!</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Let's personalize your experience to help you achieve your career goals more effectively.
        </p>
      </div>

      <div className="grid gap-4 max-w-2xl mx-auto">
        {experienceLevels.map((level) => {
          const Icon = level.icon;
          const isSelected = selectedLevel === level.level;
          
          return (
            <Card 
              key={level.level}
              className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
              }`}
              onClick={() => handleLevelSelect(level.level)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${level.color} rounded-lg flex items-center justify-center`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{level.title}</CardTitle>
                      <CardDescription>{level.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {level.badge}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {level.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto">
          <Zap className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold">What You Can Expect</h2>
        <p className="text-muted-foreground">
          Here's how Pivot will help accelerate your career growth:
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Brain className="h-6 w-6 text-blue-500" />
              <CardTitle className="text-lg">AI-Powered Insights</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Get personalized recommendations based on market trends, your skills, and career goals.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Target className="h-6 w-6 text-green-500" />
              <CardTitle className="text-lg">Smart Goal Setting</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set SMART goals with AI assistance and track your progress with detailed analytics.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <BookOpen className="h-6 w-6 text-purple-500" />
              <CardTitle className="text-lg">Learning Pathways</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Discover curated courses and skills that align with your career objectives.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-6 w-6 text-orange-500" />
              <CardTitle className="text-lg">Market Intelligence</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Stay ahead with real-time market insights and salary data for your field.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 max-w-lg mx-auto text-center">
      <div className="space-y-4">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold">You're All Set!</h2>
        <p className="text-muted-foreground">
          Your experience has been customized for the <strong>{selectedLevel}</strong> level. 
          You can always adjust this later in your settings.
        </p>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h3 className="font-semibold">Next Steps:</h3>
            <div className="space-y-2 text-sm text-left">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Set your first career goal</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Explore recommended courses</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Try the AI career planner</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Review your skill progress</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round((currentStep / totalSteps) * 100)}% Complete
            </span>
          </div>
          <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
        </div>

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        {/* Navigation */}
        <div className="flex justify-center mt-8">
          <Button 
            onClick={handleNext}
            disabled={currentStep === 1 && !selectedLevel}
            size="lg"
            className="min-w-32"
          >
            {currentStep === totalSteps ? 'Get Started' : 'Continue'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
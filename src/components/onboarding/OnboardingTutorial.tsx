import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Target, 
  TrendingUp, 
  Map,
  Star,
  Brain,
  CheckCircle2
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetElement?: string;
  position: 'center' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Pivot! 🚀',
    description: 'Your AI-powered degree planning platform. Let\'s take a quick tour to get you started.',
    icon: <Target className="h-5 w-5" />,
    position: 'center'
  },
  {
    id: 'dashboard',
    title: 'Your Career Dashboard',
    description: 'This is your central hub. Here you\'ll see Maya insights, track progress, and get personalized recommendations.',
    icon: <TrendingUp className="h-5 w-5" />,
    position: 'center'
  },
  {
    id: 'cri-score', 
    title: 'Understanding CRI Scores',
    description: 'CRI (Curriculum Rigor Index) rates content quality 0-100. Higher scores mean more effective learning paths.',
    icon: <Star className="h-5 w-5" />,
    position: 'top-right'
  },
  {
    id: 'maya-insights',
    title: 'Meet Maya, Your AI Career Guide',
    description: 'Maya analyzes market trends and provides personalized career insights based on your goals and progress.',
    icon: <Brain className="h-5 w-5" />,
    position: 'bottom-left'
  },
  {
    id: 'navigation',
    title: 'Navigate Between Hubs',
    description: 'Use Explore → Plan → Progress → Contribute to guide your career journey from discovery to contribution.',
    icon: <Map className="h-5 w-5" />,
    position: 'bottom-right'
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🎉',
    description: 'Start by exploring career paths or creating your first track. Maya will guide you along the way.',
    icon: <CheckCircle2 className="h-5 w-5" />,
    position: 'center'
  }
];

interface OnboardingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    setIsVisible(false);
    onSkip();
  };

  const getPositionClasses = (position: OnboardingStep['position']) => {
    switch (position) {
      case 'top-right':
        return 'fixed top-4 right-4 z-50 w-80';
      case 'bottom-left':
        return 'fixed bottom-4 left-4 z-50 w-80';
      case 'bottom-right':
        return 'fixed bottom-4 right-4 z-50 w-80';
      case 'center':
      default:
        return 'fixed inset-0 z-50 flex items-center justify-center p-4';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Backdrop overlay for center positioned steps */}
      {step.position === 'center' && (
        <div className="fixed inset-0 bg-black/50 z-40" />
      )}
      
      <div className={getPositionClasses(step.position)}>
        <Card className="border-2 border-primary shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {step.icon}
                <CardTitle className="text-lg">{step.title}</CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSkip}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Step indicator */}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                Step {currentStep + 1} of {ONBOARDING_STEPS.length}
              </Badge>
              <div className="flex gap-1">
                {ONBOARDING_STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 w-6 rounded-full transition-colors ${
                      index <= currentStep 
                        ? 'bg-primary' 
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              {step.description}
            </p>
            
            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={isFirstStep}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex gap-2">
                {!isLastStep && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleSkip}
                  >
                    Skip Tour
                  </Button>
                )}
                
                <Button
                  onClick={handleNext}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {isLastStep ? 'Get Started' : 'Next'}
                  {!isLastStep && <ArrowRight className="h-4 w-4" />}
                  {isLastStep && <CheckCircle2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

// Hook to manage onboarding state
export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('lifepath-onboarding-completed');
    
    if (!hasCompletedOnboarding) {
      // Small delay to let the page load first
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('lifepath-onboarding-completed', 'true');
    setShowOnboarding(false);
  };

  const skipOnboarding = () => {
    localStorage.setItem('lifepath-onboarding-completed', 'true');
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('lifepath-onboarding-completed');
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding
  };
};
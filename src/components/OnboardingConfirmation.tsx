import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, ArrowRight, Sparkles } from "lucide-react";

interface OnboardingConfirmationProps {
  onContinue: () => void;
}

export default function OnboardingConfirmation({ onContinue }: OnboardingConfirmationProps) {
  const [isGenerating, setIsGenerating] = useState(true);
  const navigate = useNavigate();

  // Simulate roadmap generation time
  useState(() => {
    const timer = setTimeout(() => {
      setIsGenerating(false);
    }, 3000);
    return () => clearTimeout(timer);
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            {isGenerating ? (
              <>
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Creating Your Roadmap</h2>
                  <p className="text-muted-foreground">
                    Our AI is analyzing your profile and generating personalized career recommendations...
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Analyzing your skills and goals</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Generating learning paths</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Creating timeline recommendations</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Roadmap Ready!</h2>
                  <p className="text-muted-foreground">
                    Your personalized career roadmap has been generated. You're ready to start your journey!
                  </p>
                </div>
                <Button 
                  onClick={() => navigate("/dashboard")} 
                  className="w-full" 
                  size="lg"
                  variant="gradient"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
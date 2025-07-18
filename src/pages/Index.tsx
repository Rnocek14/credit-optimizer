import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Target, BookOpen, Users } from "lucide-react";
import { RoadmapTester } from '@/components/RoadmapTester';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center p-8 min-h-[60vh]">
        <div className="text-center space-y-6 max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground">
            AI-Powered Career Roadmaps
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get personalized career guidance powered by AI. Create your profile and receive a custom roadmap to achieve your professional goals.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/onboarding">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/dashboard">
                View Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
                <Users className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Create Your Profile</h3>
              <p className="text-muted-foreground">
                Tell us about your background, skills, and career goals through our comprehensive onboarding form.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
                <Target className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Get AI Recommendations</h3>
              <p className="text-muted-foreground">
                Our AI analyzes your profile and generates personalized career tracks and learning paths.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
                <BookOpen className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Follow Your Roadmap</h3>
              <p className="text-muted-foreground">
                Track your progress through structured learning steps designed specifically for your goals.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Developer Testing Section */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Developer Testing</h2>
            <RoadmapTester />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

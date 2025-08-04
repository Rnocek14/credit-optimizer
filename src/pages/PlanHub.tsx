import { Link } from "react-router-dom";
import { Target, Map, Brain, Calculator, Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HubNavigation } from "@/components/HubNavigation";

const planFeatures = [
  {
    title: "AI Roadmap Generator",
    description: "Get personalized career roadmaps powered by AI",
    href: "/planner",
    icon: Map,
    color: "bg-blue-500/10 text-blue-600"
  },
  {
    title: "Goal Setting & Tracking",
    description: "Set SMART goals and track your progress",
    href: "/goals",
    icon: Target,
    color: "bg-green-500/10 text-green-600"
  },
  {
    title: "Maya Planning Assistant",
    description: "AI-powered planning and recommendations",
    href: "/maya-roadmap",
    icon: Brain,
    color: "bg-purple-500/10 text-purple-600"
  },
  {
    title: "Career ROI Calculator",
    description: "Calculate return on investment for career moves",
    href: "/salary-insights",
    icon: Calculator,
    color: "bg-orange-500/10 text-orange-600"
  }
];

export default function PlanHub() {
  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      
      <div className="container mx-auto px-4 py-8 mb-20 md:mb-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Plan Your Career Journey
            </h1>
            <p className="text-lg text-muted-foreground">
              Create strategic plans, set goals, and get AI-powered recommendations for your career growth
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {planFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.href} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${feature.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                        <CardDescription>{feature.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <Link to={feature.href}>
                        Start Planning
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
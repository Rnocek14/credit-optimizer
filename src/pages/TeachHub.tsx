import { Link } from "react-router-dom";
import { Brain, Search, TrendingUp, Award, Route, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HubNavigation } from "@/components/HubNavigation";

const curationFeatures = [
  { id: "discovery", title: "Course Discovery", description: "AI-powered course discovery and analysis", icon: Search, href: "/teach/discovery", color: "text-blue-600" },
  { id: "curation", title: "Course Curation", description: "Validate and curate courses with AI insights", icon: Brain, href: "/teach/curation", color: "text-green-600" },
  { id: "paths", title: "Learning Paths", description: "Create Maya-verified learning paths", icon: Route, href: "/teach/paths", color: "text-purple-600" },
  { id: "validation", title: "Course Validation", description: "Review AI-recommended courses for quality", icon: Shield, href: "/teach/validation", color: "text-orange-600" },
  { id: "analytics", title: "Curation Analytics", description: "Track curation impact and outcomes", icon: TrendingUp, href: "/teach/analytics", color: "text-indigo-600" },
  { id: "marketplace", title: "Course Marketplace", description: "Manage curated course marketplace", icon: Award, href: "/teach/marketplace", color: "text-pink-600" },
];

export default function TeachHub() {
  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Intelligent Curation Hub</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered course curation and learning path optimization with Maya intelligence
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {curationFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Icon className={`h-8 w-8 ${feature.color}`} />
                    <div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={feature.href}>
                      {feature.id === "discovery" || feature.id === "curation" ? "Open" : "Coming Soon"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
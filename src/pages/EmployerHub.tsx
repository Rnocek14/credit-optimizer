import { Link } from "react-router-dom";
import { Briefcase, Users, Target, TrendingUp, Search, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// HubNavigation now provided by AppShell at route level

const employerFeatures = [
  { id: "talent", title: "Talent Pipeline", description: "Browse and recruit top candidates", icon: Search, href: "/employer/talent", color: "text-blue-600" },
  { id: "workforce", title: "Workforce Analytics", description: "Track employee skills and development", icon: TrendingUp, href: "/employer/workforce", color: "text-green-600" },
  { id: "hiring", title: "Hiring Dashboard", description: "Manage recruitment and onboarding", icon: Users, href: "/employer/hiring", color: "text-purple-600" },
  { id: "skills", title: "Skills Assessment", description: "Evaluate candidate and employee skills", icon: Target, href: "/employer/skills", color: "text-orange-600" },
  { id: "partnerships", title: "Training Partnerships", description: "Partner with educational institutions", icon: Building, href: "/employer/partnerships", color: "text-indigo-600" },
  { id: "jobs", title: "Job Postings", description: "Create and manage job openings", icon: Briefcase, href: "/employer/jobs", color: "text-pink-600" },
];

export default function EmployerHub() {
  return (
    <div className="min-h-screen bg-background">
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Employer Hub</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect with talent and build your workforce of the future
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employerFeatures.map((feature) => {
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
                      Coming Soon
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
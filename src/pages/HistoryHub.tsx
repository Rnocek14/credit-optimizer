import { Link } from "react-router-dom";
import { BookOpen, GitBranch, FileText, Award, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HubNavigation } from "@/components/HubNavigation";

const historyFeatures = [
  {
    title: "Skill Tree Visualization",
    description: "Visualize your learning journey and skill connections",
    href: "/skill-tree",
    icon: GitBranch,
    color: "bg-blue-500/10 text-blue-600"
  },
  {
    title: "Transcript Management",
    description: "Manage your learning transcripts and records",
    href: "/transcripts",
    icon: FileText,
    color: "bg-green-500/10 text-green-600"
  },
  {
    title: "Resume Builder & Analytics",
    description: "Build and analyze your resume performance",
    href: "/resume-analytics",
    icon: BookOpen,
    color: "bg-purple-500/10 text-purple-600"
  },
  {
    title: "Certificate Gallery",
    description: "Showcase your certificates and achievements",
    href: "/certificates",
    icon: Award,
    color: "bg-orange-500/10 text-orange-600"
  },
  {
    title: "Badge Collection",
    description: "View and share your earned badges",
    href: "/badges",
    icon: Trophy,
    color: "bg-red-500/10 text-red-600"
  }
];

export default function HistoryHub() {
  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      
      <div className="container mx-auto px-4 py-8 mb-20 md:mb-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Your Learning History
            </h1>
            <p className="text-lg text-muted-foreground">
              Track your progress, showcase achievements, and build your professional portfolio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {historyFeatures.map((feature) => {
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
                        View History
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
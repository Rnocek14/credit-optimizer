import { Link } from "react-router-dom";
import { Book, Users, TrendingUp, Award, Calendar, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HubNavigation } from "@/components/HubNavigation";

const teachFeatures = [
  { id: "analytics", title: "Teaching Analytics", description: "Track student progress and engagement", icon: TrendingUp, href: "/teach/analytics", color: "text-blue-600" },
  { id: "courses", title: "Course Management", description: "Create and manage your courses", icon: Book, href: "/teach/courses", color: "text-green-600" },
  { id: "students", title: "Student Roster", description: "View and manage your students", icon: Users, href: "/teach/students", color: "text-purple-600" },
  { id: "assignments", title: "Assignments", description: "Create and grade assignments", icon: Award, href: "/teach/assignments", color: "text-orange-600" },
  { id: "schedule", title: "Class Schedule", description: "Manage your teaching schedule", icon: Calendar, href: "/teach/schedule", color: "text-indigo-600" },
  { id: "feedback", title: "Student Feedback", description: "Collect and review student feedback", icon: MessageSquare, href: "/teach/feedback", color: "text-pink-600" },
];

export default function TeachHub() {
  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Teaching Hub</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Empower your students with comprehensive teaching tools and analytics
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachFeatures.map((feature) => {
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
                      {feature.id === "analytics" || feature.id === "courses" ? "Open" : "Coming Soon"}
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
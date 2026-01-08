import { HubNavigation } from "@/components/HubNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, Building, Briefcase, Settings, 
  Users, BookOpen, BarChart3, Shield, ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSecureAuth } from "@/hooks/useSecureAuth";

export default function ContributeHub() {
  const { hasPermission } = useSecureAuth();

  const contributionFeatures = [
    {
      id: "teach",
      title: "Teach & Mentor",
      description: "Share your expertise by creating courses and mentoring learners",
      icon: GraduationCap,
      href: "/teach-hub",
      permission: "user", // Anyone can become a teacher
      stats: { courses: 0, students: 0, rating: 0 },
      actions: [
        { label: "Create Course", href: "/upload-course" },
        { label: "View Analytics", href: "/teach/analytics" },
        { label: "Manage Courses", href: "/teach/courses" }
      ]
    },
    {
      id: "institution",
      title: "Institution Portal",
      description: "Educational institution tools and management features",
      icon: Building,
      href: "/institution-hub",
      permission: "user",
      stats: { programs: 0, enrollments: 0, completion: 0 },
      actions: [
        { label: "Manage Programs", href: "/institution" },
        { label: "Student Analytics", href: "/analytics" },
        { label: "Certification Tools", href: "/certificates" }
      ]
    },
    {
      id: "employer",
      title: "Employer Tools",
      description: "Talent recruitment and employee development features",
      icon: Briefcase,
      href: "/employer-hub", 
      permission: "user",
      stats: { jobs: 0, candidates: 0, hires: 0 },
      actions: [
        { label: "Post Jobs", href: "/employer" },
        { label: "Browse Talent", href: "/resume-gallery" },
        { label: "Analytics Dashboard", href: "/analytics" }
      ]
    },
    {
      id: "admin",
      title: "System Administration",
      description: "Platform management and administrative controls",
      icon: Settings,
      href: "/admin",
      permission: "admin",
      stats: { users: 1250, courses: 89, certificates: 456 },
      actions: [
        { label: "User Management", href: "/admin" },
        { label: "Content Moderation", href: "/admin/moderation" },
        { label: "System Settings", href: "/admin/settings" },
        { label: "School Scraper", href: "/admin/school-scraper" }
      ]
    }
  ];

  const availableFeatures = contributionFeatures.filter(feature => 
    hasPermission(feature.permission as any)
  );

  if (availableFeatures.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <HubNavigation />
        
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
            <p className="text-muted-foreground mb-6">
              You don't have permission to access contribution features yet.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Complete more learning milestones to unlock teaching opportunities, 
              or contact an administrator for institutional access.
            </p>
            <div className="flex justify-center gap-3">
              <Button asChild>
                <Link to="/plan">
                  Continue Learning
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/progress">
                  View Progress
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Contribute to Life Path</h1>
          <p className="text-muted-foreground">
            Share your expertise and help others on their career journey
          </p>
        </div>

        {/* Available Features Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {availableFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{feature.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {feature.description}
                        </CardDescription>
                      </div>
                    </div>
                    {feature.permission === "admin" && (
                      <Badge variant="destructive">Admin</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {Object.entries(feature.stats).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <p className="text-2xl font-bold">{value}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {key}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button asChild className="w-full">
                      <Link to={feature.href}>
                        <ChevronRight className="h-4 w-4 mr-2" />
                        Open {feature.title}
                      </Link>
                    </Button>
                    <div className="grid grid-cols-1 gap-2">
                      {feature.actions.slice(0, 2).map((action, index) => (
                        <Button key={index} asChild variant="outline" size="sm">
                          <Link to={action.href}>
                            {action.label}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Getting Started Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Getting Started as a Contributor
            </CardTitle>
            <CardDescription>
              New to contributing? Here's how to make the most impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-medium mb-2">Share Knowledge</h3>
                <p className="text-sm text-muted-foreground">
                  Create courses and content based on your professional experience
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-medium mb-2">Mentor Others</h3>
                <p className="text-sm text-muted-foreground">
                  Guide learners through their career journey with personalized advice
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-medium mb-2">Track Impact</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor your contribution metrics and learner success stories
                </p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <div className="flex justify-center gap-3">
                <Button asChild>
                  <Link to="/teach">
                    Start Teaching
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/mentor-inbox">
                    Browse Mentoring Opportunities
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
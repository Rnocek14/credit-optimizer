import { HubNavigation } from "@/components/HubNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GraduationCap, Building, Briefcase, Settings, 
  Users, BookOpen, BarChart3, Shield, ChevronRight
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useSecureAuth } from "@/hooks/useSecureAuth";

export default function ContributeTabbed() {
  const { hasPermission } = useSecureAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'teach';

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  const contributionFeatures = {
    teach: {
      title: "Teach & Mentor",
      description: "Share your expertise by creating courses and mentoring learners",
      icon: GraduationCap,
      permission: "user",
      stats: { courses: 0, students: 0, rating: 0 },
      actions: [
        { label: "Create Course", href: "/upload-course" },
        { label: "View Analytics", href: "/teach/analytics" },
        { label: "Manage Courses", href: "/teach/courses" }
      ]
    },
    institution: {
      title: "Institution Portal",
      description: "Educational institution tools and management features",
      icon: Building,
      permission: "user",
      stats: { programs: 0, enrollments: 0, completion: 0 },
      actions: [
        { label: "Manage Programs", href: "/institution" },
        { label: "Student Analytics", href: "/analytics" },
        { label: "Certification Tools", href: "/certificates" }
      ]
    },
    employer: {
      title: "Employer Tools",
      description: "Talent recruitment and employee development features",
      icon: Briefcase,
      permission: "user",
      stats: { jobs: 0, candidates: 0, hires: 0 },
      actions: [
        { label: "Post Jobs", href: "/employer" },
        { label: "Browse Talent", href: "/resume-gallery" },
        { label: "Analytics Dashboard", href: "/analytics" }
      ]
    },
    admin: {
      title: "System Administration",
      description: "Platform management and administrative controls",
      icon: Settings,
      permission: "admin",
      stats: { users: 1250, courses: 89, certificates: 456 },
      actions: [
        { label: "User Management", href: "/admin" },
        { label: "Content Moderation", href: "/admin/moderation" },
        { label: "System Settings", href: "/admin/settings" }
      ]
    }
  };

  const availableTabs = Object.entries(contributionFeatures).filter(([key, feature]) => 
    hasPermission(feature.permission as any)
  );

  if (availableTabs.length === 0) {
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

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {availableTabs.map(([key, feature]) => (
              <TabsTrigger 
                key={key} 
                value={key} 
                data-testid={`tab-${key}`}
                className="flex items-center gap-2"
              >
                <feature.icon className="h-4 w-4" />
                {feature.title.split(' ')[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          {availableTabs.map(([key, feature]) => {
            const Icon = feature.icon;
            return (
              <TabsContent key={key} value={key} className="mt-6">
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Main Feature Card */}
                  <Card className="lg:col-span-2">
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
                        {Object.entries(feature.stats).map(([statKey, value]) => (
                          <div key={statKey} className="text-center">
                            <p className="text-2xl font-bold">{value}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {statKey}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        <Button asChild className="w-full">
                          <Link to={feature.actions[0]?.href || '#'}>
                            <ChevronRight className="h-4 w-4 mr-2" />
                            {feature.actions[0]?.label || 'Get Started'}
                          </Link>
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                          {feature.actions.slice(1).map((action, index) => (
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

                  {/* Getting Started Sidebar */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Getting Started
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center p-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <BookOpen className="h-6 w-6 text-blue-600" />
                        </div>
                        <h3 className="font-medium mb-2">Share Knowledge</h3>
                        <p className="text-sm text-muted-foreground">
                          Create content based on your professional experience
                        </p>
                      </div>
                      <div className="text-center p-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Users className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="font-medium mb-2">Help Others</h3>
                        <p className="text-sm text-muted-foreground">
                          Guide learners through their career journey
                        </p>
                      </div>
                      <div className="text-center p-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <BarChart3 className="h-6 w-6 text-purple-600" />
                        </div>
                        <h3 className="font-medium mb-2">Track Impact</h3>
                        <p className="text-sm text-muted-foreground">
                          Monitor your contribution metrics
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}
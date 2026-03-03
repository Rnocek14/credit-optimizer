import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GraduationCap, Building, Briefcase, Settings, 
  Users, BookOpen, BarChart3, Shield, ChevronRight,
  Search, TrendingUp, Target, FileText, Brain,
  Zap, TrendingDown, Award, MessageSquare
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import { useMentorAnalytics } from "@/hooks/useMentorAnalytics";
import { WorkflowManagementInterface } from "@/components/WorkflowManagementInterface";
import { DemoSeedingPanel } from "@/components/DemoSeedingPanel";
import { DemoCourseSeedTrigger } from "@/components/DemoCourseSeedTrigger";
import { CourseIntelligenceSystemValidator } from "@/components/CourseIntelligenceSystemValidator";
import { SmartBatchOperations } from "@/components/SmartBatchOperations";
import { PredictiveCurationEngine } from "@/components/PredictiveCurationEngine";
import { AutoValidationDashboard } from "@/components/AutoValidationDashboard";

export default function ContributeTabbed() {
  const { hasPermission, user } = useSecureAuth();
  const { metrics, achievements, loading } = useMentorAnalytics();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'teach';

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  const contributionFeatures = {
    teach: {
      title: "Teach & Mentor",
      description: "Share your expertise through AI-powered course curation and mentoring",
      icon: GraduationCap,
      permission: "mentor",
      stats: { 
        courses: metrics?.courses_reviewed || 0, 
        students: metrics?.impact_score || 0, 
        rating: metrics?.quality_score || 0 
      },
      actions: [
        { label: "Course Discovery", href: "/teach/discovery" },
        { label: "Course Curation", href: "/teach/curation" },
        { label: "Learning Paths", href: "/teach/paths" },
        { label: "Validation Hub", href: "/teach/validation" },
        { label: "Marketplace", href: "/teach/marketplace" },
        { label: "Analytics", href: "/teach/analytics" }
      ],
      features: [
        { title: "AI-Powered Course Discovery", description: "Discover and validate course content using intelligent algorithms", icon: Search },
        { title: "Smart Course Curation", description: "Create structured learning experiences with AI assistance", icon: Brain },
        { title: "Predictive Learning Paths", description: "Build adaptive pathways that respond to learner needs", icon: TrendingUp },
        { title: "Real-time Validation", description: "Instant feedback and quality assurance for course content", icon: Award },
        { title: "Impact Analytics", description: "Track your teaching effectiveness and student outcomes", icon: BarChart3 },
        { title: "Mentor Community", description: "Connect with other educators and share best practices", icon: MessageSquare }
      ]
    },
    institution: {
      title: "Institution Portal",
      description: "Comprehensive institutional management and analytics platform",
      icon: Building,
      permission: "mentor",
      stats: { programs: 0, enrollments: 0, completion: 0 },
      actions: [
        { label: "Institution Overview", href: "/institution/overview" },
        { label: "Student Management", href: "/institution/students" },
        { label: "Program Analytics", href: "/institution/programs" },
        { label: "Faculty Dashboard", href: "/institution/faculty" },
        { label: "Reports", href: "/institution/reports" },
        { label: "Settings", href: "/institution/settings" }
      ],
      features: [
        { title: "Institution Overview", description: "View institutional metrics and KPIs", icon: BarChart3 },
        { title: "Student Management", description: "Manage student enrollment and records", icon: Users },
        { title: "Program Analytics", description: "Track program performance and outcomes", icon: GraduationCap },
        { title: "Faculty Dashboard", description: "Manage teaching staff and resources", icon: Building },
        { title: "Institutional Reports", description: "Generate compliance and performance reports", icon: FileText },
        { title: "Institution Settings", description: "Configure institutional preferences", icon: Settings }
      ]
    },
    employer: {
      title: "Employer Tools",
      description: "Connect with talent and build your workforce of the future",
      icon: Briefcase,
      permission: "mentor",
      stats: { jobs: 0, candidates: 0, hires: 0 },
      actions: [
        { label: "Talent Pipeline", href: "/employer/talent" },
        { label: "Workforce Analytics", href: "/employer/workforce" },
        { label: "Hiring Dashboard", href: "/employer/hiring" },
        { label: "Skills Assessment", href: "/employer/skills" },
        { label: "Training Partnerships", href: "/employer/partnerships" },
        { label: "Job Postings", href: "/employer/jobs" }
      ],
      features: [
        { title: "Talent Pipeline", description: "Browse and recruit top candidates", icon: Search },
        { title: "Workforce Analytics", description: "Track employee skills and development", icon: TrendingUp },
        { title: "Hiring Dashboard", description: "Manage recruitment and onboarding", icon: Users },
        { title: "Skills Assessment", description: "Evaluate candidate and employee skills", icon: Target },
        { title: "Training Partnerships", description: "Partner with educational institutions", icon: Building },
        { title: "Job Postings", description: "Create and manage job openings", icon: Briefcase }
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
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Contribute to Pivot</h1>
          <p className="text-muted-foreground">
            Share your expertise and help others on their career journey
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`grid w-full ${availableTabs.length === 1 ? 'grid-cols-1' : availableTabs.length === 2 ? 'grid-cols-2' : availableTabs.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
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
                <div className="grid gap-6">
                  {/* Main Feature Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-primary/10 rounded-lg">
                            <Icon className="h-8 w-8 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl">{feature.title}</CardTitle>
                            <CardDescription className="mt-1 text-lg">
                              {feature.description}
                            </CardDescription>
                          </div>
                        </div>
                        {(feature.permission === "admin" || feature.permission === "mentor") && (
                          <Badge variant={feature.permission === "admin" ? "destructive" : "secondary"}>
                            {feature.permission === "admin" ? "Admin" : "Mentor"}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        {Object.entries(feature.stats).map(([statKey, value]) => (
                          <div key={statKey} className="text-center p-4 border rounded-lg">
                            <p className="text-3xl font-bold text-primary">{value}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {statKey}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Feature Grid */}
                      {(feature as any).features && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-4">Key Features</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(feature as any).features.map((feat: any, index: number) => (
                              <Card key={index} className="border-muted">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                      <feat.icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-sm mb-1">{feat.title}</h4>
                                      <p className="text-xs text-muted-foreground">{feat.description}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {feature.actions.map((action, index) => (
                            <Button 
                              key={index} 
                              asChild 
                              variant={index === 0 ? "default" : "outline"}
                              className="h-12"
                            >
                              <Link to={action.href} className="flex items-center justify-center gap-2">
                                <ChevronRight className="h-4 w-4" />
                                {action.label}
                              </Link>
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Special Content for Teach Tab */}
                      {key === 'teach' && (
                        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            AI-Powered Teaching Tools
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <h5 className="font-medium">Course Intelligence</h5>
                              <p className="text-muted-foreground">AI validates and optimizes your course content</p>
                            </div>
                            <div>
                              <h5 className="font-medium">Predictive Curation</h5>
                              <p className="text-muted-foreground">Smart recommendations for learning paths</p>
                            </div>
                            <div>
                              <h5 className="font-medium">Auto-Validation</h5>
                              <p className="text-muted-foreground">Real-time quality assurance and feedback</p>
                            </div>
                            <div>
                              <h5 className="font-medium">Impact Analytics</h5>
                              <p className="text-muted-foreground">Track student success and engagement</p>
                            </div>
                          </div>
                          {!loading && achievements && achievements.length > 0 && (
                            <div className="mt-4 p-3 bg-background rounded border">
                              <h5 className="font-medium mb-2 flex items-center gap-2">
                                <Award className="h-4 w-4 text-amber-500" />
                                Recent Achievement
                              </h5>
                              <p className="text-sm text-muted-foreground">
                                {achievements[0].achievement_name}: {achievements[0].description}
                              </p>
                            </div>
                          )}
                          
                          {/* Advanced Teaching Components */}
                          <div className="mt-6 space-y-6">
                            <DemoSeedingPanel />
                            <DemoCourseSeedTrigger />
                            <CourseIntelligenceSystemValidator />
                            
                            <div className="text-center">
                              <h3 className="text-xl font-bold mb-2">Intelligence Amplification Tools</h3>
                              <p className="text-muted-foreground mb-4">Smart batch operations, predictive curation, and auto-validation</p>
                            </div>
                            
                            <div className="grid lg:grid-cols-2 gap-6">
                              <SmartBatchOperations />
                              <PredictiveCurationEngine />
                            </div>
                            
                            <AutoValidationDashboard />
                          </div>
                        </div>
                      )}

                      {/* Special Content for Institution Tab */}
                      {key === 'institution' && (
                        <div className="mt-6 space-y-6">
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Building className="h-5 w-5 text-primary" />
                              Institutional Management Tools
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <h5 className="font-medium">Student Lifecycle Management</h5>
                                <p className="text-muted-foreground">End-to-end student journey tracking and analytics</p>
                              </div>
                              <div>
                                <h5 className="font-medium">Program Performance Analytics</h5>
                                <p className="text-muted-foreground">Real-time insights into program effectiveness</p>
                              </div>
                              <div>
                                <h5 className="font-medium">Faculty Resource Optimization</h5>
                                <p className="text-muted-foreground">Optimize teaching assignments and resources</p>
                              </div>
                              <div>
                                <h5 className="font-medium">Compliance Reporting</h5>
                                <p className="text-muted-foreground">Automated reporting for regulatory compliance</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Special Content for Employer Tab */}
                      {key === 'employer' && (
                        <div className="mt-6 space-y-6">
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Briefcase className="h-5 w-5 text-primary" />
                              Workforce Development Platform
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <h5 className="font-medium">AI-Powered Talent Matching</h5>
                                <p className="text-muted-foreground">Find candidates with precise skill alignment</p>
                              </div>
                              <div>
                                <h5 className="font-medium">Skills Gap Analysis</h5>
                                <p className="text-muted-foreground">Identify and address workforce skill gaps</p>
                              </div>
                              <div>
                                <h5 className="font-medium">Training Partnership Network</h5>
                                <p className="text-muted-foreground">Connect with educational providers for upskilling</p>
                              </div>
                              <div>
                                <h5 className="font-medium">Performance Prediction</h5>
                                <p className="text-muted-foreground">Predictive analytics for hiring decisions</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Special Content for Admin Tab - Workflow Management */}
                      {key === 'admin' && (
                        <div className="mt-6">
                          <h4 className="font-semibold mb-4 flex items-center gap-2">
                            <Settings className="h-5 w-5 text-primary" />
                            Workflow Management
                          </h4>
                          <WorkflowManagementInterface />
                        </div>
                      )}
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
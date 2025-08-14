import { HubNavigation } from "@/components/HubNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  History, Trophy, Award, FileText, Share, ExternalLink, 
  CheckCircle, Calendar, Star, BookOpen, Target
} from "lucide-react";
import { Link } from "react-router-dom";
import { useActiveTrackStore } from "@/stores/useActiveTrackStore";
// Track selector component would be imported here
import { MayaGuidancePanel } from "@/components/MayaGuidancePanel";

export default function ProgressHub() {
  const { activeTrackId } = useActiveTrackStore();

  const learningHistory = [
    {
      id: 1,
      title: "Python Fundamentals",
      type: "Course",
      completedAt: "2024-01-15",
      provider: "DataCamp",
      duration: "20 hours",
      xpEarned: 150,
      progress: 100
    },
    {
      id: 2,
      title: "Statistics Basics",
      type: "Course", 
      completedAt: "2024-01-28",
      provider: "Khan Academy",
      duration: "15 hours",
      xpEarned: 120,
      progress: 100
    },
    {
      id: 3,
      title: "Data Analysis Project",
      type: "Project",
      completedAt: "2024-02-05",
      provider: "Self-directed",
      duration: "1 week",
      xpEarned: 200,
      progress: 100
    }
  ];

  const portfolioProjects = [
    {
      id: 1,
      title: "Customer Segmentation Analysis",
      description: "Machine learning project analyzing customer behavior patterns",
      technologies: ["Python", "Pandas", "Scikit-learn", "Matplotlib"],
      status: "verified",
      completedAt: "2024-02-05",
      githubUrl: "https://github.com/user/customer-segmentation",
      demoUrl: "https://customer-analysis-demo.com"
    },
    {
      id: 2,
      title: "Sales Forecasting Dashboard",
      description: "Interactive dashboard predicting sales trends",
      technologies: ["Python", "Streamlit", "Prophet", "Plotly"],
      status: "pending",
      completedAt: "2024-02-10",
      githubUrl: "https://github.com/user/sales-forecasting",
      demoUrl: null
    }
  ];

  const credentials = [
    {
      id: 1,
      type: "certificate",
      title: "Python for Data Science",
      issuer: "DataCamp",
      issuedAt: "2024-01-20",
      verificationCode: "DC-12345-PY",
      badgeUrl: "/api/badge/python-cert"
    },
    {
      id: 2,
      type: "badge",
      title: "Fast Learner",
      description: "Completed 5 courses in one month",
      earnedAt: "2024-02-01",
      emoji: "⚡"
    },
    {
      id: 3,
      type: "certificate",
      title: "Statistics Foundations",
      issuer: "Khan Academy",
      issuedAt: "2024-02-01",
      verificationCode: "KA-67890-ST",
      badgeUrl: "/api/badge/stats-cert"
    }
  ];

  const overallStats = {
    totalXP: 1250,
    currentLevel: 5,
    coursesCompleted: 8,
    projectsCompleted: 3,
    certificatesEarned: 5,
    badgesEarned: 3,
    studyStreak: 15
  };

  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header with Track Selector */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Progress</h1>
            <p className="text-muted-foreground">
              Track your learning journey and showcase your achievements
            </p>
          </div>
          <div className="flex items-center gap-4">
            {activeTrackId && (
              <Badge variant="outline" className="px-3 py-1">
                Track: Active
              </Badge>
            )}
            {/* <TrackSelector /> */}
          </div>
        </div>

        {/* Maya Guidance */}
        <MayaGuidancePanel 
          title="Congrats! This unlocks Data Analyst badge..."
          message="You've completed 3 key milestones! Consider adding your Customer Segmentation project to your resume and sharing your Python certificate on LinkedIn."
          className="mb-6"
        />

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total XP</p>
                  <p className="text-2xl font-bold">{overallStats.totalXP}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Level</p>
                  <p className="text-2xl font-bold">{overallStats.currentLevel}</p>
                </div>
                <Trophy className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{overallStats.coursesCompleted}</p>
                </div>
                <BookOpen className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Study Streak</p>
                  <p className="text-2xl font-bold">{overallStats.studyStreak} days</p>
                </div>
                <Target className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="history" data-testid="tab-history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="portfolio" data-testid="tab-portfolio" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="credentials" data-testid="tab-credentials" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Credentials
            </TabsTrigger>
            <TabsTrigger value="resume" data-testid="tab-resume" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Resume
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Learning History</CardTitle>
                <CardDescription>
                  Your completed courses, projects, and learning milestones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {learningHistory.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{item.title}</h4>
                          <Badge variant="outline">{item.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.provider} • {item.duration} • +{item.xpEarned} XP
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Completed on {new Date(item.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button asChild variant="outline" className="w-full mt-4">
                  <Link to="/learning-history">
                    View Full History
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Portfolio Projects</CardTitle>
                    <CardDescription>
                      Showcase your practical skills and completed projects
                    </CardDescription>
                  </div>
                  <Button asChild>
                    <Link to="/projects">
                      Manage Projects
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {portfolioProjects.map((project) => (
                    <div key={project.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{project.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {project.description}
                          </p>
                        </div>
                        <Badge 
                          variant={project.status === "verified" ? "default" : "secondary"}
                        >
                          {project.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {project.technologies.map((tech, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm" data-testid="add-to-resume">
                          <Link to="/resume-builder">
                            <Share className="h-4 w-4 mr-2" />
                            Add to Resume
                          </Link>
                        </Button>
                        {project.githubUrl && (
                          <Button asChild variant="outline" size="sm">
                            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              GitHub
                            </a>
                          </Button>
                        )}
                        {project.demoUrl && (
                          <Button asChild variant="outline" size="sm">
                            <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Demo
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credentials" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Badges & Certificates</CardTitle>
                    <CardDescription>
                      Your verified achievements and credentials
                    </CardDescription>
                  </div>
                  <Button asChild data-testid="manage-wallet">
                    <Link to="/wallet">
                      Manage Wallet
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {credentials.map((credential) => (
                    <div key={credential.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {credential.type === "badge" ? (
                            <span className="text-2xl">{credential.emoji}</span>
                          ) : (
                            <Award className="h-6 w-6 text-primary" />
                          )}
                          <div>
                            <h4 className="font-medium">{credential.title}</h4>
                            {credential.issuer && (
                              <p className="text-sm text-muted-foreground">
                                {credential.issuer}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {credential.type}
                        </Badge>
                      </div>
                      {credential.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {credential.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {credential.issuedAt ? 
                            `Issued: ${new Date(credential.issuedAt).toLocaleDateString()}` :
                            `Earned: ${new Date(credential.earnedAt).toLocaleDateString()}`
                          }
                        </p>
                        <Button variant="outline" size="sm">
                          <Share className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resume" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Resume Builder</CardTitle>
                    <CardDescription>
                      Create and manage your professional resume
                    </CardDescription>
                  </div>
                  <Button asChild>
                    <Link to="/resume-builder">
                      Open Resume Builder
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Build Your Resume</h3>
                  <p className="text-muted-foreground mb-4">
                    Use your completed projects and certificates to create a professional resume
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button asChild>
                      <Link to="/resume-builder">
                        Create New Resume
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/resume-analytics">
                        View Analytics
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
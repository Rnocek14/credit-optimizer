import { Target, BarChart3, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function EmployerSkills() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Skills Assessment</h1>
            <p className="text-muted-foreground">
              Evaluate and develop your team's capabilities
            </p>
          </div>
          <Button>
            <Target className="mr-2 h-4 w-4" />
            Create Assessment
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Skill Categories</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">
                Tracked competencies
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assessments</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">
                Completed this quarter
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Skill Gaps</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">
                Critical areas identified
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Improvement Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23%</div>
              <p className="text-xs text-muted-foreground">
                Avg. skill growth
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="gaps">Skills Gaps</TabsTrigger>
            <TabsTrigger value="development">Development Plans</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Team Skill Matrix</CardTitle>
                  <CardDescription>
                    Current skill distribution across your team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { skill: "React/Frontend", level: 85, trend: "+12%" },
                      { skill: "Node.js/Backend", level: 78, trend: "+8%" },
                      { skill: "Cloud Architecture", level: 65, trend: "+15%" },
                      { skill: "DevOps/CI/CD", level: 70, trend: "+5%" },
                      { skill: "Data Analysis", level: 45, trend: "+20%" },
                      { skill: "Machine Learning", level: 35, trend: "+25%" },
                    ].map((skill, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{skill.skill}</span>
                          <div className="flex items-center space-x-2">
                            <span>{skill.level}%</span>
                            <Badge variant="outline" className="text-xs">
                              {skill.trend}
                            </Badge>
                          </div>
                        </div>
                        <Progress value={skill.level} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Assessment Summary</CardTitle>
                  <CardDescription>
                    Recent assessment activity and results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Completed This Month</span>
                      <span className="text-2xl font-bold">47</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Average Score</span>
                      <span className="text-2xl font-bold">78%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Pass Rate</span>
                      <span className="text-2xl font-bold">92%</span>
                    </div>
                    <div className="pt-4">
                      <h4 className="text-sm font-medium mb-2">Top Performers</h4>
                      <div className="space-y-2">
                        {[
                          { name: "Sarah Johnson", score: "94%" },
                          { name: "Michael Chen", score: "91%" },
                          { name: "Emily Rodriguez", score: "89%" },
                        ].map((performer, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{performer.name}</span>
                            <span className="font-medium">{performer.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Assessments</CardTitle>
                <CardDescription>
                  Latest skill assessments and certifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      title: "React Advanced Patterns",
                      participants: 12,
                      avgScore: "87%",
                      date: "March 15, 2024",
                      status: "Completed"
                    },
                    {
                      title: "AWS Solutions Architect",
                      participants: 8,
                      avgScore: "79%",
                      date: "March 10, 2024",
                      status: "Completed"
                    },
                    {
                      title: "Data Structures & Algorithms",
                      participants: 15,
                      avgScore: "82%",
                      date: "March 5, 2024",
                      status: "Completed"
                    },
                    {
                      title: "Machine Learning Fundamentals",
                      participants: 6,
                      avgScore: "In Progress",
                      date: "March 20, 2024",
                      status: "Active"
                    },
                  ].map((assessment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{assessment.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {assessment.participants} participants • {assessment.date}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium">{assessment.avgScore}</span>
                        <Badge variant={assessment.status === "Completed" ? "secondary" : "default"}>
                          {assessment.status}
                        </Badge>
                        <Button variant="ghost" size="sm">View Details</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Library</CardTitle>
                <CardDescription>
                  Create and manage skill assessments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <Input placeholder="Search assessments..." className="flex-1" />
                  <Button variant="outline">Filter</Button>
                  <Button>Create Assessment</Button>
                </div>
                <p className="text-muted-foreground">Assessment creation tools coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gaps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Skills Gap Analysis</CardTitle>
                <CardDescription>
                  Identify critical skill gaps and training needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Gap analysis tools coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="development" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Development Plans</CardTitle>
                <CardDescription>
                  Create personalized skill development roadmaps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Development planning tools coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
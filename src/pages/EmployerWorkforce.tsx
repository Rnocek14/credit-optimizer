import { Users, TrendingUp, Award, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function EmployerWorkforce() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Workforce Analytics</h1>
            <p className="text-muted-foreground">
              Monitor team performance and skill development
            </p>
          </div>
          <Button>
            <TrendingUp className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Size</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">247</div>
              <p className="text-xs text-muted-foreground">
                +12 hires this quarter
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Skill Coverage</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89%</div>
              <p className="text-xs text-muted-foreground">
                Of required competencies
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.2</div>
              <p className="text-xs text-muted-foreground">
                Average team rating
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94%</div>
              <p className="text-xs text-muted-foreground">
                Annual retention
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="skills">Skills Analysis</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="development">Development</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Team Composition</CardTitle>
                  <CardDescription>
                    Breakdown by department and role
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { department: "Engineering", count: 89, percentage: 36 },
                      { department: "Product", count: 34, percentage: 14 },
                      { department: "Design", count: 28, percentage: 11 },
                      { department: "Marketing", count: 45, percentage: 18 },
                      { department: "Sales", count: 51, percentage: 21 },
                    ].map((dept, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{dept.department}</span>
                          <span>{dept.count} people ({dept.percentage}%)</span>
                        </div>
                        <Progress value={dept.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Key Metrics</CardTitle>
                  <CardDescription>
                    Performance indicators at a glance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Employee Satisfaction</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={87} className="w-20 h-2" />
                        <span className="text-sm">87%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Training Completion</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={76} className="w-20 h-2" />
                        <span className="text-sm">76%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Goal Achievement</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={92} className="w-20 h-2" />
                        <span className="text-sm">92%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Innovation Index</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={68} className="w-20 h-2" />
                        <span className="text-sm">68%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
                <CardDescription>
                  Notable accomplishments and milestones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      title: "Q1 Revenue Target Exceeded",
                      description: "Sales team achieved 112% of quarterly target",
                      date: "March 2024",
                      type: "Revenue"
                    },
                    {
                      title: "Product Launch Success",
                      description: "New feature adopted by 78% of users within first month",
                      date: "February 2024",
                      type: "Product"
                    },
                    {
                      title: "Team Certification Milestone",
                      description: "85% of engineering team completed cloud architecture certification",
                      date: "January 2024",
                      type: "Development"
                    },
                  ].map((achievement, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{achievement.title}</p>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{achievement.type}</Badge>
                        <span className="text-sm text-muted-foreground">{achievement.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skills" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Skills Analysis</CardTitle>
                <CardDescription>
                  Team skill distribution and gaps analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Skills analysis tools coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Individual and team performance tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Performance analytics coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="development" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Development Programs</CardTitle>
                <CardDescription>
                  Track professional development and training progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Development tracking tools coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
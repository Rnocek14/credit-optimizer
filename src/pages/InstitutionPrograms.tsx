import { BookOpen, BarChart3, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function InstitutionPrograms() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Program Analytics</h1>
            <p className="text-muted-foreground">
              Monitor program performance and curriculum effectiveness
            </p>
          </div>
          <Button>
            <BookOpen className="mr-2 h-4 w-4" />
            Add Program
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">
                +2 new this semester
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Enrollment</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3,492</div>
              <p className="text-xs text-muted-foreground">
                +15% from last year
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">92.3%</div>
              <p className="text-xs text-muted-foreground">
                +3.2% from last year
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.6</div>
              <p className="text-xs text-muted-foreground">
                Student satisfaction
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Program Portfolio</CardTitle>
                <CardDescription>
                  Overview of all academic programs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "Computer Science", students: 450, completion: 95, satisfaction: 4.8, status: "active" },
                    { name: "Data Science", students: 320, completion: 88, satisfaction: 4.6, status: "active" },
                    { name: "Business Analytics", students: 280, completion: 92, satisfaction: 4.4, status: "active" },
                    { name: "Cybersecurity", students: 210, completion: 90, satisfaction: 4.7, status: "new" },
                  ].map((program, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-medium">{program.name}</p>
                          <p className="text-sm text-muted-foreground">{program.students} students</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-sm font-medium">{program.completion}%</p>
                          <p className="text-xs text-muted-foreground">Completion</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">{program.satisfaction}</p>
                          <p className="text-xs text-muted-foreground">Rating</p>
                        </div>
                        <Badge variant={program.status === "new" ? "secondary" : "outline"}>
                          {program.status}
                        </Badge>
                        <Button variant="ghost" size="sm">Manage</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="curriculum" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Curriculum Management</CardTitle>
                <CardDescription>
                  Manage course sequences and requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Curriculum management tools coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outcomes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Learning Outcomes</CardTitle>
                <CardDescription>
                  Track program effectiveness and graduate success
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Employment Rate</span>
                      <span className="text-sm">89%</span>
                    </div>
                    <Progress value={89} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Industry Alignment</span>
                      <span className="text-sm">94%</span>
                    </div>
                    <Progress value={94} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Graduate Satisfaction</span>
                      <span className="text-sm">92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Program Analytics</CardTitle>
                <CardDescription>
                  Detailed performance metrics and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Advanced analytics dashboard coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
import { Users, GraduationCap, TrendingUp, BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function InstitutionStudents() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Student Management</h1>
            <p className="text-muted-foreground">
              Manage student enrollment, progress, and academic performance
            </p>
          </div>
          <Button>
            <Users className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,847</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Enrollments</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground">
                +8% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Graduation Rate</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87.5%</div>
              <p className="text-xs text-muted-foreground">
                +2.1% from last year
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3.42</div>
              <p className="text-xs text-muted-foreground">
                GPA scale
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Student Directory</CardTitle>
                <CardDescription>
                  Search and manage student records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <Input placeholder="Search students..." className="max-w-sm" />
                  <Button variant="outline">Search</Button>
                </div>
                
                <div className="space-y-3">
                  {[
                    { name: "Sarah Johnson", id: "STU-2024-001", program: "Computer Science", year: "Junior", gpa: "3.85" },
                    { name: "Michael Chen", id: "STU-2024-002", program: "Data Science", year: "Senior", gpa: "3.92" },
                    { name: "Emily Rodriguez", id: "STU-2024-003", program: "Business Analytics", year: "Sophomore", gpa: "3.67" },
                  ].map((student, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-muted-foreground">{student.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline">{student.program}</Badge>
                        <Badge variant="secondary">{student.year}</Badge>
                        <span className="text-sm font-medium">GPA: {student.gpa}</span>
                        <Button variant="ghost" size="sm">View</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enrollment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enrollment Management</CardTitle>
                <CardDescription>
                  Manage course enrollments and waitlists
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Enrollment management tools coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Academic Performance</CardTitle>
                <CardDescription>
                  Track student progress and academic outcomes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Performance analytics coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Student Reports</CardTitle>
                <CardDescription>
                  Generate comprehensive student reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Reporting tools coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
import { Users, Star, Award, BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function InstitutionFaculty() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Faculty Dashboard</h1>
            <p className="text-muted-foreground">
              Manage faculty members and teaching assignments
            </p>
          </div>
          <Button>
            <Users className="mr-2 h-4 w-4" />
            Add Faculty
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Faculty</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">126</div>
              <p className="text-xs text-muted-foreground">
                +3 new hires this year
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89</div>
              <p className="text-xs text-muted-foreground">
                Current semester
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.3</div>
              <p className="text-xs text-muted-foreground">
                Student evaluations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Research Active</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">78%</div>
              <p className="text-xs text-muted-foreground">
                Faculty participation
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="directory" className="w-full">
          <TabsList>
            <TabsTrigger value="directory">Directory</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="development">Development</TabsTrigger>
          </TabsList>

          <TabsContent value="directory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Faculty Directory</CardTitle>
                <CardDescription>
                  Search and manage faculty profiles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <Input placeholder="Search faculty..." className="max-w-sm" />
                  <Button variant="outline">Search</Button>
                </div>
                
                <div className="space-y-3">
                  {[
                    { 
                      name: "Dr. Sarah Johnson", 
                      email: "sarah.johnson@university.edu", 
                      department: "Computer Science", 
                      position: "Professor",
                      courses: 3,
                      rating: "4.8"
                    },
                    { 
                      name: "Prof. Michael Chen", 
                      email: "michael.chen@university.edu", 
                      department: "Data Science", 
                      position: "Associate Professor",
                      courses: 2,
                      rating: "4.6"
                    },
                    { 
                      name: "Dr. Emily Rodriguez", 
                      email: "emily.rodriguez@university.edu", 
                      department: "Business Analytics", 
                      position: "Assistant Professor",
                      courses: 4,
                      rating: "4.2"
                    },
                  ].map((faculty, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${faculty.name}`} />
                          <AvatarFallback>{faculty.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{faculty.name}</p>
                          <p className="text-sm text-muted-foreground">{faculty.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline">{faculty.department}</Badge>
                        <Badge variant="secondary">{faculty.position}</Badge>
                        <span className="text-sm text-muted-foreground">{faculty.courses} courses</span>
                        <span className="text-sm font-medium">⭐ {faculty.rating}</span>
                        <Button variant="ghost" size="sm">Profile</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Teaching Assignments</CardTitle>
                <CardDescription>
                  Manage course assignments and schedules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Assignment management tools coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Faculty Performance</CardTitle>
                <CardDescription>
                  Track teaching effectiveness and student feedback
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
                <CardTitle>Professional Development</CardTitle>
                <CardDescription>
                  Track training and development programs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Development tracking coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
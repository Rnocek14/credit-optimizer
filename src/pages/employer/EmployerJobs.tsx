import { Briefcase, Plus, Eye, Edit, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EmployerJobs() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Management</h1>
            <p className="text-muted-foreground">
              Post, manage, and track your job openings
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Post New Job
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                Currently open
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">284</div>
              <p className="text-xs text-muted-foreground">
                Total this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Interviews Scheduled</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">47</div>
              <p className="text-xs text-muted-foreground">
                This week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time to Fill</CardTitle>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">18</div>
              <p className="text-xs text-muted-foreground">
                Days average
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">Active Jobs</TabsTrigger>
            <TabsTrigger value="drafts">Drafts</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Job Postings</CardTitle>
                <CardDescription>
                  Manage your current job openings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <Input placeholder="Search jobs..." className="flex-1" />
                  <Select>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">Filter</Button>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      title: "Senior Software Engineer",
                      department: "Engineering",
                      location: "San Francisco, CA",
                      type: "Full-time",
                      applications: 45,
                      posted: "3 days ago",
                      status: "Active",
                      urgent: false
                    },
                    {
                      title: "Product Manager",
                      department: "Product",
                      location: "Remote",
                      type: "Full-time",
                      applications: 67,
                      posted: "1 week ago",
                      status: "Active",
                      urgent: true
                    },
                    {
                      title: "UX Designer",
                      department: "Design",
                      location: "New York, NY",
                      type: "Full-time",
                      applications: 32,
                      posted: "5 days ago",
                      status: "Active",
                      urgent: false
                    },
                    {
                      title: "Data Scientist",
                      department: "Engineering",
                      location: "Austin, TX",
                      type: "Full-time",
                      applications: 29,
                      posted: "2 days ago",
                      status: "Active",
                      urgent: false
                    },
                    {
                      title: "Marketing Manager",
                      department: "Marketing",
                      location: "Remote",
                      type: "Full-time",
                      applications: 83,
                      posted: "1 week ago",
                      status: "Active",
                      urgent: false
                    },
                  ].map((job, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{job.title}</p>
                            {job.urgent && (
                              <Badge variant="destructive" className="text-xs">
                                Urgent
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {job.department} • {job.location} • {job.type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Posted {job.posted}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <p className="text-sm font-medium">{job.applications}</p>
                          <p className="text-xs text-muted-foreground">Applications</p>
                        </div>
                        <Badge variant="secondary">{job.status}</Badge>
                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drafts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Draft Jobs</CardTitle>
                <CardDescription>
                  Job postings that haven't been published yet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      title: "DevOps Engineer",
                      department: "Engineering",
                      lastEdited: "2 hours ago",
                      status: "Draft"
                    },
                    {
                      title: "Sales Manager",
                      department: "Sales",
                      lastEdited: "1 day ago",
                      status: "Draft"
                    },
                  ].map((job, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{job.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {job.department} • Last edited {job.lastEdited}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{job.status}</Badge>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="closed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Closed Positions</CardTitle>
                <CardDescription>
                  Recently filled or cancelled job postings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      title: "Frontend Developer",
                      department: "Engineering",
                      closedDate: "1 week ago",
                      reason: "Position Filled",
                      applications: 156
                    },
                    {
                      title: "Content Writer",
                      department: "Marketing",
                      closedDate: "2 weeks ago",
                      reason: "Position Filled",
                      applications: 89
                    },
                    {
                      title: "Business Analyst",
                      department: "Operations",
                      closedDate: "3 weeks ago",
                      reason: "Cancelled",
                      applications: 34
                    },
                  ].map((job, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{job.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {job.department} • Closed {job.closedDate} • {job.applications} applications
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={job.reason === "Position Filled" ? "secondary" : "outline"}>
                          {job.reason}
                        </Badge>
                        <Button variant="ghost" size="sm">View</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Hiring Analytics</CardTitle>
                <CardDescription>
                  Performance metrics for your job postings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Top Performing Jobs</h4>
                    <div className="space-y-2">
                      {[
                        { title: "Product Manager", applications: 67 },
                        { title: "Marketing Manager", applications: 83 },
                        { title: "Senior Software Engineer", applications: 45 },
                        { title: "UX Designer", applications: 32 },
                      ].map((job, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{job.title}</span>
                          <span className="font-medium">{job.applications} apps</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-3">Department Metrics</h4>
                    <div className="space-y-2">
                      {[
                        { dept: "Engineering", avgTime: "22 days" },
                        { dept: "Product", avgTime: "18 days" },
                        { dept: "Design", avgTime: "15 days" },
                        { dept: "Marketing", avgTime: "12 days" },
                      ].map((dept, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{dept.dept}</span>
                          <span className="font-medium">{dept.avgTime}</span>
                        </div>
                      ))}
                    </div>
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
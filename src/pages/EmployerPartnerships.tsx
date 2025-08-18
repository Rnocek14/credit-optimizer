import { Handshake, Building, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export default function EmployerPartnerships() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Training Partnerships</h1>
            <p className="text-muted-foreground">
              Collaborate with educational institutions and training providers
            </p>
          </div>
          <Button>
            <Handshake className="mr-2 h-4 w-4" />
            New Partnership
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Partnerships</CardTitle>
              <Handshake className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                With 8 institutions
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trained Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">189</div>
              <p className="text-xs text-muted-foreground">
                Through partnerships
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Program ROI</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">340%</div>
              <p className="text-xs text-muted-foreground">
                Training investment return
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Partner Rating</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.7</div>
              <p className="text-xs text-muted-foreground">
                Average satisfaction
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">Active Partnerships</TabsTrigger>
            <TabsTrigger value="programs">Training Programs</TabsTrigger>
            <TabsTrigger value="marketplace">Partner Marketplace</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Current Partnerships</CardTitle>
                <CardDescription>
                  Your active training and educational partnerships
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      name: "Tech University",
                      type: "University",
                      programs: 3,
                      participants: 45,
                      status: "Active",
                      rating: "4.8",
                      startDate: "Jan 2024"
                    },
                    {
                      name: "DataSkills Academy",
                      type: "Training Provider",
                      programs: 2,
                      participants: 28,
                      status: "Active",
                      rating: "4.6",
                      startDate: "Feb 2024"
                    },
                    {
                      name: "Cloud Certification Institute",
                      type: "Certification Body",
                      programs: 4,
                      participants: 67,
                      status: "Active",
                      rating: "4.9",
                      startDate: "Dec 2023"
                    },
                    {
                      name: "Business Leadership College",
                      type: "Business School",
                      programs: 1,
                      participants: 12,
                      status: "Trial",
                      rating: "4.3",
                      startDate: "Mar 2024"
                    },
                  ].map((partner, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${partner.name}`} />
                          <AvatarFallback>
                            {partner.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{partner.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {partner.programs} programs • {partner.participants} participants • Since {partner.startDate}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline">{partner.type}</Badge>
                        <span className="text-sm font-medium">⭐ {partner.rating}</span>
                        <Badge variant={partner.status === "Active" ? "secondary" : "default"}>
                          {partner.status}
                        </Badge>
                        <Button variant="ghost" size="sm">Manage</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="programs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Training Programs</CardTitle>
                <CardDescription>
                  Programs offered through your partnerships
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      title: "Advanced React Development",
                      partner: "Tech University",
                      duration: "8 weeks",
                      enrolled: 15,
                      completed: 12,
                      rating: "4.7"
                    },
                    {
                      title: "AWS Solutions Architect",
                      partner: "Cloud Certification Institute",
                      duration: "12 weeks",
                      enrolled: 22,
                      completed: 18,
                      rating: "4.9"
                    },
                    {
                      title: "Data Science Fundamentals",
                      partner: "DataSkills Academy",
                      duration: "6 weeks",
                      enrolled: 18,
                      completed: 16,
                      rating: "4.5"
                    },
                    {
                      title: "Leadership Excellence",
                      partner: "Business Leadership College",
                      duration: "4 weeks",
                      enrolled: 8,
                      completed: 0,
                      rating: "New"
                    },
                  ].map((program, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{program.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {program.partner} • {program.duration}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <p className="text-sm font-medium">{program.enrolled}</p>
                          <p className="text-xs text-muted-foreground">Enrolled</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">{program.completed}</p>
                          <p className="text-xs text-muted-foreground">Completed</p>
                        </div>
                        <Badge variant="outline">
                          {program.rating === "New" ? "New" : `⭐ ${program.rating}`}
                        </Badge>
                        <Button variant="ghost" size="sm">View</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketplace" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Partner Marketplace</CardTitle>
                <CardDescription>
                  Discover new training partners and programs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <Input placeholder="Search training providers..." className="flex-1" />
                  <Button variant="outline">Filter</Button>
                  <Button>Search</Button>
                </div>
                <p className="text-muted-foreground">Partner marketplace coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Partnership Analytics</CardTitle>
                <CardDescription>
                  Track the effectiveness of your training partnerships
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Program Completion Rates</h4>
                    <div className="space-y-2">
                      {[
                        { program: "AWS Certification", rate: 89 },
                        { program: "React Development", rate: 85 },
                        { program: "Data Science", rate: 92 },
                        { program: "Leadership", rate: 75 },
                      ].map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.program}</span>
                          <span className="font-medium">{item.rate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-3">ROI by Partner</h4>
                    <div className="space-y-2">
                      {[
                        { partner: "Tech University", roi: "420%" },
                        { partner: "Cloud Institute", roi: "380%" },
                        { partner: "DataSkills", roi: "340%" },
                        { partner: "Business College", roi: "280%" },
                      ].map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.partner}</span>
                          <span className="font-medium text-green-600">{item.roi}</span>
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
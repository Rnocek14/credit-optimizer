import { Users, Search, Filter, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EmployerTalent() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Talent Pipeline</h1>
            <p className="text-muted-foreground">
              Discover and connect with qualified candidates
            </p>
          </div>
          <Button>
            <Users className="mr-2 h-4 w-4" />
            View Saved Candidates
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Candidates</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,847</div>
              <p className="text-xs text-muted-foreground">
                +234 new this month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Shortlisted</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">
                For current openings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Searches</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">
                Ongoing positions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Match Rate</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87%</div>
              <p className="text-xs text-muted-foreground">
                Skill alignment
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="search" className="w-full">
          <TabsList>
            <TabsTrigger value="search">Talent Search</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="saved">Saved Candidates</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Search Candidates</CardTitle>
                <CardDescription>
                  Find candidates matching your requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <Input placeholder="Search by skills, experience, location..." className="flex-1" />
                  <Select>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Experience Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level</SelectItem>
                      <SelectItem value="mid">Mid Level</SelectItem>
                      <SelectItem value="senior">Senior Level</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      name: "Sarah Johnson",
                      title: "Senior Software Engineer",
                      location: "San Francisco, CA",
                      experience: "5 years",
                      skills: ["React", "TypeScript", "Node.js", "AWS"],
                      match: "95%",
                      availability: "Available"
                    },
                    {
                      name: "Michael Chen",
                      title: "Data Scientist",
                      location: "New York, NY",
                      experience: "3 years",
                      skills: ["Python", "Machine Learning", "SQL", "TensorFlow"],
                      match: "89%",
                      availability: "2 weeks notice"
                    },
                    {
                      name: "Emily Rodriguez",
                      title: "Product Manager",
                      location: "Austin, TX",
                      experience: "4 years",
                      skills: ["Product Strategy", "Agile", "Analytics", "Leadership"],
                      match: "92%",
                      availability: "Available"
                    },
                  ].map((candidate, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate.name}`} />
                          <AvatarFallback>{candidate.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{candidate.name}</p>
                          <p className="text-sm text-muted-foreground">{candidate.title}</p>
                          <p className="text-xs text-muted-foreground">{candidate.location} • {candidate.experience}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 3).map((skill, skillIndex) => (
                            <Badge key={skillIndex} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {candidate.skills.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{candidate.skills.length - 3}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="secondary">{candidate.match} match</Badge>
                        <Badge variant={candidate.availability === "Available" ? "default" : "outline"}>
                          {candidate.availability}
                        </Badge>
                        <Button variant="ghost" size="sm">View Profile</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recruitment Pipeline</CardTitle>
                <CardDescription>
                  Track candidates through your hiring process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Pipeline management tools coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Talent Analytics</CardTitle>
                <CardDescription>
                  Insights into talent market and hiring trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Talent analytics dashboard coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Saved Candidates</CardTitle>
                <CardDescription>
                  Candidates you've saved for future opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">No saved candidates yet. Start searching to save promising profiles.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
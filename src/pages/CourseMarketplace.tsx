import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HubNavigation } from "@/components/HubNavigation";
import { useState } from "react";
import { Search, Star, Clock, DollarSign, ExternalLink, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Mock data for validated courses
const mockValidatedCourses = [
  {
    id: "1",
    title: "Full Stack Web Development Bootcamp",
    platform: "Tech Academy",
    instructor: "Sarah Johnson",
    rating: 4.8,
    reviews: 2341,
    duration: "16 weeks",
    cost: "$1299",
    difficulty: "Intermediate",
    validation_score: 95,
    cri_prediction: 87,
    skills: ["React", "Node.js", "MongoDB", "TypeScript"],
    description: "Comprehensive bootcamp covering modern web development stack with hands-on projects.",
    mentor_endorsed: true,
    completion_rate: 89,
    job_placement_rate: 76
  },
  {
    id: "2", 
    title: "Data Science with Python",
    platform: "DataCamp Pro",
    instructor: "Dr. Michael Chen",
    rating: 4.6,
    reviews: 1876,
    duration: "12 weeks",
    cost: "$799",
    difficulty: "Beginner",
    validation_score: 92,
    cri_prediction: 82,
    skills: ["Python", "Pandas", "Machine Learning", "Visualization"],
    description: "Learn data science fundamentals with Python and build real-world projects.",
    mentor_endorsed: true,
    completion_rate: 94,
    job_placement_rate: 68
  },
  {
    id: "3",
    title: "Cloud Architecture on AWS",
    platform: "Cloud Institute",
    instructor: "Amanda Rodriguez",
    rating: 4.9,
    reviews: 1234,
    duration: "10 weeks", 
    cost: "$1499",
    difficulty: "Advanced",
    validation_score: 98,
    cri_prediction: 91,
    skills: ["AWS", "Docker", "Kubernetes", "DevOps"],
    description: "Master cloud architecture patterns and AWS services for scalable applications.",
    mentor_endorsed: true,
    completion_rate: 85,
    job_placement_rate: 82
  }
];

export default function CourseMarketplace() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");

  const getValidationColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-yellow-600";
    return "text-red-600";
  };

  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredCourses = mockValidatedCourses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPlatform = filterPlatform === "all" || course.platform === filterPlatform;
    const matchesDifficulty = filterDifficulty === "all" || course.difficulty.toLowerCase() === filterDifficulty;
    
    return matchesSearch && matchesPlatform && matchesDifficulty;
  });

  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Course Marketplace</h1>
          <p className="text-muted-foreground">
            Discover mentor-validated courses with proven career outcomes.
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses or skills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="Tech Academy">Tech Academy</SelectItem>
                    <SelectItem value="DataCamp Pro">DataCamp Pro</SelectItem>
                    <SelectItem value="Cloud Institute">Cloud Institute</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {course.platform} • {course.instructor}
                    </CardDescription>
                  </div>
                  {course.mentor_endorsed && (
                    <Badge variant="default" className="ml-2">
                      Mentor Endorsed
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {course.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{course.rating}</span>
                      <span className="text-muted-foreground">({course.reviews})</span>
                    </div>
                    <Badge className={getDifficultyColor(course.difficulty)}>
                      {course.difficulty}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{course.cost}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Validation Score:</span>
                      <span className={getValidationColor(course.validation_score)}>
                        {course.validation_score}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>CRI Prediction:</span>
                      <span className={getValidationColor(course.cri_prediction)}>
                        {course.cri_prediction}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Job Placement:</span>
                      <span className="text-muted-foreground">{course.job_placement_rate}%</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {course.skills.slice(0, 4).map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1" variant="outline">
                      View Details
                    </Button>
                    <Button size="icon" variant="outline">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Courses Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or browse all courses.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
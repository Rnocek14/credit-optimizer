import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  ExternalLink, 
  MapPin, 
  Clock, 
  Star, 
  BookOpen, 
  User, 
  Zap, 
  TrendingUp, 
  Plus, 
  Check, 
  Filter,
  Code,
  Server,
  Cloud,
  Database,
  Settings,
  Smartphone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  platform: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  cost: string;
  skill_tags: string[];
  skill_id: string;
  url?: string;
  mentor_name?: string;
  xp_reward: number;
  cri_impact: number;
  category: 'Frontend' | 'Backend' | 'Cloud' | 'Data Science' | 'DevOps' | 'Mobile';
  is_recommended: boolean;
  instructor_verified: boolean;
  top_rated: boolean;
  created_at: string;
}

interface Mentor {
  id: string;
  user_id: string;
  name: string;
  role_title: string;
  years_experience: number;
  skills: string[];
  location: string;
  category: 'Frontend' | 'Backend' | 'Cloud' | 'Data Science' | 'DevOps' | 'Mobile';
  skill_id: string;
  xp_reward: number;
  cri_impact: number;
  hourly_rate?: string;
  top_rated: boolean;
  mentorship_available: boolean;
}

// Enhanced mock data with Life Path platform requirements
const mockCourses: Course[] = [
  {
    id: "1",
    title: "Advanced React Hooks",
    platform: "Scrimba",
    difficulty: "Advanced",
    cost: "Free",
    skill_tags: ["React", "Hooks", "State Management"],
    skill_id: "react-advanced",
    url: "https://scrimba.com/react-hooks",
    mentor_name: "Sarah Chen",
    xp_reward: 120,
    cri_impact: 15,
    category: "Frontend",
    is_recommended: true,
    instructor_verified: true,
    top_rated: true,
    created_at: "2024-01-15T10:00:00Z"
  },
  {
    id: "2",
    title: "Node.js API Design",
    platform: "Udemy",
    difficulty: "Intermediate",
    cost: "$49.99",
    skill_tags: ["Node.js", "API", "Express", "MongoDB"],
    skill_id: "nodejs-api",
    mentor_name: "Alex Rodriguez",
    xp_reward: 90,
    cri_impact: 12,
    category: "Backend",
    is_recommended: false,
    instructor_verified: true,
    top_rated: false,
    created_at: "2024-02-01T14:30:00Z"
  },
  {
    id: "3",
    title: "AWS Cloud Fundamentals",
    platform: "AWS Training",
    difficulty: "Beginner",
    cost: "Free",
    skill_tags: ["AWS", "EC2", "S3", "Lambda"],
    skill_id: "aws-basics",
    mentor_name: "Jordan Smith",
    xp_reward: 80,
    cri_impact: 10,
    category: "Cloud",
    is_recommended: true,
    instructor_verified: true,
    top_rated: true,
    created_at: "2024-01-20T09:15:00Z"
  },
  {
    id: "4",
    title: "TypeScript Deep Dive",
    platform: "Frontend Masters",
    difficulty: "Advanced",
    cost: "$39/month",
    skill_tags: ["TypeScript", "JavaScript", "Types"],
    skill_id: "typescript-advanced",
    mentor_name: "Emily Watson",
    xp_reward: 110,
    cri_impact: 14,
    category: "Frontend",
    is_recommended: true,
    instructor_verified: true,
    top_rated: true,
    created_at: "2024-03-10T16:45:00Z"
  },
  {
    id: "5",
    title: "Python Data Analysis",
    platform: "Coursera",
    difficulty: "Intermediate",
    cost: "$49/month",
    skill_tags: ["Python", "Pandas", "NumPy", "Visualization"],
    skill_id: "python-data",
    mentor_name: "Dr. Michael Kim",
    xp_reward: 100,
    cri_impact: 13,
    category: "Data Science",
    is_recommended: false,
    instructor_verified: true,
    top_rated: true,
    created_at: "2024-02-15T11:20:00Z"
  },
  {
    id: "6",
    title: "Docker & Kubernetes",
    platform: "Linux Academy",
    difficulty: "Advanced",
    cost: "$29/month",
    skill_tags: ["Docker", "Kubernetes", "Containers"],
    skill_id: "docker-k8s",
    mentor_name: "Chris Thompson",
    xp_reward: 130,
    cri_impact: 16,
    category: "DevOps",
    is_recommended: true,
    instructor_verified: true,
    top_rated: false,
    created_at: "2024-01-30T13:45:00Z"
  },
  {
    id: "7",
    title: "React Native Essentials",
    platform: "Expo Learn",
    difficulty: "Intermediate",
    cost: "Free",
    skill_tags: ["React Native", "Mobile", "Expo"],
    skill_id: "react-native",
    mentor_name: "Lisa Park",
    xp_reward: 95,
    cri_impact: 11,
    category: "Mobile",
    is_recommended: false,
    instructor_verified: true,
    top_rated: true,
    created_at: "2024-03-05T08:30:00Z"
  },
  {
    id: "8",
    title: "GraphQL Complete Guide",
    platform: "Apollo Academy",
    difficulty: "Advanced",
    cost: "$69.99",
    skill_tags: ["GraphQL", "Apollo", "API"],
    skill_id: "graphql-advanced",
    mentor_name: "David Lee",
    xp_reward: 115,
    cri_impact: 14,
    category: "Backend",
    is_recommended: true,
    instructor_verified: true,
    top_rated: true,
    created_at: "2024-02-20T12:00:00Z"
  },
  {
    id: "9",
    title: "Machine Learning Basics",
    platform: "Kaggle Learn",
    difficulty: "Beginner",
    cost: "Free",
    skill_tags: ["ML", "Python", "Scikit-learn"],
    skill_id: "ml-basics",
    mentor_name: "Dr. Anna Zhang",
    xp_reward: 85,
    cri_impact: 10,
    category: "Data Science",
    is_recommended: false,
    instructor_verified: true,
    top_rated: false,
    created_at: "2024-03-15T15:20:00Z"
  },
  {
    id: "10",
    title: "Terraform Infrastructure",
    platform: "HashiCorp Learn",
    difficulty: "Intermediate",
    cost: "Free",
    skill_tags: ["Terraform", "IaC", "AWS"],
    skill_id: "terraform",
    mentor_name: "Mark Johnson",
    xp_reward: 105,
    cri_impact: 12,
    category: "DevOps",
    is_recommended: true,
    instructor_verified: true,
    top_rated: true,
    created_at: "2024-03-01T10:15:00Z"
  }
];

const mockMentors: Mentor[] = [
  {
    id: "1",
    user_id: "2b458624-d498-4cca-a63d-9341cc20e363",
    name: "Sarah Chen",
    role_title: "Senior Frontend Architect",
    years_experience: 8,
    skills: ["React", "TypeScript", "Next.js", "GraphQL"],
    location: "San Francisco, CA",
    category: "Frontend",
    skill_id: "react-advanced",
    xp_reward: 50,
    cri_impact: 8,
    hourly_rate: "$120/hr",
    top_rated: true,
    mentorship_available: true
  },
  {
    id: "2", 
    user_id: "3c459625-e499-5ddb-b64d-a442dd21f474",
    name: "Alex Rodriguez",
    role_title: "Backend Engineering Lead",
    years_experience: 10,
    skills: ["Node.js", "Python", "PostgreSQL", "Redis"],
    location: "Austin, TX",
    category: "Backend",
    skill_id: "nodejs-api",
    xp_reward: 60,
    cri_impact: 9,
    hourly_rate: "$140/hr",
    top_rated: true,
    mentorship_available: true
  },
  {
    id: "3",
    user_id: "4d56a736-f5aa-6eec-c75e-b553ee32e585", 
    name: "Dr. Michael Kim",
    role_title: "ML Engineering Manager",
    years_experience: 12,
    skills: ["Python", "TensorFlow", "AWS", "Spark"],
    location: "Seattle, WA",
    category: "Data Science",
    skill_id: "python-data",
    xp_reward: 70,
    cri_impact: 11,
    hourly_rate: "$160/hr",
    top_rated: true,
    mentorship_available: true
  },
  {
    id: "4",
    user_id: "5e67b847-g6bb-7ffd-d86f-c664ff43f696",
    name: "Jordan Smith",
    role_title: "Cloud Solutions Architect",
    years_experience: 9,
    skills: ["AWS", "Terraform", "Kubernetes", "Docker"],
    location: "Denver, CO",
    category: "Cloud",
    skill_id: "aws-basics",
    xp_reward: 55,
    cri_impact: 9,
    hourly_rate: "$130/hr",
    top_rated: false,
    mentorship_available: true
  },
  {
    id: "5",
    user_id: "6f78c958-h7cc-8ggf-e97g-d775gg54g707",
    name: "Emily Watson",
    role_title: "Staff Software Engineer",
    years_experience: 11,
    skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
    location: "New York, NY",
    category: "Frontend",
    skill_id: "typescript-advanced",
    xp_reward: 65,
    cri_impact: 10,
    hourly_rate: "$150/hr",
    top_rated: true,
    mentorship_available: true
  }
];

const CourseCard = ({ course, onSaveToRoadmap }: { course: Course; onSaveToRoadmap: (courseId: string) => void }) => {
  const getCategoryIcon = (category: Course['category']) => {
    switch (category) {
      case 'Frontend': return <Code className="h-4 w-4" />;
      case 'Backend': return <Server className="h-4 w-4" />;
      case 'Cloud': return <Cloud className="h-4 w-4" />;
      case 'Data Science': return <Database className="h-4 w-4" />;
      case 'DevOps': return <Settings className="h-4 w-4" />;
      case 'Mobile': return <Smartphone className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: Course['difficulty']) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Intermediate': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Advanced': return 'bg-red-500/20 text-red-300 border-red-500/30';
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700 hover:border-slate-600 transition-all duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {getCategoryIcon(course.category)}
            <Badge variant="outline" className="text-slate-300 border-slate-600">
              {course.category}
            </Badge>
          </div>
          <div className="flex gap-1">
            {course.is_recommended && (
              <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs">
                🔥 Recommended
              </Badge>
            )}
            {course.instructor_verified && (
              <Badge variant="outline" className="text-blue-300 border-blue-500/30 text-xs">
                ✓ Verified
              </Badge>
            )}
            {course.top_rated && (
              <Badge variant="outline" className="text-yellow-300 border-yellow-500/30 text-xs">
                <Star className="h-3 w-3 mr-1" />
                Top Rated
              </Badge>
            )}
          </div>
        </div>
        
        <CardTitle className="text-slate-100 text-lg leading-tight group-hover:text-white transition-colors">
          {course.title}
        </CardTitle>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">{course.platform}</span>
          <Badge variant="outline" className={getDifficultyColor(course.difficulty)}>
            {course.difficulty}
          </Badge>
        </div>
        
        {course.mentor_name && (
          <p className="text-xs text-slate-500">by {course.mentor_name}</p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        <div className="flex flex-wrap gap-1">
          {course.skill_tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs bg-slate-800 text-slate-300">
              {tag}
            </Badge>
          ))}
          {course.skill_tags.length > 3 && (
            <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-300">
              +{course.skill_tags.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-green-400">
              <Zap className="h-3 w-3" />
              +{course.xp_reward} XP
            </div>
            <div className="flex items-center gap-1 text-blue-400">
              <TrendingUp className="h-3 w-3" />
              +{course.cri_impact} CRI
            </div>
          </div>
          <span className="text-slate-300 font-medium">{course.cost}</span>
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            onClick={() => onSaveToRoadmap(course.id)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Save to Roadmap
          </Button>
          {course.url && (
            <Button size="sm" variant="default" asChild>
              <a href={course.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const MentorCard = ({ mentor, onConnect }: { mentor: Mentor; onConnect: (mentorId: string) => void }) => {
  const getCategoryIcon = (category: Mentor['category']) => {
    switch (category) {
      case 'Frontend': return <Code className="h-4 w-4" />;
      case 'Backend': return <Server className="h-4 w-4" />;
      case 'Cloud': return <Cloud className="h-4 w-4" />;
      case 'Data Science': return <Database className="h-4 w-4" />;
      case 'DevOps': return <Settings className="h-4 w-4" />;
      case 'Mobile': return <Smartphone className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700 hover:border-slate-600 transition-all duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {getCategoryIcon(mentor.category)}
            <Badge variant="outline" className="text-slate-300 border-slate-600">
              {mentor.category}
            </Badge>
          </div>
          {mentor.top_rated && (
            <Badge variant="outline" className="text-yellow-300 border-yellow-500/30 text-xs">
              <Star className="h-3 w-3 mr-1" />
              Top Rated
            </Badge>
          )}
        </div>
        
        <CardTitle className="text-slate-100 text-lg group-hover:text-white transition-colors">
          {mentor.name}
        </CardTitle>
        
        <p className="text-slate-400 text-sm">{mentor.role_title}</p>
        
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {mentor.years_experience}+ years
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {mentor.location}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        <div className="flex flex-wrap gap-1">
          {mentor.skills.slice(0, 3).map((skill, index) => (
            <Badge key={index} variant="secondary" className="text-xs bg-slate-800 text-slate-300">
              {skill}
            </Badge>
          ))}
          {mentor.skills.length > 3 && (
            <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-300">
              +{mentor.skills.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-green-400">
              <Zap className="h-3 w-3" />
              +{mentor.xp_reward} XP
            </div>
            <div className="flex items-center gap-1 text-blue-400">
              <TrendingUp className="h-3 w-3" />
              +{mentor.cri_impact} CRI
            </div>
          </div>
          {mentor.hourly_rate && (
            <span className="text-slate-300 font-medium text-sm">{mentor.hourly_rate}</span>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            onClick={() => onConnect(mentor.id)}
          >
            <User className="h-3 w-3 mr-1" />
            Connect
          </Button>
          <Button size="sm" variant="default" asChild>
            <Link to={`/resume/${mentor.user_id}`}>
              View Profile
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Explore() {
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [mentors, setMentors] = useState<Mentor[]>(mockMentors);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const categories = ["All", "Frontend", "Backend", "Cloud", "Data Science", "DevOps", "Mobile"];
  const additionalFilters = ["🔥 Recommended", "Beginner", "Free", "Top Rated"];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const filteredCourses = courses.filter(course => {
    if (activeFilter === "All") return true;
    if (activeFilter === "🔥 Recommended") return course.is_recommended;
    if (activeFilter === "Free") return course.cost === "Free";
    if (activeFilter === "Top Rated") return course.top_rated;
    if (activeFilter === "Beginner") return course.difficulty === "Beginner";
    return course.category === activeFilter;
  });

  const filteredMentors = mentors.filter(mentor => {
    if (activeFilter === "All") return true;
    if (activeFilter === "🔥 Recommended") return mentor.top_rated;
    if (activeFilter === "Top Rated") return mentor.top_rated;
    return mentor.category === activeFilter;
  });

  const handleSaveToRoadmap = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      toast({
        title: "Added to Roadmap!",
        description: `"${course.title}" has been saved to your learning roadmap.`,
      });
    }
  };

  const handleConnectMentor = (mentorId: string) => {
    const mentor = mentors.find(m => m.id === mentorId);
    if (mentor) {
      toast({
        title: "Connection Request Sent!",
        description: `Your request to connect with ${mentor.name} has been sent.`,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="container mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-80 bg-slate-800 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">🎯 Explore Your Path</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Discover courses and mentors tailored to your roadmap and skill tree progress
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-200">Filter by Category</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden border-slate-600 text-slate-300"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
          
          <div className={`flex flex-wrap gap-2 ${showFilters ? 'block' : 'hidden md:flex'}`}>
            {[...categories, ...additionalFilters].map((filter) => (
              <Button
                key={filter}
                variant={activeFilter === filter ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full ${
                  activeFilter === filter 
                    ? "bg-blue-600 text-white" 
                    : "border-slate-600 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>

        {/* Courses Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              Courses ({filteredCourses.length})
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard 
                key={course.id} 
                course={course} 
                onSaveToRoadmap={handleSaveToRoadmap}
              />
            ))}
          </div>
        </div>

        {/* Mentors Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <User className="h-6 w-6" />
              Mentors ({filteredMentors.length})
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMentors.map((mentor) => (
              <MentorCard 
                key={mentor.id} 
                mentor={mentor} 
                onConnect={handleConnectMentor}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
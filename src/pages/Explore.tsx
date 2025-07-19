import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  Trophy, 
  BookOpen, 
  Users,
  Heart,
  Play,
  Bookmark,
  TrendingUp,
  Award,
  ChevronRight,
  Zap,
  Target,
  User,
  MapPin,
  Calendar,
  ExternalLink,
  Plus,
  Code,
  Server,
  Cloud,
  Database,
  Settings,
  Smartphone,
  Brain,
  Lock,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  layer: number;
  xpReward: number;
  criBoost?: number;
  duration: string;
  rating: number;
  enrollments: number;
  difficulty: string;
  tags: string[];
  instructor: string;
  platform: string;
  cost: string;
  verified: boolean;
  url?: string;
  skillGapFiller: boolean;
  aiSuggested: boolean;
}

interface Mentor {
  id: string;
  name: string;
  title: string;
  company: string;
  expertise: string[];
  rating: number;
  reviews: number;
  hourlyRate?: number;
  responseTime: string;
  location: string;
  verified: boolean;
  availableSlots: number;
  bio: string;
  avatar?: string;
  nextLayerSpecialist: boolean;
  topRated: boolean;
}

// Enhanced mock data with Life Path platform features
const mockCourses: Course[] = [
  {
    id: '1',
    title: 'React Fundamentals',
    description: 'Learn the basics of React including components, state, and props. Perfect for building modern UIs.',
    category: 'Frontend',
    layer: 1,
    xpReward: 30,
    criBoost: 15,
    duration: '4 weeks',
    rating: 4.8,
    enrollments: 1250,
    difficulty: 'Beginner',
    tags: ['React', 'JavaScript', 'Web Development'],
    instructor: 'Sarah Chen',
    platform: 'TechLearn',
    cost: 'Free',
    verified: true,
    skillGapFiller: true,
    aiSuggested: true
  },
  {
    id: '2',
    title: 'Advanced TypeScript Patterns',
    description: 'Master complex TypeScript patterns and advanced type system features for scalable applications.',
    category: 'Frontend',
    layer: 2,
    xpReward: 45,
    criBoost: 20,
    duration: '6 weeks',
    rating: 4.9,
    enrollments: 890,
    difficulty: 'Advanced',
    tags: ['TypeScript', 'JavaScript', 'Type System'],
    instructor: 'Alex Rodriguez',
    platform: 'CodeMaster',
    cost: '$89',
    verified: true,
    skillGapFiller: false,
    aiSuggested: true
  },
  {
    id: '3',
    title: 'Node.js Backend Development',
    description: 'Build scalable backend applications with Node.js and Express. Learn APIs, databases, and deployment.',
    category: 'Backend',
    layer: 2,
    xpReward: 40,
    criBoost: 18,
    duration: '8 weeks',
    rating: 4.7,
    enrollments: 2100,
    difficulty: 'Intermediate',
    tags: ['Node.js', 'Express', 'API Development'],
    instructor: 'Marcus Johnson',
    platform: 'DevAcademy',
    cost: '$129',
    verified: false,
    skillGapFiller: true,
    aiSuggested: false
  },
  {
    id: '4',
    title: 'AWS Cloud Architecture',
    description: 'Design and deploy cloud infrastructure on AWS. Master EC2, S3, Lambda, and more.',
    category: 'Cloud',
    layer: 3,
    xpReward: 60,
    criBoost: 25,
    duration: '10 weeks',
    rating: 4.6,
    enrollments: 756,
    difficulty: 'Advanced',
    tags: ['AWS', 'Cloud', 'Infrastructure'],
    instructor: 'Emma Thompson',
    platform: 'CloudGuru',
    cost: '$199',
    verified: true,
    skillGapFiller: false,
    aiSuggested: false
  },
  {
    id: '5',
    title: 'Docker & Kubernetes Essentials',
    description: 'Containerize and orchestrate applications with Docker and Kubernetes for modern DevOps.',
    category: 'DevOps',
    layer: 2,
    xpReward: 50,
    criBoost: 22,
    duration: '7 weeks',
    rating: 4.5,
    enrollments: 980,
    difficulty: 'Intermediate',
    tags: ['Docker', 'Kubernetes', 'DevOps'],
    instructor: 'Chris Wilson',
    platform: 'DevOps Pro',
    cost: '$149',
    verified: true,
    skillGapFiller: true,
    aiSuggested: true
  },
  {
    id: '6',
    title: 'JavaScript Algorithms & Data Structures',
    description: 'Master fundamental algorithms and data structures using JavaScript. Ace your interviews.',
    category: 'Frontend',
    layer: 1,
    xpReward: 35,
    criBoost: 16,
    duration: '5 weeks',
    rating: 4.7,
    enrollments: 1800,
    difficulty: 'Intermediate',
    tags: ['JavaScript', 'Algorithms', 'Data Structures'],
    instructor: 'David Park',
    platform: 'AlgoMaster',
    cost: 'Free',
    verified: true,
    skillGapFiller: false,
    aiSuggested: false
  }
];

const mockMentors: Mentor[] = [
  {
    id: '1',
    name: 'Dr. Michael Zhang',
    title: 'Senior Software Engineer',
    company: 'Google',
    expertise: ['React', 'TypeScript', 'System Design', 'Performance'],
    rating: 4.9,
    reviews: 127,
    hourlyRate: 150,
    responseTime: '< 2 hours',
    location: 'San Francisco, CA',
    verified: true,
    availableSlots: 8,
    bio: 'Former Google Tech Lead with 10+ years experience in scalable web applications and mentoring engineers.',
    avatar: '/avatars/michael.jpg',
    nextLayerSpecialist: true,
    topRated: true
  },
  {
    id: '2',
    name: 'Lisa Park',
    title: 'Principal Engineer',
    company: 'Netflix',
    expertise: ['Node.js', 'Microservices', 'DevOps', 'AWS'],
    rating: 4.8,
    reviews: 89,
    hourlyRate: 180,
    responseTime: '< 4 hours',
    location: 'Seattle, WA',
    verified: true,
    availableSlots: 5,
    bio: 'Netflix Principal Engineer specializing in backend systems and cloud architecture at scale.',
    avatar: '/avatars/lisa.jpg',
    nextLayerSpecialist: true,
    topRated: true
  },
  {
    id: '3',
    name: 'James Wilson',
    title: 'Lead Developer',
    company: 'Stripe',
    expertise: ['JavaScript', 'Payment Systems', 'Security', 'APIs'],
    rating: 4.7,
    reviews: 156,
    hourlyRate: 120,
    responseTime: '< 6 hours',
    location: 'Austin, TX',
    verified: false,
    availableSlots: 12,
    bio: 'Stripe Lead Developer with expertise in fintech and secure payment processing systems.',
    avatar: '/avatars/james.jpg',
    nextLayerSpecialist: false,
    topRated: true
  },
  {
    id: '4',
    name: 'Sarah Martinez',
    title: 'Cloud Solutions Architect',
    company: 'Microsoft Azure',
    expertise: ['Azure', 'Cloud Architecture', 'Terraform', 'Security'],
    rating: 4.9,
    reviews: 203,
    hourlyRate: 160,
    responseTime: '< 3 hours',
    location: 'Austin, TX',
    verified: true,
    availableSlots: 6,
    bio: 'Microsoft Azure Solutions Architect helping companies migrate to cloud and optimize infrastructure.',
    avatar: '/avatars/sarah.jpg',
    nextLayerSpecialist: true,
    topRated: true
  }
];

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("courses");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Simulate fetching user's skill tree progress
  const [userLayer, setUserLayer] = useState(1); // Current highest unlocked layer
  const [skillGaps, setSkillGaps] = useState(['React', 'TypeScript']); // Skills needed for next layer

  // Filter and sort logic
  const getFilteredCourses = () => {
    let filtered = mockCourses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           course.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "all" || course.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesVerified = !showVerifiedOnly || course.verified;
      
      return matchesSearch && matchesCategory && matchesVerified;
    });

    // Sort courses
    switch (sortBy) {
      case "xp":
        filtered.sort((a, b) => b.xpReward - a.xpReward);
        break;
      case "cri":
        filtered.sort((a, b) => (b.criBoost || 0) - (a.criBoost || 0));
        break;
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "popularity":
        filtered.sort((a, b) => b.enrollments - a.enrollments);
        break;
      default:
        // Relevance - prioritize AI suggested and skill gap fillers
        filtered.sort((a, b) => {
          const aScore = (a.aiSuggested ? 100 : 0) + (a.skillGapFiller ? 50 : 0);
          const bScore = (b.aiSuggested ? 100 : 0) + (b.skillGapFiller ? 50 : 0);
          return bScore - aScore;
        });
        break;
    }

    return filtered;
  };

  const getFilteredMentors = () => {
    let filtered = mockMentors.filter(mentor => {
      const matchesSearch = mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           mentor.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           mentor.expertise.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesVerified = !showVerifiedOnly || mentor.verified;
      
      return matchesSearch && matchesVerified;
    });

    // Sort mentors
    switch (sortBy) {
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "reviews":
        filtered.sort((a, b) => b.reviews - a.reviews);
        break;
      case "availability":
        filtered.sort((a, b) => b.availableSlots - a.availableSlots);
        break;
      default:
        // Relevance - prioritize next layer specialists and top rated
        filtered.sort((a, b) => {
          const aScore = (a.nextLayerSpecialist ? 100 : 0) + (a.topRated ? 50 : 0);
          const bScore = (b.nextLayerSpecialist ? 100 : 0) + (b.topRated ? 50 : 0);
          return bScore - aScore;
        });
        break;
    }

    return filtered;
  };

  const toggleSaveItem = (itemId: string) => {
    const newSavedItems = new Set(savedItems);
    if (newSavedItems.has(itemId)) {
      newSavedItems.delete(itemId);
      toast({
        title: "Removed from saved",
        description: "Item removed from your saved list"
      });
    } else {
      newSavedItems.add(itemId);
      toast({
        title: "Saved successfully",
        description: "Item added to your saved list"
      });
    }
    setSavedItems(newSavedItems);
  };

  // Get curated sections
  const getSuggestedCourses = () => getFilteredCourses().filter(c => c.aiSuggested).slice(0, 3);
  const getSkillGapCourses = () => getFilteredCourses().filter(c => c.skillGapFiller).slice(0, 3);
  const getTopRatedMentors = () => getFilteredMentors().filter(m => m.topRated).slice(0, 3);
  const getNextLayerMentors = () => getFilteredMentors().filter(m => m.nextLayerSpecialist).slice(0, 3);

  const CourseCard = ({ course }: { course: Course }) => (
    <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-all duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {course.aiSuggested && (
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs">
                  <Brain className="h-3 w-3 mr-1" />
                  AI Suggested
                </Badge>
              )}
              {course.skillGapFiller && (
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  Gap Filler
                </Badge>
              )}
              {course.verified && (
                <Badge className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
                  <Award className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg text-slate-100 group-hover:text-blue-300 transition-colors">
              {course.title}
            </CardTitle>
            <p className="text-sm text-slate-400 mt-1">{course.instructor} • {course.platform}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSaveItem(course.id)}
            className="text-slate-400 hover:text-red-400"
          >
            <Heart className={`h-4 w-4 ${savedItems.has(course.id) ? 'fill-red-400 text-red-400' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-300 line-clamp-2">{course.description}</p>
        
        {/* Tags and Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-slate-700 border-slate-600 text-slate-300">
            Layer {course.layer}
          </Badge>
          <Badge variant="outline" className="bg-slate-700 border-slate-600 text-slate-300">
            {course.category}
          </Badge>
          <Badge variant="outline" className={`${
            course.difficulty === 'Beginner' ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30' :
            course.difficulty === 'Intermediate' ? 'bg-amber-600/20 text-amber-300 border-amber-500/30' :
            'bg-red-600/20 text-red-300 border-red-500/30'
          }`}>
            {course.difficulty}
          </Badge>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {course.tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs bg-slate-700 text-slate-300">
              {tag}
            </Badge>
          ))}
          {course.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
              +{course.tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <span className="text-slate-300">{course.xpReward} XP</span>
          </div>
          {course.criBoost && (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-slate-300">+{course.criBoost} CRI</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-slate-300">{course.duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-400" />
            <span className="text-slate-300">{course.rating} ({course.enrollments})</span>
          </div>
        </div>

        {/* Price and Action */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <span className="font-semibold text-slate-200">{course.cost}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-slate-300 border-slate-600">
              <Plus className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white" size="sm">
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const MentorCard = ({ mentor }: { mentor: Mentor }) => (
    <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-all duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-slate-300" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {mentor.nextLayerSpecialist && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Next Layer
                  </Badge>
                )}
                {mentor.topRated && (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    Top Rated
                  </Badge>
                )}
                {mentor.verified && (
                  <Badge className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
                    <Award className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg text-slate-100 group-hover:text-purple-300 transition-colors">
                {mentor.name}
              </CardTitle>
              <p className="text-sm text-slate-400">{mentor.title}</p>
              <p className="text-xs text-slate-500">{mentor.company}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSaveItem(mentor.id)}
            className="text-slate-400 hover:text-red-400"
          >
            <Heart className={`h-4 w-4 ${savedItems.has(mentor.id) ? 'fill-red-400 text-red-400' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-300 line-clamp-2">{mentor.bio}</p>
        
        {/* Expertise Tags */}
        <div className="flex flex-wrap gap-2">
          {mentor.expertise.slice(0, 3).map((skill, index) => (
            <Badge key={index} variant="outline" className="bg-slate-700 border-slate-600 text-slate-300">
              {skill}
            </Badge>
          ))}
          {mentor.expertise.length > 3 && (
            <Badge variant="outline" className="bg-slate-700 border-slate-600 text-slate-300">
              +{mentor.expertise.length - 3} more
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-400" />
            <span className="text-slate-300">{mentor.rating} ({mentor.reviews})</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-slate-300">{mentor.responseTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span className="text-slate-300">{mentor.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-400" />
            <span className="text-slate-300">{mentor.availableSlots} slots</span>
          </div>
        </div>

        {/* Price and Action */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <span className="font-semibold text-slate-200">
            {mentor.hourlyRate ? `$${mentor.hourlyRate}/hr` : 'Contact for pricing'}
          </span>
          <Button className="bg-purple-600 hover:bg-purple-500 text-white" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Book Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
            🌟 Explore Learning Paths
          </h1>
          <p className="text-slate-400 text-lg">
            Discover courses, mentors, and resources tailored to your learning journey and skill gaps
          </p>
        </div>

        {/* User Progress Context */}
        <Card className="bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600 rounded-xl shadow-lg mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-400" />
                  <span className="text-slate-300">Current Layer: <span className="font-semibold text-white">{userLayer}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-amber-400" />
                  <span className="text-slate-300">Next Layer Skills: <span className="font-semibold text-amber-300">{skillGaps.join(', ')}</span></span>
                </div>
              </div>
              <Badge className="bg-blue-600 hover:bg-blue-500">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Personalized
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <Card className="bg-slate-800 border-slate-700 rounded-xl shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search courses, mentors, or skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
                />
              </div>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px] bg-slate-700 border-slate-600 text-slate-100">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="frontend">Frontend</SelectItem>
                  <SelectItem value="backend">Backend</SelectItem>
                  <SelectItem value="cloud">Cloud</SelectItem>
                  <SelectItem value="devops">DevOps</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600 text-slate-100">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="xp">XP Reward</SelectItem>
                  <SelectItem value="cri">CRI Boost</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="popularity">Popularity</SelectItem>
                </SelectContent>
              </Select>

              {/* Verified Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="verified-only"
                  checked={showVerifiedOnly}
                  onCheckedChange={setShowVerifiedOnly}
                />
                <Label htmlFor="verified-only" className="text-slate-300">Verified Only</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 border-slate-700">
            <TabsTrigger value="courses" className="data-[state=active]:bg-slate-700">
              <BookOpen className="h-4 w-4 mr-2" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="mentors" className="data-[state=active]:bg-slate-700">
              <Users className="h-4 w-4 mr-2" />
              Mentors
            </TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-8">
            {/* AI Suggested Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-400" />
                <h2 className="text-2xl font-semibold text-slate-100">Suggested for You</h2>
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">AI Curated</Badge>
              </div>
              <p className="text-slate-400">Courses tailored to your current progress and career goals</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getSuggestedCourses().map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>

            {/* Skill Gap Fillers */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-400" />
                <h2 className="text-2xl font-semibold text-slate-100">Skill Gap Fillers</h2>
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">Unlock Next Layer</Badge>
              </div>
              <p className="text-slate-400">Complete these to unlock Layer {userLayer + 1} in your skill tree</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getSkillGapCourses().map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>

            {/* All Courses */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-slate-100">All Courses</h2>
                <Badge variant="outline" className="bg-slate-700 border-slate-600 text-slate-300">
                  {getFilteredCourses().length} courses
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getFilteredCourses().map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Mentors Tab */}
          <TabsContent value="mentors" className="space-y-8">
            {/* Top-Rated Mentors */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400" />
                <h2 className="text-2xl font-semibold text-slate-100">Top-Rated Mentors</h2>
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">Highest Rated</Badge>
              </div>
              <p className="text-slate-400">Industry experts with exceptional mentoring track records</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getTopRatedMentors().map((mentor) => (
                  <MentorCard key={mentor.id} mentor={mentor} />
                ))}
              </div>
            </div>

            {/* Next Layer Specialists */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-purple-400" />
                <h2 className="text-2xl font-semibold text-slate-100">Next Layer Specialists</h2>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">Layer {userLayer + 1}</Badge>
              </div>
              <p className="text-slate-400">Mentors specializing in skills you need for your next advancement</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getNextLayerMentors().map((mentor) => (
                  <MentorCard key={mentor.id} mentor={mentor} />
                ))}
              </div>
            </div>

            {/* All Mentors */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-slate-100">All Mentors</h2>
                <Badge variant="outline" className="bg-slate-700 border-slate-600 text-slate-300">
                  {getFilteredMentors().length} mentors
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getFilteredMentors().map((mentor) => (
                  <MentorCard key={mentor.id} mentor={mentor} />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Saved Items Quick Access */}
        {savedItems.size > 0 && (
          <Card className="bg-slate-800 border-slate-700 rounded-xl shadow-lg mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Bookmark className="h-5 w-5 text-purple-400" />
                Saved Items ({savedItems.size})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {Array.from(savedItems).map((itemId) => {
                  const course = mockCourses.find(c => c.id === itemId);
                  const mentor = mockMentors.find(m => m.id === itemId);
                  const item = course || mentor;
                  
                  return item ? (
                    <Badge key={itemId} variant="outline" className="bg-purple-600/20 border-purple-500/30 text-purple-300">
                      {course ? course.title : mentor?.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
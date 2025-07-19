import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, MapPin, Clock } from "lucide-react";

interface Course {
  id: string;
  title: string;
  platform: string;
  difficulty?: string;
  cost?: string;
  skill_tags: string[];
  url?: string;
  mentor_name?: string;
  is_ai_recommended: boolean;
  created_at: string;
}

interface FeaturedMentor {
  id: string;
  user_id: string;
  name: string;
  role_title?: string;
  years_experience?: number;
  skills: string[];
  location?: string;
}

// Demo data for courses
const demoCourses: Course[] = [
  {
    id: "1",
    title: "Advanced React Patterns",
    platform: "Udemy",
    difficulty: "Advanced",
    cost: "$89.99",
    skill_tags: ["React", "JavaScript", "Frontend", "Hooks"],
    url: "https://udemy.com/react-patterns",
    mentor_name: "Aisha Khan",
    is_ai_recommended: true,
    created_at: "2024-01-15T10:00:00Z"
  },
  {
    id: "2",
    title: "Node.js Backend Development",
    platform: "Coursera",
    difficulty: "Intermediate",
    cost: "Free",
    skill_tags: ["Node.js", "Backend", "API", "Express"],
    mentor_name: "Mateo Silva",
    is_ai_recommended: false,
    created_at: "2024-02-01T14:30:00Z"
  },
  {
    id: "3",
    title: "Full Stack Web Development",
    platform: "FreeCodeCamp",
    difficulty: "Beginner",
    cost: "Free",
    skill_tags: ["HTML", "CSS", "JavaScript", "MongoDB"],
    mentor_name: "Jade Chen",
    is_ai_recommended: true,
    created_at: "2024-01-20T09:15:00Z"
  },
  {
    id: "4",
    title: "TypeScript Fundamentals",
    platform: "Pluralsight",
    difficulty: "Intermediate",
    cost: "$29/month",
    skill_tags: ["TypeScript", "JavaScript", "Frontend"],
    mentor_name: "Aisha Khan",
    is_ai_recommended: false,
    created_at: "2024-03-10T16:45:00Z"
  },
  {
    id: "5",
    title: "AWS Cloud Practitioner",
    platform: "AWS Training",
    difficulty: "Beginner",
    cost: "Free",
    skill_tags: ["AWS", "Cloud", "DevOps"],
    mentor_name: "Mateo Silva",
    is_ai_recommended: true,
    created_at: "2024-02-15T11:20:00Z"
  },
  {
    id: "6",
    title: "Python for Data Science",
    platform: "Coursera",
    difficulty: "Intermediate",
    cost: "$49/month",
    skill_tags: ["Python", "Data Science", "Machine Learning"],
    mentor_name: "Jade Chen",
    is_ai_recommended: true,
    created_at: "2024-01-30T13:45:00Z"
  }
];

// Demo data for featured mentors
const demoMentors: FeaturedMentor[] = [
  {
    id: "1",
    user_id: "2b458624-d498-4cca-a63d-9341cc20e363",
    name: "Aisha Khan",
    role_title: "Senior Frontend Developer",
    years_experience: 5,
    skills: ["React", "TypeScript", "Node.js", "AWS", "GraphQL"],
    location: "San Francisco, CA"
  },
  {
    id: "2", 
    user_id: "3c459625-e499-5ddb-b64d-a442dd21f474",
    name: "Mateo Silva",
    role_title: "Full Stack Engineer",
    years_experience: 7,
    skills: ["JavaScript", "Python", "Docker", "Kubernetes", "PostgreSQL"],
    location: "Austin, TX"
  },
  {
    id: "3",
    user_id: "4d56a736-f5aa-6eec-c75e-b553ee32e585", 
    name: "Jade Chen",
    role_title: "Data Science Lead",
    years_experience: 6,
    skills: ["Python", "Machine Learning", "SQL", "TensorFlow", "R"],
    location: "Seattle, WA"
  }
];

export default function Explore() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [mentors, setMentors] = useState<FeaturedMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = ["All", "AI Recommended", "Beginner", "Free", "Advanced"];

  useEffect(() => {
    fetchExploreData();
  }, []);

  const fetchExploreData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Use demo data when not logged in
        setCourses(demoCourses);
        setMentors(demoMentors);
        setLoading(false);
        return;
      }

      // Fetch recommended courses
      const { data: coursesData } = await supabase
        .from('recommended_courses')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(12);

      // Fetch featured mentors
      const { data: mentorsData } = await supabase
        .from('profiles')
        .select('id, user_id, name, role_title, years_experience, skills, location')
        .eq('gallery_featured', true)
        .eq('gallery_enabled', true)
        .not('name', 'is', null)
        .limit(6);

      // Transform courses data
      const transformedCourses: Course[] = (coursesData || []).map(course => ({
        id: course.id,
        title: course.title,
        platform: course.platform,
        difficulty: course.difficulty,
        cost: course.cost,
        skill_tags: course.skill_tags || [],
        url: course.url,
        mentor_name: "Expert Mentor", // Placeholder since we don't have mentor join
        is_ai_recommended: course.is_ai_recommended || false,
        created_at: course.created_at
      }));

      // Transform mentors data
      const transformedMentors: FeaturedMentor[] = (mentorsData || []).map(mentor => ({
        id: mentor.id,
        user_id: mentor.user_id,
        name: mentor.name || "Anonymous Mentor",
        role_title: mentor.role_title,
        years_experience: mentor.years_experience,
        skills: mentor.skills || [],
        location: mentor.location
      }));

      setCourses(transformedCourses.length > 0 ? transformedCourses : demoCourses);
      setMentors(transformedMentors.length > 0 ? transformedMentors : demoMentors);
    } catch (error) {
      console.error('Error fetching explore data:', error);
      setCourses(demoCourses);
      setMentors(demoMentors);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-12">
      {/* Featured Courses Section */}
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">🎓 Recommended Courses</h1>
          <p className="text-muted-foreground">
            Discover curated learning paths tailored to advance your career
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(filter)}
              className="rounded-full"
            >
              {filter}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="shadow-sm hover:shadow-md transition-shadow rounded-xl p-4 group">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  {course.difficulty && (
                    <Badge variant="outline" className={getDifficultyColor(course.difficulty)}>
                      {course.difficulty}
                    </Badge>
                  )}
                  {course.is_ai_recommended && (
                    <Badge variant="secondary" className="text-xs">
                      AI Recommended
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                  {course.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{course.platform}</p>
                {course.mentor_name && (
                  <p className="text-xs text-muted-foreground">by {course.mentor_name}</p>
                )}
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {course.skill_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {course.skill_tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {course.skill_tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{course.skill_tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    {course.cost && (
                      <span className="text-sm font-medium text-primary">
                        {course.cost}
                      </span>
                    )}
                    {course.url && (
                      <Button size="sm" className="ml-auto" asChild>
                        <a href={course.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Course
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Featured Mentors Section */}
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">🧑‍🏫 Featured Mentors</h2>
          <p className="text-muted-foreground">
            Connect with industry experts who can guide your career journey
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentors.map((mentor) => (
            <Card key={mentor.id} className="shadow-sm hover:shadow-md transition-shadow rounded-xl p-4 group">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  {mentor.name}
                </CardTitle>
                {mentor.role_title && (
                  <p className="text-sm text-muted-foreground">{mentor.role_title}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {mentor.years_experience && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {mentor.years_experience}+ years
                    </div>
                  )}
                  {mentor.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {mentor.location}
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {mentor.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {mentor.skills.slice(0, 3).map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {mentor.skills.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{mentor.skills.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="pt-2">
                    <Button size="sm" className="w-full" asChild>
                      <Link to={`/resume/${mentor.user_id}`}>
                        View Profile
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
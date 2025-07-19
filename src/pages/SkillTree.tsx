import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Lightbulb } from "lucide-react";

interface SkillData {
  topSkills: { skill: string; count: number; source: string }[];
  recommendedSkills: { skill: string; reason: string; priority: "High" | "Medium" | "Low" }[];
}

// Demo data for Aisha Khan (frontend dev)
const demoSkillData: SkillData = {
  topSkills: [
    { skill: "React", count: 8, source: "Transcripts & Courses" },
    { skill: "TypeScript", count: 6, source: "Resume & Projects" },
    { skill: "JavaScript", count: 7, source: "Transcripts & Courses" },
    { skill: "Node.js", count: 4, source: "Courses & Resume" },
    { skill: "CSS", count: 5, source: "Transcripts" },
    { skill: "GraphQL", count: 3, source: "Resume" },
    { skill: "AWS", count: 2, source: "Courses" },
    { skill: "Frontend", count: 9, source: "All Sources" }
  ],
  recommendedSkills: [
    { skill: "Next.js", reason: "Natural progression from React expertise", priority: "High" },
    { skill: "Docker", reason: "DevOps skills gap identified in career goals", priority: "High" },
    { skill: "Testing (Jest/Cypress)", reason: "Essential for senior frontend roles", priority: "Medium" },
    { skill: "Design Systems", reason: "Aligns with UI/UX career goals", priority: "Medium" },
    { skill: "Python", reason: "Expand backend capabilities", priority: "Low" },
    { skill: "Machine Learning", reason: "Future tech trend alignment", priority: "Low" }
  ]
};

export default function SkillTree() {
  const [skillData, setSkillData] = useState<SkillData>(demoSkillData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSkillData();
  }, []);

  const fetchSkillData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Use demo data when not logged in
        setSkillData(demoSkillData);
        setLoading(false);
        return;
      }

      // TODO: Aggregate skills from multiple sources
      // For now, mock aggregation from available data

      // Fetch user's transcripts skills
      const { data: transcripts } = await supabase
        .from('transcripts')
        .select('skill_tags')
        .eq('user_id', user.id);

      // Fetch user's saved courses skills
      const { data: savedCourses } = await supabase
        .from('saved_courses')
        .select(`
          recommended_courses!inner (
            skill_tags
          )
        `)
        .eq('user_id', user.id);

      // Mock aggregation logic
      const allSkills: string[] = [];
      
      // Add skills from transcripts
      transcripts?.forEach(transcript => {
        if (transcript.skill_tags) {
          allSkills.push(...transcript.skill_tags);
        }
      });

      // Add skills from saved courses
      savedCourses?.forEach(saved => {
        if (saved.recommended_courses?.skill_tags) {
          allSkills.push(...saved.recommended_courses.skill_tags);
        }
      });

      // Count skill occurrences
      const skillCounts: Record<string, number> = {};
      allSkills.forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });

      // Convert to top skills format
      const topSkills = Object.entries(skillCounts)
        .map(([skill, count]) => ({
          skill,
          count,
          source: "Transcripts & Courses"
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Use aggregated data if available, otherwise fall back to demo
      const userSkillData: SkillData = {
        topSkills: topSkills.length > 0 ? topSkills : demoSkillData.topSkills,
        recommendedSkills: demoSkillData.recommendedSkills // Always use demo for recommendations for now
      };

      setSkillData(userSkillData);
    } catch (error) {
      console.error('Error fetching skill data:', error);
      setSkillData(demoSkillData);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="h-96 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">🌳 Skill Tree Navigator</h1>
        <p className="text-muted-foreground">
          Explore your growing skill graph and unlock new learning pathways
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Skills Learned */}
        <Card className="rounded-xl p-4 shadow-sm border border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <TrendingUp className="h-5 w-5 text-primary" />
              🧠 Top Skills Learned
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Skills you've acquired through courses, transcripts, and projects
            </p>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              {skillData.topSkills.map((skillItem, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <span className="font-medium">{skillItem.skill}</span>
                      <p className="text-xs text-muted-foreground">{skillItem.source}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-xs">
                      {skillItem.count}x
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {skillData.topSkills.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No skills tracked yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete courses and add transcripts to build your skill tree!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommended Skills */}
        <Card className="rounded-xl p-4 shadow-sm border border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              🪄 Recommended Skills to Learn Next
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              AI-powered recommendations based on your goals and skill gaps
            </p>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              {skillData.recommendedSkills.map((recommendation, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium">{recommendation.skill}</span>
                    <Badge variant="outline" className={getPriorityColor(recommendation.priority)}>
                      {recommendation.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {recommendation.reason}
                  </p>
                </div>
              ))}
            </div>

            {skillData.recommendedSkills.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No recommendations yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Set career goals to get personalized skill recommendations!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Future Visual Tree Placeholder */}
      <div className="mt-8">
        <Card className="rounded-xl p-6 shadow-sm border border-dashed border-gray-300 bg-muted/20">
          <div className="text-center">
            <div className="text-4xl mb-3">🌳</div>
            <h3 className="text-lg font-semibold mb-2">Visual Skill Tree Coming Soon</h3>
            <p className="text-muted-foreground">
              This space will feature an interactive skill tree visualization showing your learning journey and skill connections.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Plus,
  BookOpen,
  Star,
  CheckCircle,
  Calendar,
  GraduationCap
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Transcript {
  id: string;
  title: string;
  description: string;
  skill_tags: string[];
  cri_score: number;
  use_in_resume: boolean;
  grade: string;
  difficulty: string;
  created_at: string;
}

const Transcripts = () => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      fetchTranscripts(user.id);
    } else {
      // Use demo data for Aisha Khan if no user is logged in
      fetchTranscripts('2b458624-d498-4cca-a63d-9341cc20e363');
    }
  };

  const fetchTranscripts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transcripts:', error);
        toast.error('Failed to load transcripts');
        return;
      }

      setTranscripts(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load transcripts');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getCRIScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 7.5) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 6.5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getDifficultyColor = (difficulty: string) => {
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
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading transcripts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            📜 <span>Learning Transcripts</span>
          </h1>
          <p className="text-muted-foreground">
            Track your learning journey and academic achievements
          </p>
        </div>

        {/* Transcripts Grid */}
        {transcripts.length === 0 ? (
          // Empty State
          <Card className="max-w-md mx-auto shadow-lg rounded-xl">
            <CardContent className="text-center py-12">
              <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Transcripts Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start building your learning portfolio by adding your courses, certifications, and educational experiences.
              </p>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Transcript
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {transcripts.map((transcript) => (
              <Card key={transcript.id} className="shadow-sm rounded-xl hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg leading-tight">
                      {transcript.title}
                    </CardTitle>
                    {transcript.use_in_resume && (
                      <Badge variant="secondary" className="shrink-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Resume
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {transcript.description}
                  </p>

                  <Separator />

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {/* CRI Score */}
                    <div className={`px-3 py-1 rounded-full border font-medium ${getCRIScoreColor(transcript.cri_score)}`}>
                      <Star className="h-3 w-3 inline mr-1" />
                      CRI: {transcript.cri_score.toFixed(1)}
                    </div>

                    {/* Difficulty */}
                    {transcript.difficulty && (
                      <Badge variant="outline" className={getDifficultyColor(transcript.difficulty)}>
                        {transcript.difficulty}
                      </Badge>
                    )}

                    {/* Grade */}
                    {transcript.grade && (
                      <Badge variant="outline" className="font-medium">
                        Grade: {transcript.grade}
                      </Badge>
                    )}
                  </div>

                  {/* Skill Tags */}
                  {transcript.skill_tags && transcript.skill_tags.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">Skills Learned:</div>
                      <div className="flex flex-wrap gap-1">
                        {transcript.skill_tags.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2">
                    <Calendar className="h-3 w-3" />
                    Completed: {formatDate(transcript.created_at)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Floating Add Button */}
        <Button
          className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg hover:shadow-xl bg-primary hover:bg-primary/90 z-50"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default Transcripts;
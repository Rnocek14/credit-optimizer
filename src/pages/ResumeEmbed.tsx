import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ExternalLink, Award, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProfileData {
  id: string;
  name: string;
  role_title: string;
  location: string;
  experience_level: string;
  skills: string[];
  resume_review_summary: string;
}

interface CareerTrack {
  title: string;
  description: string;
  growth_potential: string;
}

interface RoadmapStep {
  title: string;
  category: string;
  completed: boolean;
}

export default function ResumeEmbed() {
  const { resumeId } = useParams();
  const [searchParams] = useSearchParams();
  const theme = searchParams.get('theme') || 'light';
  const size = searchParams.get('size') || 'default'; // mini, default, large
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [tracks, setTracks] = useState<CareerTrack[]>([]);
  const [roadmapStats, setRoadmapStats] = useState({ total: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resumeId) {
      fetchResumeData();
    }
  }, [resumeId]);

  const fetchResumeData = async () => {
    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', resumeId)
        .eq('gallery_enabled', true)
        .single();

      if (profileError || !profileData) {
        throw new Error('Resume not found or not public');
      }

      setProfile(profileData);

      // Fetch career tracks
      const { data: tracksData, error: tracksError } = await supabase
        .from('career_tracks')
        .select('*')
        .eq('user_id', resumeId)
        .limit(2);

      if (!tracksError && tracksData) {
        setTracks(tracksData);
      }

      // Fetch roadmap stats
      const { data: roadmapData, error: roadmapError } = await supabase
        .from('roadmap_steps')
        .select('completed')
        .eq('user_id', resumeId);

      if (!roadmapError && roadmapData) {
        const total = roadmapData.length;
        const completed = roadmapData.filter(step => step.completed).length;
        setRoadmapStats({ total, completed });
      }

    } catch (err) {
      console.error('Error fetching resume data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load resume');
    } finally {
      setLoading(false);
    }
  };

  const getScoreFromSummary = (summary: string): number => {
    // Extract score from AI review summary if it contains one
    const scoreMatch = summary?.match(/(\d+)\/100|(\d+)%|score[:\s]*(\d+)/i);
    if (scoreMatch) {
      return parseInt(scoreMatch[1] || scoreMatch[2] || scoreMatch[3] || '0');
    }
    return 85; // Default fallback score
  };

  const getScoreBadge = (score: number) => {
    if (score >= 95) return { label: 'Top 1%', variant: 'default' as const, color: 'text-green-600' };
    if (score >= 90) return { label: 'Top 5%', variant: 'secondary' as const, color: 'text-blue-600' };
    if (score >= 80) return { label: 'Top 20%', variant: 'outline' as const, color: 'text-purple-600' };
    return { label: 'Rising Star', variant: 'outline' as const, color: 'text-orange-600' };
  };

  const getCompletionPercentage = () => {
    if (roadmapStats.total === 0) return 0;
    return Math.round((roadmapStats.completed / roadmapStats.total) * 100);
  };

  const getKeyTaglines = () => {
    const taglines = [];
    
    if (profile?.experience_level) {
      taglines.push(`${profile.experience_level} Developer`);
    }
    
    if (tracks.length > 0) {
      taglines.push(tracks[0].title);
    }
    
    const completionRate = getCompletionPercentage();
    if (completionRate > 0) {
      taglines.push(`${completionRate}% Learning Progress`);
    }
    
    return taglines.slice(0, 3);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Resume Not Found</h2>
          <p className="text-sm text-muted-foreground">
            This resume is not available or not public.
          </p>
        </div>
      </div>
    );
  }

  const score = getScoreFromSummary(profile.resume_review_summary || '');
  const scoreBadge = getScoreBadge(score);
  const taglines = getKeyTaglines();
  const completionRate = getCompletionPercentage();

  const cardClass = `
    ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}
    ${size === 'mini' ? 'max-w-xs' : size === 'large' ? 'max-w-2xl' : 'max-w-md'}
  `;

  const bodyClass = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50';

  return (
    <div className={`min-h-screen ${bodyClass} p-4 flex items-center justify-center`}>
      <Card className={cardClass}>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="font-bold text-lg leading-tight">
                {profile.name || 'Anonymous'}
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-1`}>
                {profile.role_title}
              </p>
              {profile.location && (
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  📍 {profile.location}
                </p>
              )}
            </div>

            {/* Score Badge */}
            <div className="text-right">
              <div className={`text-2xl font-bold ${scoreBadge.color} mb-1`}>
                {score}/100
              </div>
              <Badge variant={scoreBadge.variant} className="text-xs">
                {scoreBadge.label}
              </Badge>
            </div>
          </div>

          {/* Key Taglines */}
          {taglines.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {taglines.map((tagline, index) => (
                  <div
                    key={index}
                    className={`text-xs px-2 py-1 rounded-full ${
                      theme === 'dark' 
                        ? 'bg-gray-700 text-gray-300' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {tagline}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning Progress */}
          {roadmapStats.total > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Learning Progress</span>
              </div>
              <div className={`w-full bg-gray-200 rounded-full h-2 ${theme === 'dark' ? 'bg-gray-700' : ''}`}>
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {roadmapStats.completed} of {roadmapStats.total} skills completed
              </p>
            </div>
          )}

          {/* Skills Preview */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Top Skills</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {profile.skills.slice(0, 4).map((skill, index) => (
                  <span
                    key={index}
                    className={`text-xs px-2 py-1 rounded ${
                      theme === 'dark'
                        ? 'bg-purple-900/30 text-purple-300 border border-purple-700'
                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}
                  >
                    {skill}
                  </span>
                ))}
                {profile.skills.length > 4 && (
                  <span className={`text-xs px-2 py-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    +{profile.skills.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* CTA */}
          <Button 
            className="w-full" 
            asChild
            variant={theme === 'dark' ? 'secondary' : 'default'}
          >
            <a 
              href={`${window.location.origin}/resume/${resumeId}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Full Resume
            </a>
          </Button>

          {/* Powered by badge */}
          <div className="text-center mt-3">
            <a 
              href={`${window.location.origin}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs ${theme === 'dark' ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
            >
              Powered by Life Path Resume
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
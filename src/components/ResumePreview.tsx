import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ResumePreviewProps {
  userId: string;
}

export const ResumePreview = ({ userId }: ResumePreviewProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResumeData = async () => {
      setLoading(true);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data: careerTracks } = await supabase
        .from('career_tracks')
        .select('*')
        .eq('user_id', userId);

      const { data: roadmapSteps } = await supabase
        .from('roadmap_steps')
        .select('*')
        .eq('user_id', userId);

      setProfile(profileData);
      setTracks(careerTracks || []);
      setSteps(roadmapSteps || []);
      setLoading(false);
    };

    if (userId) fetchResumeData();
  }, [userId]);

  if (loading || !profile) return <div className="p-4">Loading resume preview...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 bg-background rounded-lg shadow-md">
      <header>
        <h1 className="text-2xl font-bold text-foreground">{profile.name}</h1>
        <p className="text-sm text-muted-foreground">{profile.role_title} → {profile.career_goals}</p>
        <p className="text-sm text-muted-foreground">{profile.location} • {profile.availability}</p>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-2 text-foreground">Summary</h2>
        <p className="text-muted-foreground">
          Completed {steps.length} roadmap steps across {tracks.length} career tracks.
          Verified outputs include certifications, portfolio projects, and mentor-rated milestones.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2 text-foreground">Career Tracks & Achievements</h2>
        {tracks.map((track, index) => {
          const trackSteps = steps.filter((_, i) => Math.floor(i / 3) === index);

          return (
            <Card key={track.id} className="mb-4">
              <CardHeader>
                <CardTitle>{track.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{track.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {trackSteps.map((step, i) => (
                  <div key={i} className="border rounded p-3">
                    <div className="font-semibold text-foreground">{step.title}</div>
                    <div className="text-sm text-muted-foreground mb-1">{step.description}</div>
                    <div className="text-xs mb-1 text-muted-foreground">
                      📅 {step.timeline} • ⏱ {step.estimated_duration}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{step.category}</Badge>
                      {step.cri && <Badge>CRI {step.cri}</Badge>}
                      {step.difficulty && <Badge>★ {step.difficulty}</Badge>}
                      {step.verified && <Badge variant="default">Mentor Verified</Badge>}
                      {step.success_metrics && (
                        <Badge variant="secondary">🎯 {step.success_metrics}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="flex gap-4 pt-4">
        <Button variant="default">Download PDF</Button>
        <Button variant="outline">Copy JSON</Button>
        <Button variant="ghost">Share Resume Link</Button>
      </section>
    </div>
  );
};
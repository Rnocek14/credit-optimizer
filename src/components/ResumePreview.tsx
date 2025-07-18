import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';
import { Download, Copy, Share } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1F2937',
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#374151',
  },
  trackDescription: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 10,
  },
  stepContainer: {
    marginBottom: 8,
    padding: 8,
    border: '1px solid #E5E7EB',
    borderRadius: 4,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  stepDescription: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 3,
  },
  stepMeta: {
    fontSize: 8,
    color: '#9CA3AF',
    marginBottom: 3,
  },
  badge: {
    fontSize: 8,
    backgroundColor: '#F3F4F6',
    padding: '2 6',
    borderRadius: 2,
    marginRight: 4,
  },
});

// PDF Document Component
const ResumePDFDocument = ({ profile, tracks, steps }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.subtitle}>{profile.role_title} → {profile.career_goals}</Text>
        <Text style={styles.subtitle}>{profile.location} • {profile.availability}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <Text style={styles.subtitle}>
          Completed {steps.length} roadmap steps across {tracks.length} career tracks.
          Verified outputs include certifications, portfolio projects, and mentor-rated milestones.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Career Tracks & Achievements</Text>
        {tracks.map((track: any, index: number) => {
          const trackSteps = steps.filter((_: any, i: number) => Math.floor(i / 3) === index);
          return (
            <View key={track.id} style={{ marginBottom: 15 }}>
              <Text style={styles.trackTitle}>{track.title}</Text>
              <Text style={styles.trackDescription}>{track.description}</Text>
              {trackSteps.map((step: any, i: number) => (
                <View key={i} style={styles.stepContainer}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                  <Text style={styles.stepMeta}>
                    📅 {step.timeline} • ⏱ {step.estimated_duration}
                  </Text>
                  <Text style={styles.stepMeta}>
                    Category: {step.category} | Success: {step.success_metrics}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </Page>
  </Document>
);

interface ResumePreviewProps {
  userId: string;
}

export const ResumePreview = ({ userId }: ResumePreviewProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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

  const handleCopyJSON = async () => {
    const resumeData = {
      profile,
      career_tracks: tracks,
      roadmap_steps: steps,
      generated_at: new Date().toISOString(),
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(resumeData, null, 2));
      toast({
        title: "JSON Copied!",
        description: "Resume data copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy JSON data",
        variant: "destructive",
      });
    }
  };

  const handleDownloadJSON = () => {
    const resumeData = {
      profile,
      career_tracks: tracks,
      roadmap_steps: steps,
      generated_at: new Date().toISOString(),
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resumeData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${profile?.name?.replace(/\s+/g, '_')}_resume.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/resume/${userId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.name}'s Resume`,
          text: 'Check out my AI-generated career roadmap resume',
          url: shareUrl,
        });
      } catch (error) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link Copied!",
          description: "Share link copied to clipboard",
        });
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied!",
        description: "Share link copied to clipboard",
      });
    }
  };

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
        <PDFDownloadLink
          document={<ResumePDFDocument profile={profile} tracks={tracks} steps={steps} />}
          fileName={`${profile?.name?.replace(/\s+/g, '_')}_resume.pdf`}
        >
          {({ loading }) => (
            <Button variant="default" disabled={loading}>
              <Download className="w-4 h-4 mr-2" />
              {loading ? 'Generating...' : 'Download PDF'}
            </Button>
          )}
        </PDFDownloadLink>
        
        <Button variant="outline" onClick={handleCopyJSON}>
          <Copy className="w-4 h-4 mr-2" />
          Copy JSON
        </Button>
        
        <Button variant="ghost" onClick={handleShare}>
          <Share className="w-4 h-4 mr-2" />
          Share Resume Link
        </Button>
      </section>
    </div>
  );
};
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, UserCheck, Award, FileText } from 'lucide-react';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SkillVerification {
  id: string;
  skill_name: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  mentor_feedback?: string;
  verified_at?: string;
  mentor_id?: string;
  mentor_name?: string;
}

interface TrackMentorVerificationProps {
  className?: string;
}

export function TrackMentorVerification({ className }: TrackMentorVerificationProps) {
  const { activeTrackId, activeTrack } = useActiveTrackStore();
  const [requestText, setRequestText] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch track skills that can be verified
  const { data: trackSkills = [] } = useQuery({
    queryKey: ['track-skills', activeTrackId],
    queryFn: async () => {
      if (!activeTrackId) return [];
      
      // For demo purposes, return mock skills based on track
      const mockSkills = {
        'Data Science': ['Python Programming', 'Machine Learning', 'Data Visualization', 'Statistical Analysis'],
        'Frontend Development': ['React', 'TypeScript', 'CSS/Styling', 'API Integration'],
        'Backend Development': ['Node.js', 'Database Design', 'API Development', 'System Architecture'],
      };
      
      const trackName = activeTrack?.track_name || 'General';
      return mockSkills[trackName as keyof typeof mockSkills] || ['Core Skills', 'Problem Solving', 'Project Management'];
    },
    enabled: !!activeTrackId,
  });

  // Fetch user's skill verifications for current track
  const { data: skillVerifications = [] } = useQuery({
    queryKey: ['skill-verifications', activeTrackId],
    queryFn: async (): Promise<SkillVerification[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !activeTrackId) return [];

      // Mock data for demo - in real implementation, fetch from database
      return [
        {
          id: '1',
          skill_name: 'Python Programming',
          verification_status: 'verified',
          mentor_feedback: 'Excellent understanding of Python fundamentals and OOP concepts.',
          verified_at: '2024-01-15T10:30:00Z',
          mentor_id: 'mentor-1',
          mentor_name: 'Dr. Sarah Johnson'
        },
        {
          id: '2',
          skill_name: 'Machine Learning',
          verification_status: 'pending',
          mentor_feedback: undefined,
          verified_at: undefined,
          mentor_id: undefined,
          mentor_name: undefined
        }
      ];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Submit skill verification request
  const requestVerificationMutation = useMutation({
    mutationFn: async ({ skill, evidence }: { skill: string; evidence: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // In real implementation, insert into skill_verification_requests table
      console.log('Requesting verification for:', { skill, evidence, trackId: activeTrackId });
      
      // Mock success response
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Skill verification request submitted successfully');
      setRequestText('');
      setSelectedSkill('');
      queryClient.invalidateQueries({ queryKey: ['skill-verifications', activeTrackId] });
    },
    onError: (error) => {
      toast.error('Failed to submit verification request');
      console.error('Verification request error:', error);
    },
  });

  const handleSubmitRequest = () => {
    if (!selectedSkill || !requestText.trim()) {
      toast.error('Please select a skill and provide evidence');
      return;
    }

    requestVerificationMutation.mutate({
      skill: selectedSkill,
      evidence: requestText,
    });
  };

  if (!activeTrackId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Skill Verification
          </CardTitle>
          <CardDescription>
            Select an active track to request skill verification
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const verifiedSkills = skillVerifications.filter(sv => sv.verification_status === 'verified');
  const pendingSkills = skillVerifications.filter(sv => sv.verification_status === 'pending');
  const completionRate = trackSkills.length > 0 ? (verifiedSkills.length / trackSkills.length) * 100 : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Verification Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Track Skill Verification
          </CardTitle>
          <CardDescription>
            Get your skills verified by expert mentors in {activeTrack?.track_name || 'your track'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Progress</span>
            <span className="text-sm font-medium">
              {verifiedSkills.length} of {trackSkills.length} skills verified
            </span>
          </div>
          <Progress value={completionRate} className="h-3" />
          
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>{verifiedSkills.length} Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span>{pendingSkills.length} Pending</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request New Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Request Skill Verification
          </CardTitle>
          <CardDescription>
            Submit evidence of your skills for mentor review
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Skill</label>
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="w-full p-3 border rounded-md bg-background"
            >
              <option value="">Choose a skill to verify...</option>
              {trackSkills.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Evidence & Portfolio</label>
            <Textarea
              placeholder="Provide evidence of your skill mastery. Include:
• Links to projects or portfolio pieces
• Certificates or completed courses
• Work experience details
• Specific examples of applying this skill"
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              rows={6}
            />
          </div>

          <Button
            onClick={handleSubmitRequest}
            disabled={!selectedSkill || !requestText.trim() || requestVerificationMutation.isPending}
            className="w-full"
          >
            {requestVerificationMutation.isPending ? 'Submitting...' : 'Submit for Verification'}
          </Button>
        </CardContent>
      </Card>

      {/* Verification Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Verification Status
          </CardTitle>
          <CardDescription>
            Track the status of your skill verification requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {skillVerifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No skill verification requests yet. Submit your first request above!
              </p>
            ) : (
              skillVerifications.map((verification) => (
                <div key={verification.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{verification.skill_name}</h4>
                    <Badge variant={
                      verification.verification_status === 'verified' ? 'default' :
                      verification.verification_status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {verification.verification_status === 'verified' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {verification.verification_status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {verification.verification_status.charAt(0).toUpperCase() + verification.verification_status.slice(1)}
                    </Badge>
                  </div>

                  {verification.verification_status === 'verified' && verification.mentor_feedback && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Verified by {verification.mentor_name} on{' '}
                        {new Date(verification.verified_at!).toLocaleDateString()}
                      </p>
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <p className="text-sm text-green-800">{verification.mentor_feedback}</p>
                      </div>
                    </div>
                  )}

                  {verification.verification_status === 'pending' && (
                    <p className="text-sm text-muted-foreground">
                      Your verification request is being reviewed by our expert mentors.
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
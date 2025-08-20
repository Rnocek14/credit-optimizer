import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';

export interface CareerProfileData {
  trackId: string;
  trackTitle: string;
  trackIcon?: string;
  trackColor?: string;
  criScore: number;
  criLevel: 'Beginner' | 'Developing' | 'Intermediate' | 'Advanced' | 'Expert';
  switchReadiness: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  overallRisk: number;
  roi3yr: number;
  lqi: number;
  rank: number; // Percentile ranking
  breakEvenMonths?: number;
  nextMilestone?: {
    title: string;
    eta: string;
  };
}

export const useCareerProfileCard = (trackId?: string) => {
  return useQuery({
    queryKey: ['career-profile-card', trackId],
    queryFn: async (): Promise<CareerProfileData | null> => {
      if (!trackId) return null;

      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Get track details
      const { data: track, error: trackError } = await supabase
        .from('career_tracks')
        .select('*')
        .eq('id', trackId)
        .eq('user_id', user.id)
        .single();

      if (trackError || !track) {
        throw new Error('Track not found');
      }

      // Get latest career risk data
      const { data: riskData } = await supabase
        .from('career_risks')
        .select('*')
        .eq('track_id', trackId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get all tracks for ranking calculation
      const { data: allTracks } = await supabase
        .from('career_tracks')
        .select('roi_score')
        .eq('user_id', user.id)
        .not('roi_score', 'is', null);

      // Calculate rank (percentile)
      const trackROI = track.roi_score || 0;
      const rank = allTracks && allTracks.length > 1 
        ? Math.round((allTracks.filter(t => (t.roi_score || 0) <= trackROI).length / allTracks.length) * 100)
        : 50; // Default to 50th percentile

      // Determine CRI level
      const criScore = trackROI; // Using ROI score as CRI proxy
      let criLevel: 'Beginner' | 'Developing' | 'Intermediate' | 'Advanced' | 'Expert' = 'Beginner';
      
      if (criScore >= 80) criLevel = 'Expert';
      else if (criScore >= 60) criLevel = 'Advanced';
      else if (criScore >= 40) criLevel = 'Intermediate';
      else if (criScore >= 20) criLevel = 'Developing';

      // Calculate LQI (Location Quality Index) - simplified for current location
      const baseSalary = 75000; // Default salary
      const lqi = Math.round(baseSalary * 1.1 / 1.2); // Simplified calculation

      // Risk assessment
      const overallRisk = riskData?.switch_risk_score || 25;
      let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
      
      if (overallRisk > 70) riskLevel = 'High';
      else if (overallRisk > 40) riskLevel = 'Medium';

      // Estimate 3-year ROI
      const roi3yr = (trackROI || 0) * 3000; // Simplified calculation

      // Get latest career switch for break-even data
      const { data: latestSwitch } = await supabase
        .from('career_switches')
        .select('break_even_months')
        .eq('user_id', user.id)
        .or(`from_track_id.eq.${trackId},to_track_id.eq.${trackId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        trackId,
        trackTitle: track.title || track.track_name || 'Untitled Track',
        trackIcon: track.icon,
        trackColor: track.color,
        criScore: Math.round(criScore),
        criLevel,
        switchReadiness: Math.round(track.switch_readiness_score || 0),
        riskLevel,
        overallRisk: Math.round(overallRisk),
        roi3yr: Math.round(roi3yr),
        lqi,
        rank,
        breakEvenMonths: latestSwitch?.break_even_months,
        nextMilestone: {
          title: 'Complete Skills Assessment', 
          eta: '2 weeks'
        } // Mock milestone
      };
    },
    enabled: !!trackId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });
};
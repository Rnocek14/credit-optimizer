import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { useCourseProgress } from '@/hooks/useCourseProgress';
import { useTrackXP } from '@/hooks/useTrackXP';
import { useTracks } from '@/hooks/useTracks';

export interface TrackResumeData {
  profile: any;
  track: any;
  courses: any[];
  skills: any[];
  projects: any[];
  achievements: any[];
  totalXP: number;
  completionRate: number;
  certificates: any[];
  proofItems: any[];
}

export interface ExportOptions {
  selectedTrackIds: string[];
  includeSharedProof: boolean;
  includeGlobalSkills: boolean;
  templateStyle: 'professional' | 'creative' | 'technical' | 'minimal';
  includeProjectLinks: boolean;
  includeCRIScore: boolean;
  includeXPProgress: boolean;
}

export function useTrackResumeExport(userId?: string) {
  const [isExporting, setIsExporting] = useState(false);
  const { activeTrackId } = useActiveTrackStore();
  const { tracks } = useTracks();

  // Get track-specific data
  const getTrackResumeData = useCallback(async (trackId: string): Promise<TrackResumeData> => {
    if (!userId) throw new Error('User ID required');

    // Fetch profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get track details
    const track = tracks.find(t => t.id === trackId);
    if (!track) throw new Error('Track not found');

    // Fetch track-specific course progress
    const { data: courseProgress } = await supabase
      .from('course_progress')
      .select(`
        *,
        course_id,
        status,
        progress_percentage,
        completed_at
      `)
      .eq('user_id', userId)
      .eq('track_id', trackId);

    // Fetch track XP data
    const { data: trackXP } = await supabase
      .from('user_track_xp')
      .select('*')
      .eq('user_id', userId)
      .eq('track_id', trackId)
      .single();

    // Fetch track-specific skills (simplified)
    const { data: skillData } = await supabase
      .from('transcripts')
      .select('*')
      .eq('user_id', userId)
      .limit(10);

    // Fetch projects (using existing table)
    const { data: projects } = await supabase
      .from('ai_resume_drafts')
      .select('*')
      .eq('user_id', userId)
      .limit(5);

    // Fetch achievements/badges earned
    const { data: achievements } = await supabase
      .from('user_badges')
      .select(`
        *,
        badges(*)
      `)
      .eq('user_id', userId);

    // Fetch certificates (simplified)
    const { data: certificates } = await supabase
      .from('transcripts')
      .select('*')
      .eq('user_id', userId)
      .limit(5);

    // Generate proof items
    const proofItems = generateTrackProofItems(
      courseProgress || [],
      projects || [],
      certificates || [],
      track
    );

    // Calculate completion rate
    const completedCourses = courseProgress?.filter(cp => cp.status === 'completed').length || 0;
    const totalCourses = courseProgress?.length || 0;
    const completionRate = totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0;

    return {
      profile: profile || {},
      track,
      courses: courseProgress || [],
      skills: skillData || [],
      projects: projects || [],
      achievements: achievements || [],
      totalXP: trackXP?.total_xp || 0,
      completionRate,
      certificates: certificates || [],
      proofItems,
    };
  }, [userId, tracks]);

  // Get multi-track resume data
  const getMultiTrackResumeData = useCallback(async (trackIds: string[], options: ExportOptions) => {
    if (!userId) throw new Error('User ID required');

    const trackDataPromises = trackIds.map(trackId => getTrackResumeData(trackId));
    const trackDataArray = await Promise.all(trackDataPromises);

    // Merge data from multiple tracks
    const mergedData = {
      profile: trackDataArray[0]?.profile || {},
      tracks: trackDataArray.map(data => data.track),
      allCourses: trackDataArray.flatMap(data => data.courses),
      allSkills: mergeDuplicateSkills(trackDataArray.flatMap(data => data.skills)),
      allProjects: trackDataArray.flatMap(data => data.projects),
      allAchievements: trackDataArray.flatMap(data => data.achievements),
      totalXP: trackDataArray.reduce((sum, data) => sum + data.totalXP, 0),
      averageCompletionRate: trackDataArray.reduce((sum, data) => sum + data.completionRate, 0) / trackDataArray.length,
      allCertificates: trackDataArray.flatMap(data => data.certificates),
      allProofItems: trackDataArray.flatMap(data => data.proofItems),
      trackSpecificData: trackDataArray,
    };

    return mergedData;
  }, [getTrackResumeData, userId]);

  // Export single track resume
  const exportTrackResume = useCallback(async (trackId: string, format: 'pdf' | 'json') => {
    setIsExporting(true);
    try {
      const trackData = await getTrackResumeData(trackId);
      
      if (format === 'json') {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trackData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${trackData.profile.name}_${trackData.track.track_name}_resume.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      }

      return trackData;
    } finally {
      setIsExporting(false);
    }
  }, [getTrackResumeData]);

  // Export multi-track resume
  const exportMultiTrackResume = useCallback(async (trackIds: string[], options: ExportOptions, format: 'pdf' | 'json') => {
    setIsExporting(true);
    try {
      const mergedData = await getMultiTrackResumeData(trackIds, options);
      
      if (format === 'json') {
        const fileName = `${mergedData.profile.name}_multi_track_resume.json`;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mergedData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", fileName);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      }

      return mergedData;
    } finally {
      setIsExporting(false);
    }
  }, [getMultiTrackResumeData]);

  return {
    isExporting,
    getTrackResumeData,
    getMultiTrackResumeData,
    exportTrackResume,
    exportMultiTrackResume,
    activeTrackId,
    tracks,
  };
}

// Helper function to generate track-specific proof items
function generateTrackProofItems(courses: any[], projects: any[], certificates: any[], track: any) {
  const proofItems = [];

  // Add completed courses as proof
  courses.filter(course => course.status === 'completed').forEach(course => {
    proofItems.push({
      id: `course_${course.id}`,
      type: 'course_completion',
      title: `Course Completed: ${course.course_id}`,
      description: `Successfully completed course in ${track.track_name} track`,
      completedAt: course.completed_at,
      trackId: track.id,
      trackName: track.track_name,
    });
  });

  // Add projects as proof
  projects.forEach(project => {
    proofItems.push({
      id: `project_${project.id}`,
      type: 'project',
      title: project.title,
      description: project.description,
      skills: project.skills_demonstrated || [],
      link: project.project_url,
      trackId: track.id,
      trackName: track.track_name,
    });
  });

  // Add certificates as proof
  certificates.forEach(cert => {
    proofItems.push({
      id: `cert_${cert.id}`,
      type: 'certificate',
      title: cert.certificate_name,
      description: `Certificate earned for ${cert.course_id}`,
      issuedAt: cert.issued_at,
      trackId: track.id,
      trackName: track.track_name,
    });
  });

  return proofItems;
}

// Helper function to merge duplicate skills
function mergeDuplicateSkills(skills: any[]) {
  const skillMap = new Map();
  
  skills.forEach(skill => {
    const key = skill.skill_name || skill.name;
    if (skillMap.has(key)) {
      const existing = skillMap.get(key);
      // Keep the higher proficiency level
      if (skill.proficiency_level > existing.proficiency_level) {
        skillMap.set(key, skill);
      }
    } else {
      skillMap.set(key, skill);
    }
  });
  
  return Array.from(skillMap.values());
}

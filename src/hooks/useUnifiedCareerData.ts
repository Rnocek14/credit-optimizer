import { useState, useEffect } from 'react';
import { fetchUnifiedCareerData, generateCareerRelationships, UnifiedCareerData, CareerRelationship } from '@/lib/unifiedCareerData';

export const useUnifiedCareerData = (careerPathId?: string) => {
  const [data, setData] = useState<UnifiedCareerData | null>(null);
  const [relationships, setRelationships] = useState<CareerRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🚀 HOOK: Starting unified career data fetch...');
        console.log('🔍 HOOK: CareerPathId:', careerPathId);
        
        const careerData = await fetchUnifiedCareerData(careerPathId);
        console.log('📦 HOOK: Raw data received:', {
          skills: careerData?.skills?.length || 0,
          jobs: careerData?.jobs?.length || 0,
          courses: careerData?.courses?.length || 0,
          projects: careerData?.projects?.length || 0,
          certifications: careerData?.certifications?.length || 0,
          careerSteps: careerData?.careerSteps?.length || 0,
        });
        
        const generatedRelationships = generateCareerRelationships(careerData);
        console.log('🔗 HOOK: Relationships generated:', generatedRelationships.length);
        
        setData(careerData);
        setRelationships(generatedRelationships);
        
        console.log('✅ HOOK: Data and relationships set in state');
      } catch (err) {
        console.error('❌ HOOK: Error loading unified career data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
        console.log('🏁 HOOK: Loading complete');
      }
    };

    console.log('🎬 HOOK: useEffect triggered');
    loadData();
  }, [careerPathId]);

  const refetch = async () => {
    const careerData = await fetchUnifiedCareerData(careerPathId);
    const generatedRelationships = generateCareerRelationships(careerData);
    setData(careerData);
    setRelationships(generatedRelationships);
  };

  return {
    data,
    relationships,
    loading,
    error,
    refetch,
  };
};
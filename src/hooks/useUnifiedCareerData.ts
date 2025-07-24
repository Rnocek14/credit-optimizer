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
        
        console.log('🔄 Loading unified career data...');
        const careerData = await fetchUnifiedCareerData(careerPathId);
        
        console.log('📊 Generating relationships...');
        const generatedRelationships = generateCareerRelationships(careerData);
        
        console.log('✅ Unified career data loaded:', {
          skills: careerData.skills.length,
          jobs: careerData.jobs.length,
          courses: careerData.courses.length,
          projects: careerData.projects.length,
          certifications: careerData.certifications.length,
          careerSteps: careerData.careerSteps.length,
          relationships: generatedRelationships.length,
        });
        
        setData(careerData);
        setRelationships(generatedRelationships);
      } catch (err) {
        console.error('❌ Error loading unified career data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

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
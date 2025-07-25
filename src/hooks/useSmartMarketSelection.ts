import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CareerPath {
  id: string;
  title: string;
}

interface Location {
  id: string;
  label: string;
  value: string;
  emoji: string;
}

interface SmartSuggestion {
  careerPath: CareerPath;
  location: Location;
  reason: string;
  priority: number;
}

export const useSmartMarketSelection = () => {
  const [autoSelectedCareerPath, setAutoSelectedCareerPath] = useState<CareerPath | null>(null);
  const [autoSelectedLocation, setAutoSelectedLocation] = useState<Location | null>(null);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [isSmartMode, setIsSmartMode] = useState(true);

  // Auto-select based on popular combinations and market data
  const initializeSmartDefaults = useCallback(async () => {
    try {
      // Get top performing career paths
      const { data: topCareers } = await supabase
        .from('market_trends')
        .select('career_path')
        .order('demand_score', { ascending: false })
        .limit(1);

      // Get popular locations
      const { data: locations } = await supabase
        .from('locations')
        .select('*')
        .eq('active', true)
        .order('salary_multiplier', { ascending: false })
        .limit(5);

      if (topCareers && topCareers.length > 0) {
        // Find matching career path
        const { data: careerPaths } = await supabase
          .from('career_paths')
          .select('id, title')
          .ilike('title', `%${topCareers[0].career_path}%`)
          .limit(1);

        if (careerPaths && careerPaths.length > 0) {
          setAutoSelectedCareerPath(careerPaths[0]);
        }
      }

      if (locations && locations.length > 0) {
        setAutoSelectedLocation({
          id: locations[0].id,
          label: locations[0].label,
          value: locations[0].value,
          emoji: locations[0].emoji
        });
      }
    } catch (error) {
      console.error('Error initializing smart defaults:', error);
    }
  }, []);

  // Generate smart suggestions based on market intelligence
  const generateSmartSuggestions = useCallback(async () => {
    try {
      const { data: trendingCombinations } = await supabase
        .from('market_trends')
        .select('career_path, location, growth_rate, demand_score')
        .order('growth_rate', { ascending: false })
        .limit(10);

      if (trendingCombinations) {
        const suggestions: SmartSuggestion[] = [];

        for (const combo of trendingCombinations) {
          // Get career path details
          const { data: careerPath } = await supabase
            .from('career_paths')
            .select('id, title')
            .ilike('title', `%${combo.career_path}%`)
            .limit(1);

          // Get location details
          const { data: location } = await supabase
            .from('locations')
            .select('*')
            .or(`label.ilike.%${combo.location}%,value.ilike.%${combo.location}%`)
            .eq('active', true)
            .limit(1);

          if (careerPath && careerPath.length > 0 && location && location.length > 0) {
            suggestions.push({
              careerPath: careerPath[0],
              location: {
                id: location[0].id,
                label: location[0].label,
                value: location[0].value,
                emoji: location[0].emoji
              },
              reason: `${combo.growth_rate > 0 ? '+' : ''}${(combo.growth_rate * 100).toFixed(1)}% growth rate`,
              priority: combo.demand_score
            });
          }
        }

        setSuggestions(suggestions.slice(0, 5));
      }
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
    }
  }, []);

  // Smart context extraction from text/actions
  const extractContextFromAction = useCallback(async (action: string, context?: string) => {
    const patterns = {
      careerPath: /(?:for|in|as|analyze)\s+([A-Z][a-zA-Z\s]+?)(?:\s+in|\s+at|$)/i,
      location: /(?:in|at)\s+([A-Z][a-zA-Z\s]+?)(?:\s+for|$)/i
    };

    const text = `${action} ${context || ''}`;
    
    const careerMatch = text.match(patterns.careerPath);
    const locationMatch = text.match(patterns.location);

    let extractedCareerPath = null;
    let extractedLocation = null;

    if (careerMatch) {
      const { data: careerPaths } = await supabase
        .from('career_paths')
        .select('id, title')
        .ilike('title', `%${careerMatch[1].trim()}%`)
        .limit(1);
      
      if (careerPaths && careerPaths.length > 0) {
        extractedCareerPath = careerPaths[0];
      }
    }

    if (locationMatch) {
      const { data: locations } = await supabase
        .from('locations')
        .select('*')
        .or(`label.ilike.%${locationMatch[1].trim()}%,value.ilike.%${locationMatch[1].trim()}%`)
        .eq('active', true)
        .limit(1);
      
      if (locations && locations.length > 0) {
        extractedLocation = {
          id: locations[0].id,
          label: locations[0].label,
          value: locations[0].value,
          emoji: locations[0].emoji
        };
      }
    }

    return { extractedCareerPath, extractedLocation };
  }, []);

  useEffect(() => {
    if (isSmartMode) {
      initializeSmartDefaults();
      generateSmartSuggestions();
    }
  }, [isSmartMode, initializeSmartDefaults, generateSmartSuggestions]);

  return {
    autoSelectedCareerPath,
    autoSelectedLocation,
    suggestions,
    isSmartMode,
    setIsSmartMode,
    extractContextFromAction,
    refreshSuggestions: generateSmartSuggestions,
    setAutoSelectedCareerPath,
    setAutoSelectedLocation
  };
};
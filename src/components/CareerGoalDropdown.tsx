import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target } from 'lucide-react';

interface CareerGoalDropdownProps {
  selectedCareerPath: string | null;
  onCareerPathChange: (careerPathId: string | null) => void;
}

export const CareerGoalDropdown: React.FC<CareerGoalDropdownProps> = ({
  selectedCareerPath,
  onCareerPathChange
}) => {
  // Fetch career paths
  const { data: careerPaths = [] } = useQuery({
    queryKey: ['career-paths'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('career_paths')
        .select('*')
        .order('title');
      
      if (error) {
        console.error('Career paths fetch error:', error);
        throw error;
      }
      
      return data;
    }
  });

  console.log('📊 Career paths data:', { careerPaths, selectedCareerPath });

  const availablePaths = careerPaths;

  // Default to Data Analyst for career step visualization
  React.useEffect(() => {
    if (!selectedCareerPath && availablePaths.length > 0) {
      // Find the actual Data Analyst career path by title
      const dataAnalystPath = availablePaths.find(path => 
        path.title === 'Data Analyst'
      );
      if (dataAnalystPath) {
        console.log('🎯 Auto-selecting Data Analyst career path:', dataAnalystPath.id);
        onCareerPathChange(dataAnalystPath.id);
      } else {
        // Fallback to first available path
        console.log('🔄 Data Analyst not found, selecting first path:', availablePaths[0].id);
        onCareerPathChange(availablePaths[0].id);
      }
    }
  }, [availablePaths, selectedCareerPath, onCareerPathChange]);

  return (
    <div className="flex items-center gap-2">
      <Target className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">Select Career Goal:</span>
      <Select value={selectedCareerPath || ''} onValueChange={onCareerPathChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Choose a career path..." />
        </SelectTrigger>
        <SelectContent>
          {availablePaths.map((path) => (
            <SelectItem key={path.id} value={path.id}>
              {path.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
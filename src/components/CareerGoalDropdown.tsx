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

  // Demo fallback - if no career paths available, provide mock data
  const mockCareerPaths = [
    { id: 'ux-designer', title: 'UX Designer', average_salary: 78000 },
    { id: 'software-engineer', title: 'Software Engineer', average_salary: 95000 },
    { id: 'product-manager', title: 'Product Manager', average_salary: 115000 },
    { id: 'data-analyst', title: 'Data Analyst', average_salary: 72000 }
  ];

  const availablePaths = careerPaths.length > 0 ? careerPaths : mockCareerPaths;

  // Default to UX Designer for Aisha Khan (demo user)
  React.useEffect(() => {
    if (!selectedCareerPath && availablePaths.length > 0) {
      const uxDesignerPath = availablePaths.find(path => 
        path.title.toLowerCase().includes('ux designer')
      );
      if (uxDesignerPath) {
        onCareerPathChange(uxDesignerPath.id);
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
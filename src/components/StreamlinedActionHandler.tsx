import { useState, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface CareerPath {
  id: string;
  title: string;
}

interface Location {
  id: string;
  label: string;
  value: string;
}

interface StreamlinedActionHandlerProps {
  availableCareerPaths: CareerPath[];
  availableLocations: Location[];
  setSelectedCareerPath: (cp: CareerPath) => void;
  setSelectedLocation: (loc: Location) => void;
  setActiveTab: (tab: string) => void;
  runComprehensiveAnalysis: (title: string, label: string, id: string, locId: string, value: string) => Promise<void>;
}

export const useStreamlinedActionHandler = ({
  availableCareerPaths,
  availableLocations,
  setSelectedCareerPath,
  setSelectedLocation,
  setActiveTab,
  runComprehensiveAnalysis
}: StreamlinedActionHandlerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const findCareerPath = useCallback((searchTerm?: string): CareerPath | null => {
    if (!searchTerm) return null;
    
    const normalized = searchTerm.toLowerCase().trim();
    
    // Exact match first
    let match = availableCareerPaths.find(cp => 
      cp.title.toLowerCase() === normalized
    );
    
    if (match) return match;
    
    // Contains match
    match = availableCareerPaths.find(cp => {
      const title = cp.title.toLowerCase();
      return title.includes(normalized) || normalized.includes(title);
    });
    
    return match || null;
  }, [availableCareerPaths]);

  const findLocation = useCallback((searchTerm?: string): Location | null => {
    if (!searchTerm) return null;
    
    const normalized = searchTerm.toLowerCase().trim();
    
    // Exact match first
    let match = availableLocations.find(loc => 
      loc.label.toLowerCase() === normalized || 
      loc.value.toLowerCase() === normalized
    );
    
    if (match) return match;
    
    // Contains match
    match = availableLocations.find(loc => {
      const label = loc.label.toLowerCase();
      const value = loc.value.toLowerCase();
      return label.includes(normalized) || value.includes(normalized) ||
             normalized.includes(label) || normalized.includes(value);
    });
    
    return match || null;
  }, [availableLocations]);

  const handleAction = useCallback(async (actionType: string, careerPath?: string, location?: string) => {
    console.log('🎯 Streamlined action:', actionType, 'for', careerPath, 'in', location);
    
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      if (actionType === 'Analyze This Market') {
        // Immediate UI feedback
        setActiveTab('analysis');
        
        toast({
          title: "Starting Analysis",
          description: `Searching for ${careerPath} in ${location}...`,
          duration: 2000
        });
        
        // Find matches
        const careerPathMatch = findCareerPath(careerPath);
        const locationMatch = findLocation(location);
        
        console.log('🔍 Matches:', { 
          career: careerPathMatch?.title, 
          location: locationMatch?.label 
        });
        
        if (careerPathMatch && locationMatch) {
          // Update selections immediately
          setSelectedCareerPath(careerPathMatch);
          setSelectedLocation(locationMatch);
          
          toast({
            title: "Analysis Started",
            description: `Analyzing ${careerPathMatch.title} in ${locationMatch.label}`,
            duration: 2000
          });
          
          // Run analysis
          await runComprehensiveAnalysis(
            careerPathMatch.title,
            locationMatch.label,
            careerPathMatch.id,
            locationMatch.id,
            locationMatch.value
          );
          
        } else {
          toast({
            title: "No Match Found",
            description: `Could not find "${careerPath}" in "${location}". Please select from available options.`,
            variant: "destructive",
            duration: 4000
          });
          setActiveTab('overview');
        }
        
      } else if (actionType === 'View Salary Analysis') {
        setActiveTab('research');
        toast({
          title: "Salary Analysis",
          description: "Loading salary insights...",
          duration: 2000
        });
        
      } else if (actionType === 'Generate Strategy') {
        setActiveTab('analysis');
        toast({
          title: "Strategy Generator",
          description: "Generating market strategy...",
          duration: 2000
        });
      }
      
    } catch (error) {
      console.error('❌ Action failed:', error);
      toast({
        title: "Action Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
        duration: 3000
      });
      setActiveTab('overview');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, findCareerPath, findLocation, setActiveTab, setSelectedCareerPath, setSelectedLocation, runComprehensiveAnalysis, toast]);

  return {
    handleAction,
    isLoading
  };
};
import { useState, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMarketIntelligence } from "@/hooks/useMarketIntelligence";

interface CareerPath {
  id: string;
  title: string;
}

interface Location {
  id: string;
  label: string;
  value: string;
  emoji?: string;
}

interface UnifiedActionHandlerProps {
  selectedCareerPath: CareerPath | null;
  selectedLocation: Location | null;
  setSelectedCareerPath: (cp: CareerPath) => void;
  setSelectedLocation: (loc: Location) => void;
  setActiveTab: (tab: string) => void;
  setSalaryData: (data: any) => void;
  runComprehensiveAnalysis: (title: string, label: string, id: string, locId: string, value: string) => Promise<void>;
}

export const useUnifiedActionHandler = ({
  selectedCareerPath,
  selectedLocation,
  setSelectedCareerPath,
  setSelectedLocation,
  setActiveTab,
  setSalaryData,
  runComprehensiveAnalysis
}: UnifiedActionHandlerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { getSalaryInsights } = useMarketIntelligence();

  const findCareerPath = useCallback(async (searchTerm?: string): Promise<CareerPath | null> => {
    if (!searchTerm) return selectedCareerPath;
    
    const { data: careerPathData } = await supabase
      .from('career_paths')
      .select('id, title')
      .ilike('title', `%${searchTerm}%`)
      .limit(5);
    
    return careerPathData?.find(cp => 
      cp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      searchTerm.toLowerCase().includes(cp.title.toLowerCase())
    ) || selectedCareerPath;
  }, [selectedCareerPath]);

  const findLocation = useCallback(async (searchTerm?: string): Promise<Location | null> => {
    if (!searchTerm) return selectedLocation;
    
    const { data: locationData } = await supabase
      .from('locations')
      .select('id, label, value')
      .or(`label.ilike.%${searchTerm}%,value.ilike.%${searchTerm}%`)
      .limit(5);
    
    return locationData?.find(loc => 
      loc.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      searchTerm.toLowerCase().includes(loc.label.toLowerCase()) ||
      searchTerm.toLowerCase().includes(loc.value.toLowerCase())
    ) || selectedLocation;
  }, [selectedLocation]);

  const handleUnifiedAction = useCallback(async (actionData: any) => {
    console.log('🎯 Unified action triggered:', actionData);
    
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      // Normalize action data - handle both string and object formats
      const actionType = typeof actionData === 'string' ? actionData : actionData.type;
      const careerPath = typeof actionData === 'string' ? undefined : actionData.careerPath;
      const location = typeof actionData === 'string' ? undefined : actionData.location;
      
      console.log('🔍 Processing unified action:', { actionType, careerPath, location });
      
      // Route to appropriate handler based on action type - ENHANCED ACTION ROUTING
      if (actionType === 'Analyze This Market' || actionType === 'Analyze This Opportunity' || actionType === 'Run Analysis') {
        await handleMarketAnalysis(careerPath, location);
      } else if (actionType === 'View Salary Analysis' || actionType.includes('Salary') || actionType === 'Explore Salaries') {
        await handleSalaryAnalysis(careerPath, location);
      } else if (actionType === 'Generate Strategy' || actionType === 'Strategy Generation') {
        await handleStrategyGeneration(careerPath, location);
      } else if (actionType === 'View Opportunities') {
        await handleViewOpportunities(careerPath, location);
      } else if (actionType === 'Pattern Details') {
        await handlePatternDetails(careerPath, location);
      } else {
        console.log('🔄 Handling unknown action:', actionType);
        await handleGenericAction(actionType, careerPath, location);
      }
      
    } catch (error) {
      console.error('❌ Unified action processing failed:', error);
      toast({
        title: "Action Failed",
        description: "Failed to process action. Please try again.",
        variant: "destructive",
        duration: 3000
      });
      setActiveTab('overview');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, findCareerPath, findLocation, setActiveTab, runComprehensiveAnalysis, toast]);

  const handleMarketAnalysis = async (careerPath?: string, location?: string) => {
    console.log('📊 Starting market analysis for:', careerPath, 'in', location);
    
    // Switch to analysis tab immediately for visual feedback
    setActiveTab('analysis');
    
    toast({
      title: "Starting Analysis",
      description: `Analyzing ${careerPath || 'selected career'} in ${location || 'selected location'}...`,
      duration: 2000
    });
    
    // Find matching data
    const [matchedCareerPath, matchedLocation] = await Promise.all([
      findCareerPath(careerPath),
      findLocation(location)
    ]);
    
    if (matchedCareerPath && matchedLocation) {
      console.log('✅ Found matches:', { 
        career: matchedCareerPath.title, 
        location: matchedLocation.label 
      });
      
      // Update state sequentially to prevent race conditions
      setSelectedCareerPath(matchedCareerPath);
      await new Promise(resolve => setTimeout(resolve, 100));
      setSelectedLocation(matchedLocation);
      
      toast({
        title: "Analysis Started",
        description: `Analyzing ${matchedCareerPath.title} in ${matchedLocation.label}`,
        duration: 2000
      });
      
      // Run comprehensive analysis
      await runComprehensiveAnalysis(
        matchedCareerPath.title,
        matchedLocation.label,
        matchedCareerPath.id,
        matchedLocation.id,
        matchedLocation.value
      );
    } else {
      const missingItems = [];
      if (!matchedCareerPath) missingItems.push(`career path "${careerPath}"`);
      if (!matchedLocation) missingItems.push(`location "${location}"`);
      
      toast({
        title: "Data Not Found",
        description: `Could not find ${missingItems.join(' and ')}. Please select from dropdowns.`,
        variant: "destructive",
        duration: 4000
      });
      setActiveTab('overview');
    }
  };

  const handleSalaryAnalysis = async (careerPath?: string, location?: string) => {
    console.log('💰 Starting salary analysis for:', careerPath);
    
    // Switch to research tab immediately
    setActiveTab('research');
    
    toast({
      title: "Loading Salary Analysis",
      description: "Fetching salary insights...",
      duration: 2000
    });
    
    // Find matching career path
    const targetCareerPath = await findCareerPath(careerPath);
    
    if (targetCareerPath) {
      try {
        console.log('📊 Fetching salary insights for:', targetCareerPath.title);
        const salaryData = await getSalaryInsights(targetCareerPath.title);
        
        if (salaryData) {
          setSalaryData(salaryData);
          setSelectedCareerPath(targetCareerPath);
          
          toast({
            title: "Salary Analysis Ready",
            description: `Salary insights for ${targetCareerPath.title} loaded`,
            duration: 2000
          });
        } else {
          toast({
            title: "No Salary Data",
            description: "No salary information available for this career path",
            variant: "destructive",
            duration: 3000
          });
        }
      } catch (error) {
        console.error('❌ Salary analysis failed:', error);
        toast({
          title: "Salary Analysis Failed",
          description: "Failed to load salary insights",
          variant: "destructive",
          duration: 3000
        });
      }
    } else {
      toast({
        title: "No Career Selected",
        description: "Please select a career path first",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const handleStrategyGeneration = useCallback(async (careerPath?: string, location?: string) => {
    console.log('🎯 Handling strategy generation:', { careerPath, location });
    
    const finalCareerPath = careerPath ? await findCareerPath(careerPath) : selectedCareerPath;
    const finalLocation = location ? await findLocation(location) : selectedLocation;
    
    if (finalCareerPath && finalLocation) {
      setSelectedCareerPath(finalCareerPath);
      setSelectedLocation(finalLocation);
      setActiveTab('analysis'); // Navigate to analysis tab where strategy generator is located
      
      toast({
        title: "Strategy Generator",
        description: `Opening strategy generator for ${finalCareerPath.title} in ${finalLocation.label}`,
      });
    } else {
      toast({
        title: "Strategy Generation",
        description: "Please select a career path and location first",
        variant: "destructive"
      });
    }
  }, [toast, findCareerPath, findLocation, selectedCareerPath, selectedLocation, setSelectedCareerPath, setSelectedLocation, setActiveTab]);

  // NEW ACTION HANDLERS
  const handleViewOpportunities = useCallback(async (careerPath?: string, location?: string) => {
    console.log('📍 Handling view opportunities:', { careerPath, location });
    
    // Navigate to overview tab and scroll to market activity section
    setActiveTab('overview');
    
    toast({
      title: "Market Opportunities",
      description: "Viewing available opportunities in the market overview",
    });
    
    // Future enhancement: navigate to dedicated opportunities page
  }, [setActiveTab, toast]);

  const handlePatternDetails = useCallback(async (careerPath?: string, location?: string) => {
    console.log('📊 Handling pattern details:', { careerPath, location });
    
    const finalCareerPath = careerPath ? await findCareerPath(careerPath) : selectedCareerPath;
    const finalLocation = location ? await findLocation(location) : selectedLocation;
    
    if (finalCareerPath && finalLocation) {
      setSelectedCareerPath(finalCareerPath);
      setSelectedLocation(finalLocation);
      setActiveTab('research'); // Navigate to research tab for pattern analysis
      
      toast({
        title: "Pattern Analysis",
        description: `Loading pattern details for ${finalCareerPath.title} in ${finalLocation.label}`,
      });
    } else {
      toast({
        title: "Pattern Details",
        description: "Please select a career path and location first",
        variant: "destructive"
      });
    }
  }, [toast, findCareerPath, findLocation, selectedCareerPath, selectedLocation, setSelectedCareerPath, setSelectedLocation, setActiveTab]);

  const handleGenericAction = useCallback(async (actionType: string, careerPath?: string, location?: string) => {
    console.log('🔄 Handling generic action:', { actionType, careerPath, location });
    
    toast({
      title: "Action Received",
      description: `Processing action: ${actionType}`,
    });
  }, [toast]);

  return {
    handleUnifiedAction,
    isLoading
  };
};
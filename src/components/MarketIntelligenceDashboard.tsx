import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  DollarSign, 
  Users, 
  Zap, 
  BarChart3,
  Target,
  Bell,
  Download,
  Eye,
  Brain,
  Globe,
  Activity,
  Sparkles
} from 'lucide-react';
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence';
import { useEnhancedMarketIntelligence } from '@/hooks/useEnhancedMarketIntelligence';
import { supabase } from '@/integrations/supabase/client';
import { useSmartMarketSelection } from '@/hooks/useSmartMarketSelection';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedActionHandler } from '@/components/UnifiedActionHandler';
import { CareerPathCombobox } from '@/components/ui/CareerPathCombobox';
import { LocationCombobox } from '@/components/ui/LocationCombobox';
import { MarketIntelligenceExportPanel } from './MarketIntelligenceExportPanel';
import { EnhancedMarketAlertSystem } from './EnhancedMarketAlertSystem';
import { CompareMarketTrendsPanel } from './CompareMarketTrendsPanel';
import { SuggestedMarketMovesCard } from './SuggestedMarketMovesCard';
import { MarketForecastPanel } from './MarketForecastPanel';
import { RealTimeJobDataPanel } from './RealTimeJobDataPanel';
import { HistoricalTrendsVisualization } from './HistoricalTrendsVisualization';
import { PatternRecognitionPanel } from './PatternRecognitionPanel';
import { LoadingSkeleton } from './LoadingSkeleton';
import { MarketDataSeeder } from './MarketDataSeeder';
import { IntelligentWorkflowGuide } from './IntelligentWorkflowGuide';
import { IntelligenceInsightsCard } from './IntelligenceInsightsCard';
import { TopMarketInsights } from './TopMarketInsights';
import { OpportunityScoreWidget } from './OpportunityScoreWidget';
import { MarketPulseWidget } from './MarketPulseWidget';
import { SmartSuggestionsWidget } from './SmartSuggestionsWidget';
import { SmartSelectionPanel } from './SmartSelectionPanel';
import { IntelligentActionBridge } from './IntelligentActionBridge';
import { AnalysisLoadingState } from './AnalysisLoadingState';


export const MarketIntelligenceDashboard = () => {
  const { toast } = useToast();
  const {
    loading,
    error,
    marketData,
    fetchMarketTrends,
    analyzeMarketTrends,
    getTopGrowingCareers,
    getSalaryInsights
  } = useMarketIntelligence();

  const {
    getHistoricalTrends,
    fetchRealTimeJobData,
    generateDemandForecast
  } = useEnhancedMarketIntelligence();

  const {
    autoSelectedCareerPath,
    autoSelectedLocation,
    suggestions,
    isSmartMode,
    setIsSmartMode,
    extractContextFromAction,
    setAutoSelectedCareerPath,
    setAutoSelectedLocation
  } = useSmartMarketSelection();

  const [selectedCareerPath, setSelectedCareerPath] = useState<{ id: string; title: string } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ id: string; label: string; value: string; emoji: string } | null>(null);
  const [showSmartPanel, setShowSmartPanel] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [topCareers, setTopCareers] = useState<any[]>([]);
  const [salaryData, setSalaryData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState(false);
  const [comprehensiveLoading, setComprehensiveLoading] = useState(false);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [realTimeData, setRealTimeData] = useState<any[]>([]);
  
  
  // New state for comprehensive analysis results
  const [patternRecognitionData, setPatternRecognitionData] = useState<any>(null);
  const [demandForecastData, setDemandForecastData] = useState<any>(null);
  const [salaryAnalysisData, setSalaryAnalysisData] = useState<any>(null);
  const [allAnalysisComplete, setAllAnalysisComplete] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState<'initializing' | 'analyzing' | 'processing' | 'finalizing'>('initializing');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await fetchMarketTrends();
        await loadTopCareers();
      } catch (error) {
        console.error('❌ Failed to load initial market data:', error);
        toast({
          title: "Data Loading Error",
          description: "Failed to load market data. Please refresh the page.",
          variant: "destructive"
        });
      }
    };
    
    loadInitialData();
  }, []);

  // Auto-select smart defaults when available
  useEffect(() => {
    if (isSmartMode && autoSelectedCareerPath && !selectedCareerPath) {
      setSelectedCareerPath(autoSelectedCareerPath);
    }
  }, [autoSelectedCareerPath, selectedCareerPath, isSmartMode]);

  useEffect(() => {
    if (isSmartMode && autoSelectedLocation && !selectedLocation) {
      setSelectedLocation(autoSelectedLocation);
    }
  }, [autoSelectedLocation, selectedLocation, isSmartMode]);

  const runComprehensiveAnalysis = async (careerPathTitle: string, locationLabel: string, careerPathId: string, locationId: string, locationValue: string) => {
    console.log('🚀 Starting comprehensive analysis for:', careerPathTitle, 'in', locationLabel);
    
    try {
      // Initialize progress tracking
      setAnalysisProgress(0);
      setAnalysisStage('initializing');
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UX
      
      // Stage 1: Market trend analysis
      setAnalysisStage('analyzing');
      setAnalysisProgress(20);
      console.log('📊 Running market trend analysis...');
      
      const analysisResult = await analyzeMarketTrends(careerPathId, locationId);
      console.log('📊 Analysis result:', analysisResult);
      if (analysisResult) {
        setAnalysis(analysisResult);
        setAnalysisProgress(40);
      }
      
      // Stage 2: Fetch additional data in parallel
      setAnalysisStage('processing');
      setAnalysisProgress(50);
      console.log('📈 Fetching additional market data...');
      
      const [historicalResult, realTimeResult, patternResult, forecastResult] = await Promise.allSettled([
        getHistoricalTrends(careerPathTitle, locationValue, 6),
        fetchRealTimeJobData(careerPathTitle, locationValue),
        // Pattern recognition analysis
        supabase.functions.invoke('pattern-recognition-engine', {
          body: {
            careerPath: careerPathTitle,
            location: locationValue,
            timeframe: '90d',
            analysisTypes: ['seasonal', 'trend', 'volatility', 'anomaly']
          }
        }),
        // Demand forecasting
        generateDemandForecast(careerPathTitle, locationValue, '6months')
      ]);
      
      // Stage 3: Process results and set states
      setAnalysisStage('finalizing');
      setAnalysisProgress(70);
      
      if (historicalResult.status === 'fulfilled' && historicalResult.value) {
        setHistoricalData(historicalResult.value);
        console.log('📈 Historical data set');
        setAnalysisProgress(75);
      }

      if (realTimeResult.status === 'fulfilled' && realTimeResult.value) {
        setRealTimeData(realTimeResult.value);
        console.log('⚡ Real-time data set');
        setAnalysisProgress(80);
      }

      if (patternResult.status === 'fulfilled' && patternResult.value?.data?.success) {
        setPatternRecognitionData(patternResult.value.data);
        console.log('🔍 Pattern recognition set');
        setAnalysisProgress(85);
      }

      if (forecastResult.status === 'fulfilled' && forecastResult.value) {
        setDemandForecastData(forecastResult.value);
        console.log('🔮 Demand forecast set');
        setAnalysisProgress(90);
      }

      // Final stage
      setAnalysisProgress(95);
      await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause for final processing

      setAllAnalysisComplete(true);
      setAnalysisProgress(100);
      console.log('✅ Comprehensive analysis completed successfully');
      
      toast({
        title: "🎉 Analysis Complete!",
        description: `Market analysis for ${careerPathTitle} in ${locationLabel} is ready!`,
        duration: 4000
      });
      
    } catch (error) {
      console.error('❌ Comprehensive analysis failed:', error);
      setAnalysisProgress(0);
      setAnalysisStage('initializing');
      toast({
        title: "Analysis Failed",
        description: "Failed to complete comprehensive market analysis. Please try again.",
        variant: "destructive",
        duration: 4000
      });
    }
  };

  // Use unified action handler for consistent action processing
  const { handleUnifiedAction, isLoading: unifiedActionLoading } = useUnifiedActionHandler({
    selectedCareerPath,
    selectedLocation,
    setSelectedCareerPath,
    setSelectedLocation: (loc) => setSelectedLocation({...loc, emoji: loc.emoji || ''}),
    setActiveTab,
    setSalaryAnalysisData,
    runComprehensiveAnalysis
  });

  const loadTopCareers = async () => {
    try {
      const careers = await getTopGrowingCareers();
      setTopCareers(careers);
    } catch (error) {
      console.error('❌ Failed to load top careers:', error);
    }
  };

  const handleMarketAnalysis = async () => {
    if (!selectedCareerPath || !selectedLocation) {
      toast({
        title: "Missing Information",
        description: "Please select both career path and location for analysis",
        variant: "destructive"
      });
      return;
    }

    const result = await analyzeMarketTrends(selectedCareerPath.id, selectedLocation.id);
    if (result) {
      setAnalysis(result);
      toast({
        title: "Analysis Complete",
        description: `Market analysis for ${selectedCareerPath.title} in ${selectedLocation.label} is ready`
      });
    }
  };

  const handleSalaryAnalysis = async () => {
    if (!selectedCareerPath) {
      toast({
        title: "Missing Information",
        description: "Please select a career path for salary analysis",
        variant: "destructive"
      });
      return;
    }

    const result = await getSalaryInsights(selectedCareerPath.title);
    if (result) {
      setSalaryData(result);
      toast({
        title: "Salary Analysis Complete",
        description: `Salary insights for ${selectedCareerPath.title} are ready`
      });
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
      case 'rising':
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'decreasing':
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-amber-500" />;
    }
  };

  const getCompetitionColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300';
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    }
  };

  const getMetricValue = (value: number, suffix: string = '') => {
    if (value === undefined || value === null) return 'N/A';
    return `${value.toLocaleString()}${suffix}`;
  };

  const handleTabNavigation = (tab: string) => {
    setActiveTab(tab);
  };

  const handleInsightAction = async (action: any) => {
    console.log('🎯 Insight Action Triggered:', action);
    
    // Show immediate loading feedback
    setActionLoading(true);
    setComprehensiveLoading(true);
    
    // Show immediate visual feedback with toast
    toast({
      title: "Processing Insight",
      description: "Analyzing market opportunity...",
      duration: 1000
    });
    
    try {
      // Handle both new action object format and legacy string format
      const actionType = typeof action === 'string' ? action : action.type;
      const careerPath = typeof action === 'object' ? action.careerPath : undefined;
      const location = typeof action === 'object' ? action.location : undefined;
      
      console.log('🔍 Processing action:', { actionType, careerPath, location });
      
      if (actionType === 'Analyze This Market' && careerPath && location) {
        console.log('🎯 Starting market analysis for:', careerPath, 'in', location);
        
        // Immediate UI feedback
        setActiveTab('analysis');
        setComprehensiveLoading(true);
        
        toast({
          title: "Analyzing Market",
          description: `Loading analysis for ${careerPath} in ${location}`,
          duration: 2000
        });
        
        // Enhanced fuzzy matching with multiple strategies
        const findCareerPath = async (searchTerm: string) => {
          console.log('🔍 Searching for career path:', searchTerm);
          
          // Strategy 1: Exact match
          let { data: exactMatch } = await supabase
            .from('career_paths')
            .select('*')
            .ilike('title', searchTerm)
            .limit(1);
          
          if (exactMatch && exactMatch.length > 0) {
            console.log('✅ Found exact match:', exactMatch[0]);
            return exactMatch[0];
          }
          
          // Strategy 2: Contains match
          let { data: containsMatch } = await supabase
            .from('career_paths')
            .select('*')
            .ilike('title', `%${searchTerm}%`)
            .limit(5);
          
          if (containsMatch && containsMatch.length > 0) {
            // Find best match by similarity
            const bestMatch = containsMatch.find(cp => 
              cp.title.toLowerCase() === searchTerm.toLowerCase() ||
              cp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              searchTerm.toLowerCase().includes(cp.title.toLowerCase())
            ) || containsMatch[0];
            
            console.log('✅ Found contains match:', bestMatch);
            return bestMatch;
          }
          
          // Strategy 3: Word-based fuzzy matching for compound terms
          if (searchTerm.includes(' ')) {
            const words = searchTerm.split(' ');
            for (const word of words) {
              if (word.length > 3) { // Only search meaningful words
                let { data: wordMatch } = await supabase
                  .from('career_paths')
                  .select('*')
                  .ilike('title', `%${word}%`)
                  .limit(3);
                
                if (wordMatch && wordMatch.length > 0) {
                  console.log('✅ Found word-based match:', wordMatch[0]);
                  return wordMatch[0];
                }
              }
            }
          }
          
          console.log('❌ No career path match found for:', searchTerm);
          return null;
        };

        const findLocation = async (searchTerm: string) => {
          console.log('🌍 Searching for location:', searchTerm);
          
          // Strategy 1: Exact match
          let { data: exactMatch } = await supabase
            .from('locations')
            .select('*')
            .or(`label.ilike.${searchTerm},value.ilike.${searchTerm}`)
            .eq('active', true)
            .limit(1);
          
          if (exactMatch && exactMatch.length > 0) {
            console.log('✅ Found exact location match:', exactMatch[0]);
            return exactMatch[0];
          }
          
          // Strategy 2: Contains match
          let { data: containsMatch } = await supabase
            .from('locations')
            .select('*')
            .or(`label.ilike.%${searchTerm}%,value.ilike.%${searchTerm}%`)
            .eq('active', true)
            .limit(5);
          
          if (containsMatch && containsMatch.length > 0) {
            const bestMatch = containsMatch.find(loc => 
              loc.label.toLowerCase() === searchTerm.toLowerCase() ||
              loc.value.toLowerCase() === searchTerm.toLowerCase() ||
              loc.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
              searchTerm.toLowerCase().includes(loc.label.toLowerCase())
            ) || containsMatch[0];
            
            console.log('✅ Found location contains match:', bestMatch);
            return bestMatch;
          }
          
          console.log('❌ No location match found for:', searchTerm);
          return null;
        };
        
        // Perform lookups in parallel
        const [matchedCareerPath, matchedLocation] = await Promise.all([
          findCareerPath(careerPath),
          findLocation(location)
        ]);
        
        console.log('🎯 Final matches:', { matchedCareerPath, matchedLocation });
        
        if (matchedCareerPath && matchedLocation) {
          // Clear all previous data immediately
          setAnalysis(null);
          setTopCareers([]);
          setSalaryData(null);
          setHistoricalData([]);
          setPatternRecognitionData(null);
          setDemandForecastData(null);
          setRealTimeData([]);
          setAllAnalysisComplete(false);
          
          // Update states with proper data structures
          const newCareerPath = { id: matchedCareerPath.id, title: matchedCareerPath.title };
          const newLocation = {
            id: matchedLocation.id,
            label: matchedLocation.label,
            value: matchedLocation.value,
            emoji: matchedLocation.emoji
          };
          
          // Update UI state immediately
          setSelectedCareerPath(newCareerPath);
          setSelectedLocation(newLocation);
          
          // Show progress feedback
          toast({
            title: "Analysis Started",
            description: `Analyzing ${newCareerPath.title} in ${newLocation.label}`,
            duration: 2000
          });
          
          console.log('🚀 Starting comprehensive analysis for:', newCareerPath.title, 'in', newLocation.label);
          
          // Run comprehensive analysis
          await runComprehensiveAnalysis(
            newCareerPath.title, 
            newLocation.label, 
            newCareerPath.id, 
            newLocation.id, 
            newLocation.value
          );
          
        } else {
          const missingItems = [];
          if (!matchedCareerPath) missingItems.push(`career path "${careerPath}"`);
          if (!matchedLocation) missingItems.push(`location "${location}"`);
          
          console.error('❌ Could not find:', missingItems.join(' and '));
          toast({
            title: "Data Not Found",
            description: `Could not find ${missingItems.join(' and ')}. Please try selecting from the dropdowns.`,
            variant: "destructive",
            duration: 4000
          });
          
          // Revert tab if no matches found
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
          description: "Generating personalized market strategy...",
          duration: 2000
        });
      } else {
        console.log('🔄 Handling legacy action format or unknown action:', actionType);
        // Fall back to legacy handler for other actions
        await legacyHandleInsightAction(actionType, careerPath, location);
      }
    } catch (error) {
      console.error('❌ Action processing failed:', error);
      toast({
        title: "Action Failed",
        description: "Failed to process insight action. Please try again.",
        variant: "destructive",
        duration: 3000
      });
      
      // Revert to overview on error
      setActiveTab('overview');
    } finally {
      setActionLoading(false);
      setComprehensiveLoading(false);
    }
  };

  const handleSmartSuggestionSelect = (careerPath: any, location: any) => {
    setSelectedCareerPath(careerPath);
    setSelectedLocation(location);
    setShowSmartPanel(false);
    toast({
      title: "Smart Selection Applied",
      description: `Selected ${careerPath.title} in ${location.label}`,
    });
  };


  const handleQuickAnalyze = async (careerPath: any, location: any) => {
    setSelectedCareerPath(careerPath);
    setSelectedLocation(location);
    setShowSmartPanel(false);
    
    // Trigger comprehensive analysis immediately
    await handleInsightAction({
      type: 'Analyze This Market',
      careerPath: careerPath.title,
      location: location.label
    });
  };

  const legacyHandleInsightAction = async (action: string, careerPath?: string, location?: string) => {
    console.log('🔥 Legacy action triggered:', { action, careerPath, location });
    setActionLoading(true);
    
    try {
      // Auto-select career path if provided
      let careerPathObj = selectedCareerPath;
      if (careerPath && !selectedCareerPath) {
        console.log('Looking up career path:', careerPath);
        const { data: careerPaths, error } = await supabase
          .from('career_paths')
          .select('id, title')
          .ilike('title', `%${careerPath}%`)
          .limit(1);
        
        if (error) {
          console.error('Career path lookup error:', error);
        } else if (careerPaths && careerPaths.length > 0) {
          careerPathObj = { id: careerPaths[0].id, title: careerPaths[0].title };
          setSelectedCareerPath(careerPathObj);
          console.log('Found career path:', careerPathObj);
        } else {
          console.log('No matching career path found for:', careerPath);
        }
      }

      // Auto-select location if provided
      let locationObj = selectedLocation;
      if (location && !selectedLocation) {
        console.log('Looking up location:', location);
        const { data: locations, error } = await supabase
          .from('locations')
          .select('id, label, value, emoji')
          .or(`label.ilike.%${location}%,value.ilike.%${location}%`)
          .eq('active', true)
          .limit(1);
        
        if (error) {
          console.error('Location lookup error:', error);
        } else if (locations && locations.length > 0) {
          locationObj = {
            id: locations[0].id,
            label: locations[0].label,
            value: locations[0].value,
            emoji: locations[0].emoji
          };
          setSelectedLocation(locationObj);
          console.log('Found location:', locationObj);
        } else {
          console.log('No matching location found for:', location);
        }
      }

      // Handle different actions with the resolved data
      switch (action) {
        case 'View Salary Analysis':
          if (careerPathObj) {
            console.log('Starting salary analysis for:', careerPathObj.title);
            const result = await getSalaryInsights(careerPathObj.title);
            console.log('Salary analysis result:', result);
            
            if (result) {
              setSalaryData(result);
              setActiveTab('research');
              toast({
                title: "Salary Analysis Complete",
                description: `Salary insights for ${careerPathObj.title} are ready`
              });
            } else {
              toast({
                title: "Analysis Failed",
                description: "Could not retrieve salary insights. Please try again.",
                variant: "destructive"
              });
            }
          } else {
            toast({
              title: "Missing Information",
              description: "Please select a career path for salary analysis",
              variant: "destructive"
            });
          }
          break;
          
        case 'Analyze This Market':
        case 'Analyze This Opportunity':
          if (careerPathObj && locationObj) {
            console.log('Starting market analysis for:', careerPathObj.title, 'in', locationObj.label);
            
            // Use the string values that the API expects
            const result = await analyzeMarketTrends(
              careerPathObj.id, 
              locationObj.id
            );
            console.log('Market analysis result:', result);
            
            if (result) {
              console.log('✅ Setting analysis result and navigating to analysis tab');
              setAnalysis(result);
              // Small delay to ensure state updates properly
              setTimeout(() => {
                setActiveTab('analysis');
              }, 100);
              toast({
                title: "Analysis Complete",
                description: `Market analysis for ${careerPathObj.title} in ${locationObj.label} is ready`
              });
            } else {
              toast({
                title: "Analysis Failed",
                description: "Could not complete market analysis. Please try again.",
                variant: "destructive"
              });
            }
          } else {
            toast({
              title: "Missing Information", 
              description: "Please select both career path and location for market analysis",
              variant: "destructive"
            });
          }
          break;
          
        case 'Generate Strategy':
          // Navigate to analysis tab and show strategy recommendations
          setActiveTab('analysis');
          toast({
            title: "Strategy Generator",
            description: "Generating personalized career strategy based on market insights",
          });
          break;
          
        case 'Explore Alternatives':
          setActiveTab('research');
          toast({
            title: "Exploring Alternatives",
            description: "Analyzing alternative career paths and market opportunities",
          });
          break;
          
        case 'Set Alert':
          setActiveTab('alerts');
          toast({
            title: "Alert Setup",
            description: "Setting up market alerts for this opportunity",
          });
          break;
          
        default:
          console.log('Unknown action:', action);
      }
    } catch (error) {
      console.error('❌ Error in handleInsightAction:', error);
      toast({
        title: "Action Failed",
        description: "Something went wrong while processing your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };


  // Overview Dashboard Component
  const OverviewDashboard = () => {
    if (loading && marketData.length === 0) {
      return <LoadingSkeleton variant="dashboard" />;
    }

    return (
      <div className="space-y-6">
        {/* Smart Selection Panel */}
        {showSmartPanel && (
          <SmartSelectionPanel
            suggestions={suggestions}
            onSuggestionSelect={handleSmartSuggestionSelect}
            onQuickAnalyze={handleQuickAnalyze}
            isVisible={showSmartPanel}
          />
        )}

        {/* Intelligent Action Bridge */}
        {comprehensiveLoading && (
          <IntelligentActionBridge
            isRunning={comprehensiveLoading}
            careerPath={selectedCareerPath?.title}
            location={selectedLocation?.label}
            onComplete={() => {}}
            selectedTab={activeTab}
          />
        )}

        {/* Intelligence-First Dashboard */}
        
        {/* Phase 1: Top 3 Market Insights (Lead with Intelligence) */}
        <TopMarketInsights
          marketData={marketData}
          selectedCareerPath={selectedCareerPath?.title}
          selectedLocation={selectedLocation?.value}
          onActionClick={handleUnifiedAction}
        />

        {/* Intelligence Surface: Core Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Opportunity Score Widget */}
          <div className="lg:col-span-1">
            <OpportunityScoreWidget
              marketData={marketData}
              selectedCareerPath={selectedCareerPath?.title}
              selectedLocation={selectedLocation?.value}
            />
          </div>

          {/* Market Pulse Widget */}
          <div className="lg:col-span-1">
            <MarketPulseWidget
              marketData={marketData}
              selectedCareerPath={selectedCareerPath?.title}
              selectedLocation={selectedLocation?.value}
              onActionClick={handleUnifiedAction}
            />
          </div>

          {/* Smart Suggestions Widget */}
          <div className="xl:col-span-2">
            <SmartSuggestionsWidget
              marketData={marketData}
              selectedCareerPath={selectedCareerPath?.title}
              selectedLocation={selectedLocation?.value}
              onSuggestionSelect={(careerPath, location) => {
                // Handle suggestion selection
                toast({
                  title: "Suggestion Selected",
                  description: `Analyzing ${careerPath} in ${location}`,
                });
              }}
                  onActionClick={handleUnifiedAction}
            />
          </div>
        </div>

        {/* Data Seeder (only show if no data) */}
        {marketData.length === 0 && (
          <div className="border-2 border-dashed border-muted rounded-lg p-8">
            <MarketDataSeeder />
          </div>
        )}

        {/* Connected Intelligence: Workflow & Traditional Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <IntelligentWorkflowGuide
              selectedCareerPath={selectedCareerPath}
              selectedLocation={selectedLocation}
              analysis={analysis}
              onNavigateToTab={handleTabNavigation}
              onAnalysisRequest={handleMarketAnalysis}
            />
          </div>
          <div>
            <IntelligenceInsightsCard
              selectedCareerPath={selectedCareerPath}
              selectedLocation={selectedLocation}
              analysis={analysis}
              marketData={marketData}
              onNavigateToTab={handleTabNavigation}
            />
          </div>
        </div>

        {/* Quick Market Intelligence Metrics */}
        {marketData.length > 0 && (
          <Card className="bg-gradient-to-r from-primary/5 to-blue-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Market Intelligence Score
              </CardTitle>
              <CardDescription>
                Overall market health and opportunity assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg bg-card">
                  <div className="text-2xl font-bold text-primary">
                    {marketData.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Markets Tracked</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-card">
                  <div className="text-2xl font-bold text-emerald-600">
                    +{(marketData.reduce((acc, curr) => acc + curr.growth_rate, 0) / marketData.length).toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Growth</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-card">
                  <div className="text-2xl font-bold text-blue-600">
                    {marketData.reduce((acc, curr) => acc + curr.job_postings_count, 0).toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-card">
                  <div className="text-2xl font-bold text-purple-600">
                    ${Math.round(marketData.reduce((acc, curr) => acc + curr.average_salary, 0) / marketData.length / 1000)}k
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Salary</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personalized Recommendations */}
        <SuggestedMarketMovesCard />

        {/* Market Trends Overview */}
        {marketData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Market Overview
              </CardTitle>
              <CardDescription>
                Quick insights from your market intelligence data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {marketData.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Markets Tracked</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">
                    +{(marketData.reduce((acc, curr) => acc + curr.growth_rate, 0) / marketData.length).toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Growth</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {marketData.reduce((acc, curr) => acc + curr.job_postings_count, 0).toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    ${Math.round(marketData.reduce((acc, curr) => acc + curr.average_salary, 0) / marketData.length / 1000)}k
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Salary</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Growing Careers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Market Opportunities
            </CardTitle>
            <CardDescription>
              Highest growth potential careers in your selected markets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSkeleton variant="table" count={5} />
            ) : (
              <div className="grid gap-4">
                {topCareers.slice(0, 5).map((career, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium">{career.career_path}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                          {career.growth_rate}% growth
                        </span>
                         <span className="flex items-center gap-1">
                           <DollarSign className="h-3 w-3 text-blue-500" />
                           ${career.average_salary?.toLocaleString() || 'N/A'}
                         </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {career.demand_score}% demand
                  </Badge>
                  <Badge className={getCompetitionColor(career.competition_level)}>
                    {career.competition_level}
                  </Badge>
                </div>
              </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Market Intelligence</h1>
            <p className="text-muted-foreground">
              AI-powered career market analysis and insights
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedCareerPath && selectedLocation && (
              <Badge variant="outline" className="px-3 py-1">
                <MapPin className="h-3 w-3 mr-1" />
                {selectedCareerPath.title} in {selectedLocation.label}
              </Badge>
            )}
          </div>
        </div>

        {/* Smart Global Controls */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Market Intelligence Dashboard
                  {isSmartMode && <Badge variant="secondary" className="ml-2">AI Mode</Badge>}
                </CardTitle>
                <CardDescription>
                  {selectedCareerPath && selectedLocation 
                    ? `Analyzing ${selectedCareerPath.title} opportunities in ${selectedLocation.label}`
                    : "AI-powered career market analysis and insights"
                  }
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSmartMode(!isSmartMode)}
                  className={isSmartMode ? "border-primary text-primary" : ""}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isSmartMode ? "Smart On" : "Smart Off"}
                </Button>
                <Button 
                  onClick={handleMarketAnalysis}
                  disabled={actionLoading || !selectedCareerPath || !selectedLocation}
                  className="bg-primary hover:bg-primary/90"
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Analyze Market
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Career Path
                  {autoSelectedCareerPath && !selectedCareerPath && (
                    <Badge variant="outline" className="ml-2 text-xs">AI Suggested</Badge>
                  )}
                </label>
                <CareerPathCombobox
                  value={selectedCareerPath}
                  onChange={setSelectedCareerPath}
                  placeholder={autoSelectedCareerPath ? `Try: ${autoSelectedCareerPath.title}` : "Search career paths..."}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Location
                  {autoSelectedLocation && !selectedLocation && (
                    <Badge variant="outline" className="ml-2 text-xs">AI Suggested</Badge>
                  )}
                </label>
                <LocationCombobox
                  value={selectedLocation}
                  onChange={setSelectedLocation}
                  placeholder={autoSelectedLocation ? `Try: ${autoSelectedLocation.label}` : "Select location..."}
                />
              </div>
              <div className="flex items-end gap-2">
                {isSmartMode && !selectedCareerPath && !selectedLocation && (
                  <Button
                    variant="outline"
                    onClick={() => setShowSmartPanel(true)}
                    className="flex-1 border-primary/50 text-primary hover:bg-primary/5"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Smart Pick
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCareerPath(null);
                    setSelectedLocation(null);
                    setAnalysis(null);
                    setSalaryData(null);
                    setShowSmartPanel(true);
                  }}
                  className={!selectedCareerPath && !selectedLocation ? "flex-1" : ""}
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="relative">
          <TabsList className="grid w-full grid-cols-4 h-12 p-1">
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-2 relative transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Eye className="h-4 w-4" />
              Overview
              {actionLoading && activeTab === 'overview' && (
                <div className="absolute top-1 right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="analysis" 
              className="flex items-center gap-2 relative transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <BarChart3 className="h-4 w-4" />
              Analysis
              {(actionLoading || comprehensiveLoading) && activeTab === 'analysis' && (
                <div className="absolute top-1 right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              )}
              {analysis && !actionLoading && !comprehensiveLoading && (
                <div className="absolute top-1 right-1 h-2 w-2 bg-emerald-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="research" 
              className="flex items-center gap-2 relative transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Brain className="h-4 w-4" />
              Research
              {salaryData && (
                <div className="absolute top-1 right-1 h-2 w-2 bg-purple-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="alerts" 
              className="flex items-center gap-2 relative transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Bell className="h-4 w-4" />
              Alerts & Export
            </TabsTrigger>
          </TabsList>
          
          {/* Visual feedback for tab switching */}
          {actionLoading && (
            <div className="absolute top-0 left-0 right-0 bottom-0 bg-primary/5 rounded-lg flex items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-primary">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                Processing...
              </div>
            </div>
          )}
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <OverviewDashboard />
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          {/* Dynamic Analysis Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Market Analysis
                {selectedCareerPath && selectedLocation && (
                  <Badge variant="outline" className="ml-2">
                    {selectedCareerPath.title} · {selectedLocation.label}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {selectedCareerPath && selectedLocation 
                  ? `Comprehensive market intelligence for ${selectedCareerPath.title} in ${selectedLocation.label}`
                  : "Select a career path and location to begin analysis"
                }
              </CardDescription>
            </CardHeader>
            {selectedCareerPath && selectedLocation && !analysis && !actionLoading && !comprehensiveLoading && (
              <CardContent>
                <Button 
                  onClick={() => runComprehensiveAnalysis(
                    selectedCareerPath.title, 
                    selectedLocation.label, 
                    selectedCareerPath.id, 
                    selectedLocation.id, 
                    selectedLocation.value
                  )}
                  className="w-full"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Run Comprehensive Analysis
                </Button>
              </CardContent>
            )}
          </Card>

          {(actionLoading || comprehensiveLoading) ? (
            <AnalysisLoadingState
              careerPath={selectedCareerPath?.title}
              location={selectedLocation?.label}
              stage={analysisStage}
              progress={analysisProgress || (comprehensiveLoading ? 65 : 35)}
            />
          ) : analysis ? (
            <div className="grid gap-6">
              {/* Market Analysis Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Market Analysis Results
                  </CardTitle>
                  <CardDescription>
                    AI-powered insights for {selectedCareerPath?.title} in {selectedLocation?.label}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Demand Trend</p>
                            <p className="text-xl font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                              {analysis?.marketTrends?.aiInsights?.demandTrend ? getTrendIcon(analysis.marketTrends.aiInsights.demandTrend) : <Activity className="h-4 w-4 text-amber-500" />}
                              {analysis?.marketTrends?.aiInsights?.demandTrend || 'Analyzing...'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-emerald-600">
                              {analysis?.marketTrends?.demandScore || 0}%
                            </div>
                            <Progress value={analysis?.marketTrends?.demandScore || 0} className="w-16 mt-1" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Salary Trend</p>
                            <p className="text-xl font-bold flex items-center gap-2 text-blue-800 dark:text-blue-200">
                              {analysis?.marketTrends?.aiInsights?.salaryTrend ? getTrendIcon(analysis.marketTrends.aiInsights.salaryTrend) : <Activity className="h-4 w-4 text-amber-500" />}
                              {analysis?.marketTrends?.aiInsights?.salaryTrend || 'Analyzing...'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">
                              {analysis?.marketTrends?.aiInsights?.growthRate || 0}%
                            </div>
                            <Progress value={Math.abs(analysis?.marketTrends?.aiInsights?.growthRate || 0)} className="w-16 mt-1" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Market Saturation</p>
                            <p className="text-xl font-bold text-purple-800 dark:text-purple-200">
                              {analysis?.marketTrends?.aiInsights?.marketSaturation || 'Analyzing...'}
                            </p>
                          </div>
                          <Badge className={getCompetitionColor(analysis?.marketTrends?.competitionLevel || 'medium')}>
                            {analysis?.marketTrends?.competitionLevel || 'Medium'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* AI Insights */}
                  {analysis?.marketTrends?.aiInsights && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">AI Market Intelligence</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <p className="font-medium mb-3 text-emerald-700 dark:text-emerald-300">Market Drivers</p>
                            <div className="space-y-2">
                              {(analysis.marketTrends.aiInsights.keyDrivers || []).map((driver: string, index: number) => (
                                <Badge key={index} variant="outline" className="mr-2 mb-2">
                                  {driver}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <p className="font-medium mb-3 text-red-700 dark:text-red-300">Risk Factors</p>
                            <div className="space-y-2">
                              {(analysis.marketTrends.aiInsights.riskFactors || []).map((risk: string, index: number) => (
                                <Badge key={index} variant="destructive" className="mr-2 mb-2">
                                  {risk}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        {analysis.marketTrends.aiInsights.recommendation && (
                          <div className="border-t pt-4">
                            <p className="font-medium mb-2">Strategic Recommendation</p>
                            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                              {analysis.marketTrends.aiInsights.recommendation}
                            </p>
                            {analysis.marketTrends.aiInsights.confidence && (
                              <div className="flex items-center gap-2 mt-3">
                                <span className="text-sm font-medium">Confidence Score:</span>
                                <Badge variant="secondary">
                                  {analysis.marketTrends.aiInsights.confidence}%
                                </Badge>
                                <Progress value={analysis.marketTrends.aiInsights.confidence} className="w-20" />
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>

              {/* Historical Trends */}
              <HistoricalTrendsVisualization 
                selectedCareerPaths={selectedCareerPath ? [selectedCareerPath] : []}
                selectedLocation={selectedLocation || undefined}
                autoData={historicalData}
                autoTrigger={!!historicalData && historicalData.length > 0}
              />

              {/* Pattern Recognition */}
              <PatternRecognitionPanel 
                careerPath={selectedCareerPath?.title || ''} 
                location={selectedLocation?.value || ''}
                autoData={patternRecognitionData}
                autoTrigger={!!patternRecognitionData}
              />

              {/* Advanced Analytics */}
              <div className="grid gap-6">
                <MarketForecastPanel 
                  careerPath={selectedCareerPath?.title || ''} 
                  location={selectedLocation?.value || ''}
                  autoData={demandForecastData}
                  autoTrigger={!!demandForecastData}
                />
                <RealTimeJobDataPanel 
                  careerPath={selectedCareerPath?.title || ''} 
                  location={selectedLocation?.value || ''}
                  autoData={realTimeData}
                  autoTrigger={!!realTimeData && realTimeData.length > 0}
                />
              </div>
            </div>
          ) : selectedCareerPath && selectedLocation ? (
            <Card>
              <CardContent className="p-8 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Ready to Analyze</h3>
                  <p className="text-muted-foreground mb-4">
                    Analysis ready for {selectedCareerPath.title} in {selectedLocation.label}
                  </p>
                  <Button 
                    onClick={() => runComprehensiveAnalysis(
                      selectedCareerPath.title, 
                      selectedLocation.label, 
                      selectedCareerPath.id, 
                      selectedLocation.id, 
                      selectedLocation.value
                    )}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Start Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Get Started</h3>
                  <p className="text-muted-foreground">
                    Select a career path and location from the Overview tab to begin market analysis.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Research Tab */}
        <TabsContent value="research" className="space-y-6">
          {loading && !salaryData ? (
            <LoadingSkeleton variant="dashboard" />
          ) : (
            <div className="grid gap-6">
            {/* Salary Intelligence */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Salary Intelligence
                </CardTitle>
                <CardDescription>
                  Comprehensive salary analysis and market positioning
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button onClick={handleSalaryAnalysis} disabled={loading || !selectedCareerPath}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analyze Salaries
                  </Button>
                </div>

                {salaryData && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
                        <CardContent className="p-4 text-center">
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Average Salary</p>
                          <p className="text-2xl font-bold text-emerald-600">
                            ${salaryData.averageSalary.toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                        <CardContent className="p-4 text-center">
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Median Salary</p>
                          <p className="text-2xl font-bold text-blue-600">
                            ${salaryData.medianSalary.toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                        <CardContent className="p-4 text-center">
                          <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Sample Size</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {salaryData.sampleSize}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {salaryData.topPayingLocation && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Top Paying Market</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span className="font-medium">{salaryData.topPayingLocation.location}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-emerald-600">
                                ${salaryData.topPayingLocation.average_salary.toLocaleString()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {salaryData.topPayingLocation.growth_rate}% growth
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compare Trends */}
            <CompareMarketTrendsPanel />
          </div>
          )}
        </TabsContent>

        {/* Alerts & Export Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="grid gap-6">
            <EnhancedMarketAlertSystem />
            <MarketIntelligenceExportPanel
              selectedCareerPath={selectedCareerPath?.title}
              selectedLocation={selectedLocation?.value}
              marketData={marketData}
              analysisData={analysis}
              isLoading={loading}
              onRefreshData={fetchMarketTrends}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-destructive font-medium">Error: {error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarketIntelligenceDashboard;

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, DollarSign, TrendingUp, Clock, Receipt, Lightbulb, Briefcase, Globe, Filter } from 'lucide-react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';

interface LocationROIExplorerProps {
  selectedCareerPathId: string | null;
  goalSkillIds: string[];
  selectedLocation?: string;
  onLocationSelect?: (location: string) => void;
}

interface Location {
  id: string;
  value: string;
  label: string;
  emoji: string;
  continent: string;
  country_code: string;
  coordinates: [number, number];
  salary_multiplier: number;
  cost_of_living: number;
  job_market: string;
  job_icon: string;
  visa_eligibility: Record<string, boolean>;
  active: boolean;
}

interface ContinentBounds {
  continent: string;
  bounds: {
    center: [number, number];
    scale: number;
  };
}

const worldGeoUrl = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";
const usaStatesGeoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/countries/united-states/us-albers-50.json";

// Color scale function for heat map
const getColorByMetric = (value: number, metric: 'roi' | 'colAdjustedRoi' | 'lqi', maxValue: number) => {
  const normalizedValue = Math.min(value / maxValue, 1);
  
  if (normalizedValue < 0.3) {
    return `hsl(${10 + normalizedValue / 0.3 * 20}, 70%, ${40 + normalizedValue / 0.3 * 20}%)`;
  } else if (normalizedValue < 0.7) {
    const intensity = (normalizedValue - 0.3) / 0.4;
    return `hsl(${30 + intensity * 30}, 70%, ${60 + intensity * 20}%)`;
  } else {
    const intensity = (normalizedValue - 0.7) / 0.3;
    return `hsl(${60 + intensity * 60}, 70%, ${50 + intensity * 20}%)`;
  }
};

export const LocationROIExplorer: React.FC<LocationROIExplorerProps> = ({
  selectedCareerPathId,
  goalSkillIds,
  selectedLocation,
  onLocationSelect
}) => {
  const [showVisaEligibility, setShowVisaEligibility] = useState(false);
  const [sortBy, setSortBy] = useState<'roi' | 'colAdjustedRoi' | 'jobMarket' | 'lqi'>('lqi');
  const [mapMetric, setMapMetric] = useState<'roi' | 'colAdjustedRoi' | 'lqi'>('lqi');
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [mapView, setMapView] = useState<'global' | 'usa'>('global');
  const [zoom, setZoom] = useState(1);
  
  // Filter states
  const [selectedContinent, setSelectedContinent] = useState<string>('');
  const [visaFilter, setVisaFilter] = useState<string>('');
  const [jobMarketFilter, setJobMarketFilter] = useState<string>('');
  
  const currentUserRegion = 'india';

  // Fetch locations from Supabase
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('locations')
        .select('*')
        .eq('active', true)
        .order('label');
      
      if (error) {
        console.error('Locations fetch error:', error);
        throw error;
      }
      
      return data.map((location: any) => ({
        ...location,
        coordinates: location.coordinates as [number, number],
        visa_eligibility: location.visa_eligibility as Record<string, boolean>
      })) as Location[];
    }
  });

  // Fetch continent bounds
  const { data: continentBounds = [] } = useQuery({
    queryKey: ['continent-bounds'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('continent_bounds')
        .select('*');
      
      if (error) {
        console.error('Continent bounds fetch error:', error);
        return [];
      }
      
      return data.map((bound: any) => ({
        continent: bound.continent,
        bounds: bound.bounds as { center: [number, number]; scale: number }
      })) as ContinentBounds[];
    }
  });

  // Fetch selected career path details
  const { data: careerPath } = useQuery({
    queryKey: ['career-path', selectedCareerPathId],
    queryFn: async () => {
      if (!selectedCareerPathId) return null;
      
      const { data, error } = await supabase
        .from('career_paths')
        .select('*')
        .eq('id', selectedCareerPathId)
        .single();
      
      if (error) {
        console.error('Career path fetch error:', error);
        return {
          id: 'ux-designer',
          title: 'UX Designer',
          average_salary: 78000,
          industry: 'Design',
          level: 'Entry'
        };
      }
      
      return data;
    },
    enabled: !!selectedCareerPathId
  });

  // Filter locations based on selected filters
  const filteredLocations = useMemo(() => {
    return locations.filter(location => {
      const continentMatch = !selectedContinent || location.continent === selectedContinent;
      const visaMatch = !visaFilter || (visaFilter === 'eligible' && location.visa_eligibility[currentUserRegion]);
      const jobMarketMatch = !jobMarketFilter || location.job_market === jobMarketFilter;
      
      return continentMatch && visaMatch && jobMarketMatch;
    });
  }, [locations, selectedContinent, visaFilter, jobMarketFilter, currentUserRegion]);

  // Get unique continents for filter dropdown
  const availableContinents = useMemo(() => {
    return [...new Set(locations.map(location => location.continent))].sort();
  }, [locations]);

  // Get unique job markets for filter dropdown
  const availableJobMarkets = useMemo(() => {
    return [...new Set(locations.map(location => location.job_market))].sort();
  }, [locations]);

  // Calculate ROI data for filtered locations
  const locationROIData = useMemo(() => {
    if (!careerPath) return [];

    const currentSalary = 45000;
    const skillCount = goalSkillIds.length || 8;
    const avgCostPerSkill = 150;
    const totalCost = skillCount * avgCostPerSkill;
    const avgWeeksPerSkill = 3;
    const totalWeeks = skillCount * avgWeeksPerSkill;
    const totalMonths = Math.ceil(totalWeeks / 4);

    return filteredLocations.map(location => {
      const adjustedSalary = Math.round((careerPath.average_salary || 78000) * location.salary_multiplier);
      const uplift = adjustedSalary - currentSalary;
      const roi = uplift / totalCost;
      const colAdjustedROI = uplift / (totalCost * location.cost_of_living);
      const isVisaEligible = location.visa_eligibility[currentUserRegion] || false;
      
      const roiScore = roi;
      const colScore = 100 - (location.cost_of_living * 100);
      const jobMarketScore = location.job_market === 'High' ? 100 : location.job_market === 'Medium' ? 65 : 30;
      const visaScore = isVisaEligible ? 100 : 30;
      
      const lqi = (roiScore * 0.4) + (colScore * 0.25) + (jobMarketScore * 0.25) + (visaScore * 0.10);
      
      return {
        ...location,
        adjustedSalary,
        uplift,
        roi,
        colAdjustedROI,
        totalCost,
        totalMonths,
        isVisaEligible,
        lqi,
        roiScore,
        colScore,
        jobMarketScore,
        visaScore
      };
    }).sort((a, b) => {
      if (sortBy === 'lqi') return b.lqi - a.lqi;
      if (sortBy === 'colAdjustedRoi') return b.colAdjustedROI - a.colAdjustedROI;
      if (sortBy === 'jobMarket') {
        const jobMarketOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
        return jobMarketOrder[b.job_market as keyof typeof jobMarketOrder] - jobMarketOrder[a.job_market as keyof typeof jobMarketOrder];
      }
      return b.roi - a.roi;
    });
  }, [filteredLocations, careerPath, goalSkillIds, sortBy, currentUserRegion]);

  // Auto-focus map when continent is selected
  const mapProjectionConfig = useMemo(() => {
    if (selectedContinent && continentBounds.length > 0) {
      const bounds = continentBounds.find(b => b.continent === selectedContinent);
      if (bounds) {
        return {
          scale: bounds.bounds.scale,
          center: bounds.bounds.center
        };
      }
    }
    
    return mapView === 'usa' ? {
      scale: 800,
      center: [-98, 39]
    } : {
      scale: 100,
      center: [0, 20]
    };
  }, [selectedContinent, continentBounds, mapView]);

  // Get metric values for heat map scaling
  const metricValues = locationROIData.map(location => {
    switch (mapMetric) {
      case 'roi': return location.roi;
      case 'colAdjustedRoi': return location.colAdjustedROI;
      case 'lqi': return location.lqi;
      default: return location.lqi;
    }
  });
  const maxMetricValue = Math.max(...metricValues, 1);

  if (!careerPath) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Relocation ROI Explorer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Select a career goal to compare ROI across locations
          </p>
        </CardContent>
      </Card>
    );
  }

  if (locationsLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            🌍 Relocation ROI Explorer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topROILocations = [...locationROIData].sort((a, b) => b.roi - a.roi).slice(0, 2);
  const topCOLROILocations = [...locationROIData].sort((a, b) => b.colAdjustedROI - a.colAdjustedROI).slice(0, 2);
  const topLQILocation = [...locationROIData].sort((a, b) => b.lqi - a.lqi)[0];

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            🌍 Relocation ROI Explorer
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Compare {careerPath.title} earning potential across different locations
          </p>
          
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Filter className="h-3 w-3" />
                Continent Filter
              </Label>
              <Select value={selectedContinent} onValueChange={setSelectedContinent}>
                <SelectTrigger>
                  <SelectValue placeholder="All Continents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Continents</SelectItem>
                  {availableContinents.map(continent => (
                    <SelectItem key={continent} value={continent}>{continent}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Visa Eligibility
              </Label>
              <Select value={visaFilter} onValueChange={setVisaFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Regions</SelectItem>
                  <SelectItem value="eligible">Visa Eligible Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                Job Market Quality
              </Label>
              <Select value={jobMarketFilter} onValueChange={setJobMarketFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Markets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Markets</SelectItem>
                  {availableJobMarkets.map(market => (
                    <SelectItem key={market} value={market}>{market}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Interactive World Heat Map */}
          <div className="mt-6 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">🗺️ Interactive ROI Heat Map</h3>
              <div className="flex gap-2">
                <Select value={mapView} onValueChange={(value: 'global' | 'usa') => setMapView(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">🌍 Global View</SelectItem>
                    <SelectItem value="usa">🇺🇸 U.S. States</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={mapMetric} onValueChange={(value: 'roi' | 'colAdjustedRoi' | 'lqi') => setMapMetric(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="roi">ROI</SelectItem>
                    <SelectItem value="colAdjustedRoi">Net ROI (COL-adjusted)</SelectItem>
                    <SelectItem value="lqi">LQI Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="relative">
              <ComposableMap
                projection="geoMercator"
                projectionConfig={mapProjectionConfig}
                style={{ width: "100%", height: "400px" }}
              >
                <ZoomableGroup
                  zoom={zoom}
                  onZoomChange={setZoom}
                  minZoom={0.5}
                  maxZoom={8}
                  center={mapProjectionConfig.center}
                >
                  {/* Global View */}
                  {mapView === 'global' && (
                    <Geographies geography={worldGeoUrl}>
                      {({ geographies }) =>
                        geographies.map((geo) => {
                          const countryCode = geo.properties.ISO_A2;
                          const locationData = locationROIData.find(l => l.country_code === countryCode);
                          const metricValue = locationData ? (
                            mapMetric === 'roi' ? locationData.roi :
                            mapMetric === 'colAdjustedRoi' ? locationData.colAdjustedROI :
                            locationData.lqi
                          ) : 0;
                          
                          const fillColor = locationData 
                            ? getColorByMetric(metricValue, mapMetric, maxMetricValue)
                            : "hsl(var(--muted))";
                          
                          const isSelected = selectedLocation === locationData?.value;
                          const isHovered = hoveredLocation === locationData?.value;
                          const shouldGlow = selectedContinent && locationData?.continent === selectedContinent;
                          
                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              fill={fillColor}
                              stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--border))"}
                              strokeWidth={isSelected ? 2 : 0.5}
                              style={{
                                default: { 
                                  outline: "none",
                                  filter: shouldGlow ? "drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))" : "none"
                                },
                                hover: { 
                                  outline: "none", 
                                  cursor: locationData ? "pointer" : "default",
                                  filter: isHovered ? "brightness(1.1)" : shouldGlow ? "drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))" : "none"
                                },
                                pressed: { outline: "none" }
                              }}
                              onMouseEnter={() => {
                                if (locationData) setHoveredLocation(locationData.value);
                              }}
                              onMouseLeave={() => setHoveredLocation(null)}
                              onClick={() => {
                                if (locationData && onLocationSelect) {
                                  onLocationSelect(locationData.value);
                                }
                              }}
                            />
                          );
                        })
                      }
                    </Geographies>
                  )}
                  
                  {/* USA States View */}
                  {mapView === 'usa' && (
                    <Geographies geography={usaStatesGeoUrl} parseGeographies={(geos) => 
                      geos.map(geo => ({ ...geo, properties: { ...geo.properties, NAME: geo.properties.NAME || geo.properties.name } }))
                    }>
                      {({ geographies }) =>
                        geographies.map((geo) => {
                          const stateName = geo.properties.NAME;
                          const stateMapping: Record<string, string> = {
                            'California': 'california',
                            'New York': 'new-york'
                          };
                          const locationData = locationROIData.find(loc => loc.value === stateMapping[stateName]);
                          const metricValue = locationData ? (
                            mapMetric === 'roi' ? locationData.roi :
                            mapMetric === 'colAdjustedRoi' ? locationData.colAdjustedROI :
                            locationData.lqi
                          ) : 0;
                          
                          const fillColor = locationData 
                            ? getColorByMetric(metricValue, mapMetric, maxMetricValue)
                            : "hsl(var(--muted))";
                          
                          const isSelected = selectedLocation === locationData?.value;
                          const isHovered = hoveredLocation === locationData?.value;
                          
                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              fill={fillColor}
                              stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--border))"}
                              strokeWidth={isSelected ? 2 : 0.5}
                              style={{
                                default: { outline: "none" },
                                hover: { 
                                  outline: "none", 
                                  cursor: locationData ? "pointer" : "default",
                                  filter: isHovered ? "brightness(1.1)" : "none"
                                },
                                pressed: { outline: "none" }
                              }}
                              onMouseEnter={() => {
                                if (locationData) setHoveredLocation(locationData.value);
                              }}
                              onMouseLeave={() => setHoveredLocation(null)}
                              onClick={() => {
                                if (locationData && onLocationSelect) {
                                  onLocationSelect(locationData.value);
                                }
                              }}
                            />
                          );
                        })
                      }
                    </Geographies>
                  )}
                  
                  {/* Markers for specific locations */}
                  {locationROIData
                    .filter(location => {
                      if (mapView === 'usa') {
                        return location.country_code === 'US' && location.value !== 'united-states';
                      }
                      return location.country_code !== 'REMOTE' && location.country_code !== 'US';
                    })
                    .map(location => {
                      const isSelected = selectedLocation === location.value;
                      const isHovered = hoveredLocation === location.value;
                      const metricValue = mapMetric === 'roi' ? location.roi :
                                        mapMetric === 'colAdjustedRoi' ? location.colAdjustedROI :
                                        location.lqi;
                      const shouldGlow = selectedContinent && location.continent === selectedContinent;
                      
                      return (
                        <Marker
                          key={location.value}
                          coordinates={location.coordinates}
                          onClick={() => onLocationSelect?.(location.value)}
                          onMouseEnter={() => setHoveredLocation(location.value)}
                          onMouseLeave={() => setHoveredLocation(null)}
                        >
                          <circle
                            r={isSelected ? 8 : 6}
                            fill={getColorByMetric(metricValue, mapMetric, maxMetricValue)}
                            stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--background))"}
                            strokeWidth={2}
                            style={{
                              cursor: "pointer",
                              filter: isHovered ? "brightness(1.2)" : shouldGlow ? "drop-shadow(0 0 6px rgba(59, 130, 246, 0.8))" : "none"
                            }}
                          />
                          <text
                            textAnchor="middle"
                            y={-12}
                            style={{
                              fontSize: "12px",
                              fill: "hsl(var(--foreground))",
                              fontWeight: isSelected ? "bold" : "normal",
                              pointerEvents: "none"
                            }}
                          >
                            {location.emoji}
                          </text>
                        </Marker>
                      );
                    })}
                  
                  {/* Remote work floating marker */}
                  {mapView === 'global' && locationROIData.find(l => l.value === 'remote') && (
                    <Marker
                      coordinates={[20, -20]}
                      onClick={() => onLocationSelect?.('remote')}
                      onMouseEnter={() => setHoveredLocation('remote')}
                      onMouseLeave={() => setHoveredLocation(null)}
                    >
                      <circle
                        r={selectedLocation === 'remote' ? 10 : 8}
                        fill={getColorByMetric(
                          locationROIData.find(l => l.value === 'remote')?.[mapMetric === 'roi' ? 'roi' : mapMetric === 'colAdjustedRoi' ? 'colAdjustedROI' : 'lqi'] || 0,
                          mapMetric,
                          maxMetricValue
                        )}
                        stroke={selectedLocation === 'remote' ? "hsl(var(--primary))" : "hsl(var(--background))"}
                        strokeWidth={2}
                        style={{
                          cursor: "pointer",
                          filter: hoveredLocation === 'remote' ? "brightness(1.2)" : "none"
                        }}
                      />
                      <text
                        textAnchor="middle"
                        y={4}
                        style={{
                          fontSize: "14px",
                          fill: "hsl(var(--background))",
                          fontWeight: "bold",
                          pointerEvents: "none"
                        }}
                      >
                        💻
                      </text>
                    </Marker>
                  )}
                </ZoomableGroup>
              </ComposableMap>
              
              {/* Tooltip */}
              {hoveredLocation && (
                <div className="absolute top-4 left-4 bg-white border rounded-lg p-3 shadow-lg z-10">
                  {(() => {
                    const location = locationROIData.find(l => l.value === hoveredLocation);
                    if (!location) return null;
                    
                    return (
                      <div className="text-sm space-y-1">
                        <div className="font-semibold flex items-center gap-2">
                          {location.emoji} {location.label}
                        </div>
                        <div>ROI: {location.roi.toFixed(1)}×</div>
                        <div>Net ROI: {location.colAdjustedROI.toFixed(1)}×</div>
                        <div>LQI: {location.lqi.toFixed(1)}</div>
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {/* Legend */}
              <div className="absolute bottom-4 right-4 bg-white border rounded-lg p-3 shadow-lg">
                <div className="text-xs font-semibold mb-2">
                  {mapMetric === 'roi' ? 'ROI Scale' : 
                   mapMetric === 'colAdjustedRoi' ? 'Net ROI Scale' : 
                   'LQI Scale'}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorByMetric(0.2, mapMetric, maxMetricValue) }}></div>
                  <span className="text-xs">Low</span>
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorByMetric(0.6, mapMetric, maxMetricValue) }}></div>
                  <span className="text-xs">Medium</span>
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorByMetric(1.0, mapMetric, maxMetricValue) }}></div>
                  <span className="text-xs">High</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Switch
                id="visa-toggle"
                checked={showVisaEligibility}
                onCheckedChange={setShowVisaEligibility}
              />
              <Label htmlFor="visa-toggle" className="text-sm">Show Visa Eligibility</Label>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('roi')}
                className={`px-3 py-1 text-xs rounded ${sortBy === 'roi' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                Sort by ROI
              </button>
              <button
                onClick={() => setSortBy('colAdjustedRoi')}
                className={`px-3 py-1 text-xs rounded ${sortBy === 'colAdjustedRoi' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                Sort by Net ROI
              </button>
              <button
                onClick={() => setSortBy('jobMarket')}
                className={`px-3 py-1 text-xs rounded ${sortBy === 'jobMarket' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                Sort by Jobs
              </button>
              <button
                onClick={() => setSortBy('lqi')}
                className={`px-3 py-1 text-xs rounded ${sortBy === 'lqi' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                Sort by LQI
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locationROIData.map(location => {
              const isTopROI = topROILocations.some(top => top.value === location.value);
              const isTopCOLROI = topCOLROILocations.some(top => top.value === location.value);
              const isSelected = selectedLocation === location.value;
              
              return (
                <div
                  key={location.value}
                  className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50 ring-2 ring-blue-200'
                      : isTopROI 
                        ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50' 
                        : 'border-border bg-card hover:shadow-md'
                  }`}
                  onClick={() => onLocationSelect?.(location.value)}
                >
                  {/* Badges */}
                  <div className="absolute -top-2 -right-2 flex flex-col gap-1">
                    {isTopROI && (
                      <Badge className="bg-yellow-500 text-yellow-900">
                        🔥 Best ROI
                      </Badge>
                    )}
                    {isTopCOLROI && !isTopROI && (
                      <Badge className="bg-blue-500 text-blue-100">
                        💡 Best COL-Adjusted ROI
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {/* Location Header */}
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{location.emoji}</span>
                      <h3 className="font-semibold text-sm">{location.label}</h3>
                    </div>

                    {/* Adjusted Salary */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-green-600" />
                        <span className="text-xs text-muted-foreground">Salary</span>
                      </div>
                      <span className="text-sm font-medium text-green-600">
                        ${location.adjustedSalary.toLocaleString()}
                      </span>
                    </div>

                    {/* ROI Multiplier */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-purple-600" />
                        <span className="text-xs text-muted-foreground">ROI</span>
                      </div>
                      <span className="text-sm font-bold text-purple-600">
                        {location.roi.toFixed(1)}× Return
                      </span>
                    </div>

                    {/* COL-Adjusted ROI */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Lightbulb className="h-3 w-3 text-cyan-600" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>ROI adjusted for cost of living ({(location.cost_of_living * 100).toFixed(0)}% of US baseline)</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-xs text-muted-foreground">Net ROI (Cost-Adjusted)</span>
                      </div>
                      <span className="text-sm font-bold text-cyan-600">
                        {location.colAdjustedROI.toFixed(1)}× Return
                      </span>
                    </div>

                    {/* LQI Score */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs cursor-help">🏆</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">LQI Breakdown:</p>
                            <p>ROI {location.roiScore.toFixed(1)}× | COL {location.colScore.toFixed(0)} | Job {location.jobMarketScore} | Visa {location.visaScore}</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-xs text-muted-foreground">LQI</span>
                      </div>
                      <span className="text-sm font-bold text-amber-600">
                        {location.lqi.toFixed(1)}
                      </span>
                    </div>

                    {/* Job Availability */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-indigo-600" />
                        <span className="text-xs text-muted-foreground">Job Availability</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{location.job_icon}</span>
                        <span className="text-sm font-medium text-indigo-600">{location.job_market}</span>
                      </div>
                    </div>

                    {/* Visa Status (conditional) */}
                    {showVisaEligibility && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3 text-slate-600" />
                          <span className="text-xs text-muted-foreground">Visa Status</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm">
                                {location.isVisaEligible ? '✅' : '❌'}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{location.isVisaEligible ? 'Visa eligible from India' : 'Visa restrictions apply'}</p>
                            </TooltipContent>
                          </Tooltip>
                          <span className="text-sm font-medium text-slate-600">
                            {location.isVisaEligible ? 'Eligible' : 'Restricted'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Total Cost */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Receipt className="h-3 w-3 text-blue-600" />
                        <span className="text-xs text-muted-foreground">Cost</span>
                      </div>
                      <span className="text-sm font-medium text-blue-600">
                        ${location.totalCost.toLocaleString()}
                      </span>
                    </div>

                    {/* Time Estimate */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-orange-600" />
                        <span className="text-xs text-muted-foreground">Time</span>
                      </div>
                      <span className="text-sm font-medium text-orange-600">
                        {location.totalMonths} months
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-center mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Top LQI Region</p>
                <p className="font-semibold text-sm">
                  🌍 {topLQILocation?.emoji} {topLQILocation?.label} (LQI {topLQILocation?.lqi.toFixed(1)})
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Showing Results</p>
                <p className="font-semibold text-sm">
                  {locationROIData.length} of {locations.length} locations
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Best ROI</p>
                <p className="font-semibold text-sm">
                  {topROILocations[0]?.emoji} {topROILocations[0]?.label}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Best Net ROI</p>
                <p className="font-semibold text-sm">
                  {topCOLROILocations[0]?.emoji} {topCOLROILocations[0]?.label}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ROI Range</p>
                <p className="font-semibold text-sm">
                  {locationROIData[locationROIData.length - 1]?.roi.toFixed(1)}× - {locationROIData[0]?.roi.toFixed(1)}×
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Skills in Path</p>
                <p className="font-semibold text-sm">{goalSkillIds.length || 8} skills</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              *LQI combines ROI, cost of living, job market, and visa factors for comprehensive ranking
            </p>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

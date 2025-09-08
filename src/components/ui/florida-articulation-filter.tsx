import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MapPin, 
  School, 
  CheckCircle, 
  AlertTriangle,
  Filter,
  ExternalLink
} from 'lucide-react';
import { 
  floridaInstitutions, 
  floridaProgramPathways,
  fetchFloridaArticulationData,
  getFloridaArticulationBadge,
  FloridaArticulationMapping
} from '@/lib/florida/articulation-data';

interface FloridaArticulationFilterProps {
  onFilterChange: (filters: FloridaFilters) => void;
  showFloridaPaths: boolean;
  onToggleFloridaPaths: (show: boolean) => void;
}

export interface FloridaFilters {
  enabled: boolean;
  sourceInstitution?: string;
  targetInstitution?: string;
  institutionType?: 'all' | 'community_college' | 'state_university' | 'private' | 'technical';
  articulationLevel?: 'all' | 'general_education' | 'major_prerequisite' | 'elective' | 'program_specific';
  guaranteedTransferOnly: boolean;
  region?: 'all' | 'north' | 'central' | 'south' | 'panhandle';
}

export function FloridaArticulationFilter({
  onFilterChange,
  showFloridaPaths,
  onToggleFloridaPaths
}: FloridaArticulationFilterProps) {
  const [filters, setFilters] = useState<FloridaFilters>({
    enabled: false,
    institutionType: 'all',
    articulationLevel: 'all',
    guaranteedTransferOnly: false,
    region: 'all'
  });
  
  const [articulationData, setArticulationData] = useState<FloridaArticulationMapping[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (filters.enabled) {
      loadArticulationData();
    }
  }, [filters.enabled]);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const loadArticulationData = async () => {
    setLoading(true);
    try {
      const data = await fetchFloridaArticulationData();
      setArticulationData(data);
    } catch (error) {
      console.error('Failed to load Florida articulation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key: keyof FloridaFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const communityColleges = floridaInstitutions.filter(inst => inst.type === 'community_college');
  const universities = floridaInstitutions.filter(inst => inst.type === 'state_university');

  const getStatsText = () => {
    if (!filters.enabled || loading) return 'Configure filters to see statistics';
    
    const totalMappings = articulationData.length;
    const guaranteedMappings = articulationData.filter(m => m.transferRate === 1.0).length;
    
    return `${totalMappings} articulation agreements • ${guaranteedMappings} guaranteed transfers`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Florida Articulation System
          </div>
          <Switch
            checked={filters.enabled}
            onCheckedChange={(enabled) => {
              updateFilter('enabled', enabled);
              onToggleFloridaPaths(enabled);
            }}
          />
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Filter paths by Florida state articulation agreements and transfer policies
        </p>
      </CardHeader>
      
      {filters.enabled && (
        <CardContent className="space-y-4">
          {/* Institution Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Starting Institution
              </label>
              <Select
                value={filters.sourceInstitution || ''}
                onValueChange={(value) => updateFilter('sourceInstitution', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select community college" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Institution</SelectItem>
                  {communityColleges.map(inst => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Target University
              </label>
              <Select
                value={filters.targetInstitution || ''}
                onValueChange={(value) => updateFilter('targetInstitution', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select university" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any University</SelectItem>
                  {universities.map(inst => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Institution Type
              </label>
              <Select
                value={filters.institutionType || 'all'}
                onValueChange={(value) => updateFilter('institutionType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="community_college">Community Colleges</SelectItem>
                  <SelectItem value="state_university">State Universities</SelectItem>
                  <SelectItem value="private">Private Institutions</SelectItem>
                  <SelectItem value="technical">Technical Colleges</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Region
              </label>
              <Select
                value={filters.region || 'all'}
                onValueChange={(value) => updateFilter('region', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="north">North Florida</SelectItem>
                  <SelectItem value="central">Central Florida</SelectItem>
                  <SelectItem value="south">South Florida</SelectItem>
                  <SelectItem value="panhandle">Panhandle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Guaranteed Transfer Only</p>
                <p className="text-xs text-muted-foreground">Show only paths with guaranteed credit transfer</p>
              </div>
              <Switch
                checked={filters.guaranteedTransferOnly}
                onCheckedChange={(checked) => updateFilter('guaranteedTransferOnly', checked)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Articulation Level
              </label>
              <Select
                value={filters.articulationLevel || 'all'}
                onValueChange={(value) => updateFilter('articulationLevel', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="general_education">General Education</SelectItem>
                  <SelectItem value="major_prerequisite">Major Prerequisites</SelectItem>
                  <SelectItem value="program_specific">Program Specific</SelectItem>
                  <SelectItem value="elective">Electives</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Statistics */}
          <div className="p-3 bg-muted/20 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Filter Statistics</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Loading articulation data...' : getStatsText()}
            </p>
          </div>

          {/* Popular Pathways */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Popular Florida Pathways</h4>
            <div className="space-y-2">
              {floridaProgramPathways.slice(0, 2).map(pathway => (
                <div key={pathway.id} className="p-2 border rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">{pathway.name}</span>
                    {pathway.guaranteedTransfer && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Guaranteed
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{pathway.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* External Resources */}
          <div className="pt-3 border-t">
            <Button variant="outline" size="sm" className="w-full" asChild>
              <a 
                href="https://www.floridashines.org/go-to-college/planning-for-college/transfer"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Official FL Transfer Guide
              </a>
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Florida Articulation Badge Component
export function FloridaArticulationBadge({ nodeId }: { nodeId: string }) {
  const badge = getFloridaArticulationBadge(nodeId);
  
  if (!badge.hasFlArticulation) return null;
  
  return (
    <div className="flex items-center gap-1">
      <Badge 
        variant={badge.guaranteedTransfer ? 'default' : 'secondary'} 
        className="text-xs"
      >
        <MapPin className="w-3 h-3 mr-1" />
        FL Transfer
      </Badge>
      {badge.guaranteedTransfer && (
        <Badge variant="outline" className="text-xs">
          <CheckCircle className="w-3 h-3 mr-1" />
          Guaranteed
        </Badge>
      )}
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  MapPin, 
  Plus, 
  Save, 
  Trash2, 
  Eye, 
  EyeOff, 
  Globe, 
  DollarSign,
  Building,
  Search,
  Settings
} from 'lucide-react';

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
  created_at: string;
  updated_at: string;
}

interface ContinentBounds {
  id: string;
  continent: string;
  bounds: {
    center: [number, number];
    scale: number;
  };
  created_at: string;
}

const CONTINENTS = [
  'North America',
  'South America', 
  'Europe',
  'Asia',
  'Africa',
  'Oceania'
];

const JOB_MARKETS = ['High', 'Medium', 'Low'];

const VISA_REGIONS = ['india', 'uk', 'remote', 'us', 'eu', 'canada'];

const LocationManagerPanel: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [activeOnly, setActiveOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Partial<Location> | null>(null);

  // Fetch locations
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['admin-locations', activeOnly],
    queryFn: async () => {
      let query = (supabase as any).from('locations').select('*').order('label');
      
      if (activeOnly) {
        query = query.eq('active', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
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
        .select('*')
        .order('continent');
      
      if (error) throw error;
      
      return data.map((bound: any) => ({
        ...bound,
        bounds: bound.bounds as { center: [number, number]; scale: number }
      })) as ContinentBounds[];
    }
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (location: Partial<Location> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('locations')
        .update({
          value: location.value,
          label: location.label,
          emoji: location.emoji,
          continent: location.continent,
          country_code: location.country_code,
          coordinates: location.coordinates,
          salary_multiplier: location.salary_multiplier,
          cost_of_living: location.cost_of_living,
          job_market: location.job_market,
          job_icon: location.job_icon,
          visa_eligibility: location.visa_eligibility,
          active: location.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', location.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-locations'] });
      toast({ title: "Success", description: "Location updated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: `Failed to update location: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Create location mutation
  const createLocationMutation = useMutation({
    mutationFn: async (location: Omit<Location, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await (supabase as any)
        .from('locations')
        .insert([{
          ...location,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-locations'] });
      setIsAddModalOpen(false);
      setEditingLocation(null);
      toast({ title: "Success", description: "Location created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: `Failed to create location: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Filter locations based on search
  const filteredLocations = useMemo(() => {
    if (!searchQuery) return locations;
    return locations.filter(location =>
      location.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.continent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.country_code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [locations, searchQuery]);

  const handleSaveLocation = (location: Partial<Location> & { id: string }) => {
    updateLocationMutation.mutate(location);
  };

  const handleDeactivateLocation = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    if (location) {
      updateLocationMutation.mutate({ ...location, active: false });
    }
  };

  const handleCreateLocation = () => {
    if (editingLocation) {
      createLocationMutation.mutate(editingLocation as Omit<Location, 'id' | 'created_at' | 'updated_at'>);
    }
  };

  const LocationCard: React.FC<{ location: Location }> = ({ location }) => {
    const [localLocation, setLocalLocation] = useState<Location>(location);

    const updateField = (field: keyof Location, value: any) => {
      setLocalLocation(prev => ({ ...prev, [field]: value }));
    };

    const updateVisaEligibility = (region: string, eligible: boolean) => {
      setLocalLocation(prev => ({
        ...prev,
        visa_eligibility: { ...prev.visa_eligibility, [region]: eligible }
      }));
    };

    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-2xl">{localLocation.emoji}</span>
              {localLocation.label}
              {!localLocation.active && <Badge variant="secondary">Inactive</Badge>}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleSaveLocation(localLocation)}
                disabled={updateLocationMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDeactivateLocation(location.id)}
                disabled={updateLocationMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Deactivate
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Label</Label>
                <Input
                  value={localLocation.label}
                  onChange={(e) => updateField('label', e.target.value)}
                  placeholder="City, Country"
                />
              </div>
              
              <div>
                <Label className="text-xs font-semibold">Value (Slug)</Label>
                <Input
                  value={localLocation.value}
                  onChange={(e) => updateField('value', e.target.value)}
                  placeholder="city-country"
                />
              </div>
              
              <div>
                <Label className="text-xs font-semibold">Emoji</Label>
                <Input
                  value={localLocation.emoji}
                  onChange={(e) => updateField('emoji', e.target.value)}
                  placeholder="🏙️"
                />
              </div>
              
              <div>
                <Label className="text-xs font-semibold">Continent</Label>
                <Select
                  value={localLocation.continent}
                  onValueChange={(value) => updateField('continent', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTINENTS.map(continent => (
                      <SelectItem key={continent} value={continent}>
                        {continent}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Geographic & Economic */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Country Code</Label>
                <Input
                  value={localLocation.country_code}
                  onChange={(e) => updateField('country_code', e.target.value.toUpperCase())}
                  placeholder="US"
                  maxLength={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold">Longitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={localLocation.coordinates[0]}
                    onChange={(e) => updateField('coordinates', [parseFloat(e.target.value), localLocation.coordinates[1]])}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Latitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={localLocation.coordinates[1]}
                    onChange={(e) => updateField('coordinates', [localLocation.coordinates[0], parseFloat(e.target.value)])}
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-xs font-semibold">Salary Multiplier</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={localLocation.salary_multiplier}
                  onChange={(e) => updateField('salary_multiplier', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label className="text-xs font-semibold">Cost of Living</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={localLocation.cost_of_living}
                  onChange={(e) => updateField('cost_of_living', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Job Market & Icons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold">Job Market</Label>
              <Select
                value={localLocation.job_market}
                onValueChange={(value) => updateField('job_market', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_MARKETS.map(market => (
                    <SelectItem key={market} value={market}>
                      {market}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-xs font-semibold">Job Icon</Label>
              <Input
                value={localLocation.job_icon}
                onChange={(e) => updateField('job_icon', e.target.value)}
                placeholder="💼"
              />
            </div>
          </div>

          {/* Visa Eligibility */}
          <div>
            <Label className="text-xs font-semibold mb-2 block">Visa Eligibility</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {VISA_REGIONS.map(region => (
                <div key={region} className="flex items-center space-x-2">
                  <Switch
                    id={`${location.id}-${region}`}
                    checked={localLocation.visa_eligibility[region] || false}
                    onCheckedChange={(checked) => updateVisaEligibility(region, checked)}
                  />
                  <Label 
                    htmlFor={`${location.id}-${region}`}
                    className="text-sm capitalize"
                  >
                    {region}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id={`${location.id}-active`}
              checked={localLocation.active}
              onCheckedChange={(checked) => updateField('active', checked)}
            />
            <Label htmlFor={`${location.id}-active`} className="text-sm">
              Active Location
            </Label>
          </div>
        </CardContent>
      </Card>
    );
  };

  const AddLocationModal = () => {
    const newLocation: Partial<Location> = {
      value: '',
      label: '',
      emoji: '🏙️',
      continent: 'North America',
      country_code: '',
      coordinates: [0, 0],
      salary_multiplier: 1.0,
      cost_of_living: 1.0,
      job_market: 'Medium',
      job_icon: '💼',
      visa_eligibility: {},
      active: true
    };

    if (!editingLocation) {
      setEditingLocation(newLocation);
    }

    return (
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogTrigger asChild>
          <Button className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-50">
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {editingLocation && (
              <LocationCard location={editingLocation as Location} />
            )}
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateLocation}
                disabled={createLocationMutation.isPending}
              >
                Create Location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (locationsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Location Manager
          </h1>
          <p className="text-muted-foreground">
            Manage locations for the ROI Explorer and Heat Map
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="active-only"
              checked={activeOnly}
              onCheckedChange={setActiveOnly}
            />
            <Label htmlFor="active-only" className="text-sm">
              Active Only
            </Label>
          </div>
          
          <Badge variant="outline" className="px-3 py-1">
            {filteredLocations.length} locations
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search locations by name, continent, or country code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredLocations.map(location => (
          <LocationCard key={location.id} location={location} />
        ))}
      </div>

      {/* Continent Bounds Section */}
      <Separator />
      
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Continent Bounds</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {continentBounds.map(bound => (
            <Card key={bound.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{bound.continent}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <Label className="text-xs">Center Lng</Label>
                    <div className="font-mono text-xs">{bound.bounds.center[0]}</div>
                  </div>
                  <div>
                    <Label className="text-xs">Center Lat</Label>
                    <div className="font-mono text-xs">{bound.bounds.center[1]}</div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Scale</Label>
                    <div className="font-mono text-xs">{bound.bounds.scale}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Add Location Button */}
      <AddLocationModal />
    </div>
  );
};

export default LocationManagerPanel;
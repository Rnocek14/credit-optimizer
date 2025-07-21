import React from 'react';
import { Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LocationDropdownProps {
  selectedLocation: string;
  onLocationChange: (location: string) => void;
}

const LOCATIONS = [
  { value: 'united-states', label: 'United States', multiplier: 1.0 },
  { value: 'california', label: 'California', multiplier: 1.3 },
  { value: 'new-york', label: 'New York', multiplier: 1.2 },
  { value: 'india', label: 'India', multiplier: 0.3 },
  { value: 'uk', label: 'United Kingdom', multiplier: 0.9 },
  { value: 'remote', label: 'Remote', multiplier: 1.1 }
];

export const LocationDropdown: React.FC<LocationDropdownProps> = ({
  selectedLocation,
  onLocationChange
}) => {
  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedLocation} onValueChange={onLocationChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="🌍 Select Location" />
        </SelectTrigger>
        <SelectContent>
          {LOCATIONS.map((location) => (
            <SelectItem key={location.value} value={location.value}>
              {location.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export const getLocationMultiplier = (location: string): number => {
  const locationData = LOCATIONS.find(l => l.value === location);
  return locationData?.multiplier || 1.0;
};

export const getLocationLabel = (location: string): string => {
  const locationData = LOCATIONS.find(l => l.value === location);
  return locationData?.label || 'United States';
};
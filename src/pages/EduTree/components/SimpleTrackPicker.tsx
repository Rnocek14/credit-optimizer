import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TRACK_DEFINITIONS, type TrackId } from '../data/trackDefinitions';

export interface SimpleTrackPickerProps {
  value?: TrackId;
  onChange: (value: TrackId | undefined) => void;
  placeholder?: string;
  excludeValue?: TrackId;
}

export function SimpleTrackPicker({ value, onChange, placeholder = "Select track...", excludeValue }: SimpleTrackPickerProps) {
  const availableTracks = TRACK_DEFINITIONS.filter(track => 
    !excludeValue || track.id !== excludeValue
  );

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {availableTracks.map((track) => (
          <SelectItem key={track.id} value={track.id}>
            {track.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
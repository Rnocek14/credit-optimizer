import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { type TrackId } from '../data/trackDefinitions';

interface TrackPickerProps {
  value: TrackId | undefined;
  onChange: (value: TrackId) => void;
  disabled?: boolean;
}

const trackOptions = [
  { id: 'software-engineering' as TrackId, name: 'Software Engineering' },
  { id: 'data-science' as TrackId, name: 'Data Science' },
  { id: 'cybersecurity' as TrackId, name: 'Cybersecurity' }
] as const;

export function TrackPicker({ value, onChange, disabled }: TrackPickerProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="track-picker">Learning Track</Label>
      <Select 
        value={value} 
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger id="track-picker" className="w-48">
          <SelectValue placeholder="Select a track" />
        </SelectTrigger>
        <SelectContent>
          {trackOptions.map(option => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
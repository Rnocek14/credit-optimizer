import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TrackKey } from '../data/resolveTrackBlocks';

interface TrackPickerProps {
  value: TrackKey | undefined;
  onChange: (value: TrackKey) => void;
  disabled?: boolean;
}

const trackOptions = [
  { id: 'software-engineering' as TrackKey, name: 'Software Engineering' },
  { id: 'data-science' as TrackKey, name: 'Data Science' },
  { id: 'cybersecurity' as TrackKey, name: 'Cybersecurity' }
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
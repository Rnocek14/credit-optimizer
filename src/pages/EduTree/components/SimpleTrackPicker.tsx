import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type TrackKey = 'software-engineering' | 'data-science' | 'cybersecurity';

interface SimpleTrackPickerProps {
  value: TrackKey;
  onChange: (value: TrackKey) => void;
}

const trackOptions = [
  { id: 'software-engineering' as TrackKey, name: 'Software Engineering' },
  { id: 'data-science' as TrackKey, name: 'Data Science' },
  { id: 'cybersecurity' as TrackKey, name: 'Cybersecurity' }
] as const;

export function SimpleTrackPicker({ value, onChange }: SimpleTrackPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="track-picker" className="text-sm font-medium">Track:</Label>
      <Select 
        value={value} 
        onValueChange={onChange}
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
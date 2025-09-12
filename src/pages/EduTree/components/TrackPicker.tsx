import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export interface Track {
  id: string;
  name: string;
  description?: string;
}

interface TrackPickerProps {
  tracks: Track[];
  selectedId?: string;
  onChange: (id: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function TrackPicker({
  tracks,
  selectedId,
  onChange,
  label = "Track",
  placeholder = "Select a track...",
  className = ""
}: TrackPickerProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <Label className="text-sm opacity-70 whitespace-nowrap">{label}</Label>
      )}
      <Select value={selectedId ?? ""} onValueChange={onChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {tracks.map(track => (
            <SelectItem key={track.id} value={track.id}>
              <div className="flex flex-col">
                <span className="font-medium">{track.name}</span>
                {track.description && (
                  <span className="text-xs text-muted-foreground">{track.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
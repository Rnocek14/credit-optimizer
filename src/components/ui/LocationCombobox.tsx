import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Location {
  id: string;
  label: string;
  value: string;
  emoji: string;
}

interface LocationComboboxProps {
  value: { id: string; label: string; value: string; emoji: string } | null;
  onChange: (location: { id: string; label: string; value: string; emoji: string } | null) => void;
  placeholder?: string;
}

export function LocationCombobox({ value, onChange, placeholder = "Select location..." }: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations', searchValue],
    queryFn: async () => {
      let query = supabase
        .from('locations')
        .select('id, label, value, emoji')
        .eq('active', true)
        .order('label', { ascending: true });

      if (searchValue.trim()) {
        query = query.ilike('label', `%${searchValue.trim()}%`);
      }

      const { data, error } = await query.limit(50);
      
      if (error) {
        console.error('Error fetching locations:', error);
        return [];
      }
      
      return data as Location[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      // Trigger refetch with new search value
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleSelect = (location: Location) => {
    onChange(location);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setSearchValue('');
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value ? (
              <span className="flex items-center gap-2">
                <span>{value.emoji}</span>
                {value.label}
              </span>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search locations..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Loading..." : "No locations found."}
              </CommandEmpty>
              <CommandGroup>
                {locations.map((location) => (
                  <CommandItem
                    key={location.id}
                    value={location.label}
                    onSelect={() => handleSelect(location)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === location.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex items-center gap-2">
                      <span>{location.emoji}</span>
                      {location.label}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-8 px-2"
        >
          Clear
        </Button>
      )}
    </div>
  );
}
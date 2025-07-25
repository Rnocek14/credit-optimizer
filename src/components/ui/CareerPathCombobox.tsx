import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Target } from 'lucide-react';
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

interface CareerPath {
  id: string;
  title: string;
}

interface CareerPathComboboxProps {
  value: { id: string; title: string } | null;
  onChange: (careerPath: { id: string; title: string } | null) => void;
  placeholder?: string;
}

export function CareerPathCombobox({ value, onChange, placeholder = "Select career path..." }: CareerPathComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const { data: careerPaths = [], isLoading } = useQuery({
    queryKey: ['career-paths', searchValue],
    queryFn: async () => {
      let query = supabase
        .from('career_paths')
        .select('id, title')
        .order('title', { ascending: true });

      if (searchValue.trim()) {
        query = query.ilike('title', `%${searchValue.trim()}%`);
      }

      const { data, error } = await query.limit(50);
      
      if (error) {
        console.error('Error fetching career paths:', error);
        return [];
      }
      
      return data as CareerPath[];
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

  const handleSelect = (careerPath: CareerPath) => {
    onChange(careerPath);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setSearchValue('');
  };

  return (
    <div className="flex items-center gap-2">
      <Target className="h-4 w-4 text-muted-foreground" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value ? value.title : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search career paths..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Loading..." : "No career paths found."}
              </CommandEmpty>
              <CommandGroup>
                {careerPaths.map((careerPath) => (
                  <CommandItem
                    key={careerPath.id}
                    value={careerPath.title}
                    onSelect={() => handleSelect(careerPath)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === careerPath.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {careerPath.title}
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
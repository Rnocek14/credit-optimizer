import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Filter, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SkillTreeSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSkillSelect: (skillId: string) => void;
  skills: Array<{
    id: string;
    name: string;
    category: string;
    description?: string;
  }>;
  filteredSkills: any[];
  className?: string;
}

export const SkillTreeSearch: React.FC<SkillTreeSearchProps> = ({
  searchTerm,
  onSearchChange,
  onSkillSelect,
  skills,
  filteredSkills,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const searchResults = searchTerm.length > 0 
    ? skills.filter(skill => 
        skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        skill.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        skill.category.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || searchResults.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : searchResults.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && searchResults[highlightedIndex]) {
            handleSkillSelect(searchResults[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, highlightedIndex]);

  useEffect(() => {
    setIsOpen(searchTerm.length > 0 && searchResults.length > 0);
    setHighlightedIndex(-1);
  }, [searchTerm, searchResults.length]);

  const handleSkillSelect = (skill: any) => {
    onSkillSelect(skill.id);
    onSearchChange('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    searchRef.current?.blur();
  };

  const clearSearch = () => {
    onSearchChange('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchRef}
          type="text"
          placeholder="Search skills, categories, or descriptions..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => {
            if (searchTerm.length > 0 && searchResults.length > 0) {
              setIsOpen(true);
            }
          }}
          className="pl-10 pr-10 w-full bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/50"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && searchResults.length > 0 && (
        <div 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-popover/95 backdrop-blur-md border border-border/50 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
        >
          <div className="p-2 border-b border-border/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span>{searchResults.length} results found</span>
            </div>
          </div>
          
          {searchResults.map((skill, index) => (
            <div
              key={skill.id}
              onClick={() => handleSkillSelect(skill)}
              className={cn(
                "px-3 py-2 cursor-pointer transition-colors group",
                index === highlightedIndex 
                  ? "bg-accent/80 text-accent-foreground" 
                  : "hover:bg-accent/40"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {skill.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {skill.category}
                    </Badge>
                    {skill.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {skill.description.substring(0, 50)}...
                      </span>
                    )}
                  </div>
                </div>
                <Target className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      {!searchTerm && (
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-primary rounded-full" />
            <span>{filteredSkills.length} skills visible</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Press / to search</span>
          </div>
        </div>
      )}
    </div>
  );
};
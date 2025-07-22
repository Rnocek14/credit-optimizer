import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Search, X, ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchableSkill {
  id: string;
  name: string;
  category: string;
  description?: string;
  position: { x: number; y: number };
  status: 'locked' | 'available' | 'in_progress' | 'completed';
}

interface SkillSearchOverlayProps {
  skills: SearchableSkill[];
  isVisible: boolean;
  onClose: () => void;
  onSkillSelect: (skillId: string) => void;
  onHighlightSkills: (skillIds: string[]) => void;
  selectedSkillId?: string;
  className?: string;
}

const MAX_RESULTS = 50;
const SEARCH_DEBOUNCE_MS = 300;

export const SkillSearchOverlay: React.FC<SkillSearchOverlayProps> = ({
  skills,
  isVisible,
  onClose,
  onSkillSelect,
  onHighlightSkills,
  selectedSkillId,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Filter and rank skills based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    const query = searchQuery.toLowerCase().trim();
    const results = skills
      .map(skill => {
        const nameMatch = skill.name.toLowerCase();
        const categoryMatch = skill.category.toLowerCase();
        const descriptionMatch = skill.description?.toLowerCase() || '';
        
        // Calculate relevance score
        let score = 0;
        
        // Exact name match gets highest score
        if (nameMatch === query) score += 100;
        // Name starts with query
        else if (nameMatch.startsWith(query)) score += 50;
        // Name contains query
        else if (nameMatch.includes(query)) score += 25;
        
        // Category matches
        if (categoryMatch === query) score += 20;
        else if (categoryMatch.includes(query)) score += 10;
        
        // Description contains query
        if (descriptionMatch.includes(query)) score += 5;
        
        // Boost completed/in-progress skills slightly
        if (skill.status === 'completed') score += 2;
        else if (skill.status === 'in_progress') score += 1;
        
        return { skill, score };
      })
      .filter(result => result.score > 0)
      .sort((a, b) => {
        // Sort by score first, then by name
        if (b.score !== a.score) return b.score - a.score;
        return a.skill.name.localeCompare(b.skill.name);
      })
      .slice(0, MAX_RESULTS)
      .map(result => result.skill);

    return results;
  }, [skills, searchQuery]);

  // Debounced search to highlight matching skills
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        onHighlightSkills(searchResults.map(s => s.id));
      } else {
        onHighlightSkills([]);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery, searchResults, onHighlightSkills]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Focus search input when overlay becomes visible
  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isVisible]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          if (!isSearchFocused) {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
          }
          break;
        case 'ArrowUp':
          if (!isSearchFocused) {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
          }
          break;
        case 'Enter':
          if (!isSearchFocused && searchResults[selectedIndex]) {
            e.preventDefault();
            handleSkillSelect(searchResults[selectedIndex].id);
          }
          break;
        case 'Tab':
          if (!isSearchFocused && searchResults.length > 0) {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % searchResults.length);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, searchResults, selectedIndex, isSearchFocused, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && searchResults.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [selectedIndex, searchResults]);

  const handleSkillSelect = useCallback((skillId: string) => {
    onSkillSelect(skillId);
    onClose();
  }, [onSkillSelect, onClose]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    onHighlightSkills([]);
    searchInputRef.current?.focus();
  }, [onHighlightSkills]);

  const getSkillStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'available': return '🔓';
      default: return '🔒';
    }
  }, []);

  const getSkillStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed': return 'text-success';
      case 'in_progress': return 'text-warning';
      case 'available': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  }, []);

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Search Panel */}
      <div className={cn(
        "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
        "w-full max-w-2xl max-h-[80vh] bg-background border rounded-lg shadow-lg z-50",
        "flex flex-col overflow-hidden",
        className
      )}>
        {/* Search Header */}
        <div className="flex items-center gap-2 p-4 border-b">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search skills by name, category, or description..."
            className="flex-1 border-none focus-visible:ring-0 focus-visible:ring-offset-0"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-hidden">
          {searchQuery.trim() === '' ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Search for skills</p>
              <p className="text-sm">Start typing to find skills by name, category, or description</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-lg font-medium">No skills found</p>
              <p className="text-sm">Try adjusting your search terms</p>
            </div>
          ) : (
            <div ref={resultsRef} className="overflow-auto max-h-full">
              {searchResults.map((skill, index) => (
                <div
                  key={skill.id}
                  className={cn(
                    "p-3 border-b cursor-pointer transition-colors",
                    "hover:bg-muted/50 focus:bg-muted/50",
                    index === selectedIndex && "bg-muted",
                    skill.id === selectedSkillId && "bg-primary/10"
                  )}
                  onClick={() => handleSkillSelect(skill.id)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSkillSelect(skill.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getSkillStatusIcon(skill.status)}</span>
                        <h3 className="font-medium text-foreground">{skill.name}</h3>
                        <span className={cn("text-sm", getSkillStatusColor(skill.status))}>
                          {skill.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Category: {skill.category}
                      </p>
                      {skill.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {skill.description}
                        </p>
                      )}
                    </div>
                    {index === selectedIndex && (
                      <ArrowDown className="h-4 w-4 text-muted-foreground ml-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search Footer */}
        {searchResults.length > 0 && (
          <div className="p-3 border-t bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
            <span>
              {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
              {searchResults.length === MAX_RESULTS && ' (showing first 50)'}
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" />
                Navigate
              </span>
              <span>Enter to select</span>
              <span>Esc to close</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
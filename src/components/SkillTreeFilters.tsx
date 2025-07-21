
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, Filter, Target, Eye, EyeOff } from 'lucide-react';

interface SkillTreeFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeCategories: string[];
  onCategoryToggle: (category: string) => void;
  showOnlyRecommended: boolean;
  onRecommendedToggle: (show: boolean) => void;
  focusMode: boolean;
  onFocusModeToggle: (focus: boolean) => void;
  skillCounts: {
    total: number;
    completed: number;
    inProgress: number;
    recommended: number;
  };
}

const categories = [
  { name: 'Technical', color: 'bg-blue-100 text-blue-800', icon: '🖥️' },
  { name: 'Soft Skills', color: 'bg-green-100 text-green-800', icon: '💡' },
  { name: 'Career', color: 'bg-purple-100 text-purple-800', icon: '🎯' },
  { name: 'Tools', color: 'bg-orange-100 text-orange-800', icon: '🛠️' }
];

export const SkillTreeFilters: React.FC<SkillTreeFiltersProps> = ({
  searchTerm,
  onSearchChange,
  activeCategories,
  onCategoryToggle,
  showOnlyRecommended,
  onRecommendedToggle,
  focusMode,
  onFocusModeToggle,
  skillCounts
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Skill Tree Filters
        </CardTitle>
        <CardDescription>
          Customize your skill tree view and focus on what matters most
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categories */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Categories</Label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge
                key={category.name}
                variant={activeCategories.includes(category.name) ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  activeCategories.includes(category.name) 
                    ? category.color 
                    : 'hover:bg-muted'
                }`}
                onClick={() => onCategoryToggle(category.name)}
              >
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="recommended"
              checked={showOnlyRecommended}
              onCheckedChange={onRecommendedToggle}
            />
            <Label htmlFor="recommended" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Show Only Recommended
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="focus"
              checked={focusMode}
              onCheckedChange={onFocusModeToggle}
            />
            <Label htmlFor="focus" className="flex items-center gap-2">
              {focusMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Focus Mode
            </Label>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{skillCounts.total}</div>
            <div className="text-sm text-muted-foreground">Total Skills</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{skillCounts.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{skillCounts.inProgress}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{skillCounts.recommended}</div>
            <div className="text-sm text-muted-foreground">Recommended</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

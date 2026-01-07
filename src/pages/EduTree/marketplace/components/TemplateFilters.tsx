import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, BookOpen, Building2, TrendingUp } from 'lucide-react';
import { usePlanBasket } from '@/pages/EduTree/v5/state/usePlanBasket';
import { getAnchorPolicy } from '@/lib/degree/institutionPolicies';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MarketplaceFilters } from '@/pages/EduTree/v5/types/templates';

interface TemplateFiltersProps {
  filters: MarketplaceFilters;
  onFiltersChange: (filters: MarketplaceFilters) => void;
}

const CAREER_OPTIONS = [
  { id: 'software-engineer', label: 'Software Engineer' },
  { id: 'web-developer', label: 'Web Developer' },
  { id: 'data-analyst', label: 'Data Analyst' },
  { id: 'data-scientist', label: 'Data Scientist' },
  { id: 'cybersecurity-analyst', label: 'Cybersecurity Analyst' },
  { id: 'registered-nurse', label: 'Registered Nurse' },
];

const ANCHOR_SCHOOLS = ['TESU', 'WGU', 'UMGC', 'Community College'];

export function TemplateFilters({ filters, onFiltersChange }: TemplateFiltersProps) {
  const { constraints } = usePlanBasket();
  const anchorPolicy = constraints.target_school ? getAnchorPolicy(constraints.target_school) : null;
  
  const handleBudgetChange = (value: number[]) => {
    onFiltersChange({ ...filters, budgetRange: [value[0], value[1]] });
  };

  const handleTimeChange = (value: number[]) => {
    onFiltersChange({ ...filters, timeRange: [value[0], value[1]] });
  };

  const handleWeeklyHoursChange = (value: number[]) => {
    onFiltersChange({ ...filters, weeklyHoursRange: [value[0], value[1]] });
  };

  const handleDeliveryModeChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      deliveryMode: value as MarketplaceFilters['deliveryMode'] 
    });
  };

  const handleSchoolToggle = (school: string, checked: boolean) => {
    const newSchools = checked
      ? [...filters.anchorSchools, school]
      : filters.anchorSchools.filter(s => s !== school);
    onFiltersChange({ ...filters, anchorSchools: newSchools });
  };

  const handleSortChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      sortBy: value as MarketplaceFilters['sortBy'] 
    });
  };

  const handleClearAll = () => {
    onFiltersChange({
      careerIds: [],
      budgetRange: [0, 50000],
      timeRange: [12, 60],
      weeklyHoursRange: [5, 40],
      deliveryMode: 'all',
      anchorSchools: [],
      sortBy: 'popularity',
    });
  };

  return (
    <div className="space-y-6">
      {/* Anchor School Policy Card */}
      {anchorPolicy && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-primary/20">
            <GraduationCap className="h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold text-sm">{anchorPolicy.partner_name}</div>
              <div className="text-xs text-muted-foreground">Graduation School Policies</div>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Alt Credits Cap</div>
                <div className="text-muted-foreground">Max {anchorPolicy.max_alt_credits} credits</div>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Residency Required</div>
                <div className="text-muted-foreground">Min {anchorPolicy.min_residency_credits} credits</div>
              </div>
            </div>
            
            {anchorPolicy.upper_division_min > 0 && (
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Upper Division</div>
                  <div className="text-muted-foreground">Min {anchorPolicy.upper_division_min} credits</div>
                </div>
              </div>
            )}
          </div>
          
          {anchorPolicy.notes && (
            <div className="pt-2 border-t border-primary/20">
              <p className="text-xs text-muted-foreground italic">{anchorPolicy.notes}</p>
            </div>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters</h3>
        <Button variant="ghost" size="sm" onClick={handleClearAll}>
          Clear All
        </Button>
      </div>

      {/* Sort By */}
      <div className="space-y-2">
        <Label>Sort By</Label>
        <Select value={filters.sortBy} onValueChange={handleSortChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popularity">Most Popular</SelectItem>
            <SelectItem value="cost">Lowest Cost</SelectItem>
            <SelectItem value="time">Fastest</SelectItem>
            <SelectItem value="roi">Best ROI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Budget Range */}
      <div className="space-y-3">
        <Label>Budget Range</Label>
        <div className="px-2">
          <Slider
            min={0}
            max={50000}
            step={1000}
            value={filters.budgetRange}
            onValueChange={handleBudgetChange}
          />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>${(filters.budgetRange[0] / 1000).toFixed(0)}K</span>
          <span>${(filters.budgetRange[1] / 1000).toFixed(0)}K</span>
        </div>
      </div>

      {/* Time Range */}
      <div className="space-y-3">
        <Label>Completion Time (months)</Label>
        <div className="px-2">
          <Slider
            min={12}
            max={60}
            step={6}
            value={filters.timeRange}
            onValueChange={handleTimeChange}
          />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{filters.timeRange[0]}mo</span>
          <span>{filters.timeRange[1]}mo</span>
        </div>
      </div>

      {/* Weekly Hours */}
      <div className="space-y-3">
        <Label>Weekly Study Hours</Label>
        <div className="px-2">
          <Slider
            min={5}
            max={40}
            step={5}
            value={filters.weeklyHoursRange}
            onValueChange={handleWeeklyHoursChange}
          />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{filters.weeklyHoursRange[0]}hrs</span>
          <span>{filters.weeklyHoursRange[1]}hrs</span>
        </div>
      </div>

      {/* Delivery Mode */}
      <div className="space-y-3">
        <Label>Delivery Mode</Label>
        <RadioGroup value={filters.deliveryMode} onValueChange={handleDeliveryModeChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all" className="font-normal cursor-pointer">All</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fully_online" id="online" />
            <Label htmlFor="online" className="font-normal cursor-pointer">Online Only</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="hybrid" id="hybrid" />
            <Label htmlFor="hybrid" className="font-normal cursor-pointer">Hybrid OK</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="in_person_ok" id="in-person" />
            <Label htmlFor="in-person" className="font-normal cursor-pointer">In-Person OK</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Anchor Schools */}
      <div className="space-y-3">
        <Label>Schools</Label>
        <div className="space-y-2">
          {ANCHOR_SCHOOLS.map(school => (
            <div key={school} className="flex items-center space-x-2">
              <Checkbox
                id={school}
                checked={filters.anchorSchools.includes(school)}
                onCheckedChange={(checked) => handleSchoolToggle(school, checked as boolean)}
              />
              <Label htmlFor={school} className="font-normal cursor-pointer">
                {school}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

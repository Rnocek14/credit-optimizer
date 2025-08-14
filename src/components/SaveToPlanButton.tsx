/**
 * Enhanced Save to Plan Button
 * Unified component for saving items from any hub to Plan with smart categorization
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle, Clock, Target } from 'lucide-react';
import { useCrossHubIntegration } from '@/hooks/useCrossHubIntegration';
import { useSkillGaps } from '@/hooks/useSkillGaps';
import { SaveToPlanItem } from '@/types/plan';
import { CRIBoostChip } from '@/components/ui/cri-boost-chip';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';

interface SaveToPlanButtonProps {
  item: SaveToPlanItem;
  compact?: boolean;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showPrioritySelector?: boolean;
}

export const SaveToPlanButton: React.FC<SaveToPlanButtonProps> = ({
  item,
  compact = false,
  variant = 'outline',
  size = 'default',
  showPrioritySelector = false
}) => {
  const [selectedPriority, setSelectedPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const { saveToPlan, isSavingToPlan, calculateCRIBoost } = useCrossHubIntegration();
  const { data: skillGaps = [] } = useSkillGaps();
  
  // Calculate CRI boost for this item
  const { boost: criBoost, explanation: criExplanation } = calculateCRIBoost(item, skillGaps);
  
  // Check if already saved
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser
  });

  const { data: isAlreadySaved } = useQuery({
    queryKey: ['is-saved', item.id, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return false;
      
      const { data } = await supabase
        .from('saved_plan_items')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('item_id', item.id)
        .eq('item_type', item.type)
        .maybeSingle();
      
      return !!data;
    },
    enabled: !!currentUser?.id
  });

  const handleSave = (priority: 'high' | 'medium' | 'low' = selectedPriority) => {
    saveToPlan({
      ...item,
      priority,
      timeEstimate: item.timeEstimate || getEstimatedTime(item.type)
    });
  };

  const getEstimatedTime = (type: string): string => {
    switch (type) {
      case 'course': return '2-4 weeks';
      case 'career_path': return '6-12 months';
      case 'project': return '1-2 weeks';
      case 'skill': return '4-8 weeks';
      default: return '2-4 weeks';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'course': return '📚';
      case 'career_path': return '🎯';
      case 'project': return '🚀';
      case 'skill': return '💡';
      case 'mentor': return '👨‍🏫';
      default: return '📌';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isAlreadySaved) {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled
        className="gap-2 text-green-600"
      >
        <CheckCircle className="h-4 w-4" />
        {!compact && "Saved to Plan"}
      </Button>
    );
  }

  if (showPrioritySelector) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={isSavingToPlan}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {!compact && "Save to Plan"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <span className="text-lg">{getTypeIcon(item.type)}</span>
            Save "{item.title}"
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleSave('high')} className="gap-2">
            <Target className="h-4 w-4 text-red-500" />
            <div className="flex-1">
              <div className="font-medium">High Priority</div>
              <div className="text-xs text-muted-foreground">Focus on this first</div>
            </div>
            <Badge variant="outline" className={getPriorityColor('high')}>
              High
            </Badge>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleSave('medium')} className="gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <div className="flex-1">
              <div className="font-medium">Medium Priority</div>
              <div className="text-xs text-muted-foreground">Add to regular schedule</div>
            </div>
            <Badge variant="outline" className={getPriorityColor('medium')}>
              Medium
            </Badge>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleSave('low')} className="gap-2">
            <Plus className="h-4 w-4 text-green-500" />
            <div className="flex-1">
              <div className="font-medium">Low Priority</div>
              <div className="text-xs text-muted-foreground">Future consideration</div>
            </div>
            <Badge variant="outline" className={getPriorityColor('low')}>
              Low
            </Badge>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={() => handleSave()}
        disabled={isSavingToPlan}
        className="gap-2"
        data-testid="save-to-plan-btn"
      >
        <Plus className="h-4 w-4" />
        {!compact && (isSavingToPlan ? "Saving..." : "Save to Plan")}
      </Button>
      {criBoost > 0 && (
        <CRIBoostChip 
          boostPercentage={criBoost} 
          explanation={criExplanation}
          size={size === 'sm' ? 'sm' : 'default'}
        />
      )}
    </div>
  );
};
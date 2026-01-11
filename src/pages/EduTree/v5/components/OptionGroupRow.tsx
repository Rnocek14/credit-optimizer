/**
 * OptionGroupRow - Renders a grouped set of equivalent options
 * Shows best option as header, with expandable alternatives
 */

import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ScoredOption, OptionGroup } from '../utils/optionGrouping';
import { PolicyBadges, RecommendedBadge } from './PolicyBadges';
import type { LegacyAnchorPolicy } from '@/lib/degree/institutionPolicies';

interface OptionGroupRowProps {
  group: OptionGroup;
  isTopGroup: boolean;
  sortBy: string;
  anchorPolicy: Partial<LegacyAnchorPolicy>;
  currentAceCredits: number;
  isInBasket: (optionId: string, courseId: string) => boolean;
  onAddToBasket: (option: ScoredOption['option']) => void;
  onRemoveFromBasket: (optionId: string) => void;
}

export function OptionGroupRow({
  group,
  isTopGroup,
  sortBy,
  anchorPolicy,
  currentAceCredits,
  isInBasket,
  onAddToBasket,
  onRemoveFromBasket,
}: OptionGroupRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { bestOption, alternatives } = group;
  const best = bestOption.option;
  const inBasket = isInBasket(best.id, best.courseId);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Group Header - Best Option */}
      <div
        className={`p-3 flex items-center justify-between hover:bg-accent/50 transition-colors ${
          isTopGroup && sortBy === 'best-match' ? 'border-primary/50 bg-primary/5' : ''
        }`}
      >
        <div className="min-w-0 flex-1">
          <RecommendedBadge 
            reason={bestOption.reason}
            isTopOption={isTopGroup}
            sortBy={sortBy}
          />
          
          <div className="font-medium text-sm truncate flex items-center gap-2">
            {best.courseId}: {best.title}
            
            {/* Group indicator */}
            {alternatives.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-2 text-xs"
                onClick={() => setIsExpanded(v => !v)}
              >
                {isExpanded ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                {alternatives.length} alternative{alternatives.length > 1 ? 's' : ''}
              </Button>
            )}
          </div>
          
          {/* Best option details */}
          <div className="mt-1">
            <PolicyBadges 
              option={best}
              anchorPolicy={anchorPolicy}
              currentAceCredits={currentAceCredits}
            />
          </div>
          
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            <span>{best.credits} cr</span>
            {best.cost_usd !== null && (
              <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-medium">
                {best.cost_usd === 0 ? 'Included' : `$${new Intl.NumberFormat().format(best.cost_usd)}`}
              </span>
            )}
            {best.duration_weeks && <span>• {best.duration_weeks}w</span>}
            {best.provider && (
              <span className="text-[10px] text-muted-foreground">{best.provider}</span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 ml-2">
          <Button
            onClick={() => inBasket 
              ? onRemoveFromBasket(best.id) 
              : onAddToBasket(best)
            }
            size="sm"
            variant={inBasket ? 'default' : 'outline'}
          >
            {inBasket ? '✓ In Plan' : '+ Add'}
          </Button>
        </div>
      </div>
      
      {/* Expanded Alternatives */}
      {isExpanded && alternatives.length > 0 && (
        <div className="border-t bg-muted/20">
          {alternatives.map((alt) => {
            const option = alt.option;
            const altInBasket = isInBasket(option.id, option.courseId);
            
            return (
              <div 
                key={option.id}
                className="p-3 pl-6 flex items-center justify-between border-b last:border-b-0 hover:bg-accent/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate text-muted-foreground">
                    via {option.provider}
                  </div>
                  
                  <PolicyBadges 
                    option={option}
                    anchorPolicy={anchorPolicy}
                    currentAceCredits={currentAceCredits}
                  />
                  
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <span>{option.credits} cr</span>
                    {option.cost_usd !== null && (
                      <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-medium">
                        {option.cost_usd === 0 ? 'Included' : `$${new Intl.NumberFormat().format(option.cost_usd)}`}
                      </span>
                    )}
                    {option.duration_weeks && <span>• {option.duration_weeks}w</span>}
                  </div>
                </div>
                
                <Button
                  onClick={() => altInBasket 
                    ? onRemoveFromBasket(option.id) 
                    : onAddToBasket(option)
                  }
                  size="sm"
                  variant={altInBasket ? 'default' : 'outline'}
                >
                  {altInBasket ? '✓ In Plan' : '+ Add'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  showToggle?: boolean;
}

export const ExpandableText: React.FC<ExpandableTextProps> = ({
  text,
  maxLength = 300,
  className = '',
  showToggle = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!text) return null;
  
  const needsTruncation = text.length > maxLength;
  const displayText = needsTruncation && !isExpanded 
    ? text.substring(0, maxLength) + '...' 
    : text;

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-sm text-muted-foreground leading-relaxed break-words">
        {displayText}
      </p>
      
      {needsTruncation && showToggle && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 p-0 text-xs text-primary hover:text-primary/80"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              Read More
            </>
          )}
        </Button>
      )}
    </div>
  );
};

interface ExpandableListProps {
  items: string[];
  maxItems?: number;
  className?: string;
  renderItem?: (item: string, index: number) => React.ReactNode;
}

export const ExpandableList: React.FC<ExpandableListProps> = ({
  items,
  maxItems = 2,
  className = '',
  renderItem
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!items || items.length === 0) return null;
  
  const displayItems = isExpanded ? items : items.slice(0, maxItems);
  const hasMoreItems = items.length > maxItems;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="space-y-1">
        {displayItems.map((item, index) => (
          <div key={index}>
            {renderItem ? renderItem(item, index) : (
              <div className="text-sm text-muted-foreground break-words">
                {item}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {hasMoreItems && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 p-0 text-xs text-primary hover:text-primary/80"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              Show {items.length - maxItems} More
            </>
          )}
        </Button>
      )}
    </div>
  );
};
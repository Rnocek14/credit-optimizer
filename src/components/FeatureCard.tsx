/**
 * Enhanced Feature Card Component
 * Uses the new design system for consistent styling and interactions
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'premium';
  };
  className?: string;
  premium?: boolean;
  disabled?: boolean;
}

export function FeatureCard({
  title,
  description,
  icon: Icon,
  iconColor = "bg-primary/10 text-primary",
  badge,
  badgeVariant = 'default',
  action,
  className,
  premium = false,
  disabled = false
}: FeatureCardProps) {
  return (
    <Card 
      className={cn(
        "group relative overflow-hidden",
        premium && "border-primary/20 shadow-colored",
        disabled && "opacity-60 cursor-not-allowed",
        !disabled && "hover-lift cursor-pointer",
        className
      )}
    >
      {premium && (
        <div className="absolute inset-0 bg-gradient-primary opacity-5" />
      )}
      
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-lg transition-colors",
              iconColor,
              !disabled && "hover-gentle transition-transform"
            )}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {title}
              </CardTitle>
              {badge && (
                <Badge variant={badgeVariant} className="mt-1">
                  {badge}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <CardDescription className="text-base leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      
      {action && (
        <CardContent className="pt-0">
          <Button
            onClick={action.onClick}
            variant={premium ? 'premium' : action.variant || 'default'}
            className="w-full"
            disabled={disabled}
          >
            {action.label}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

// Grid wrapper for feature cards
export function FeatureGrid({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={cn(
      "grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      className
    )}>
      {children}
    </div>
  );
}
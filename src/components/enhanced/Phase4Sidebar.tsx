import React from 'react';
import { 
  Bot, TrendingUp, Target, Heart, Brain, Zap, Activity, 
  ChevronLeft, ChevronRight, Home 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Phase4SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navigationItems = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Home,
    description: 'Dashboard overview and progress'
  },
  {
    id: 'copilot',
    label: 'AI Co-Pilot',
    icon: Bot,
    description: 'AI-powered career guidance'
  },
  {
    id: 'pivot',
    label: 'Career Pivot',
    icon: TrendingUp,
    description: 'Explore pivot opportunities'
  },
  {
    id: 'tracker',
    label: 'Progress',
    icon: Target,
    description: 'Track your development'
  },
  {
    id: 'workflows',
    label: 'Workflows',
    icon: Activity,
    description: 'Autonomous task management'
  }
];

export function Phase4Sidebar({ 
  activeTab, 
  onTabChange, 
  collapsed, 
  onToggleCollapse 
}: Phase4SidebarProps) {
  return (
    <div className={cn(
      "flex flex-col bg-card border-r border-border transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h2 className="font-semibold text-sm">Phase 4</h2>
              <p className="text-xs text-muted-foreground">Career Co-Pilot</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="p-2 h-8 w-8"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <TooltipProvider>
        <nav className="flex-1 p-2">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              const buttonElement = (
                <Button
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "w-full justify-start gap-3 h-10",
                    collapsed && "justify-center",
                    isActive && "bg-primary/10 text-primary border-primary/20"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && (
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                  )}
                </Button>
              );

              return collapsed ? (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    {buttonElement}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : buttonElement;
            })}
          </div>
        </nav>
      </TooltipProvider>

      {/* Status Indicator */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            System Online
          </div>
        </div>
      )}
    </div>
  );
}
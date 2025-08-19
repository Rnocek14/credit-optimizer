import { Link, useLocation } from "react-router-dom";
import { Search, Target, BookOpen, Settings, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import { useJourneyStore } from "@/stores/journeyStore";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const primaryHubs = [
  { id: "discover", label: "DISCOVER", icon: Search, href: "/discover" },
  { id: "plan", label: "PLAN", icon: Target, href: "/plan" },
  { id: "progress", label: "PROGRESS", icon: BookOpen, href: "/progress" },
];

export function HubNavigation() {
  const location = useLocation();
  const { hasPermission } = useSecureAuth();
  const { stage, permissions } = useJourneyStore();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/discover") {
      return location.pathname.startsWith("/discover") || 
             location.pathname.startsWith("/explore") || 
             location.pathname === "/explore-courses" ||
             location.pathname === "/salary-insights" ||
             location.pathname === "/market-intelligence";
    }
    if (href === "/plan") {
      return location.pathname.startsWith("/plan") || 
             location.pathname === "/goals" || 
             location.pathname === "/planner" ||
             location.pathname === "/maya-roadmap" ||
             location.pathname === "/workflows";
    }
    if (href === "/progress") {
      return location.pathname.startsWith("/progress") ||
             location.pathname.startsWith("/history") ||
             location.pathname.startsWith("/learning-history") ||
             location.pathname === "/certificates" ||
             location.pathname === "/badges" ||
             location.pathname === "/transcripts" ||
             location.pathname === "/projects" ||
             location.pathname === "/wallet" ||
             location.pathname === "/resume-builder" ||
             location.pathname === "/resume-analytics";
    }
    return location.pathname === href;
  };

  // Progressive disclosure based on journey stage
  const showProgress = stage !== 'new';
  const showContribute = permissions.admin || permissions.institution || permissions.employer || permissions.teach || hasPermission("admin") || hasPermission("user");

  // Visible hubs based on progressive disclosure
  const visibleHubs = [
    primaryHubs[0], // DISCOVER - always shown
    primaryHubs[1], // PLAN - always shown
    ...(showProgress ? [primaryHubs[2]] : []), // PROGRESS - shown after onboarding
  ];

  return (
    <nav data-testid="hub-nav" data-stage={stage} className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4">
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity mr-6">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Life Path
            </span>
          </Link>

          {visibleHubs.map((hub) => {
            const Icon = hub.icon;
            return (
              <Button
                key={hub.id}
                variant={isActive(hub.href) ? "default" : "ghost"}
                size="sm"
                asChild
                className={cn(
                  "gap-2 font-medium",
                  isActive(hub.href) && "bg-primary text-primary-foreground"
                )}
              data-testid={`nav-${hub.id}`}
            >
              <Link to={hub.href}>
                <Icon className="h-4 w-4" />
                {hub.label}
              </Link>
            </Button>
            );
          })}

          {showContribute && (
            <DropdownMenu open={isMoreOpen} onOpenChange={setIsMoreOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={location.pathname.startsWith("/contribute") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2 font-medium"
                  data-testid="nav-contribute"
                >
                  <Settings className="h-4 w-4" />
                  CONTRIBUTE
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/contribute?tab=teach" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Teach
                    </Link>
                  </DropdownMenuItem>
                  {hasPermission("user") && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/contribute?tab=institution" className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Institution
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/contribute?tab=employer" className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Employer
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {hasPermission("admin") && (
                    <DropdownMenuItem asChild>
                      <Link to="/contribute?tab=admin" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Theme Toggle */}
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
          <div className="flex items-center justify-around py-2">
            {visibleHubs.map((hub) => {
              const Icon = hub.icon;
              return (
                <Link
                  key={hub.id}
                  to={hub.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 text-xs",
                    isActive(hub.href) 
                      ? "text-primary font-medium" 
                      : "text-muted-foreground"
                  )}
                  data-testid={`nav-${hub.id}`}
                >
                  <Icon className="h-5 w-5" />
                  {hub.label}
                </Link>
              );
            })}
            
            {showContribute && (
              <Link
                to="/contribute"
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 text-xs",
                  location.pathname.startsWith("/contribute")
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                )}
                data-testid="nav-contribute"
              >
                <Settings className="h-5 w-5" />
                MORE
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
import { Link, useLocation } from "react-router-dom";
import { Search, Target, BookOpen, Settings, ChevronDown, CalendarDays, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import { useJourneyStore } from "@/stores/journeyStore";
import { useActiveTrackStore } from "@/stores/useActiveTrackStore";
import { useState, Suspense, lazy } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActivePlan } from "@/hooks/useActivePlan";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TutorialToggle from "@/tutorial/TutorialToggle";
import TutorialTip from "@/tutorial/TutorialTip";
import { TIPS } from "@/tutorial/tutorial-map";

// Lazy load TrackManager to keep bundle size trim
const TrackManager = lazy(() => import("@/components/multi-track/TrackManager").then(module => ({ 
  default: module.TrackManager 
})));

// Plan hub href is dynamic — computed at render time
const staticHubs = [
  { id: "today", label: "TODAY", icon: CalendarDays, href: "/today" },
  { id: "discover", label: "DISCOVER", icon: Search, href: "/discover" },
  // plan hub injected dynamically below
  { id: "progress", label: "PROGRESS", icon: BookOpen, href: "/progress" },
];

export function HubNavigation() {
  const location = useLocation();
  const { hasPermission, user } = useSecureAuth();
  const { stage, permissions } = useJourneyStore();
  const { activeTrackId } = useActiveTrackStore();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [showTrackManager, setShowTrackManager] = useState(false);
  const { data: activePlan } = useActivePlan();

  // Safety net: always link to /plan (the stable workspace).
  // /plan then provides "Open Planner" with the right params for V6.
  const planHubHref = '/plan';
  const planHub = { id: "plan", label: "DEGREE PLAN", icon: GraduationCap, href: planHubHref };

  const primaryHubs = [
    staticHubs[0], // TODAY
    staticHubs[1], // DISCOVER
    planHub,       // DEGREE PLAN (dynamic)
    staticHubs[2], // PROGRESS
  ];

  // Fetch current track details for display
  const { data: currentTrack } = useQuery({
    queryKey: ['current-track', activeTrackId],
    queryFn: async () => {
      if (!activeTrackId || !user) return null;
      const { data, error } = await supabase
        .from('career_tracks')
        .select('id, title')
        .eq('id', activeTrackId)
        .eq('user_id', user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!activeTrackId && !!user,
  });

  const isActive = (hubId: string) => {
    if (hubId === "today") {
      return location.pathname === "/today";
    }
    if (hubId === "discover") {
      return location.pathname.startsWith("/discover") || 
             location.pathname.startsWith("/explore") || 
             location.pathname === "/explore-courses" ||
             location.pathname === "/salary-insights" ||
             location.pathname === "/market-intelligence";
    }
    if (hubId === "plan") {
      return location.pathname.startsWith("/plan") || 
             location.pathname.startsWith("/edu-tree-v5") ||
             location.pathname.startsWith("/edu-tree-v6") ||
             location.pathname === "/goals" || 
             location.pathname === "/planner" ||
             location.pathname === "/marketplace" ||
             location.pathname === "/build";
    }
    if (hubId === "progress") {
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
    return false;
  };

  // Progressive disclosure based on journey stage
  const showProgress = stage !== 'new';
  // CONTRIBUTE hidden from primary nav (cleanup 2026-04). Routes still accessible
  // via direct URL for admin/institution/employer/teach roles. Future B2B surface.
  const showContribute = false;
  const isBuildPage = location.pathname === '/build';
  const displayTrackTitle = currentTrack?.title || (activeTrackId ? `Track ${activeTrackId.slice(0, 8)}...` : null);

  // Visible hubs based on progressive disclosure
  const visibleHubs = [
    primaryHubs[0], // TODAY - always shown
    primaryHubs[1], // DISCOVER - always shown
    primaryHubs[2], // DEGREE PLAN - always shown
    ...(showProgress ? [primaryHubs[3]] : []), // PROGRESS - shown after onboarding
  ];

  return (
    <nav data-testid="hub-nav" data-stage={stage} className="hidden md:block bg-glass border-b sticky top-0 z-50">
      <div className="container-xl">
        {/* Desktop Navigation */}
        <div className="flex items-center gap-2 py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity mr-8">
            <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-colored">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-h4 font-bold bg-gradient-primary bg-clip-text text-transparent">
              Pivot
            </span>
          </Link>

          {visibleHubs.map((hub) => {
            const Icon = hub.icon;
            return (
              <div key={hub.id} className="flex items-center gap-1">
                <Button
                  key={hub.id}
                  variant={isActive(hub.id) ? "default" : "ghost"}
                  size="sm"
                  asChild
                  className={cn(
                    "gap-2 font-medium interactive",
                    isActive(hub.id) && "bg-primary text-primary-foreground shadow-elevation"
                  )}
                data-testid={`nav-${hub.id}`}
              >
                <Link to={hub.href}>
                  <Icon className="h-4 w-4" />
                  {hub.label}
                </Link>
              </Button>
              <TutorialTip 
                id={`${hub.id}Hub`} 
                label={TIPS[`${hub.id}Hub` as keyof typeof TIPS]} 
              />
              </div>
            );
          })}

          {/* Active Track Display for Build Page */}
          {isBuildPage && currentTrack && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-accent/50 rounded-md border border-border/50">
              <span className="text-sm text-muted-foreground">Active:</span>
              <span className="text-sm font-medium text-foreground max-w-[200px] truncate">
                {displayTrackTitle}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTrackManager(true)}
                  className="h-6 px-2 text-ui-small text-muted-foreground hover:text-foreground"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Change
                </Button>
                <TutorialTip 
                  id="trackManager" 
                  label={TIPS.trackManager} 
                />
              </div>
            </div>
          )}

          {showContribute && (
            <div className="flex items-center gap-1">
              <DropdownMenu open={isMoreOpen} onOpenChange={setIsMoreOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={location.pathname.startsWith("/contribute") ? "default" : "ghost"}
                    size="sm"
                    className="gap-2 font-medium interactive"
                    data-testid="nav-contribute"
                  >
                    <Settings className="h-4 w-4" />
                    CONTRIBUTE
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-popover shadow-floating border">
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
            <TutorialTip 
              id="contributeMenu" 
              label={TIPS.contributeMenu} 
            />
            </div>
          )}

          {/* Tutorial Toggle & Theme Toggle */}
          <div className="ml-auto flex items-center gap-4">
            <TutorialToggle />
            <ThemeToggle />
          </div>
        </div>

      </div>

      {/* Track Manager Dialog */}
      <Suspense fallback={null}>
        <TrackManager 
          open={showTrackManager}
          onOpenChange={setShowTrackManager}
          currentTrackId={activeTrackId || undefined}
          modal={true}
          onTrackSelect={(trackId) => {
            setShowTrackManager(false);
            // Navigation will be handled by the hook
          }}
        />
      </Suspense>
    </nav>
  );
}
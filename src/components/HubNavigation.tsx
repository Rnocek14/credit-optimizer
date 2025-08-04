import { Link, useLocation } from "react-router-dom";
import { Search, Target, BookOpen, User, Building, Briefcase, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSecureAuth } from "@/hooks/useSecureAuth";

const primaryHubs = [
  { id: "explore", label: "EXPLORE", icon: Search, href: "/explore-hub" },
  { id: "plan", label: "PLAN", icon: Target, href: "/plan-hub" },
  { id: "history", label: "HISTORY", icon: BookOpen, href: "/history-hub" },
];

const stakeholderHubs = [
  { id: "teach", label: "TEACH", icon: User, href: "/teach", role: "teacher" },
  { id: "institution", label: "INSTITUTION", icon: Building, href: "/institution-hub", role: "institution" },
  { id: "employer", label: "EMPLOYER", icon: Briefcase, href: "/employer-hub", role: "employer" },
  { id: "admin", label: "ADMIN", icon: Settings, href: "/admin", role: "admin" },
];

export function HubNavigation() {
  const location = useLocation();
  const { hasPermission } = useSecureAuth();

  const isActive = (href: string) => {
    if (href === "/explore-hub") {
      return location.pathname.startsWith("/explore") || location.pathname === "/discover";
    }
    if (href === "/plan-hub") {
      return location.pathname.startsWith("/plan") || location.pathname === "/goals" || location.pathname === "/maya-roadmap";
    }
    if (href === "/history-hub") {
      return location.pathname.startsWith("/skill") || location.pathname === "/transcript" || location.pathname === "/certificates" || location.pathname === "/badges";
    }
    return location.pathname === href;
  };

  const visibleStakeholderHubs = stakeholderHubs.filter(hub => {
    if (hub.role === "teacher") return true; // Anyone can become a teacher
    if (hub.role === "admin") return hasPermission("admin");
    // Add more role checks as needed
    return false;
  });

  return (
    <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4">
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2 py-3">
          {primaryHubs.map((hub) => {
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
              >
                <Link to={hub.href}>
                  <Icon className="h-4 w-4" />
                  {hub.label}
                </Link>
              </Button>
            );
          })}

          {visibleStakeholderHubs.length > 0 && (
            <>
              <div className="h-6 w-px bg-border mx-2" />
              {visibleStakeholderHubs.map((hub) => {
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
                  >
                    <Link to={hub.href}>
                      <Icon className="h-4 w-4" />
                      {hub.label}
                    </Link>
                  </Button>
                );
              })}
            </>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
          <div className="flex items-center justify-around py-2">
            {primaryHubs.map((hub) => {
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
                >
                  <Icon className="h-5 w-5" />
                  {hub.label}
                </Link>
              );
            })}
            
            {visibleStakeholderHubs.length > 0 && visibleStakeholderHubs[0] && (
              <Link
                to={visibleStakeholderHubs[0].href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 text-xs",
                  isActive(visibleStakeholderHubs[0].href)
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                )}
              >
                {(() => {
                  const Icon = visibleStakeholderHubs[0].icon;
                  return <Icon className="h-5 w-5" />;
                })()}
                {visibleStakeholderHubs[0].label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
import { Link, useLocation } from "react-router-dom";
import { GraduationCap, Store, Compass, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

const NAV_ITEMS = [
  { id: "plan", label: "My Plan", icon: GraduationCap, href: "/plan", match: ["/plan", "/edu-tree-v6"] },
  { id: "marketplace", label: "Marketplace", icon: Store, href: "/edu-tree-v5/marketplace", match: ["/edu-tree-v5"] },
  { id: "careers", label: "Careers", icon: Compass, href: "/explore/careers", match: ["/explore"] },
];

export function HubNavigation() {
  const location = useLocation();
  const { user } = useSecureAuth();

  const isActive = (match: string[]) =>
    match.some((prefix) => location.pathname.startsWith(prefix));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to={user ? "/plan" : "/"} className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          Pivot
        </Link>

        {user ? (
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.match);
              return (
                <Button
                  key={item.id}
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-1.5",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  )}
                >
                  <Link to={item.href}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>
        ) : (
          <nav className="hidden md:flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link to="/guides">Guides</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/get-started">Check my credits</Link>
            </Button>
          </nav>
        )}

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-1.5"
              onClick={() => void supabase.auth.signOut()}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

import { Home, Target, Compass, User, Settings } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MobileThemeToggle } from "./MobileThemeToggle";

interface MobileNavigationProps {
  className?: string;
}

const navigationItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Target, label: "Plan", path: "/plan" },
  { icon: Compass, label: "Discover", path: "/discover" },
  { icon: User, label: "Progress", path: "/progress" },
];

export function MobileNavigation({ className }: MobileNavigationProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      "pb-safe-bottom transition-colors duration-200",
      className
    )}
    style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
    >
      <div className="flex items-center justify-around px-4 py-2">
        {navigationItems.map((item) => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg p-2 min-w-[48px] min-h-[48px] transition-all duration-200",
                "hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          );
        })}
        
        {/* Theme Toggle in Navigation */}
        <div className="flex flex-col items-center justify-center p-2">
          <MobileThemeToggle className="w-10 h-10 p-2" />
          <span className="text-xs font-medium text-muted-foreground mt-1">Theme</span>
        </div>
      </div>
    </nav>
  );
}
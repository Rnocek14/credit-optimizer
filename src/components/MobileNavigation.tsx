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
      "pb-safe-bottom transition-colors duration-200 shadow-lg",
      className
    )}
    style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
    >
      <div className="flex items-center justify-around px-2 py-3">
        {navigationItems.map((item) => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl p-3 min-w-[56px] min-h-[56px] transition-all duration-200",
                "hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "active:scale-95 transform",
                isActive 
                  ? "text-primary bg-primary/15 shadow-soft" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-6 w-6 mb-1" />
              <span className="text-ui-small font-medium leading-tight">{item.label}</span>
            </NavLink>
          );
        })}
        
        {/* Theme Toggle in Navigation */}
        <div className="flex flex-col items-center justify-center p-3 min-w-[56px] min-h-[56px] rounded-xl hover:bg-muted/50 transition-all duration-200">
          <MobileThemeToggle className="w-6 h-6" />
          <span className="text-ui-small font-medium text-muted-foreground mt-1 leading-tight">Theme</span>
        </div>
      </div>
    </nav>
  );
}
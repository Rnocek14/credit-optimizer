import { Compass, GraduationCap, Store } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface MobileNavigationProps {
  className?: string;
}

export function MobileNavigation({ className }: MobileNavigationProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const navigationItems = [
    { icon: GraduationCap, label: "My Plan", path: "/plan" },
    { icon: Store, label: "Marketplace", path: "/edu-tree-v5/marketplace" },
    { icon: Compass, label: "Careers", path: "/explore/careers" },
  ];

  const isActive = (item: typeof navigationItems[0]) => {
    if (item.label === "My Plan") return currentPath.startsWith("/plan") || currentPath.startsWith("/edu-tree-v6");
    if (item.label === "Marketplace") return currentPath.startsWith("/edu-tree-v5");
    if (item.label === "Careers") return currentPath.startsWith("/explore");
    return currentPath === item.path;
  };

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      "pb-safe-bottom transition-colors duration-200",
      className
    )}
    style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
    >
      <div className="flex items-center justify-around px-2 py-3">
        {navigationItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;

          return (
            <NavLink
              key={item.label}
              to={item.path}
              className={cn(
              "flex flex-col items-center justify-center rounded-xl p-3 min-w-[56px] min-h-[56px] transition-all duration-200",
                "hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                "active:scale-95 transform",
                active
                  ? "text-primary bg-primary/15"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-6 w-6 mb-1" />
              <span className="text-ui-small font-medium leading-tight">{item.label}</span>
            </NavLink>
          );
        })}

      </div>
    </nav>
  );
}

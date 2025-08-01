import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Menu, X, Target, LogOut, User, Home, Award, BookOpen, 
  GraduationCap, Compass, TreePine, DollarSign, BarChart, 
  TrendingUp, Workflow, Brain, BarChart3, Bookmark, History,
  Settings, ChevronDown, HelpCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWorkflowCertificates } from "@/hooks/useWorkflowCertificates";
import { useUserExperienceLevel, ExperienceLevel } from "@/hooks/useUserExperienceLevel";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  experienceLevel: ExperienceLevel[];
  category: 'core' | 'learning' | 'analytics' | 'ai' | 'admin';
}

const allNavItems: NavItem[] = [
  // Core features - available to all levels
  { href: "/", label: "Home", icon: Home, experienceLevel: ['beginner', 'intermediate', 'advanced'], category: 'core' },
  { href: "/explore", label: "Explore", icon: Compass, experienceLevel: ['beginner', 'intermediate', 'advanced'], category: 'core' },
  { href: "/goals", label: "Goals", icon: Target, experienceLevel: ['beginner', 'intermediate', 'advanced'], category: 'core' },
  { href: "/planner", label: "Planner", icon: Target, experienceLevel: ['beginner', 'intermediate', 'advanced'], category: 'core' },
  
  // Learning features - intermediate and above
  { href: "/explore-courses", label: "Courses", icon: BookOpen, experienceLevel: ['intermediate', 'advanced'], category: 'learning' },
  { href: "/saved-courses", label: "Saved", icon: Bookmark, experienceLevel: ['intermediate', 'advanced'], category: 'learning' },
  { href: "/learning-history", label: "Learning", icon: History, experienceLevel: ['intermediate', 'advanced'], category: 'learning' },
  { href: "/skill-tree", label: "Skill Tree", icon: TreePine, experienceLevel: ['intermediate', 'advanced'], category: 'learning' },
  { href: "/workflows", label: "Workflows", icon: Workflow, experienceLevel: ['intermediate', 'advanced'], category: 'learning' },
  
  // Analytics features - advanced only
  { href: "/cri-dashboard", label: "Career Readiness", icon: BarChart3, experienceLevel: ['advanced'], category: 'analytics' },
  { href: "/salary-insights", label: "Salary Insights", icon: DollarSign, experienceLevel: ['advanced'], category: 'analytics' },
  { href: "/market-intelligence", label: "Market Intelligence", icon: TrendingUp, experienceLevel: ['advanced'], category: 'analytics' },
  { href: "/resume-analytics", label: "Resume Analytics", icon: BarChart, experienceLevel: ['advanced'], category: 'analytics' },
  
  // AI features - intermediate and above
  { href: "/maya-roadmap", label: "Maya Roadmap", icon: Brain, experienceLevel: ['intermediate', 'advanced'], category: 'ai' },
  { href: "/maya-cri-integration", label: "Maya × CRI", icon: Brain, experienceLevel: ['advanced'], category: 'ai' },
  { href: "/maya-automation", label: "Maya Automation", icon: Brain, experienceLevel: ['advanced'], category: 'ai' },
  
  // Achievement features
  { href: "/certificates", label: "Certificates", icon: Award, experienceLevel: ['intermediate', 'advanced'], category: 'learning' },
  { href: "/badges", label: "Badges", icon: Award, experienceLevel: ['intermediate', 'advanced'], category: 'learning' },
  
  // Admin/advanced features
  { href: "/resume-gallery", label: "Talent Gallery", icon: User, experienceLevel: ['advanced'], category: 'admin' },
  { href: "/teach", label: "Teach", icon: GraduationCap, experienceLevel: ['advanced'], category: 'admin' },
];

export default function RoleBasedNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { toast } = useToast();
  const { hasPermission } = useSecureAuth();
  const { getTotalCertificates, fetchUserCertificates } = useWorkflowCertificates();
  const { experienceLevel, updateExperienceLevel, isLoading } = useUserExperienceLevel();
  const [certificateCount, setCertificateCount] = useState(0);

  useEffect(() => {
    const loadCertificateCount = async () => {
      await fetchUserCertificates();
      setCertificateCount(getTotalCertificates());
    };
    loadCertificateCount();
  }, [fetchUserCertificates, getTotalCertificates]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out successfully",
        description: "Come back soon!",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Filter navigation items based on experience level
  const getFilteredNavItems = () => {
    return allNavItems.filter(item => 
      item.experienceLevel.includes(experienceLevel)
    );
  };

  const groupedNavItems = () => {
    const filtered = getFilteredNavItems();
    return {
      core: filtered.filter(item => item.category === 'core'),
      learning: filtered.filter(item => item.category === 'learning'),
      analytics: filtered.filter(item => item.category === 'analytics'),
      ai: filtered.filter(item => item.category === 'ai'),
      admin: filtered.filter(item => item.category === 'admin')
    };
  };

  const isActive = (path: string) => location.pathname === path;

  const experienceLevelConfig = {
    beginner: { label: "Beginner", color: "bg-green-500" },
    intermediate: { label: "Intermediate", color: "bg-blue-500" },
    advanced: { label: "Advanced", color: "bg-purple-500" }
  };

  if (isLoading) {
    return (
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </div>
      </nav>
    );
  }

  const navGroups = groupedNavItems();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              PathfindAI
            </span>
          </Link>

          {/* Experience Level Switcher */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Experience:</span>
              <Tabs value={experienceLevel} onValueChange={(value) => updateExperienceLevel(value as ExperienceLevel)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="beginner" className="text-xs">Beginner</TabsTrigger>
                  <TabsTrigger value="intermediate" className="text-xs">Intermediate</TabsTrigger>
                  <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Core Navigation */}
            <div className="flex items-center space-x-1">
              {navGroups.core.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive(item.href) ? "default" : "ghost"}
                  size="sm"
                  className="transition-all duration-200"
                >
                  <Link to={item.href} className="flex items-center space-x-2">
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </Button>
              ))}
            </div>

            {/* Advanced Features Dropdown */}
            {(navGroups.learning.length > 0 || navGroups.analytics.length > 0 || navGroups.ai.length > 0) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                    <span>More</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background border shadow-lg">
                  {navGroups.learning.length > 0 && (
                    <>
                      <DropdownMenuLabel>Learning</DropdownMenuLabel>
                      {navGroups.learning.map((item) => (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link to={item.href} className="flex items-center space-x-2 w-full">
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                            {item.href === "/certificates" && certificateCount > 0 && (
                              <Badge variant="secondary" className="ml-auto px-1.5 py-0.5 text-xs">
                                {certificateCount}
                              </Badge>
                            )}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  {navGroups.ai.length > 0 && (
                    <>
                      <DropdownMenuLabel>AI Features</DropdownMenuLabel>
                      {navGroups.ai.map((item) => (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link to={item.href} className="flex items-center space-x-2 w-full">
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  {navGroups.analytics.length > 0 && (
                    <>
                      <DropdownMenuLabel>Analytics</DropdownMenuLabel>
                      {navGroups.analytics.map((item) => (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link to={item.href} className="flex items-center space-x-2 w-full">
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Admin Features - Only for admin users */}
            {hasPermission('admin') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background border shadow-lg">
                  <DropdownMenuLabel>Admin</DropdownMenuLabel>
                  {navGroups.admin.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link to={item.href} className="flex items-center space-x-2 w-full">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center space-x-2 w-full">
                      <Target className="h-4 w-4" />
                      <span>Full Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <div className="ml-4 pl-4 border-l">
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-2">
              {/* Experience Level Switcher - Mobile */}
              <div className="px-2 mb-4">
                <Tabs value={experienceLevel} onValueChange={(value) => updateExperienceLevel(value as ExperienceLevel)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="beginner" className="text-xs">Beginner</TabsTrigger>
                    <TabsTrigger value="intermediate" className="text-xs">Intermediate</TabsTrigger>
                    <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Core Features */}
              {navGroups.core.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive(item.href) ? "default" : "ghost"}
                  className="justify-start transition-all duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Link to={item.href} className="flex items-center space-x-2">
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </Button>
              ))}

              {/* Learning Features */}
              {navGroups.learning.length > 0 && (
                <>
                  <div className="px-2 py-1 text-sm font-medium text-muted-foreground">Learning</div>
                  {navGroups.learning.map((item) => (
                    <Button
                      key={item.href}
                      asChild
                      variant={isActive(item.href) ? "default" : "ghost"}
                      className="justify-start transition-all duration-200"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Link to={item.href} className="flex items-center space-x-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {item.href === "/certificates" && certificateCount > 0 && (
                          <Badge variant="secondary" className="ml-auto px-1.5 py-0.5 text-xs">
                            {certificateCount}
                          </Badge>
                        )}
                      </Link>
                    </Button>
                  ))}
                </>
              )}

              {/* AI Features */}
              {navGroups.ai.length > 0 && (
                <>
                  <div className="px-2 py-1 text-sm font-medium text-muted-foreground">AI Features</div>
                  {navGroups.ai.map((item) => (
                    <Button
                      key={item.href}
                      asChild
                      variant={isActive(item.href) ? "default" : "ghost"}
                      className="justify-start transition-all duration-200"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Link to={item.href} className="flex items-center space-x-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </Button>
                  ))}
                </>
              )}

              {/* Analytics Features */}
              {navGroups.analytics.length > 0 && (
                <>
                  <div className="px-2 py-1 text-sm font-medium text-muted-foreground">Analytics</div>
                  {navGroups.analytics.map((item) => (
                    <Button
                      key={item.href}
                      asChild
                      variant={isActive(item.href) ? "default" : "ghost"}
                      className="justify-start transition-all duration-200"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Link to={item.href} className="flex items-center space-x-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </Button>
                  ))}
                </>
              )}
              
              <div className="pt-2 border-t">
                <Button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="justify-start text-destructive hover:text-destructive w-full transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
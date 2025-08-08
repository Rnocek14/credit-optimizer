import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Database, Users, Shield } from "lucide-react";
import { isProduction } from "@/lib/security";

export function AdminDevToolsPanel() {
  const [isSeeding, setIsSeeding] = useState(false);
  const { hasPermission } = useSecureAuth();
  const { toast } = useToast();

  // SECURITY: Only show to admin users
  if (!hasPermission("admin")) {
    return null;
  }

  // SECURITY: Show warning in production
  if (isProduction()) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Production Environment</CardTitle>
          </div>
          <CardDescription>
            Development tools are disabled in production for security.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            These tools are only available in development environments to prevent 
            accidental data manipulation in production.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleDemoSeeding = async () => {
    setIsSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('demo-course-seeder');
      
      if (error) throw error;
      
      toast({
        title: "Demo seeding completed",
        description: `Processed ${data.coursesProcessed || 0} courses`,
      });
    } catch (error: any) {
      console.error('Demo seeding error:', error);
      toast({
        title: "Seeding failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSocialSeeding = async () => {
    setIsSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-learning-seeder');
      
      if (error) throw error;
      
      toast({
        title: "Social learning seeding completed",
        description: "Demo study groups and challenges created",
      });
    } catch (error: any) {
      console.error('Social seeding error:', error);
      toast({
        title: "Seeding failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card className="border-orange-200 dark:border-orange-800">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-orange-600 dark:text-orange-400">Admin Development Tools</CardTitle>
        </div>
        <CardDescription>
          Development utilities for seeding demo data and testing features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={handleDemoSeeding}
            disabled={isSeeding}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Database className="h-4 w-4" />
            <span>{isSeeding ? "Seeding..." : "Seed Demo Courses"}</span>
          </Button>
          
          <Button
            onClick={handleSocialSeeding}
            disabled={isSeeding}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Users className="h-4 w-4" />
            <span>{isSeeding ? "Seeding..." : "Seed Social Learning"}</span>
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground bg-muted rounded p-3">
          <p><strong>⚠️ Development Only:</strong> These tools populate the database with demo data.</p>
          <p><strong>Security:</strong> Requires admin role and JWT authentication.</p>
          <p><strong>Production:</strong> Automatically disabled in production environments.</p>
        </div>
      </CardContent>
    </Card>
  );
}
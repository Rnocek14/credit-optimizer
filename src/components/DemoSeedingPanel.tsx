import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, Brain, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const DemoSeedingPanel = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedingStatus, setSeedingStatus] = useState<string>("");
  const { toast } = useToast();

  const handleDemoSeeding = async () => {
    setIsSeeding(true);
    setSeedingStatus("Initializing demo seeding...");

    try {
      const { data, error } = await supabase.functions.invoke('demo-course-seeder', {
        body: {}
      });

      if (error) {
        throw error;
      }

      setSeedingStatus("Demo seeding completed successfully!");
      toast({
        title: "Demo Seeding Complete",
        description: `${data.coursesProcessed} courses processed and analyzed by Maya AI`,
      });

    } catch (error) {
      console.error('Demo seeding error:', error);
      setSeedingStatus("Error during demo seeding");
      toast({
        title: "Seeding Error",
        description: "Failed to seed demo courses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Demo Course Seeding
        </CardTitle>
        <CardDescription>
          Populate the Intelligent Learning Curation system with real Coursera courses processed by Maya AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm">AI Analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm">Mentor Curation</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm">Market Alignment</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <span className="text-sm">Learning Paths</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            This will seed the system with:
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">20-30 Coursera Courses</Badge>
            <Badge variant="secondary">AI CRI Analysis</Badge>
            <Badge variant="secondary">3 Learning Paths</Badge>
            <Badge variant="secondary">Sample Mentor Reviews</Badge>
          </div>
        </div>

        {seedingStatus && (
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm">{seedingStatus}</p>
          </div>
        )}

        <Button 
          onClick={handleDemoSeeding} 
          disabled={isSeeding}
          className="w-full"
        >
          {isSeeding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Seeding Demo Courses...
            </>
          ) : (
            "Start Demo Seeding"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
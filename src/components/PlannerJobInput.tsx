import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Target, Loader2, Sparkles } from "lucide-react";
import { useAnalytics } from "@/lib/analytics";

interface PlannerJobInputProps {
  onGeneratePlan: (targetJob: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  suggestions?: string[];
}

const popularJobs = [
  "Digital Marketing Manager",
  "UX Designer",
  "Frontend Engineer", 
  "Data Scientist",
  "Product Manager",
  "DevOps Engineer",
  "Full Stack Developer",
  "AI Engineer",
  "Marketing Manager",
  "Software Engineer",
  "Business Analyst",
  "Growth Marketing Manager",
  "Content Marketing Manager",
  "Backend Developer",
  "Mobile Developer"
];

export function PlannerJobInput({ onGeneratePlan, loading, error, suggestions = [] }: PlannerJobInputProps) {
  const [targetJob, setTargetJob] = useState("");
  const { trackPlannerGeneratePlan } = useAnalytics();

  const handleGeneratePlan = async () => {
    if (!targetJob.trim()) return;
    await onGeneratePlan(targetJob.trim());
  };

  const handleSuggestionClick = (job: string) => {
    setTargetJob(job);
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Target Job Goal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="space-y-3">
          <Input
            placeholder="Enter your dream job title..."
            value={targetJob}
            onChange={(e) => setTargetJob(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleGeneratePlan()}
            disabled={loading}
            className="text-lg h-12"
          />
          
          <Button 
            onClick={handleGeneratePlan} 
            disabled={loading || !targetJob.trim()}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Learning Plan
          </Button>
        </div>

        {/* Error Display with Suggestions */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive font-medium">
              {suggestions.length > 0 ? '🔍 ' : '⚠️ '}
              {error}
            </p>
            {suggestions.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Did you mean one of these?</p>
                <div className="flex flex-wrap gap-1">
                  {suggestions.map((job) => (
                    <Badge
                      key={job}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 text-xs transition-colors"
                      onClick={() => {
                        handleSuggestionClick(job);
                        onGeneratePlan(job);
                      }}
                    >
                      {job}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Popular Suggestions */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">
            Popular career targets:
          </div>
          <div className="flex flex-wrap gap-2">
            {popularJobs.map((job) => (
              <Badge
                key={job}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors"
                onClick={() => handleSuggestionClick(job)}
              >
                {job}
              </Badge>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-md">
          💡 <strong>Pro tip:</strong> Be specific with your job title for better results. 
          For example, "UX Designer" instead of just "Designer".
        </div>
      </CardContent>
    </Card>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTutorial } from "@/tutorial/TutorialProvider";
import { Info, HelpCircle, BookOpen, Target, Settings } from "lucide-react";
import TutorialTip from "@/tutorial/TutorialTip";
import { TIPS } from "@/tutorial/tutorial-map";

export function TutorialDashboard() {
  const { enabled, setEnabled } = useTutorial();

  const featureGroups = [
    {
      title: "Navigation & Overview",
      features: [
        { id: "discoverHub", icon: Target, title: "Discover Hub" },
        { id: "planHub", icon: BookOpen, title: "Plan Hub" },
        { id: "progressHub", icon: Settings, title: "Progress Hub" },
        { id: "contributeMenu", icon: Settings, title: "Contribute Menu" },
        { id: "trackManager", icon: Settings, title: "Track Manager" },
      ]
    },
    {
      title: "Dashboard & Analytics", 
      features: [
        { id: "adaptiveDashboard", icon: Target, title: "Adaptive Dashboard" },
        { id: "phaseProgress", icon: Target, title: "Phase Progress" },
        { id: "mayaInsights", icon: HelpCircle, title: "Maya Insights" },
        { id: "criGauge", icon: Target, title: "CRI Gauge" },
        { id: "skillBars", icon: Target, title: "Skill Bars" },
      ]
    },
    {
      title: "Learning & Planning",
      features: [
        { id: "exploreRecommendations", icon: BookOpen, title: "Course Recommendations" },
        { id: "recoSave", icon: BookOpen, title: "Save Courses" },
        { id: "plansSavedCourses", icon: BookOpen, title: "Saved Courses List" },
        { id: "planProjectedCRI", icon: Target, title: "Projected CRI" },
        { id: "careerGoals", icon: Target, title: "Career Goals" },
      ]
    },
    {
      title: "Progress & Achievements",
      features: [
        { id: "transcriptExport", icon: Settings, title: "Transcript Export" },
        { id: "transcriptResume", icon: Settings, title: "Transcript Resume" },
        { id: "badgeSystem", icon: Target, title: "Badge System" },
        { id: "projectPortfolio", icon: BookOpen, title: "Project Portfolio" },
        { id: "certificateViewer", icon: Settings, title: "Certificate Viewer" },
      ]
    },
    {
      title: "AI & Advanced Features",
      features: [
        { id: "mayaChat", icon: HelpCircle, title: "Maya Chat" },
        { id: "aiAnalyzer", icon: HelpCircle, title: "AI Analyzer" },
        { id: "semanticMatching", icon: Target, title: "Semantic Matching" },
        { id: "smartSuggestions", icon: HelpCircle, title: "Smart Suggestions" },
        { id: "multiTrack", icon: Settings, title: "Multi-Track" },
      ]
    }
  ];

  const totalTips = Object.keys(TIPS).length;
  const enabledCount = enabled ? totalTips : 0;

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
              <Info className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Tutorial Mode Dashboard
                <Badge variant={enabled ? "default" : "secondary"}>
                  {enabled ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Interactive help tips across all features ({enabledCount}/{totalTips} tips available)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="tutorial-master-toggle"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <Label htmlFor="tutorial-master-toggle" className="text-sm font-medium">
              Enable Tutorial Mode
            </Label>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {enabled && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Tutorial Mode Active</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Look for <Info className="h-3 w-3 inline text-primary" /> icons throughout the app. 
              Hover over them to see helpful tips and explanations for each feature.
            </p>
          </div>
        )}

        <div className="grid gap-6">
          {featureGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {group.title}
                <Badge variant="outline" className="text-xs">
                  {group.features.length} features
                </Badge>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.features.map((feature) => {
                  const Icon = feature.icon;
                  const tipContent = TIPS[feature.id as keyof typeof TIPS];
                  
                  return (
                    <Card 
                      key={feature.id} 
                      className={`p-4 ${!tipContent ? 'opacity-50 border-dashed' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium truncate">{feature.title}</h4>
                            {enabled && tipContent && (
                              <TutorialTip 
                                id={feature.id} 
                                label={tipContent} 
                              />
                            )}
                          </div>
                          {tipContent ? (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {tipContent.substring(0, 60)}...
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              Tip not available
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Need Help?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Tutorial tips provide context-sensitive help for every feature
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setEnabled(!enabled)}
              className="gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              {enabled ? 'Disable' : 'Enable'} Tutorial Mode
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
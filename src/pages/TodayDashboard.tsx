import { HubNavigation } from "@/components/HubNavigation";
import { TodayDashboard } from "@/components/TodayDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Route, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export default function TodayDashboardPage() {
  return (
    <>
      <Helmet>
        <title>Today Dashboard – Personalized Focus | PathfindAI</title>
        <meta name="description" content="View your personalized daily recommendations, quick wins, and learning streak on the Today dashboard." />
        <link rel="canonical" href={`${window.location.origin}/today`} />
      </Helmet>
      <HubNavigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Today's Focus</h1>
          <p className="text-muted-foreground">
            Your personalized daily recommendations and progress
          </p>
        </div>
        
        {/* New Career Planning Tools */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Career Planning Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button variant="ghost" className="justify-start border-0" asChild>
                <Link to="/education-tree">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Education Tree (New!)
                </Link>
              </Button>
              <Button variant="ghost" className="justify-start border-0" asChild>
                <Link to="/skilltree3">
                  <Route className="mr-2 h-4 w-4" />
                  Life Path Graph
                </Link>
              </Button>
              <Button variant="ghost" className="justify-start border-0" asChild>
                <Link to="/edu-tree-v3-vertical">
                  <Workflow className="mr-2 h-4 w-4" />
                  EduTree V3 Vertical (Test)
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <TodayDashboard />
      </div>
    </>
  );
}
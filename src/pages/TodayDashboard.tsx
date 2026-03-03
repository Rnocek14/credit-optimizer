import { TodayDashboard } from "@/components/TodayDashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export default function TodayDashboardPage() {
  return (
    <>
      <Helmet>
        <title>Today – Your Daily Focus | Pivot</title>
        <meta name="description" content="View your personalized daily recommendations, quick wins, and learning streak on the Today dashboard." />
        <link rel="canonical" href={`${window.location.origin}/today`} />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Today's Focus</h1>
          <p className="text-muted-foreground">
            Your personalized daily recommendations and progress
          </p>
        </div>

        {/* Degree Plan CTA */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium text-foreground">Start your degree plan</p>
                <p className="text-sm text-muted-foreground">Browse optimized templates and build your path</p>
              </div>
            </div>
            <Button asChild size="sm">
              <Link to="/edu-tree-v5/marketplace">
                Browse Plans
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <TodayDashboard />
      </div>
    </>
  );
}

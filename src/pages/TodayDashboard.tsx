import { HubNavigation } from "@/components/HubNavigation";
import { TodayDashboard } from "@/components/TodayDashboard";
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
        
        <TodayDashboard />
      </div>
    </>
  );
}
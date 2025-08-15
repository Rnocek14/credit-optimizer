import { HubNavigation } from "@/components/HubNavigation";
import { TodayDashboard } from "@/components/TodayDashboard";

export default function TodayDashboardPage() {
  return (
    <>
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
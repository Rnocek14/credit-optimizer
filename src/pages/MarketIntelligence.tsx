import { HubNavigation } from "@/components/HubNavigation";
import { MarketIntelligenceDashboard } from "@/components/MarketIntelligenceDashboardMigrated";
import { useTutorialDeeplink } from "@/tutorial/useTutorialDeeplink";

export default function MarketIntelligence() {
  useTutorialDeeplink();
  
  return (
    <>
      <HubNavigation />
      <MarketIntelligenceDashboard />
    </>
  );
}
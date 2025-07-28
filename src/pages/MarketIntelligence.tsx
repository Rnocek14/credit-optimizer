import Navigation from "@/components/Navigation";
import { MarketIntelligenceDashboard } from "@/components/MarketIntelligenceDashboardMigrated";
import { UnifiedDataProvider } from "@/contexts/UnifiedDataContext";

export default function MarketIntelligence() {
  return (
    <UnifiedDataProvider>
      <Navigation />
      <MarketIntelligenceDashboard />
    </UnifiedDataProvider>
  );
}
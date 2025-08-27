import { HubNavigation } from "@/components/HubNavigation";
import { EnhancedWorkflowDashboard } from "@/components/EnhancedWorkflowDashboard";
import { ManualStepTest } from "@/components/ManualStepTest";
import { MayaIntelligenceDashboard } from "@/components/MayaIntelligenceDashboard";
import { useTutorialDeeplink } from "@/tutorial/useTutorialDeeplink";

export default function Workflows() {
  useTutorialDeeplink();
  
  return (
    <>
      <HubNavigation />
      <div className="container mx-auto py-6 space-y-6">
        <section id="maya-why">
          <MayaIntelligenceDashboard />
        </section>
        <section id="maya-confidence">
          <ManualStepTest />
        </section>
        <section id="maya-alt-paths">
          <EnhancedWorkflowDashboard />
        </section>
      </div>
    </>
  );
}
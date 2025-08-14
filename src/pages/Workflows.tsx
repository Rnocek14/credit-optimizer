import { HubNavigation } from "@/components/HubNavigation";
import { EnhancedWorkflowDashboard } from "@/components/EnhancedWorkflowDashboard";
import { ManualStepTest } from "@/components/ManualStepTest";
import { MayaIntelligenceDashboard } from "@/components/MayaIntelligenceDashboard";

export default function Workflows() {
  return (
    <>
      <HubNavigation />
      <div className="container mx-auto py-6 space-y-6">
        <MayaIntelligenceDashboard />
        <ManualStepTest />
        <EnhancedWorkflowDashboard />
      </div>
    </>
  );
}
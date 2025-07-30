import Navigation from "@/components/Navigation";
import { EnhancedWorkflowDashboard } from "@/components/EnhancedWorkflowDashboard";
import { ManualStepTest } from "@/components/ManualStepTest";

export default function Workflows() {
  return (
    <>
      <Navigation />
      <div className="container mx-auto py-6 space-y-6">
        <ManualStepTest />
        <EnhancedWorkflowDashboard />
      </div>
    </>
  );
}
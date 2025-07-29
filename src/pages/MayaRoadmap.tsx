
import { MayaRoadmapGenerator } from '@/components/MayaRoadmapGenerator';
import { MayaPhase5Test } from '@/components/MayaPhase5Test';
import { EnhancedWorkflowDashboard } from '@/components/EnhancedWorkflowDashboard';
import Navigation from '@/components/Navigation';

const MayaRoadmap = () => {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 space-y-8">
          <MayaPhase5Test />
          <EnhancedWorkflowDashboard />
          <MayaRoadmapGenerator />
        </div>
      </div>
    </>
  );
};

export default MayaRoadmap;

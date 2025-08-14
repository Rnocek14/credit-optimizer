
import { MayaEnhancedDashboard } from '@/components/MayaEnhancedDashboard';
import { HubNavigation } from '@/components/HubNavigation';

const MayaRoadmap = () => {
  return (
    <>
      <HubNavigation />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <MayaEnhancedDashboard />
        </div>
      </div>
    </>
  );
};

export default MayaRoadmap;

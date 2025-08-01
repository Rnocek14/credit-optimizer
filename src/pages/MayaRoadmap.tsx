
import { MayaEnhancedDashboard } from '@/components/MayaEnhancedDashboard';
import Navigation from '@/components/Navigation';

const MayaRoadmap = () => {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <MayaEnhancedDashboard />
        </div>
      </div>
    </>
  );
};

export default MayaRoadmap;

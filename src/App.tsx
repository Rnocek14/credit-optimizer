import React, { useEffect } from 'react';
import './utils/triggerCourseSeeding';
import { BrowserRouter } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { AppRoutes } from '@/app/routes';
import { XPCelebrationOverlay } from '@/components/XPCelebrationOverlay';
import { DevMenu } from './components/dev/DevMenu';
import { MobileNavigation } from './components/MobileNavigation';
import { useCircuitBreakerClient } from './hooks/useCircuitBreakerClient';
import { initializeCircuitBreaker } from './lib/edgeFunctionClient';

const App = () => {
  const circuitBreaker = useCircuitBreakerClient();

  useEffect(() => {
    initializeCircuitBreaker(circuitBreaker);
  }, [circuitBreaker]);

  return (
    <AppProviders>
      <BrowserRouter>
        <div className="pb-20 md:pb-0">
          <AppRoutes />
        </div>
        <MobileNavigation className="block md:hidden" />
        <XPCelebrationOverlay />
        {process.env.NODE_ENV !== 'production' && <DevMenu />}
      </BrowserRouter>
    </AppProviders>
  );
};

export default App;

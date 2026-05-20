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
import { useAuth } from '@/contexts/AuthContext';

/**
 * AuthedMobileNav — only mounts the bottom tab bar for signed-in users.
 * Logged-out visitors on the public funnel (/, /get-started, /compare,
 * /plan/preview, /guides) should not see hub-only navigation.
 */
const AuthedMobileNav = () => {
  const { user } = useAuth();
  if (!user) return null;
  return <MobileNavigation className="block md:hidden" />;
};

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
        <AuthedMobileNav />
        <XPCelebrationOverlay />
        {process.env.NODE_ENV !== 'production' && <DevMenu />}
      </BrowserRouter>
    </AppProviders>
  );
};

export default App;

import { BrowserRouter } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { AppRoutes } from '@/app/routes';
import { MobileNavigation } from './components/MobileNavigation';
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
  return (
    <AppProviders>
      <BrowserRouter>
        <div className="pb-20 md:pb-0">
          <AppRoutes />
        </div>
        <AuthedMobileNav />
      </BrowserRouter>
    </AppProviders>
  );
};

export default App;

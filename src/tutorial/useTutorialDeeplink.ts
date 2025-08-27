import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTutorial } from '@/tutorial/TutorialProvider';
import { trackTelemetryEvent } from '@/utils/telemetry';

export function useTutorialDeeplink() {
  const { search } = useLocation();
  const { enabled, setEnabled } = useTutorial();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const tutorialParam = params.get('tutorial');
    const tipParam = params.get('tip');
    
    if (tutorialParam === 'on' && tipParam) {
      // Delay to ensure DOM is ready and components are rendered
      setTimeout(() => {
        // Enable tutorial mode if not already enabled
        if (!enabled) {
          setEnabled(true);
        }
        
        // Attempt to open the specific tip
        requestAnimationFrame(() => {
          const tipElement = document.querySelector(`[data-tutorial-tip="${tipParam}"]`);
          const success = !!tipElement;
          
          if (tipElement) {
            // Focus the tip element to trigger tooltip display
            (tipElement as HTMLElement).focus();
            
            // For buttons or interactive elements, trigger hover
            const event = new MouseEvent('mouseenter', { bubbles: true });
            tipElement.dispatchEvent(event);
          }
          
          // Track the deep-link attempt
          trackTelemetryEvent({
            task: 'tutorial_deeplink_open',
            complexity: { 
              tip_id: tipParam, 
              route: window.location.pathname, 
              success,
              reason: success ? 'opened' : 'tip_not_found'
            },
          });
        });
        
        // Clean up URL parameters
        const cleanedUrl = new URL(window.location.href);
        cleanedUrl.searchParams.delete('tutorial');
        cleanedUrl.searchParams.delete('tip');
        window.history.replaceState({}, '', cleanedUrl.toString());
      }, 150);
    }
  }, [search, enabled, setEnabled]);
}
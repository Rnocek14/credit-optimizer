import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export type PanelScope = 'degree' | 'year' | 'module' | null;

interface PanelState {
  scope: PanelScope;
  nodeId?: string;
  nodeData?: any;
  tab?: string;
}

export function useScopedPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [panelState, setPanelState] = useState<PanelState>({
    scope: null
  });

  // Sync with URL params on mount and location changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const scope = params.get('scope') as PanelScope;
    const nodeId = params.get('node') || undefined;
    const tab = params.get('tab') || undefined;
    
    setPanelState(prev => {
      // Guard: only update if values actually changed
      if (prev.scope === scope && prev.nodeId === nodeId && prev.tab === tab) {
        return prev;
      }
      return scope ? { scope, nodeId, tab } : { scope: null };
    });
  }, [location.search]);

  const openPanel = useCallback((scope: PanelScope, nodeId?: string, nodeData?: any, tab?: string) => {
    setPanelState(prev => {
      const isSameScope = prev.scope === scope && prev.nodeId === nodeId;
      const isTabChange = isSameScope && prev.tab !== tab;
      
      const params = new URLSearchParams(location.search);
      if (scope) {
        params.set('scope', scope);
        if (nodeId) params.set('node', nodeId);
        if (tab) params.set('tab', tab);
      } else {
        params.delete('scope');
        params.delete('node');
        params.delete('tab');
      }
      
      navigate(`${location.pathname}?${params.toString()}`, { 
        replace: isTabChange // Only replace for tab changes within same scope
      });
      
      return { scope, nodeId, nodeData, tab };
    });
  }, [navigate, location]);

  const closePanel = useCallback(() => {
    openPanel(null);
  }, [openPanel]);

  const setTab = useCallback((tab: string) => {
    if (panelState.scope) {
      openPanel(panelState.scope, panelState.nodeId, panelState.nodeData, tab);
    }
  }, [panelState, openPanel]);

  return {
    panelState,
    openPanel,
    closePanel,
    setTab,
    isOpen: panelState.scope !== null
  };
}

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
    
    if (scope) {
      setPanelState({ scope, nodeId, tab });
    } else {
      setPanelState({ scope: null });
    }
  }, [location.search]);

  const openPanel = useCallback((scope: PanelScope, nodeId?: string, nodeData?: any, tab?: string) => {
    setPanelState({ scope, nodeId, nodeData, tab });
    
    // Update URL
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
    
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
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

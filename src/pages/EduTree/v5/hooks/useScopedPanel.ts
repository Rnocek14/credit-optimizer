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
        console.log('[useScopedPanel] URL sync - no change, keeping state');
        return prev;
      }
      
      console.log('[useScopedPanel] URL sync triggered:', {
        from: { scope: prev.scope, nodeId: prev.nodeId, tab: prev.tab },
        to: { scope, nodeId, tab },
        willClearNodeData: scope !== prev.scope || nodeId !== prev.nodeId
      });
      
      // CRITICAL: Set nodeData to undefined when loading from URL
      // This triggers hydration logic in EduTreeV5Page
      return scope ? { scope, nodeId, tab, nodeData: undefined } : { scope: null };
    });
  }, [location.search]);

  const openPanel = useCallback((scope: PanelScope, nodeId?: string, nodeData?: any, tab?: string) => {
    console.log('[useScopedPanel] openPanel called:', {
      scope, 
      nodeId, 
      hasNodeData: !!nodeData,
      tab,
      isSameAsCurrentScope: panelState.scope === scope && panelState.nodeId === nodeId,
      currentLocation: location.search
    });
    
    setPanelState(prev => {
      // ✅ PHASE 2: Detect re-opening same scope and force refresh to restore drawer
      const isSameScope = prev.scope === scope && prev.nodeId === nodeId;
      const isTabChange = isSameScope && prev.tab !== tab;
      
      if (isSameScope && scope && !isTabChange) {
        console.log('[useScopedPanel] 🔄 Re-opening same scope, signaling drawer to expand');
        // Signal drawer to expand to default size
        const params = new URLSearchParams(location.search);
        params.set('scope', scope);
        if (nodeId) params.set('node', nodeId);
        if (tab) params.set('tab', tab);
        params.set('expand', 'true'); // Signal to expand drawer
        
        navigate(`${location.pathname}?${params.toString()}`, { replace: true });
        
        // Return updated state
        return { scope, nodeId, nodeData, tab };
      }
      
      
      const params = new URLSearchParams(location.search);
      if (scope) {
        params.set('scope', scope);
        
        // ✅ FIX: Always set OR delete node parameter
        if (nodeId) {
          params.set('node', nodeId);
        } else {
          params.delete('node'); // Clean up stale nodeId
        }
        
        // ✅ FIX: Always set OR delete tab parameter
        if (tab) {
          params.set('tab', tab);
        } else {
          params.delete('tab'); // Clean up stale tab
        }
      } else {
        params.delete('scope');
        params.delete('node');
        params.delete('tab');
      }
      
      // Log param changes
      const deletedParams = [];
      if (!nodeId && prev.nodeId) deletedParams.push('node');
      if (!tab && prev.tab) deletedParams.push('tab');
      
      console.log('[useScopedPanel] State update:', {
        from: prev,
        to: { scope, nodeId, hasNodeData: !!nodeData, tab },
        deletedParams,
        newURL: `${location.pathname}?${params.toString()}`
      });
      
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

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface DisclosureState {
  expandedNodes: Set<string>;
  collapsedBranches: Set<string>;
  focusedPath: string | null;
  zoomLevel: number;
  viewMode: 'overview' | 'detailed' | 'focused';
}

type DisclosureAction =
  | { type: 'EXPAND_NODE'; nodeId: string }
  | { type: 'COLLAPSE_NODE'; nodeId: string }
  | { type: 'TOGGLE_NODE'; nodeId: string }
  | { type: 'COLLAPSE_BRANCH'; branchId: string }
  | { type: 'EXPAND_BRANCH'; branchId: string }
  | { type: 'FOCUS_PATH'; pathId: string }
  | { type: 'CLEAR_FOCUS' }
  | { type: 'SET_VIEW_MODE'; mode: 'overview' | 'detailed' | 'focused' }
  | { type: 'SET_ZOOM_LEVEL'; level: number };

const initialState: DisclosureState = {
  expandedNodes: new Set(['job-root']), // Start with root expanded
  collapsedBranches: new Set(),
  focusedPath: null,
  zoomLevel: 1,
  viewMode: 'overview'
};

function disclosureReducer(state: DisclosureState, action: DisclosureAction): DisclosureState {
  switch (action.type) {
    case 'EXPAND_NODE': {
      const newExpanded = new Set(state.expandedNodes);
      newExpanded.add(action.nodeId);
      return { ...state, expandedNodes: newExpanded };
    }
    case 'COLLAPSE_NODE': {
      const newExpanded = new Set(state.expandedNodes);
      newExpanded.delete(action.nodeId);
      return { ...state, expandedNodes: newExpanded };
    }
    case 'TOGGLE_NODE': {
      const newExpanded = new Set(state.expandedNodes);
      if (newExpanded.has(action.nodeId)) {
        newExpanded.delete(action.nodeId);
      } else {
        newExpanded.add(action.nodeId);
      }
      return { ...state, expandedNodes: newExpanded };
    }
    case 'COLLAPSE_BRANCH': {
      const newCollapsed = new Set(state.collapsedBranches);
      newCollapsed.add(action.branchId);
      return { ...state, collapsedBranches: newCollapsed };
    }
    case 'EXPAND_BRANCH': {
      const newCollapsed = new Set(state.collapsedBranches);
      newCollapsed.delete(action.branchId);
      return { ...state, collapsedBranches: newCollapsed };
    }
    case 'FOCUS_PATH':
      return { ...state, focusedPath: action.pathId, viewMode: 'focused' };
    case 'CLEAR_FOCUS':
      return { ...state, focusedPath: null, viewMode: 'overview' };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode };
    case 'SET_ZOOM_LEVEL':
      return { ...state, zoomLevel: action.level };
    default:
      return state;
  }
}

interface DisclosureContextValue extends DisclosureState {
  dispatch: React.Dispatch<DisclosureAction>;
  isNodeVisible: (nodeId: string, parentId?: string) => boolean;
  isNodeExpanded: (nodeId: string) => boolean;
  isBranchCollapsed: (branchId: string) => boolean;
  getVisibilityClass: (nodeId: string, level: number) => string;
  toggleNode: (nodeId: string) => void;
  focusOnPath: (pathId: string) => void;
  clearFocus: () => void;
  setViewMode: (mode: 'overview' | 'detailed' | 'focused') => void;
}

const DisclosureContext = createContext<DisclosureContextValue | undefined>(undefined);

export const ProgressiveDisclosureProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(disclosureReducer, initialState);

  const isNodeVisible = (nodeId: string, parentId?: string): boolean => {
    // Root is always visible
    if (nodeId.startsWith('job-')) return true;
    
    // If no parent, check if it's in expanded set
    if (!parentId) return state.expandedNodes.has(nodeId);
    
    // Check if parent is expanded
    if (!state.expandedNodes.has(parentId)) return false;
    
    // In focused mode, only show focused path
    if (state.viewMode === 'focused' && state.focusedPath) {
      return nodeId.includes(state.focusedPath) || parentId.includes(state.focusedPath);
    }
    
    // Check branch collapse state
    const branchId = getBranchId(nodeId);
    if (state.collapsedBranches.has(branchId)) return false;
    
    return true;
  };

  const isNodeExpanded = (nodeId: string): boolean => {
    return state.expandedNodes.has(nodeId);
  };

  const isBranchCollapsed = (branchId: string): boolean => {
    return state.collapsedBranches.has(branchId);
  };

  const getVisibilityClass = (nodeId: string, level: number): string => {
    const base = 'transition-all duration-300';
    
    if (!isNodeVisible(nodeId)) {
      return `${base} opacity-0 scale-95 pointer-events-none`;
    }
    
    if (state.viewMode === 'focused' && state.focusedPath) {
      if (nodeId.includes(state.focusedPath)) {
        return `${base} opacity-100 scale-100`;
      } else {
        return `${base} opacity-30 scale-95`;
      }
    }
    
    // Progressive opacity based on level and zoom
    const opacity = Math.max(0.3, 1 - (level * 0.1) + (state.zoomLevel * 0.2));
    return `${base} opacity-${Math.round(opacity * 100)}`;
  };

  const toggleNode = (nodeId: string) => {
    dispatch({ type: 'TOGGLE_NODE', nodeId });
  };

  const focusOnPath = (pathId: string) => {
    dispatch({ type: 'FOCUS_PATH', pathId });
  };

  const clearFocus = () => {
    dispatch({ type: 'CLEAR_FOCUS' });
  };

  const setViewMode = (mode: 'overview' | 'detailed' | 'focused') => {
    dispatch({ type: 'SET_VIEW_MODE', mode });
  };

  const getBranchId = (nodeId: string): string => {
    // Extract branch identifier from node ID
    if (nodeId.startsWith('skill-')) return 'skills';
    if (nodeId.startsWith('course-')) return 'courses';
    if (nodeId.startsWith('project-')) return 'projects';
    if (nodeId.startsWith('cert-')) return 'certifications';
    return 'steps';
  };

  const contextValue: DisclosureContextValue = {
    ...state,
    dispatch,
    isNodeVisible,
    isNodeExpanded,
    isBranchCollapsed,
    getVisibilityClass,
    toggleNode,
    focusOnPath,
    clearFocus,
    setViewMode
  };

  return (
    <DisclosureContext.Provider value={contextValue}>
      {children}
    </DisclosureContext.Provider>
  );
};

export const useProgressiveDisclosure = () => {
  const context = useContext(DisclosureContext);
  if (context === undefined) {
    throw new Error('useProgressiveDisclosure must be used within ProgressiveDisclosureProvider');
  }
  return context;
};
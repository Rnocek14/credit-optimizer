import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from '@xyflow/react';

export interface PathNode extends Node {
  type: 'track' | 'course' | 'project' | 'milestone';
  data: {
    title: string;
    description?: string;
    trackId?: string;
    institutionId?: string;
    teacherId?: string;
    verification?: 'self_reported' | 'institution_verified' | 'mentor_verified';
    progress?: number;
    xp?: number;
    cri?: number;
    estimatedHours?: number;
    cost?: number;
    skillTags?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  };
}

export interface PathEdge extends Edge {
  type: 'prerequisite' | 'sequence' | 'branch';
}

interface PathState {
  nodes: PathNode[];
  edges: PathEdge[];
  activeNodeId?: string;
  
  // Actions
  addNode: (node: Omit<PathNode, 'id'>) => void;
  updateNode: (id: string, updates: Partial<PathNode['data']>) => void;
  removeNode: (id: string) => void;
  
  connect: (sourceId: string, targetId: string, edgeType?: PathEdge['type']) => void;
  removeEdge: (id: string) => void;
  
  moveNode: (id: string, position: { x: number; y: number }) => void;
  setActiveNode: (id?: string) => void;
  
  forkNode: (id: string, providerOverride?: { institutionId?: string; teacherId?: string }) => void;
  mergeNodes: (ids: string[]) => void;
  swapProvider: (nodeId: string, institutionId?: string, teacherId?: string) => void;
  
  // Bulk operations
  loadTrackNodes: (trackId: string) => void;
  clearCanvas: () => void;
}

export const usePathStore = create<PathState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      activeNodeId: undefined,

      addNode: (nodeData) => {
        const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNode: PathNode = {
          id,
          position: { x: 100, y: 100 },
          ...nodeData,
        };
        
        set((state) => ({
          nodes: [...state.nodes, newNode],
        }));
      },

      updateNode: (id, updates) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id
              ? { ...node, data: { ...node.data, ...updates } }
              : node
          ),
        }));
      },

      removeNode: (id) => {
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== id),
          edges: state.edges.filter(
            (edge) => edge.source !== id && edge.target !== id
          ),
          activeNodeId: state.activeNodeId === id ? undefined : state.activeNodeId,
        }));
      },

      connect: (sourceId, targetId, edgeType = 'sequence') => {
        const edgeId = `edge-${sourceId}-${targetId}`;
        const newEdge: PathEdge = {
          id: edgeId,
          source: sourceId,
          target: targetId,
          type: edgeType,
          markerEnd: { type: 'arrowclosed' as any },
        };
        
        set((state) => ({
          edges: [...state.edges.filter(e => e.id !== edgeId), newEdge],
        }));
      },

      removeEdge: (id) => {
        set((state) => ({
          edges: state.edges.filter((edge) => edge.id !== id),
        }));
      },

      moveNode: (id, position) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id ? { ...node, position } : node
          ),
        }));
      },

      setActiveNode: (id) => {
        set({ activeNodeId: id });
      },

      forkNode: (id, providerOverride) => {
        const { nodes } = get();
        const originalNode = nodes.find((n) => n.id === id);
        if (!originalNode) return;

        const forkedNode: PathNode = {
          ...originalNode,
          id: `fork-${id}-${Date.now()}`,
          position: {
            x: originalNode.position.x + 200,
            y: originalNode.position.y,
          },
          data: {
            ...originalNode.data,
            ...providerOverride,
            title: `${originalNode.data.title} (Fork)`,
          },
        };

        set((state) => ({
          nodes: [...state.nodes, forkedNode],
        }));
      },

      mergeNodes: (ids) => {
        const { nodes } = get();
        const targetNodes = nodes.filter((n) => ids.includes(n.id));
        if (targetNodes.length < 2) return;

        // Keep the node with highest CRI
        const bestNode = targetNodes.reduce((best, current) => 
          (current.data.cri || 0) > (best.data.cri || 0) ? current : best
        );

        set((state) => ({
          nodes: state.nodes.filter((n) => !ids.includes(n.id) || n.id === bestNode.id),
          edges: state.edges.filter((e) => 
            !ids.some(id => id !== bestNode.id && (e.source === id || e.target === id))
          ),
        }));
      },

      swapProvider: (nodeId, institutionId, teacherId) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    institutionId,
                    teacherId,
                  },
                }
              : node
          ),
        }));
      },

      loadTrackNodes: (trackId) => {
        // TODO: Integrate with existing track data
        // This would load courses, projects, milestones from a track
        console.log('Loading track nodes for:', trackId);
      },

      clearCanvas: () => {
        set({
          nodes: [],
          edges: [],
          activeNodeId: undefined,
        });
      },
    }),
    {
      name: 'path-canvas-v1',
    }
  )
);

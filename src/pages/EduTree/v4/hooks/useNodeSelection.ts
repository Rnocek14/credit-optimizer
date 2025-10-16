/**
 * Hook for managing node provider selection state
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { PlanNode } from '../types/v4';

interface UseNodeSelectionReturn {
  selectedNodeId: string | null;
  isPanelOpen: boolean;
  openNodeDetail: (nodeId: string) => void;
  closeNodeDetail: () => void;
  updateNodeProvider: (
    nodes: PlanNode[],
    nodeId: string,
    institutionId: string,
    teacherId?: string
  ) => PlanNode[];
}

export function useNodeSelection(): UseNodeSelectionReturn {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const openNodeDetail = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setIsPanelOpen(true);
  }, []);

  const closeNodeDetail = useCallback(() => {
    setIsPanelOpen(false);
    // Delay clearing selectedNodeId to allow close animation
    setTimeout(() => setSelectedNodeId(null), 300);
  }, []);

  const updateNodeProvider = useCallback(
    (nodes: PlanNode[], nodeId: string, institutionId: string, teacherId?: string): PlanNode[] => {
      const updatedNodes = nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              selectedProviderId: institutionId,
              selectedTeacherId: teacherId,
            },
          };
        }
        return node;
      });

      toast.success('Provider selected', {
        description: 'Your plan metrics have been updated.',
      });

      return updatedNodes;
    },
    []
  );

  return {
    selectedNodeId,
    isPanelOpen,
    openNodeDetail,
    closeNodeDetail,
    updateNodeProvider,
  };
}

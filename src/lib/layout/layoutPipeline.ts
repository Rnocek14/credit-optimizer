import { Node, Edge } from '@xyflow/react';
import { calculateNodeDimensions } from './heightCalculation';

/**
 * Real-time layout update handler
 * Integrates with useNodeResize hook for dynamic content changes
 */
export class LayoutPipeline {
  private nodes: Node[] = [];
  private edges: Edge[] = [];
  private isProcessing = false;
  private updateCallback?: (nodes: Node[]) => void;

  constructor(updateCallback?: (nodes: Node[]) => void) {
    this.updateCallback = updateCallback;
    
    // Listen for node resize events
    if (typeof window !== 'undefined') {
      window.addEventListener('node:resized', this.handleNodeResize.bind(this));
    }
  }

  /**
   * Set initial nodes and edges
   */
  setData(nodes: Node[], edges: Edge[]) {
    this.nodes = [...nodes];
    this.edges = [...edges];
  }

  /**
   * Handle node resize events from useNodeResize hook
   */
  private handleNodeResize(event: CustomEvent) {
    if (this.isProcessing) return;
    
    const { nodeId } = event.detail;
    console.log(`📏 Node ${nodeId} resized, triggering incremental re-layout`);
    
    this.incrementalUpdate(nodeId);
  }

  /**
   * Incremental layout update for a specific node
   */
  private incrementalUpdate(changedNodeId: string) {
    if (!this.updateCallback || this.nodes.length === 0) return;

    const changedNodeIndex = this.nodes.findIndex(n => n.id === changedNodeId);
    if (changedNodeIndex === -1) return;

    const changedNode = this.nodes[changedNodeIndex];
    const newDimensions = calculateNodeDimensions(changedNode);
    
    // Find nodes in the same column that might be affected
    const sameColumnNodes = this.nodes.filter(n => 
      Math.abs(n.position.x - changedNode.position.x) < 50 && 
      n.position.y > changedNode.position.y
    );

    // Only update if there are nodes below that might be affected
    if (sameColumnNodes.length > 0) {
      // Recalculate positions for affected nodes
      let yOffset = changedNode.position.y + newDimensions.height + 64;
      
      sameColumnNodes.sort((a, b) => a.position.y - b.position.y);
      
      const updatedNodes = this.nodes.map(node => {
        const affectedNode = sameColumnNodes.find(n => n.id === node.id);
        if (affectedNode) {
          const dimensions = calculateNodeDimensions(node);
          const newY = yOffset;
          yOffset += dimensions.height + 64;
          
          return {
            ...node,
            position: { ...node.position, y: newY }
          };
        }
        return node;
      });

      this.nodes = updatedNodes;
      this.updateCallback(updatedNodes);
    }
  }

  /**
   * Force complete re-layout
   */
  forceUpdate() {
    if (this.updateCallback) {
      // Import and use the main layout function
      import('./simpleLayout').then(({ layoutNodes }) => {
        layoutNodes(this.nodes, this.edges).then(result => {
          this.nodes = result.nodes;
          this.updateCallback?.(result.nodes);
        });
      });
    }
  }

  /**
   * Cleanup event listeners
   */
  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('node:resized', this.handleNodeResize.bind(this));
    }
  }
}

/**
 * Create a layout pipeline instance
 */
export function createLayoutPipeline(updateCallback?: (nodes: Node[]) => void): LayoutPipeline {
  return new LayoutPipeline(updateCallback);
}
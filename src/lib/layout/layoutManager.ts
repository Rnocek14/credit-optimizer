import { Node, Edge } from '@xyflow/react';
import { layoutNodes } from './simpleLayout';
import { measurementSystem } from './measurementSystem';

/**
 * Advanced layout manager with caching and incremental updates
 * Manages the entire layout lifecycle with performance optimizations
 */

interface LayoutCache {
  nodes: Node[];
  layoutHash: string;
  timestamp: number;
}

interface LayoutOptions {
  forceRefresh?: boolean;
  enableCaching?: boolean;
  maxCacheAge?: number;
}

class LayoutManager {
  private cache: LayoutCache | null = null;
  private isLayouting = false;
  private pendingUpdate: Promise<any> | null = null;
  private static instance: LayoutManager;

  static getInstance(): LayoutManager {
    if (!LayoutManager.instance) {
      LayoutManager.instance = new LayoutManager();
    }
    return LayoutManager.instance;
  }

  /**
   * Generate a hash for the current node configuration to detect changes
   */
  private generateLayoutHash(nodes: Node[]): string {
    const hashData = nodes.map(node => ({
      id: node.id,
      type: node.type,
      year: node.data?.year,
      courseCount: (node.data as any)?.block?.courses?.length || 0,
      isExpanded: (node.data as any)?.isExpanded,
      subBlockCount: (node.data as any)?.subBlocks?.length || 0,
      hasAltCredits: (node.data as any)?.block?.alt_credits > 0,
      measured: node.measured ? { w: node.measured.width, h: node.measured.height } : null
    }));
    
    return JSON.stringify(hashData);
  }

  /**
   * Check if layout can be served from cache
   */
  private canUseCache(nodes: Node[], options: LayoutOptions): boolean {
    if (!options.enableCaching || options.forceRefresh || !this.cache) {
      return false;
    }

    const maxAge = options.maxCacheAge || 30000; // 30 seconds default
    const isExpired = Date.now() - this.cache.timestamp > maxAge;
    
    if (isExpired) {
      return false;
    }

    const currentHash = this.generateLayoutHash(nodes);
    return currentHash === this.cache.layoutHash;
  }

  /**
   * Main layout function with caching and performance optimizations
   */
  async performLayout(
    nodes: Node[], 
    edges: Edge[], 
    options: LayoutOptions = {}
  ): Promise<{ nodes: Node[]; edges: Edge[]; hasOverlaps: boolean; layoutTime: number; fromCache: boolean }> {
    
    // Prevent concurrent layouts
    if (this.isLayouting && this.pendingUpdate) {
      console.log('⏳ Layout already in progress, waiting...');
      return this.pendingUpdate;
    }

    // Check cache first
    if (this.canUseCache(nodes, options)) {
      console.log('🚀 Serving layout from cache');
      return {
        nodes: this.cache!.nodes,
        edges,
        hasOverlaps: false,
        layoutTime: 0,
        fromCache: true
      };
    }

    this.isLayouting = true;
    
    this.pendingUpdate = this.executeLayout(nodes, edges, options);
    const result = await this.pendingUpdate;
    
    this.isLayouting = false;
    this.pendingUpdate = null;
    
    return result;
  }

  private async executeLayout(
    nodes: Node[], 
    edges: Edge[], 
    options: LayoutOptions
  ): Promise<{ nodes: Node[]; edges: Edge[]; hasOverlaps: boolean; layoutTime: number; fromCache: boolean }> {
    
    console.log('🎯 Starting advanced layout with caching');
    const startTime = performance.now();

    try {
      // Perform the layout
      const result = await layoutNodes(nodes, edges);
      
      // Cache the results if caching is enabled
      if (options.enableCaching !== false) {
        this.cache = {
          nodes: result.nodes,
          layoutHash: this.generateLayoutHash(nodes),
          timestamp: Date.now()
        };
      }

      const totalTime = performance.now() - startTime;
      console.log(`✅ Advanced layout complete (${totalTime.toFixed(1)}ms)`);

      return {
        nodes: result.nodes,
        edges: edges,
        hasOverlaps: result.hasOverlaps,
        layoutTime: totalTime,
        fromCache: false
      };

    } catch (error) {
      console.error('❌ Layout failed:', error);
      
      // Return original nodes on error
      return {
        nodes,
        edges,
        hasOverlaps: true,
        layoutTime: performance.now() - startTime,
        fromCache: false
      };
    }
  }

  /**
   * Handle incremental updates when specific nodes change
   */
  async handleNodeUpdate(
    changedNodeId: string, 
    allNodes: Node[], 
    edges: Edge[]
  ): Promise<{ nodes: Node[]; edges: Edge[]; hasOverlaps: boolean; layoutTime: number }> {
    
    console.log(`🔄 Handling incremental update for node: ${changedNodeId}`);
    
    // Clear measurement cache for changed node
    measurementSystem.clearCache();
    
    // For now, do a full re-layout (future: implement true incremental updates)
    return this.performLayout(allNodes, edges, { forceRefresh: true });
  }

  /**
   * Clear all caches and force fresh layout
   */
  clearCache(): void {
    this.cache = null;
    measurementSystem.clearCache();
    console.log('🧹 Layout cache cleared');
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { hasCache: boolean; age?: number; nodeCount?: number } {
    if (!this.cache) {
      return { hasCache: false };
    }

    return {
      hasCache: true,
      age: Date.now() - this.cache.timestamp,
      nodeCount: this.cache.nodes.length
    };
  }
}

export const layoutManager = LayoutManager.getInstance();

/**
 * Main export function for easy use
 */
export async function performAdvancedLayout(
  nodes: Node[], 
  edges: Edge[], 
  options: LayoutOptions = {}
): Promise<{ nodes: Node[]; edges: Edge[]; hasOverlaps: boolean; layoutTime: number; fromCache: boolean }> {
  
  // Default options
  const defaultOptions: LayoutOptions = {
    enableCaching: true,
    maxCacheAge: 30000, // 30 seconds
    forceRefresh: false,
    ...options
  };

  return layoutManager.performLayout(nodes, edges, defaultOptions);
}
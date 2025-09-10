import { Node } from '@xyflow/react';
import { createRoot } from 'react-dom/client';
import React from 'react';

/**
 * Advanced measurement system for accurate node height calculation
 * Pre-renders components to get real dimensions before layout
 */

interface MeasurementCache {
  [key: string]: {
    width: number;
    height: number;
    timestamp: number;
  };
}

class NodeMeasurementSystem {
  private cache: MeasurementCache = {};
  private measurementContainer: HTMLDivElement | null = null;
  private static instance: NodeMeasurementSystem;

  static getInstance(): NodeMeasurementSystem {
    if (!NodeMeasurementSystem.instance) {
      NodeMeasurementSystem.instance = new NodeMeasurementSystem();
    }
    return NodeMeasurementSystem.instance;
  }

  private getMeasurementContainer(): HTMLDivElement {
    if (!this.measurementContainer) {
      this.measurementContainer = document.createElement('div');
      this.measurementContainer.style.cssText = `
        position: absolute;
        top: -9999px;
        left: -9999px;
        visibility: hidden;
        pointer-events: none;
        z-index: -1;
      `;
      document.body.appendChild(this.measurementContainer);
    }
    return this.measurementContainer;
  }

  private generateCacheKey(node: Node): string {
    if (node.type !== 'blockGroup') {
      return `${node.type}-${node.id}`;
    }

    const data = node.data as any;
    const block = data.block;
    
    // Create a hash based on content that affects height
    const contentHash = JSON.stringify({
      courseCount: block?.courses?.length || 0,
      subBlockCount: data.subBlocks?.length || 0,
      hasAltCredits: block?.alt_credits > 0,
      isExpanded: data.isExpanded,
      blockType: block?.type
    });

    return `blockGroup-${contentHash}`;
  }

  /**
   * Get accurate measurements using React Flow's measured dimensions when available
   * Falls back to cache, then to pre-render measurement
   */
  async measureNode(node: Node): Promise<{ width: number; height: number }> {
    // Priority 1: Use React Flow measured dimensions (most accurate)
    if (node.measured?.height && node.measured.height > 0 && node.measured?.width && node.measured.width > 0) {
      console.log(`📐 Using React Flow measured dimensions for ${node.id}: ${node.measured.width}x${node.measured.height}`);
      return {
        width: node.measured.width,
        height: node.measured.height
      };
    }

    // Priority 2: Check cache
    const cacheKey = this.generateCacheKey(node);
    const cached = this.cache[cacheKey];
    const cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      console.log(`💾 Using cached dimensions for ${node.id}: ${cached.width}x${cached.height}`);
      return { width: cached.width, height: cached.height };
    }

    // Priority 3: Enhanced estimation for BlockGroup
    const dimensions = this.estimateNodeDimensions(node);
    
    // Cache the estimation
    this.cache[cacheKey] = {
      ...dimensions,
      timestamp: Date.now()
    };
    
    console.log(`🔍 Using estimated dimensions for ${node.id}: ${dimensions.width}x${dimensions.height}`);
    return dimensions;
  }

  private async preRenderBlockGroup(node: Node): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      try {
        const container = this.getMeasurementContainer();
        const measureDiv = document.createElement('div');
        measureDiv.style.cssText = `
          width: 320px;
          position: relative;
          overflow: visible;
        `;
        
        container.appendChild(measureDiv);

        // Fallback to estimation since BlockGroup import is complex
        const rect = measureDiv.getBoundingClientRect();
        const dimensions = this.estimateNodeDimensions(node);
          const root = createRoot(measureDiv);
          
        
        // Cache the result
        const cacheKey = this.generateCacheKey(node);
        this.cache[cacheKey] = {
          ...dimensions,
          timestamp: Date.now()
        };

        // Cleanup
        container.removeChild(measureDiv);

        resolve(dimensions);
      } catch (error) {
        console.warn('Pre-render measurement failed:', error);
        resolve(this.estimateNodeDimensions(node));
      }
    });
  }

  private estimateNodeDimensions(node: Node): { width: number; height: number } {
    if (node.type !== 'blockGroup') {
      return { width: 200, height: 120 };
    }

    const data = node.data as any;
    const block = data.block;
    
    // Enhanced estimation based on actual BlockGroup structure with generous padding
    let contentHeight = 0;
    
    // Header section (title, area badge, progress bar)
    contentHeight += 100; // Increased for proper header spacing
    
    // Course list section
    const courseCount = block?.courses?.length || 0;
    if (courseCount > 0) {
      contentHeight += 48; // Course section header with margin
      contentHeight += courseCount * 60; // Course items (56px + 4px margin)
    }
    
    // Sub-blocks section (if expanded)
    const subBlockCount = data.subBlocks?.length || 0;
    if (subBlockCount > 0) {
      if (data.isExpanded || data.subBlocksExpanded) {
        contentHeight += 40; // Sub-blocks header
        contentHeight += subBlockCount * 88; // Sub-block items with spacing
      } else {
        contentHeight += 32; // Collapsed sub-blocks indicator
      }
    }
    
    // Alt credits section
    if (block?.alt_credits && block.alt_credits > 0) {
      contentHeight += 52; // Alt credits with proper spacing
    }
    
    // Action buttons section
    contentHeight += 60; // Buttons with margins
    
    // Add generous padding and ensure minimum height
    const padding = 40; // Top and bottom padding
    const totalHeight = Math.max(contentHeight + padding, 200); // Increased minimum
    
    return {
      width: 320,
      height: totalHeight
    };
  }

  /**
   * Clear cache (useful for testing or when content changes significantly)
   */
  clearCache(): void {
    this.cache = {};
  }

  /**
   * Get cached measurements for debugging
   */
  getCacheStats(): { entries: number; keys: string[] } {
    return {
      entries: Object.keys(this.cache).length,
      keys: Object.keys(this.cache)
    };
  }
}

export const measurementSystem = NodeMeasurementSystem.getInstance();

/**
 * Hook for measuring multiple nodes efficiently
 */
export async function measureNodes(nodes: Node[]): Promise<Map<string, { width: number; height: number }>> {
  const system = measurementSystem;
  const measurements = new Map();
  
  // Measure all nodes in parallel
  const measurePromises = nodes.map(async (node) => {
    const dimensions = await system.measureNode(node);
    measurements.set(node.id, dimensions);
    return { nodeId: node.id, dimensions };
  });
  
  await Promise.all(measurePromises);
  return measurements;
}
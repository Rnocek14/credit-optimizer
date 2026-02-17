/**
 * Core overlay primitives — single ReactFlow instance, swap CSS class not remount.
 */

export type OverlayType = 'roi' | 'compare' | 'transfer' | 'pivot' | 'progress';

export interface OverlayConfig<TParams = Record<string, unknown>> {
  type: OverlayType;
  params: TParams;
  cssClass: string;
}

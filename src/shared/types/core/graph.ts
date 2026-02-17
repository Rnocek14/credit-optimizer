/**
 * Core graph primitives — universal across all features.
 */

export type NodeKind = 'career' | 'skill' | 'course' | 'credential' | 'institution' | 'provider';
export type EdgeKind = 'requires' | 'unlocks' | 'transfers_to' | 'substitutes' | 'career_path';

export interface GraphNode<TMeta = Record<string, unknown>> {
  id: string;
  kind: NodeKind;
  label: string;
  meta: TMeta;
}

export interface GraphEdge<TMeta = Record<string, unknown>> {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  weight?: number;
  confidence?: number;
  verificationStatus?: 'verified' | 'inferred' | 'deprecated';
  meta?: TMeta;
}

export interface TypedMultigraph<N = GraphNode, E = GraphEdge> {
  nodes: N[];
  edges: E[];
}

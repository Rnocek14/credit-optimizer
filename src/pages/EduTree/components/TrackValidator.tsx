import React from 'react';
import { Node, Edge } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TrackDefinition, generateEdgeIds } from '../data/trackDefinitions';

interface TrackValidatorProps {
  nodes: Node[];
  edges: Edge[];
  primaryTrack?: TrackDefinition;
  comparisonTrack?: TrackDefinition;
  isVisible: boolean;
}

export function TrackValidator({ 
  nodes, 
  edges, 
  primaryTrack, 
  comparisonTrack, 
  isVisible 
}: TrackValidatorProps) {
  if (!isVisible || (!primaryTrack && !comparisonTrack)) {
    return null;
  }

  // Phase A: Build rfNodeIdByBlockId map
  const rfNodeIdByBlockId = new Map(
    nodes.map(n => [String(n.data?.blockId ?? n.id), n.id])
  );

  const edgeIds = new Set(edges.map(e => e.id));

  const validateTrack = (track: TrackDefinition) => {
    const missingNodes = track.blockIds.filter(blockId => 
      !rfNodeIdByBlockId.has(String(blockId))
    );
    
    const expectedEdges = generateEdgeIds(track.blockIds);
    const missingEdges = expectedEdges.filter(edgeId => !edgeIds.has(edgeId));
    
    return { missingNodes, missingEdges };
  };

  const primaryValidation = primaryTrack ? validateTrack(primaryTrack) : null;
  const comparisonValidation = comparisonTrack ? validateTrack(comparisonTrack) : null;

  // Check terminal node
  const degreeNode = nodes.find(n => n.type === 'degree' || n.type === 'terminal');
  const degreeTitle = (degreeNode?.data?.title as string) || (degreeNode?.data?.label as string);

  const hasIssues = 
    (primaryValidation && (primaryValidation.missingNodes.length > 0 || primaryValidation.missingEdges.length > 0)) ||
    (comparisonValidation && (comparisonValidation.missingNodes.length > 0 || comparisonValidation.missingEdges.length > 0)) ||
    !degreeTitle;

  if (!hasIssues) {
    return (
      <Card className="absolute top-4 left-4 p-3 bg-green-50 border-green-200 z-50">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            ✓ Track Validation Pass
          </Badge>
          <span className="text-sm text-green-700">All track data contracts verified</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="absolute top-4 left-4 p-4 bg-yellow-50 border-yellow-200 z-50 max-w-md">
      <div className="space-y-3">
        <Badge variant="destructive" className="mb-2">
          ⚠️ Track Validation Issues
        </Badge>

        {primaryValidation && (
          <div>
            <div className="font-medium text-sm text-yellow-800">
              {primaryTrack!.name} Track:
            </div>
            {primaryValidation.missingNodes.length > 0 && (
              <div className="text-xs text-red-600 ml-2">
                Missing nodes: {primaryValidation.missingNodes.join(', ')}
              </div>
            )}
            {primaryValidation.missingEdges.length > 0 && (
              <div className="text-xs text-red-600 ml-2">
                Missing edges: {primaryValidation.missingEdges.join(', ')}
              </div>
            )}
          </div>
        )}

        {comparisonValidation && (
          <div>
            <div className="font-medium text-sm text-yellow-800">
              {comparisonTrack!.name} Track:
            </div>
            {comparisonValidation.missingNodes.length > 0 && (
              <div className="text-xs text-red-600 ml-2">
                Missing nodes: {comparisonValidation.missingNodes.join(', ')}
              </div>
            )}
            {comparisonValidation.missingEdges.length > 0 && (
              <div className="text-xs text-red-600 ml-2">
                Missing edges: {comparisonValidation.missingEdges.join(', ')}
              </div>
            )}
          </div>
        )}

        {!degreeTitle && (
          <div className="text-xs text-red-600">
            Terminal node missing title: {degreeNode?.id || 'No degree node found'}
          </div>
        )}

        <div className="text-xs text-gray-600 mt-2">
          Degree node data: {String(degreeTitle || 'None')}
        </div>
      </div>
    </Card>
  );
}

// Browser console audit functions (for development)
export const runTrackAudits = (nodes: Node[], edges: Edge[]) => {
  if (process.env.NODE_ENV !== 'development') return;

  const rfNodeIdByBlockId = new Map(
    nodes.map(n => [String(n.data?.blockId ?? n.id), n.id])
  );

  const sampleTrackA = ['1','2','3','4','5','6','9'];
  const sampleTrackB = ['1','2','3','4','7','8','9'];

  const missing = (blockIds: string[]) => 
    blockIds.filter(b => !rfNodeIdByBlockId.has(String(b)));

  console.log('[Audit] Missing in Track A:', missing(sampleTrackA));
  console.log('[Audit] Missing in Track B:', missing(sampleTrackB));

  const degreeNode = nodes.find(n => n.type === 'degree' || n.type === 'terminal');
  console.log('[Audit] Degree node id/data:', degreeNode?.id, degreeNode?.data);
  console.log('[Audit] Degree title:', degreeNode?.data?.title);

  const toEdgeIds = (seq: string[]) => 
    seq.slice(0,-1).map((src,i) => `e-${src}-${seq[i+1]}`);
  
  const edgeIds = new Set(edges.map(e => e.id));
  const aMissingEdges = toEdgeIds(sampleTrackA).filter(id => !edgeIds.has(id));
  const bMissingEdges = toEdgeIds(sampleTrackB).filter(id => !edgeIds.has(id));
  
  console.log('[Audit] Missing A edges:', aMissingEdges);
  console.log('[Audit] Missing B edges:', bMissingEdges);
};
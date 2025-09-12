// Edge ID normalization utilities for consistent overlay matching

export const normalizeEdgeId = (e: { 
  id?: string; 
  source: string; 
  target: string; 
  data?: any 
}) => {
  const srcBlock = String(e.data?.sourceBlockId ?? e.source);
  const tgtBlock = String(e.data?.targetBlockId ?? e.target);
  return `e-${srcBlock}-${tgtBlock}`;
};

export const normalizeEdges = (edges: any[]) => {
  const normalized = edges.map(e => ({
    ...e,
    id: normalizeEdgeId(e)
  }));

  // Dev-time assertion
  if (import.meta.env.DEV) {
    const bad = normalized.filter(e => !/^e-.+-.+$/.test(String(e.id)));
    if (bad.length) {
      console.warn('[ASSERT] Non-normalized edge IDs:', bad.slice(0, 5).map(b => b.id));
    }
  }

  return normalized;
};

export const validateEdgeIdSpace = (edges: any[], overlayIds: string[]) => {
  const edgeIds = new Set(edges.map(e => String(e.id)));
  const matches = overlayIds.filter(id => edgeIds.has(id));
  
  if (import.meta.env.DEV) {
    console.log('[Edge ID Space]', {
      totalEdges: edges.length,
      overlayIds: overlayIds.length,
      matches: matches.length,
      sampleEdgeId: edges[0]?.id,
      sampleOverlayId: overlayIds[0]
    });
  }
  
  return matches.length > 0;
};
/**
 * Node and Edge Classification System
 * Transforms graph state into CSS classes following GPT's specification
 */

export type VisualCtx = {
  activeProgram?: string;
  comparisonProgram?: string;
  activeTrack?: string | null;
  highlightSets?: {
    primaryNodes: Set<string>;
    comparisonNodes: Set<string>;
    primaryEdges: Set<string>;
    comparisonEdges: Set<string>;
  };
  yearMap?: Record<string, 1|2|3|4>;
  categoryMap?: Record<string,'gened'|'major-core'|'elective'>;
  creditMeta?: Record<string, {ace?:boolean;nccrs?:boolean;clep?:boolean;pla?:boolean;residency?:boolean;}>;
  state?: Record<string,'locked'|'unlocked'|'ghost'|'complete'|'inprogress'|'verified'>;
  typeById: Record<string,'course'|'requirement'|'skill'|'project'|'credential'|'job'|'checkpoint'|'institution'>;
  programById?: Record<string,string[]>;
  trackById?: Record<string,string[]>;
};

export function classifyNode(id: string, ctx: VisualCtx): string[] {
  const cls = ['node', `node--${ctx.typeById[id] ?? 'course'}`];
  const programs = ctx.programById?.[id] ?? [];
  
  // Program membership
  if (ctx.activeProgram && programs.includes(ctx.activeProgram)) {
    cls.push('node--primary', `node--program-${ctx.activeProgram}`);
  }
  if (ctx.comparisonProgram && programs.includes(ctx.comparisonProgram)) {
    cls.push('node--comparison', `node--program-${ctx.comparisonProgram}`);
  }
  
  // Shared nodes (appear in both primary and comparison)
  if (cls.includes('node--primary') && cls.includes('node--comparison')) {
    cls.push('node--both','is-shared');
  }

  // Track-specific classes
  const track = ctx.trackById?.[id]?.[0];
  if (track) cls.push(`node--track-${track}`);

  // Year and category classes
  const y = ctx.yearMap?.[id]; 
  if (y) cls.push(`node--year-${y}`);
  const cat = ctx.categoryMap?.[id]; 
  if (cat) cls.push(`node--${cat}`);

  // State classes
  const s = ctx.state?.[id]; 
  if (s) cls.push(`is-${s}`);
  
  // Credit/transfer flags
  const credit = ctx.creditMeta?.[id]; 
  if (credit) {
    if (credit.ace) cls.push('node--ace');
    if (credit.nccrs) cls.push('node--nccrs');
    if (credit.clep) cls.push('node--clep');
    if (credit.pla) cls.push('node--pla');
    if (credit.residency) cls.push('node--residency-required');
  }

  // Overlay dimming based on highlight sets
  const inPrimary = ctx.highlightSets?.primaryNodes.has(id);
  const inCompare = ctx.highlightSets?.comparisonNodes.has(id);
  
  if ((ctx.activeProgram || ctx.comparisonProgram) && !inPrimary && !inCompare && !cls.includes('node--both')) {
    cls.push('node--dim');
  }

  return cls;
}

export function classifyEdge(id: string, type: string, ctx: VisualCtx): string[] {
  const cls = ['edge', `edge--${type}`];
  
  const inP = ctx.highlightSets?.primaryEdges.has(id);
  const inC = ctx.highlightSets?.comparisonEdges.has(id);
  
  if (inP && inC) {
    cls.push('edge--both');
  } else if (inP) {
    cls.push('edge--primary');
  } else if (inC) {
    cls.push('edge--comparison');
  } else {
    cls.push('edge--dim');
  }
  
  return cls;
}

/**
 * Build VisualCtx from current PathHighlight state and node data
 */
export function buildVisualCtx(highlight: any, nodes: any[]): VisualCtx {
  const { primarySelection, secondarySelection } = highlight;
  
  // Extract active programs from selections
  const activeProgram = primarySelection?.kind === 'program' ? primarySelection.id : null;
  const comparisonProgram = secondarySelection?.kind === 'program' ? secondarySelection.id : null;
  const activeTrack = primarySelection?.kind === 'track' ? primarySelection.id : null;
  
  const programById: Record<string, string[]> = {};
  const trackById: Record<string, string[]> = {};
  const typeById: Record<string, 'course'|'requirement'|'skill'|'project'|'credential'|'job'|'checkpoint'|'institution'> = {};
  const yearMap: Record<string, 1|2|3|4> = {};
  const categoryMap: Record<string, 'gened'|'major-core'|'elective'> = {};
  const state: Record<string, 'ghost'|'complete'|'inprogress'|'verified'> = {};
  
  nodes.forEach(node => {
    const nodeId = node.id;
    const data = node.data || {};
    const block = data.block || {};
    
    // Extract program and track info from different data structures
    const programId = data.program_id || block.program_id || data.programId;
    const trackId = data.track_id || block.track_id || data.trackId;
    
    // Program membership (foundational nodes belong to all programs)
    if (programId) {
      programById[nodeId] = [programId];
    } else {
      // Foundational nodes (Year 1 shared) belong to all programs
      programById[nodeId] = ['bs_cs', 'bs_it', 'bsn'];
    }
    
    // Track membership
    if (trackId) {
      trackById[nodeId] = [trackId];
    }
    
    // Node type classification (ensure valid type)
    const nodeType = node.type || 'requirement';
    const validTypes: Array<'course'|'requirement'|'skill'|'project'|'credential'|'job'|'checkpoint'|'institution'> = 
      ['course', 'requirement', 'skill', 'project', 'credential', 'job', 'checkpoint', 'institution'];
    typeById[nodeId] = validTypes.includes(nodeType as any) ? nodeType as any : 'requirement';
    
    // Year mapping
    const levelYear = data.levelYear || data.level_year || block.level_year;
    if (levelYear && levelYear >= 1 && levelYear <= 4) {
      yearMap[nodeId] = levelYear as 1|2|3|4;
    }
    
    // Category mapping based on area
    const area = data.area || block.area;
    if (area === 'foundation' || area === 'gen_ed') {
      categoryMap[nodeId] = 'gened';
    } else if (area === 'core' || area === 'track_core') {
      categoryMap[nodeId] = 'major-core';
    } else if (area === 'elective_pool') {
      categoryMap[nodeId] = 'elective';
    }
    
    // State detection
    if (data.is_empty_year === true) {
      state[nodeId] = 'ghost';
    }
  });
  
  // Build highlight sets (reuse existing highlight logic)
  const primaryNodes = new Set<string>();
  const comparisonNodes = new Set<string>();
  const primaryEdges = new Set<string>();
  const comparisonEdges = new Set<string>();
  
  // Use existing belongs logic to populate sets
  nodes.forEach(node => {
    const nodeId = node.id;
    
    if (primarySelection && belongsToSelection(node, primarySelection, programById, trackById)) {
      primaryNodes.add(nodeId);
    }
    
    if (secondarySelection && belongsToSelection(node, secondarySelection, programById, trackById)) {
      comparisonNodes.add(nodeId);
    }
  });
  
  return {
    activeProgram: activeProgram || undefined,
    comparisonProgram: comparisonProgram || undefined, 
    activeTrack: activeTrack || undefined,
    highlightSets: {
      primaryNodes,
      comparisonNodes,
      primaryEdges,
      comparisonEdges
    },
    yearMap,
    categoryMap,
    state,
    typeById,
    programById,
    trackById
  };
}

/**
 * Helper to determine if a node belongs to a selection
 * (Extracted from useApplyDimmingV2 logic)
 */
function belongsToSelection(
  node: any, 
  selection: any, 
  programById: Record<string, string[]>,
  trackById: Record<string, string[]>
): boolean {
  if (!selection || !node) return false;

  const { kind, id } = selection;
  const nodeId = node.id;
  const programs = programById[nodeId] || [];
  const tracks = trackById[nodeId] || [];
  
  if (kind === 'program') {
    return programs.includes(id);
  } else if (kind === 'track') {
    if (tracks.includes(id)) return true;
    
    // Program-shared blocks: check if track belongs to block's program
    const data = node.data || {};
    const block = data.block || {};
    const programId = data.program_id || block.program_id || data.programId;
    
    if (programId && !tracks.length) {
      // Map track to program - simplified for CS tracks
      const trackProgram = id === 'se' || id === 'ds' ? 'bs_cs' : null;
      return programId === trackProgram;
    }
  }

  return false;
}
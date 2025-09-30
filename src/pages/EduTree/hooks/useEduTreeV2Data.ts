/**
 * EduTree V2 Data Hook - Clean slate data loading
 * Bypasses legacy systems when V2 flags are active
 */

import { useMemo } from 'react';
import { useFeatureFlags } from '@/lib/featureFlags';
import { GOLDEN_LAYOUT_SEED, filterBlocksByMode, filterEdgesByBlocks, type V2RequirementBlock, type V2Edge, type FilterMode } from '../data/seedDataV2';
import { usePathHighlight } from '../ctx/PathHighlightContext';
import { useBatchRequirementOptions, marketplaceKeysFromNodeId } from '@/hooks/useBatchRequirementOptions';
import { useUserPlanSelections } from '@/hooks/useUserPlanSelections';
import { useUserPlan } from '@/hooks/useUserPlan';
import { aggregateGateMarketplaceData, type MPInfo } from '../utils/gateAggregation';

// Tolerant marketplace lookup: tries direct block.id, then all candidate keys
function getMpInfoForBlock(marketplaceData: Map<string, MPInfo> | undefined, blockId: string): MPInfo | undefined {
  if (!marketplaceData) return undefined;
  
  // Fast path: direct match
  const direct = marketplaceData.get(blockId);
  if (direct) return direct;

  // Tolerant path: try all candidate keys (seed id -> db slugs like 'cs-elec', 'y1-foundations', etc.)
  for (const candidateKey of marketplaceKeysFromNodeId(blockId)) {
    const hit = marketplaceData.get(candidateKey);
    if (hit) {
      // Track backfill usage for debugging
      (window as any).__mpSlugBackfills ??= new Set<string>();
      (window as any).__mpSlugBackfills.add(`${blockId}→${candidateKey}`);
      return hit;
    }
  }
  
  return undefined;
}

export interface UseEduTreeV2DataResult {
  blocks: V2RequirementBlock[];
  edges: V2Edge[];
  isLoading: boolean;
  isV2Mode: boolean;
  filterMode: FilterMode;
  effectiveFilterMode: FilterMode;
  isAutoMode: boolean;
  selectedPrograms: string[];
}

export function useEduTreeV2Data(filterMode: FilterMode = null): UseEduTreeV2DataResult {
  const flags = useFeatureFlags();
  const pathHighlight = usePathHighlight();
  
  const isV2Mode = flags.eduTreeV2Grid && flags.eduTreeLayoutMode === 'manual_v1';
  
  // Get user plan for selected course enrichment
  const { data: userPlan } = useUserPlan();
  
  // REMOVED: Early return logic that was causing loading loops
  // Let downstream components handle graceful rendering when context is warming
  
  // Auto-detect program vs program comparison using context selections
  const { effectiveFilterMode, isAutoMode } = useMemo(() => {
    if (!filterMode || filterMode !== 'compare-any') {
      return { effectiveFilterMode: filterMode, isAutoMode: false };
    }
    
    // Use context selections instead of parsing URL directly
    const { primarySelection, secondarySelection } = pathHighlight;
    const bothPrograms = 
      primarySelection?.kind === 'program' && 
      secondarySelection?.kind === 'program';
    
    console.log('[EduTreeV2Data] Context-based auto-detection:', {
      primarySelection,
      secondarySelection,
      bothPrograms
    });
    
    if (bothPrograms) {
      console.log('[EduTreeV2Data] Auto-detected program comparison, using compare-programs mode');
      return { effectiveFilterMode: 'compare-programs' as FilterMode, isAutoMode: true };
    }
    
    return { effectiveFilterMode: filterMode, isAutoMode: false };
  }, [filterMode, pathHighlight.primarySelection, pathHighlight.secondarySelection]);
  
  // Extract selected programs using context selections instead of URL parsing
  const selectedPrograms = useMemo(() => {
    const { primarySelection, secondarySelection } = pathHighlight;
    
    console.log('[EduTreeV2Data] Context-based selection processing:', {
      primarySelection,
      secondarySelection,
      effectiveFilterMode,
      isAutoMode,
      contextReady: !!(primarySelection || secondarySelection),
      primarySelectionValid: primarySelection?.kind === 'program',
      secondarySelectionValid: secondarySelection?.kind === 'program',
      timestamp: new Date().toISOString()
    });
    
    if (effectiveFilterMode?.includes('compare')) {
      const programs = [
        primarySelection?.kind === 'program' ? primarySelection.id : null,
        secondarySelection?.kind === 'program' ? secondarySelection.id : null
      ].filter(Boolean) as string[];
      console.log('[EduTreeV2Data] COMPARE MODE - Computed selectedPrograms:', {
        programs,
        primarySelection,
        secondarySelection,
        filterMode: effectiveFilterMode,
        primaryId: primarySelection?.id,
        secondaryId: secondarySelection?.id,
        primaryKind: primarySelection?.kind,
        secondaryKind: secondarySelection?.kind,
        shouldHaveCS: programs.includes('bs_cs'),
        shouldHaveIT: programs.includes('bs_it')
      });
      
      // CRITICAL: If we don't have any programs, something is very wrong
      if (programs.length === 0) {
        console.error('[EduTreeV2Data] CRITICAL: No programs found in compare mode! Context may not be ready.');
        console.log('[EduTreeV2Data] Full context state:', pathHighlight);
      }
      
      return programs;
    } else {
      // For single-program modes, map filter mode to program ID or use context selection
      const singleProgramResult = (() => {
        switch (effectiveFilterMode) {
          case 'bs_it':
            return ['bs_it'];
          case 'se':
            return ['bs_cs'];
          case 'ds':
            return ['bs_cs'];
          case 'bsn':
            return ['bsn'];
          default:
            // If no specific program mode, use context selection
            return [
              primarySelection?.kind === 'program' ? primarySelection.id : null
            ].filter(Boolean) as string[];
        }
      })();
      console.log('[EduTreeV2Data] SINGLE PROGRAM MODE - selectedPrograms:', {
        result: singleProgramResult,
        effectiveFilterMode,
        primarySelection
      });
      return singleProgramResult;
    }
  }, [effectiveFilterMode, pathHighlight.primarySelection, pathHighlight.secondarySelection]);

  const { blocks, edges } = useMemo(() => {
    if (!isV2Mode) {
      return { blocks: [], edges: [] };
    }
    
    console.log('[EduTreeV2Data] PHASE 5 DEBUG - Using golden layout seed with filter mode:', effectiveFilterMode, isAutoMode ? '(auto-detected)' : '');
    console.log('[EduTreeV2Data] PHASE 5 DEBUG - Original filterMode:', filterMode, '→ effectiveFilterMode:', effectiveFilterMode);
    console.log('[EduTreeV2Data] Selected programs:', selectedPrograms);
    
    // DEBUG: Count both CS and IT nodes in original seed data
    const originalItNodes = GOLDEN_LAYOUT_SEED.blocks.filter(b => b.program_id === 'bs_it');
    const originalCsNodes = GOLDEN_LAYOUT_SEED.blocks.filter(b => b.program_id === 'bs_cs');
    console.log('[DEBUG] Original seed data node counts:', {
      IT: { count: originalItNodes.length, sample: originalItNodes.slice(0, 3).map(n => ({ id: n.id, program_id: n.program_id, track_id: n.track_id }))},
      CS: { count: originalCsNodes.length, sample: originalCsNodes.slice(0, 3).map(n => ({ id: n.id, program_id: n.program_id, track_id: n.track_id }))}
    });
    
    // Apply enhanced filtering with selectedPrograms
    console.log('[EduTreeV2Data] About to filter with:', {
      effectiveFilterMode,
      selectedPrograms,
      programsLength: selectedPrograms.length,
      originalBlocksCount: GOLDEN_LAYOUT_SEED.blocks.length
    });
    
    const filteredBlocks = filterBlocksByMode(GOLDEN_LAYOUT_SEED.blocks, effectiveFilterMode, { programs: selectedPrograms });
    
    // DEBUG: Count both CS and IT nodes after mode filtering
    const itNodesAfterFilter = filteredBlocks.filter(b => b.program_id === 'bs_it');
    const csNodesAfterFilter = filteredBlocks.filter(b => b.program_id === 'bs_cs');
    console.log('[DEBUG] Nodes after filterBlocksByMode:', {
      IT: { count: itNodesAfterFilter.length, sample: itNodesAfterFilter.slice(0, 3).map(n => ({ id: n.id, program_id: n.program_id, track_id: n.track_id }))},
      CS: { count: csNodesAfterFilter.length, sample: csNodesAfterFilter.slice(0, 3).map(n => ({ id: n.id, program_id: n.program_id, track_id: n.track_id }))},
      selectedPrograms,
      effectiveFilterMode
    });
    
    // GUARD A — Final whitelist: Remove any ghost for non-selected programs
    const selected = new Set(selectedPrograms);
    console.log('[GuardA] Pre-filter ghost check:', {
      selectedPrograms,
      selected: Array.from(selected),
      ghosts: filteredBlocks.filter(b => b.is_empty_year === true).map(g => ({ id: g.id, program_id: g.program_id }))
    });
    
    const blocksFinal = filteredBlocks.filter(b => {
      const isGhost = b.is_empty_year === true;
      if (!isGhost) return true;                         // allow normal nodes
      if (!b.program_id) return false;                   // never allow programless ghosts
      
      // CRITICAL: For CS single-program modes, ALWAYS allow CS blocks and ghosts
      if (isGhost && b.program_id === 'bs_cs' && selectedPrograms.includes('bs_cs')) {
        console.log('[GuardA] EXPLICITLY allowing CS ghost in single-program mode:', b.id);
        return true;
      }
      
      // CRITICAL: For single-program IT mode, ALWAYS allow IT ghost
      if (isGhost && b.program_id === 'bs_it' && selectedPrograms.includes('bs_it')) {
        console.log('[GuardA] EXPLICITLY allowing IT ghost in single-program mode:', b.id);
        return true;
      }
      
      return selected.has(b.program_id);                 // ONLY allow ghosts for selected programs
    });
    
    // DEBUG: Count both CS and IT nodes after ghost filtering (final)
    const itNodesFinal = blocksFinal.filter(b => b.program_id === 'bs_it');
    const csNodesFinal = blocksFinal.filter(b => b.program_id === 'bs_cs');
    console.log('[DEBUG] Final node counts after all filtering:', {
      IT: { count: itNodesFinal.length, sample: itNodesFinal.slice(0, 3).map(n => ({ id: n.id, program_id: n.program_id, position_y: n.position_y }))},
      CS: { count: csNodesFinal.length, sample: csNodesFinal.slice(0, 3).map(n => ({ id: n.id, program_id: n.program_id, position_y: n.position_y }))},
      totalBlocks: blocksFinal.length
    });
    
    console.log('[GuardA] Ghost filter applied:', {
      selected: Array.from(selected),
      effectiveFilterMode,
      ghostsFiltered: filteredBlocks.length - blocksFinal.length,
      before: filteredBlocks.filter(b => b.is_empty_year === true).map(g => ({ id: g.id, program_id: g.program_id })),
      after: blocksFinal.filter(b => b.is_empty_year === true).map(g => ({ id: g.id, program_id: g.program_id }))
    });
    
    const filteredEdges = filterEdgesByBlocks(GOLDEN_LAYOUT_SEED.edges, blocksFinal);
    
    // PHASE 5: Add table logging right before node creation to verify no Y3 track blocks survive
    console.log('[EduTreeV2Data] PHASE 5 DEBUG - Blocks after filtering:');
    console.table(blocksFinal.map(b => ({
      id: b.id,
      title: b.title?.slice(0, 30) + '...',
      year: b.level_year,
      program_id: b.program_id,
      track_id: b.track_id,
      type: b.rule_type
    })));
    
    console.log('[EduTreeV2Data] Filtered to', {
      blocks: blocksFinal.length,
      edges: filteredEdges.length,
      effectiveFilterMode,
      isAutoMode
    });
    
    return {
      blocks: blocksFinal,
      edges: filteredEdges
    };
  }, [isV2Mode, effectiveFilterMode, isAutoMode, selectedPrograms]);
  
  // Extract requirement IDs for batch fetching (exclude ghosts/empty years)
  const requirementIds = useMemo(() => {
    // DEBUG: Log block structure to understand what we're working with
    if (blocks.length > 0) {
      console.log('[MP] 📊 Sample blocks:', blocks.slice(0, 5).map(b => ({
        id: b.id,
        rule_type: b.rule_type,
        level_year: b.level_year,
        is_empty_year: b.is_empty_year,
        is_virtual: b.is_virtual,
      })));
    }
    
    // All V2RequirementBlock instances are requirements by definition
    // Filter out ghosts, empty years, and gates/headers based on ID pattern
    const ids = blocks
      .filter(b => {
        if (!b?.id) return false;
        if (b.is_empty_year === true) return false;
        if (b.is_virtual === true) return false;
        if (String(b.id).startsWith('gate-')) return false;
        if (String(b.id).startsWith('header-')) return false;
        if (String(b.id).includes('ghost')) return false;
        
        // Accept year-prefixed requirement IDs (y1-math, y2-cs-core, etc.)
        return /^y\d-/.test(String(b.id));
      })
      .map(b => b.id);
    
    // DEBUG: Expose for console probing
    if (typeof window !== 'undefined') {
      (window as any).__mpRequirementIds = ids;
    }
    console.log('[MP] 📦 requirementIds (final visible blocks):', ids, {
      totalBlocks: blocks.length,
      filtered: ids.length,
      sampleIds: ids.slice(0, 5)
    });
    
    return ids;
  }, [blocks]);
  
  // Batch fetch marketplace data and selected courses
  const { data: marketplaceData } = useBatchRequirementOptions(requirementIds);
  const { data: selectedCoursesData } = useUserPlanSelections(userPlan?.id);

  // Phase 3: Gate aggregation (chips show transferables) - Declarative rules
  const gateAggregates = useMemo(() => {
    if (!marketplaceData) return new Map<string, MPInfo>();

    // Declarative aggregation rules - add new gates here
    const AGG_RULES: Array<{ gateId: string; where(b: V2RequirementBlock): boolean }> = [
      { 
        gateId: 'gate-y2-programs', 
        where: b => /^y1-/.test(String(b.id)) && 
                   !String(b.id).startsWith('header-') && 
                   !b.is_empty_year &&
                   !b.is_virtual
      },
      { 
        gateId: 'gate-y3-tracks', 
        where: b => /^y2-/.test(String(b.id)) && 
                   !String(b.id).startsWith('header-') && 
                   !b.is_empty_year &&
                   !b.is_virtual &&
                   (!selectedPrograms?.length || selectedPrograms.includes(b.program_id ?? ''))
      },
      // Future gates can be added here
    ];

    const m = new Map<string, MPInfo>();
    for (const rule of AGG_RULES) {
      const childIds = blocks.filter(rule.where).map(b => b.id);
      if (childIds.length > 0) {
        m.set(rule.gateId, aggregateGateMarketplaceData(childIds, marketplaceData));
      }
    }

    return m;
  }, [blocks, marketplaceData, selectedPrograms]);
  
  // Enrich blocks with marketplace and selection data
  const enrichedBlocks = useMemo(() => {
    // DIAGNOSTIC: Dump first 10 blocks' MP join result (Step 3 from checklist)
    if (typeof window !== 'undefined' && !(window as any).__mpEnrichOnce) {
      (window as any).__mpEnrichOnce = true;
      console.log('[ENRICH:sample] First 10 blocks with MP lookup:',
        blocks.slice(0, 10).map(b => ({
          id: b.id,
          mp: getMpInfoForBlock(marketplaceData, String(b.id)),
          isGate: String(b.id).startsWith('gate-')
        }))
      );
    }
    
    return blocks.map(block => {
      const isGate = String(block.id).startsWith('gate-');
      const mpInfo = isGate 
        ? gateAggregates.get(block.id)
        : getMpInfoForBlock(marketplaceData, String(block.id));
      const selectedCourse = selectedCoursesData?.get(block.id);

      if (!mpInfo && !selectedCourse && !userPlan?.id) return block;

      // Ensure optionsCount is a number
      const optionsCountNum = 
        mpInfo && typeof mpInfo.optionsCount !== 'number'
          ? Number(mpInfo.optionsCount)
          : mpInfo?.optionsCount;

      return {
        ...block,
        optionsCount: optionsCountNum,
        hasAceCredit: !!mpInfo?.hasAceCredit,
        hasClep: !!mpInfo?.hasClep,
        selectedCourse,
        planId: userPlan?.id,
        // gate CSS helpers
        aggHasAce: !!mpInfo?.hasAceCredit,
        aggHasClep: !!mpInfo?.hasClep,
      };
    });
  }, [blocks, marketplaceData, gateAggregates, selectedCoursesData, userPlan?.id]);
  
  return {
    blocks: enrichedBlocks,
    edges,
    isLoading: false,
    isV2Mode,
    filterMode,
    effectiveFilterMode,
    isAutoMode,
    selectedPrograms
  };
}
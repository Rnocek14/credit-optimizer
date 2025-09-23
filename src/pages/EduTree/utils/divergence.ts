/**
 * Data-Driven Gate Placement - Dynamic Divergence Analysis
 * Detects where programs/tracks actually branch in the curriculum
 */

import { assertGateX, assertNoDanglingHeaders } from '../data/validation';

type Year = 1 | 2 | 3 | 4;
type ProgramId = 'bs_cs' | 'bs_it' | (string & {});
type TrackCode = 'se' | 'ds' | (string & {});

export interface Columns {
  y1: number; 
  y2: number; 
  y3: number; 
  y4: number;
  pg?: number; // optional explicit Program Gate x
  tg?: number; // optional explicit Track Gate x
}

type TracksByProgram = Record<ProgramId, ReadonlyArray<TrackCode>>;

export interface DivergenceResult {
  divergesAfter: Year | null;        // 0 or null means "no prior year"
  forkBetween: [Year, Year] | null;  // e.g., [1,2]
}

export interface GatePositions {
  showPG: boolean;
  pgX: number | undefined;
  showTG: boolean;
  tgX: number | undefined;
}

function eqSets<T>(a: Set<T>, b: Set<T>) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

/** Build per-year block sets for the given context. */
function perYearForContext(
  blocks: { id: string; level_year: number; is_virtual?: boolean; program_id?: string | null; track_id?: string | null; }[],
  ctx: { programId?: ProgramId; trackId?: TrackCode },
  isTrackDivergenceAnalysis?: boolean
): Map<Year, Set<string>> {
  const years: Year[] = [1, 2, 3, 4];
  const m = new Map<Year, Set<string>>(years.map(y => [y, new Set()]));
  
  console.log(`[perYearForContext] Filtering blocks for context:`, ctx, `Total blocks: ${blocks.length}, isTrackDivergenceAnalysis: ${isTrackDivergenceAnalysis}`);
  
  for (const b of blocks) {
    if (b.is_virtual) continue;
    const y = Math.max(1, Math.min(4, Math.floor(b.level_year || 1))) as Year;

    // Program filter
    if (ctx.programId) {
      if (b.program_id && b.program_id !== ctx.programId) continue;
    } else {
      // no program chosen => only shared (no program_id)
      if (b.program_id) continue;
    }

    // Track filter - CRITICAL FIX: Handle track divergence analysis properly
    if (ctx.trackId) {
      // If we have a specific track, only include blocks for that track OR blocks with no track (shared)
      if (b.track_id && b.track_id !== ctx.trackId) continue;
    } else if (!isTrackDivergenceAnalysis) {
      // If no specific track requested AND not doing track divergence analysis, exclude track-specific blocks
      if (b.track_id) continue;
    }
    // If isTrackDivergenceAnalysis=true and no specific track, include ALL blocks (track-specific and shared)

    m.get(y)!.add(b.id);
  }
  
  const result = Array.from(m.entries()).map(([year, set]) => [year, set.size]).join(', ');
  console.log(`[perYearForContext] Result for ${JSON.stringify(ctx)}: ${result}`);
  return m;
}

/** First year where program sets differ. */
export function computeProgramDivergence(
  blocks: any[],
  programs: ProgramId[]
): DivergenceResult {
  console.log(`[computeProgramDivergence] Analyzing programs:`, programs);
  
  if (programs.length < 2) {
    console.log(`[computeProgramDivergence] Not enough programs (${programs.length}) for divergence`);
    return { divergesAfter: null, forkBetween: null };
  }

  const years: Year[] = [1, 2, 3, 4];
  const sets = programs.map(p => perYearForContext(blocks, { programId: p }, false));

  for (const y of years) {
    const slice = sets.map(s => s.get(y)!);
    const same = slice.every(s => s.size === slice[0].size && [...s].every(v => slice[0].has(v)));
    console.log(`[computeProgramDivergence] Year ${y} comparison:`, slice.map((s, i) => `${programs[i]}=${s.size}`).join(', '), 'same?', same);
    if (!same) {
      // If divergence only at Y4, return null (no gate needed)
      if (y === 4) {
        console.log(`[computeProgramDivergence] Divergence at Y4, no gate needed`);
        return { divergesAfter: null, forkBetween: null };
      }
      console.log(`[computeProgramDivergence] Divergence found at Y${y}, fork between Y${y-1} and Y${y}`);
      return { divergesAfter: (y - 1) as Year, forkBetween: [(y - 1) as Year, y as Year] };
    }
  }
  console.log(`[computeProgramDivergence] No divergence found`);
  return { divergesAfter: null, forkBetween: null };
}

/** First year where track sets differ (within one program). */
export function computeTrackDivergence(
  blocks: any[],
  program: ProgramId,
  tracks: ReadonlyArray<TrackCode>
): DivergenceResult {
  console.log(`[computeTrackDivergence] Analyzing ${program} with tracks:`, tracks);
  
  if (tracks.length < 2) {
    console.log(`[computeTrackDivergence] Not enough tracks (${tracks.length}) for divergence`);
    return { divergesAfter: null, forkBetween: null };
  }

  // Filter blocks to include track-specific blocks for this program  
  const relevantBlocks = blocks.filter(b => 
    !b.is_virtual && 
    (b.program_id === program || !b.program_id) // Program blocks or shared
  );
  
  console.log(`[computeTrackDivergence] Relevant blocks for ${program}:`, relevantBlocks.length, 
    'Track blocks:', relevantBlocks.filter(b => b.track_id).map(b => ({id: b.id, track: b.track_id, year: b.level_year})));

  const years: Year[] = [1, 2, 3, 4];
  const sets = tracks.map(t => perYearForContext(relevantBlocks, { programId: program, trackId: t }, true));

  for (const y of years) {
    const slice = sets.map(s => s.get(y)!);
    const same = slice.every(s => s.size === slice[0].size && [...s].every(v => slice[0].has(v)));
    console.log(`[computeTrackDivergence] Year ${y} comparison:`, slice.map((s, i) => `${tracks[i]}=${s.size}`).join(', '), 'same?', same);
    if (!same) {
      // If divergence only at Y4, return null (no gate needed)
      if (y === 4) {
        console.log(`[computeTrackDivergence] Divergence at Y4, no gate needed`);
        return { divergesAfter: null, forkBetween: null };
      }
      console.log(`[computeTrackDivergence] Divergence found at Y${y}, fork between Y${y-1} and Y${y}`);
      return { divergesAfter: (y - 1) as Year, forkBetween: [(y - 1) as Year, y as Year] };
    }
  }
  console.log(`[computeTrackDivergence] No divergence found`);
  return { divergesAfter: null, forkBetween: null };
}

function mid(a: number, b: number): number {
  console.log('[mid] Calculating midpoint:', {
    a,
    b,
    validInputs: Number.isFinite(a) && Number.isFinite(b)
  });
  
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    console.error('[mid] CRITICAL: Invalid values passed to mid function:', { a, b });
    return 500; // Better fallback position
  }
  
  const result = (a + b) / 2;
  console.log('[mid] Calculated midpoint result:', result);
  
  return result;
}

/** Decide which gates to show and where to place them. */
export function decideGatePositions(opts: {
  blocks: any[];
  programs: ProgramId[];
  tracksByProgram: TracksByProgram;
  cols: Columns;
}): GatePositions & { _pgBetween: [Year, Year] | null; _tgBetween: [Year, Year] | null } {
  const { blocks, programs, tracksByProgram, cols } = opts;
  
  // COMPREHENSIVE DEBUG LOGGING - Enhanced input validation
  console.log('[decideGatePositions] COMPREHENSIVE INPUT DEBUG:', {
    blocksCount: blocks.length,
    programs,
    tracksByProgram,
    cols,
    blocksByYear: {
      Y1: blocks.filter(b => b.level_year === 1).length,
      Y2: blocks.filter(b => b.level_year === 2).length,
      Y3: blocks.filter(b => b.level_year === 3).length,
      Y4: blocks.filter(b => b.level_year === 4).length
    },
    trackBlocksDetailed: blocks.filter(b => b.track_id).map(b => ({
      id: b.id,
      level_year: b.level_year,
      program_id: b.program_id,
      track_id: b.track_id
    })),
    gateNodesPresent: {
      programGate: !!blocks.find(b => b.id === 'gate-y2-programs'),
      trackGate: !!blocks.find(b => b.id === 'gate-y3-tracks')
    }
  });

  // Program divergence - requires multiple programs
  console.log('[decideGatePositions] PROGRAM DIVERGENCE ANALYSIS:', {
    programsCount: programs.length,
    programs,
    willAnalyzeProgramDivergence: programs.length >= 2
  });
  
  const pgDiv = computeProgramDivergence(blocks, programs);
  console.log('[decideGatePositions] Program divergence result:', pgDiv);
  
  const showPG = !!pgDiv.forkBetween;
  const pgX = showPG && pgDiv.forkBetween
    ? mid(cols[`y${pgDiv.forkBetween[0] as 1|2|3|4}`], cols[`y${pgDiv.forkBetween[1] as 1|2|3|4}`])
    : undefined; // Use undefined when hidden (no fallbacks)
    
  if (showPG) {
    console.log('[decideGatePositions] Program gate ENABLED:', { 
      forkBetween: pgDiv.forkBetween, 
      pgX,
      colsUsed: { 
        y1: cols.y1, 
        y2: cols.y2, 
        midCalculation: `(${cols.y1} + ${cols.y2}) / 2 = ${pgX}` 
      }
    });
  } else {
    console.log('[decideGatePositions] Program gate DISABLED - no divergence found');
  }

  // Track divergence - requires a single program with multiple tracks
  console.log('[decideGatePositions] TRACK DIVERGENCE ANALYSIS START:', {
    programsToAnalyze: programs,
    tracksByProgram
  });
  
  let showTG = false;
  let tgBetween: [1|2|3|4, 1|2|3|4] | null = null;
  
  for (const p of programs) {
    const tracks = tracksByProgram[p] ?? [];
    console.log('[decideGatePositions] Analyzing tracks for program:', p, {
      tracks,
      tracksCount: tracks.length,
      willAnalyzeTrackDivergence: tracks.length >= 2
    });
    
    if (tracks.length >= 2) {
      console.log('[decideGatePositions] Calling computeTrackDivergence with params:', {
        program: p,
        tracks,
        blocksCount: blocks.length
      });
      
      const tgDiv = computeTrackDivergence(blocks, p, tracks);
      console.log('[decideGatePositions] Track divergence result for', p, ':', tgDiv);
      
      if (tgDiv.forkBetween) { 
        showTG = true; 
        tgBetween = tgDiv.forkBetween as [1|2|3|4, 1|2|3|4];
        console.log('[decideGatePositions] Track gate ENABLED for', p, ':', { 
          tracks, 
          forkBetween: tgDiv.forkBetween
        });
        break; 
      } else {
        console.log('[decideGatePositions] Track gate DISABLED for', p, '- no divergence found');
      }
    } else {
      console.log('[decideGatePositions] Track gate SKIPPED for', p, '- insufficient tracks');
    }
  }
  
  const tgX = showTG && tgBetween
    ? mid(cols[`y${tgBetween[0]}`], cols[`y${tgBetween[1]}`])
    : undefined; // Use undefined when hidden (no fallbacks)
    
  if (showTG && tgBetween) {
    console.log('[decideGatePositions] Track gate final calculation:', {
      tgBetween,
      tgX,
      colsUsed: {
        y2: cols.y2,
        y3: cols.y3,
        midCalculation: `(${cols.y2} + ${cols.y3}) / 2 = ${tgX}`
      }
    });
  }

  const result = { 
    showPG, 
    pgX, 
    showTG, 
    tgX, 
    _pgBetween: pgDiv.forkBetween ?? null,
    _tgBetween: tgBetween 
  };
  
  console.log('[decideGatePositions] FINAL RESULT:', {
    ...result,
    validCoordinates: {
      pgX: Number.isFinite(pgX),
      tgX: Number.isFinite(tgX)
    },
    summary: `PG: ${showPG ? `enabled @ ${pgX}` : 'disabled'}, TG: ${showTG ? `enabled @ ${tgX}` : 'disabled'}`
  });
  
  // CRITICAL: Validate coordinates before returning
  if (showPG && !Number.isFinite(pgX)) {
    console.error('[decideGatePositions] CRITICAL: Program gate enabled but pgX is invalid:', pgX);
  }
  if (showTG && !Number.isFinite(tgX)) {
    console.error('[decideGatePositions] CRITICAL: Track gate enabled but tgX is invalid:', tgX);
  }
  
  return result;
}

// Dev utilities for console testing
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).computeProgramDivergence = computeProgramDivergence;
  (window as any).computeTrackDivergence = computeTrackDivergence;
  (window as any).decideGatePositions = decideGatePositions;
  
  // GPT's validation utilities
  (window as any).assertGateX = assertGateX;
  (window as any).assertNoDanglingHeaders = assertNoDanglingHeaders;
}
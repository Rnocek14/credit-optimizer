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
  ctx: { programId?: ProgramId; trackId?: TrackCode }
): Map<Year, Set<string>> {
  const years: Year[] = [1, 2, 3, 4];
  const m = new Map<Year, Set<string>>(years.map(y => [y, new Set()]));
  
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

    // Track filter
    if (ctx.trackId) {
      if (b.track_id && b.track_id !== ctx.trackId) continue;
    } else {
      // no track chosen => exclude track-specific
      if (b.track_id) continue;
    }

    m.get(y)!.add(b.id);
  }
  return m;
}

/** First year where program sets differ. */
export function computeProgramDivergence(
  blocks: any[],
  programs: ProgramId[]
): DivergenceResult {
  console.log('[DIVERGENCE DEBUG] computeProgramDivergence called with:', { programs, blocksCount: blocks.length });
  
  if (programs.length < 2) {
    console.log('[DIVERGENCE DEBUG] Less than 2 programs, returning null');
    return { divergesAfter: null, forkBetween: null };
  }

  const years: Year[] = [1, 2, 3, 4];
  const sets = programs.map(p => perYearForContext(blocks, { programId: p }));
  
  console.log('[DIVERGENCE DEBUG] Program block sets by year:', 
    programs.map((p, i) => ({ 
      program: p, 
      sets: Object.fromEntries(years.map(y => [y, Array.from(sets[i].get(y)!)]))
    }))
  );

  for (const y of years) {
    const slice = sets.map(s => s.get(y)!);
    const same = slice.every(s => s.size === slice[0].size && [...s].every(v => slice[0].has(v)));
    
    console.log('[DIVERGENCE DEBUG] Year', y, 'comparison:', {
      sets: slice.map((s, i) => ({ program: programs[i], blocks: Array.from(s) })),
      same
    });
    
    if (!same) {
      // If divergence only at Y4, return null (no gate needed)
      if (y === 4) {
        console.log('[DIVERGENCE DEBUG] Divergence at Y4, no gate needed');
        return { divergesAfter: null, forkBetween: null };
      }
      // Special case: divergence at Y1 - position gate before Y1
      if (y === 1) {
        const result = { divergesAfter: null, forkBetween: [1, 1] as [Year, Year] };
        console.log('[DIVERGENCE DEBUG] Found Y1 divergence (boundary case), returning:', result);
        return result;
      }
      const result = { divergesAfter: (y - 1) as Year, forkBetween: [(y - 1) as Year, y as Year] as [Year, Year] };
      console.log('[DIVERGENCE DEBUG] Found divergence, returning:', result);
      return result;
    }
  }
  console.log('[DIVERGENCE DEBUG] No divergence found, returning null');
  return { divergesAfter: null, forkBetween: null };
}

/** First year where track sets differ (within one program). */
export function computeTrackDivergence(
  blocks: any[],
  program: ProgramId,
  tracks: ReadonlyArray<TrackCode>
): DivergenceResult {
  if (tracks.length < 2) {
    return { divergesAfter: null, forkBetween: null };
  }

  const years: Year[] = [1, 2, 3, 4];
  const sets = tracks.map(t => perYearForContext(blocks, { programId: program, trackId: t }));

  for (const y of years) {
    const slice = sets.map(s => s.get(y)!);
    const same = slice.every(s => s.size === slice[0].size && [...s].every(v => slice[0].has(v)));
    if (!same) {
      // If divergence only at Y4, return null (no gate needed)
      if (y === 4) return { divergesAfter: null, forkBetween: null };
      return { divergesAfter: (y - 1) as Year, forkBetween: [(y - 1) as Year, y as Year] };
    }
  }
  return { divergesAfter: null, forkBetween: null };
}

function mid(a: number, b: number) { return (a + b) / 2; }

/** Decide which gates to show and where to place them. */
export function decideGatePositions(opts: {
  blocks: any[];
  programs: ProgramId[];
  tracksByProgram: TracksByProgram;
  cols: Columns;
}): GatePositions & { _pgBetween: [Year, Year] | null; _tgBetween: [Year, Year] | null } {
  const { blocks, programs, tracksByProgram, cols } = opts;
  
  console.log('[GATE DEBUG] decideGatePositions called with:', {
    blocksCount: blocks.length,
    programs,
    tracksByProgram,
    cols
  });

  // Program gate - use computed fork position only, no fallbacks
  const pgDiv = computeProgramDivergence(blocks, programs);
  console.log('[GATE DEBUG] Program divergence result:', pgDiv);
  
  const showPG = !!pgDiv.forkBetween;
  const pgX = showPG && pgDiv.forkBetween
    ? pgDiv.forkBetween[0] === pgDiv.forkBetween[1] && pgDiv.forkBetween[0] === 1
      ? cols.y1 - 100  // Position before Y1 for boundary case
      : mid(cols[`y${pgDiv.forkBetween[0] as 1|2|3|4}`], cols[`y${pgDiv.forkBetween[1] as 1|2|3|4}`])
    : undefined; // Use undefined when hidden (no fallbacks)
    
  console.log('[GATE DEBUG] Program gate decision:', { showPG, pgX, forkBetween: pgDiv.forkBetween });

  // Track gate - use computed fork position only
  let showTG = false;
  let tgBetween: [1|2|3|4, 1|2|3|4] | null = null;
  for (const p of programs) {
    const tracks = tracksByProgram[p] ?? [];
    if (tracks.length < 2) continue;
    const tgDiv = computeTrackDivergence(blocks, p, tracks);
    if (tgDiv.forkBetween) { 
      showTG = true; 
      tgBetween = tgDiv.forkBetween as [1|2|3|4, 1|2|3|4];
      break; 
    }
  }
  const tgX = showTG && tgBetween
    ? mid(cols[`y${tgBetween[0]}`], cols[`y${tgBetween[1]}`])
    : undefined; // Use undefined when hidden (no fallbacks)

  const result = { 
    showPG, 
    pgX, 
    showTG, 
    tgX, 
    _pgBetween: pgDiv.forkBetween ?? null,
    _tgBetween: tgBetween 
  };
  
  console.log('[GATE DEBUG] Final gate positions result:', result);
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
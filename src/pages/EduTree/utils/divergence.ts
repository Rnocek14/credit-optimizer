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
  
  console.log(`[perYearForContext] Filtering blocks for context:`, ctx, `Total blocks: ${blocks.length}`);
  
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

    // Track filter - FIXED: Include track-specific blocks when doing track comparisons
    if (ctx.trackId) {
      // If we have a specific track, only include blocks for that track OR blocks with no track (shared)
      if (b.track_id && b.track_id !== ctx.trackId) continue;
    } else {
      // If no specific track requested, include program-level blocks but exclude track-specific ones
      // UNLESS we're analyzing track divergence (in which case we should include all tracks)
      if (b.track_id) continue;
    }

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
  if (programs.length < 2) {
    return { divergesAfter: null, forkBetween: null };
  }

  const years: Year[] = [1, 2, 3, 4];
  const sets = programs.map(p => perYearForContext(blocks, { programId: p }));

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
  const sets = tracks.map(t => perYearForContext(relevantBlocks, { programId: program, trackId: t }));

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

function mid(a: number, b: number) { return (a + b) / 2; }

/** Decide which gates to show and where to place them. */
export function decideGatePositions(opts: {
  blocks: any[];
  programs: ProgramId[];
  tracksByProgram: TracksByProgram;
  cols: Columns;
}): GatePositions & { _pgBetween: [Year, Year] | null; _tgBetween: [Year, Year] | null } {
  const { blocks, programs, tracksByProgram, cols } = opts;

  // Program gate - use computed fork position only, no fallbacks
  const pgDiv = computeProgramDivergence(blocks, programs);
  const showPG = !!pgDiv.forkBetween;
  const pgX = showPG && pgDiv.forkBetween
    ? mid(cols[`y${pgDiv.forkBetween[0] as 1|2|3|4}`], cols[`y${pgDiv.forkBetween[1] as 1|2|3|4}`])
    : undefined; // Use undefined when hidden (no fallbacks)

  // Track gate - use computed fork position only
  let showTG = false;
  let tgBetween: [1|2|3|4, 1|2|3|4] | null = null;
  
  // Always add debug logging (not just development)
  console.log('[decideGatePositions] Track gate analysis:', {
    programs,
    tracksByProgram,
    blocksWithTracks: blocks.filter(b => b.track_id).map(b => ({ id: b.id, program_id: b.program_id, track_id: b.track_id, level_year: b.level_year }))
  });
  
  for (const p of programs) {
    const tracks = tracksByProgram[p] ?? [];
    console.log(`[decideGatePositions] Program ${p} has tracks:`, tracks);
    if (tracks.length < 2) continue;
    const tgDiv = computeTrackDivergence(blocks, p, tracks);
    console.log(`[decideGatePositions] Track divergence for ${p}:`, tgDiv);
    if (tgDiv.forkBetween) { 
      showTG = true; 
      tgBetween = tgDiv.forkBetween as [1|2|3|4, 1|2|3|4];
      break; 
    }
  }
  const tgX = showTG && tgBetween
    ? mid(cols[`y${tgBetween[0]}`], cols[`y${tgBetween[1]}`])
    : undefined; // Use undefined when hidden (no fallbacks)

  return { 
    showPG, 
    pgX, 
    showTG, 
    tgX, 
    _pgBetween: pgDiv.forkBetween ?? null,
    _tgBetween: tgBetween 
  };
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
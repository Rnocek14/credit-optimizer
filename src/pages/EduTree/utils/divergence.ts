/**
 * Data-Driven Gate Placement - Dynamic Divergence Analysis
 * Detects where programs/tracks actually branch in the curriculum
 */

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
  pgX: number;
  showTG: boolean;
  tgX: number;
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
  if (programs.length < 2) {
    return { divergesAfter: null, forkBetween: null };
  }

  const years: Year[] = [1, 2, 3, 4];
  const sets = programs.map(p => perYearForContext(blocks, { programId: p }));

  for (const y of years) {
    const slice = sets.map(s => s.get(y)!);
    const same = slice.every(s => eqSets(s, slice[0]));
    if (!same) return { divergesAfter: (y - 1) as Year, forkBetween: [y as Year, (y + 1) as Year] };
  }
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
    const same = slice.every(s => eqSets(s, slice[0]));
    if (!same) return { divergesAfter: (y - 1) as Year, forkBetween: [y as Year, (y + 1) as Year] };
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
}): GatePositions {
  const { blocks, programs, tracksByProgram, cols } = opts;

  // Program gate - use computed fork position
  const pgDiv = computeProgramDivergence(blocks, programs);
  const showPG = !!pgDiv.forkBetween;
  const pgX = showPG && pgDiv.forkBetween
    ? mid(cols[`y${pgDiv.forkBetween[0] as 1|2|3|4}`], cols[`y${pgDiv.forkBetween[1] as 1|2|3|4}`])
    : cols.pg ?? ((cols.y1 + cols.y2) / 2);

  // Track gate - use computed fork position
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
    : cols.tg ?? ((cols.y2 + cols.y3) / 2);

  return { showPG, pgX, showTG, tgX };
}

// Dev utilities for console testing
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).computeProgramDivergence = computeProgramDivergence;
  (window as any).computeTrackDivergence = computeTrackDivergence;
  (window as any).decideGatePositions = decideGatePositions;
  
  // GPT's validation utilities
  const { assertGateX, assertNoDanglingHeaders } = require('../data/validation');
  (window as any).assertGateX = assertGateX;
  (window as any).assertNoDanglingHeaders = assertNoDanglingHeaders;
}
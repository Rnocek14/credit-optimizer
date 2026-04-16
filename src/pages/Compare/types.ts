/**
 * Shared types for the /compare experience.
 *
 * Credit picker model (toggles + sliders):
 *   - 4 sources (CLEP, SOPHIA, STUDYCOM, STRAIGHTERLINE)
 *   - Each source has a 0..N credits value (0 = effectively off)
 *   - URL synced as ?clep=12&sophia=30&studycom=15&straighterline=0
 */

export const CREDIT_SOURCES = ['CLEP', 'SOPHIA', 'STUDYCOM', 'STRAIGHTERLINE'] as const;
export type CreditSource = (typeof CREDIT_SOURCES)[number];

/** Display + URL-key metadata for each picker source. */
export const CREDIT_SOURCE_META: Record<
  CreditSource,
  { label: string; urlKey: string; max: number; step: number; perCourse: number }
> = {
  CLEP:           { label: 'CLEP exams',     urlKey: 'clep',           max: 30, step: 3, perCourse: 3 },
  SOPHIA:         { label: 'Sophia',         urlKey: 'sophia',         max: 60, step: 3, perCourse: 3 },
  STUDYCOM:       { label: 'Study.com',      urlKey: 'studycom',       max: 45, step: 3, perCourse: 3 },
  STRAIGHTERLINE: { label: 'StraighterLine', urlKey: 'straighterline', max: 30, step: 3, perCourse: 3 },
};

/** Picker state — credits per source. */
export type CreditPickerState = Record<CreditSource, number>;

export const EMPTY_PICKER: CreditPickerState = {
  CLEP: 0,
  SOPHIA: 0,
  STUDYCOM: 0,
  STRAIGHTERLINE: 0,
};

export function totalPickerCredits(state: CreditPickerState): number {
  return CREDIT_SOURCES.reduce((sum, src) => sum + (state[src] ?? 0), 0);
}

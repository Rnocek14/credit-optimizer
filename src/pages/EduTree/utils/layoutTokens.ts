/**
 * Centralized Layout Tokens - GPT's 8px Grid System
 * Single source of truth for all positioning calculations
 */

// 8px grid system for pixel-perfect alignment
export const GRID = 8;
export const snap8 = (n: number) => Math.round(n / GRID) * GRID;

// Core layout constants
export const CARD_W = 280;
export const YEAR_GUTTER = 120;
export const BASE_X = 200;
export const ROW_HEIGHT = 120;
export const ROW_GAP = 96;

// Column positions (snapped to 8px grid)
export const cols = () => ({
  y1: snap8(BASE_X),
  y2: snap8(BASE_X + CARD_W + YEAR_GUTTER),
  y3: snap8(BASE_X + 2 * (CARD_W + YEAR_GUTTER)),
  y4: snap8(BASE_X + 3 * (CARD_W + YEAR_GUTTER)),
  pg: snap8((BASE_X + (BASE_X + CARD_W + YEAR_GUTTER)) / 2),
  tg: snap8(((BASE_X + CARD_W + YEAR_GUTTER) + (BASE_X + 2 * (CARD_W + YEAR_GUTTER))) / 2),
});

// Year row Y positions (snapped to 8px grid)
export const yRow = (year: 1|2|3|4) => snap8(120 + (year - 1) * (ROW_HEIGHT + ROW_GAP));

// Midpoint calculation with grid snapping
export const mid = (a: number, b: number) => snap8((a + b) / 2);

// Gate-specific Y positions
export const gateY = {
  program: mid(yRow(1), yRow(2)), // Between Y1 and Y2
  track: mid(yRow(2), yRow(3)),   // Between Y2 and Y3
};

// CSS custom properties for consistent styling
export const cardDimensions = {
  width: CARD_W,
  paddingY: 12,
  paddingX: 14,
  borderRadius: 14,
  height: 72, // Fixed gate height for consistent alignment
};
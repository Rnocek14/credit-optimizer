/**
 * Key normalization and signature helpers
 */

// Normalizes any (string|null|undefined) → lowercased, trimmed string
export const nk = (s?: string | null) => (s ?? '').trim().toLowerCase();

// Build a safe, uniform pipe-delimited signature from optional parts.
// - normalizes each segment with nk()
// - drops falsy/empty segments to avoid leading/trailing pipes
export function mkSig(parts: Array<string | number | null | undefined>) {
  return parts
    .map(p => (p == null ? '' : String(p)))
    .map(nk)
    .filter(Boolean)
    .join('|');
}

// Case-preserving variant (for scenarios where case matters)
// Only trims, does NOT lowercase tokens
export function mkSigPreservingCase(parts: Array<string | number | null | undefined>) {
  return parts
    .map(p => (p == null ? '' : String(p)))
    .map(p => p.trim())
    .filter(Boolean)
    .join('|');
}

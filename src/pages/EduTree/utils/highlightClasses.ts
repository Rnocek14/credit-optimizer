// Which highlight classes we manage
const HL_NODE = ['hl--primary', 'hl--comparison', 'hl--both', 'hl--dim', 'hl--ghost'] as const;
const HL_EDGE = ['edge--primary', 'edge--comparison', 'edge--both', 'edge--dim'] as const;
const PROGRAM_CLASSES = ['node--program-cs', 'node--program-it', 'node--program-bsn', 'node--track-se', 'node--track-ds'] as const;
const HL_ALL  = [...HL_NODE, ...HL_EDGE, ...PROGRAM_CLASSES] as const;

// One fast regex to strip **only** our highlight tokens
const HL_PATTERN = new RegExp(
  String.raw`\b(?:hl--(?:primary|comparison|both|dim|ghost)|edge--(?:primary|comparison|both|dim)|node--(?:program-(?:cs|it|bsn)|track-(?:se|ds)))\b`,
  'g'
);

/** Remove any existing hl/edge highlight tokens, keep all other classes intact. */
export function stripHLClasses(cls?: string): string {
  if (!cls) return '';
  return cls.replace(HL_PATTERN, ' ').replace(/\s+/g, ' ').trim();
}

/** Add one highlight token after stripping old ones. No dupes, preserves other classes. */
export function withHLClass(cls: string | undefined, token: string): string {
  const base = stripHLClasses(cls);
  if (!token) return base;
  const parts = base ? base.split(/\s+/) : [];
  if (!parts.includes(token)) parts.push(token);
  return parts.join(' ').trim();
}

// Convenience wrappers (optional)
export const withNodeHL = (cls: string | undefined, token: typeof HL_NODE[number]) =>
  withHLClass(cls, token);

export const withEdgeHL = (cls: string | undefined, token: typeof HL_EDGE[number]) =>
  withHLClass(cls, token);

export const withProgramClass = (cls: string | undefined, token: typeof PROGRAM_CLASSES[number]) =>
  withHLClass(cls, token);

// Enhanced utility to add multiple classes at once
export const withMultipleClasses = (cls: string | undefined, ...tokens: string[]) => {
  let result = stripHLClasses(cls);
  for (const token of tokens) {
    if (token) {
      result = withHLClass(result, token);
    }
  }
  return result;
};
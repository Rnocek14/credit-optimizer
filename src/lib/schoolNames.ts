/**
 * Human-readable school names. A cold visitor doesn't know "TESU" from
 * "COSC" — every user-facing surface should show the full name at least once.
 */
const SCHOOL_NAMES: Record<string, string> = {
  TESU: 'Thomas Edison State University',
  COSC: 'Charter Oak State College',
  WGU: 'Western Governors University',
  EXCELSIOR: 'Excelsior University',
  EMPIRE: 'SUNY Empire State University',
};

export function schoolName(code: string | null | undefined): string {
  if (!code) return 'this school';
  return SCHOOL_NAMES[code.toUpperCase()] ?? code;
}

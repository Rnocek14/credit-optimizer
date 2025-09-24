/**
 * Program Metadata - Duration and structural information for academic programs
 */

export interface ProgramMetadata {
  id: string;
  name: string;
  durationYears: number;
  skips: number[]; // Years that are skipped (e.g., [3] for IT)
  hasTracks: boolean;
  description?: string;
}

export const PROGRAM_DEFINITIONS: ProgramMetadata[] = [
  {
    id: 'bs_cs',
    name: 'Computer Science',
    durationYears: 4,
    skips: [],
    hasTracks: true,
    description: '4-year program with SE/DS track specializations'
  },
  {
    id: 'bs_it',
    name: 'Information Technology',
    durationYears: 3,
    skips: [3], // IT skips Year 3, goes Y1→Y2→Y4
    hasTracks: false,
    description: '3-year accelerated program'
  },
  {
    id: 'bsn',
    name: 'Nursing',
    durationYears: 4,
    skips: [],
    hasTracks: false,
    description: '4-year nursing program'
  }
];

export const PROGRAM_MAP = new Map(PROGRAM_DEFINITIONS.map(p => [p.id, p]));

// Helper to get program by ID with fallback
export function getProgramById(id: string): ProgramMetadata | undefined {
  return PROGRAM_MAP.get(id);
}

// Helper to check if a program skips a specific year
export function doesProgramSkipYear(programId: string, year: number): boolean {
  const program = getProgramById(programId);
  return program ? program.skips.includes(year) : false;
}

// Helper to get all program IDs
export function getAllProgramIds(): string[] {
  return PROGRAM_DEFINITIONS.map(p => p.id);
}

// Helper to format program display name with duration
export function formatProgramLabel(programId: string): string {
  const program = getProgramById(programId);
  if (!program) return programId;
  
  const duration = program.durationYears === 3 ? '3-year' : '4-year';
  return `${program.name} (${duration})`;
}
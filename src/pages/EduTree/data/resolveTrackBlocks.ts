import { supabase } from '@/integrations/supabase/client';
import { TRACK_MAP, type TrackId } from './trackDefinitions';
import { resolveBlockIds, validateResolvedIds, type BlockMappingContext } from './blockMapping';

export async function resolveTrackBlockIds(trackKey: TrackId) {
  const track = TRACK_MAP.get(trackKey);
  if (!track) {
    throw new Error(`Unknown track: ${trackKey}`);
  }

  // Create context for this track resolution
  const context: BlockMappingContext = {
    programId: getTrackProgram(trackKey),
    trackId: getTrackId(trackKey)
  };

  // Use the canonical mapping to resolve slugs to IDs
  const { resolved, missing } = resolveBlockIds(track.blockIds, context);
  
  // Validate that resolved IDs actually exist in seed data
  const { valid, invalid } = validateResolvedIds(resolved);
  
  if (invalid.length > 0) {
    console.warn(`[Resolve ${trackKey}] Some resolved IDs don't exist in seed:`, invalid);
  }

  console.log(`[Resolve ${trackKey}]`, { 
    desired: track.blockIds.length, 
    resolved: valid.length, 
    missing: missing.length > 0 ? missing : 'none',
    invalid: invalid.length > 0 ? invalid : 'none'
  });

  return { 
    name: track.name, 
    blockIds: valid, // Only return valid IDs
    missingSlugs: missing,
    invalidIds: invalid
  };
}

/**
 * Map track ID to program ID based on current architecture
 */
function getTrackProgram(trackId: TrackId): string | undefined {
  switch (trackId) {
    case 'software-engineering':
    case 'data-science':
      return 'bs_cs'; // Both SE and DS are CS program tracks
    case 'information-technology':
      return 'bs_it';
    default:
      return undefined;
  }
}

/**
 * Map track ID to track code for blocks
 */
function getTrackId(trackId: TrackId): string | undefined {
  switch (trackId) {
    case 'software-engineering':
      return 'se';
    case 'data-science':
      return 'ds';
    case 'information-technology':
      return undefined; // IT is program-level, not track-level
    default:
      return undefined;
  }
}
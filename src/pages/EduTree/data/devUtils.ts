/**
 * Development Utilities for EduTree
 * 
 * Quick access functions for debugging and validation during development
 */

import { validateEduTreeDataModel, logValidationResults } from './validation';
import { resolveSlugToId, resolveBlockIds } from './blockMapping';
import { TRACK_DEFINITIONS } from './trackDefinitions';

/**
 * Run quick validation and log results to console
 * Call this from browser dev tools: window.eduTreeValidate()
 */
export function runQuickValidation() {
  console.log('🔍 Running EduTree validation...');
  const result = validateEduTreeDataModel();
  logValidationResults(result);
  return result;
}

/**
 * Test slug resolution for debugging
 * Usage: window.eduTreeTestSlug('core-i', { programId: 'bs_cs' })
 */
export function testSlugResolution(slug: string, context?: { programId?: string; trackId?: string }) {
  console.log(`🧪 Testing slug resolution: "${slug}" with context:`, context);
  const resolved = resolveSlugToId(slug, context);
  console.log(`Result: ${slug} → ${resolved || 'NOT FOUND'}`);
  return resolved;
}

/**
 * Test track block resolution
 * Usage: window.eduTreeTestTrack('software-engineering')
 */
export function testTrackResolution(trackId: string) {
  console.log(`🎯 Testing track resolution: "${trackId}"`);
  
  const track = TRACK_DEFINITIONS.find(t => t.id === trackId);
  if (!track) {
    console.error(`Track "${trackId}" not found`);
    return null;
  }
  
  const context = {
    programId: trackId === 'information-technology' ? 'bs_it' : 'bs_cs',
    trackId: trackId === 'software-engineering' ? 'se' : 
             trackId === 'data-science' ? 'ds' : undefined
  };
  
  const { resolved, missing } = resolveBlockIds(track.blockIds, context);
  
  console.log(`Track "${track.name}" resolution:`, {
    slugs: track.blockIds,
    resolved,
    missing,
    context
  });
  
  return { resolved, missing };
}

/**
 * Expose utilities to global window for easy dev access
 */
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).eduTreeValidate = runQuickValidation;
  (window as any).eduTreeTestSlug = testSlugResolution;
  (window as any).eduTreeTestTrack = testTrackResolution;
  
  console.log('🛠️ EduTree dev utilities loaded. Try:');
  console.log('  window.eduTreeValidate() - Run full validation');
  console.log('  window.eduTreeTestSlug("core-i", {programId: "bs_cs"}) - Test slug resolution');
  console.log('  window.eduTreeTestTrack("software-engineering") - Test track resolution');
}
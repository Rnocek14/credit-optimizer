import type { DynamicModuleProvider, ModuleDefinition } from '../types/moduleProvider';
import type { ProgramModule } from '@/fixtures/v5/programModules';
import { getOptionsForBlock } from '@/fixtures/v5/courseOptions';

/**
 * Wraps PROGRAM_MODULES fixture in DynamicModuleProvider interface
 * Ensures existing CS degree functionality continues working unchanged
 * 
 * @param modules - Array of ProgramModule fixtures
 * @returns DynamicModuleProvider implementation
 */
export function createProgramModulesProvider(
  modules: ProgramModule[]
): DynamicModuleProvider {
  console.log('[ProgramModulesAdapter] Creating provider for program modules:', {
    totalModules: modules.length,
    years: [...new Set(modules.map(m => m.year))].sort()
  });

  return {
    sourceType: 'program-modules',
    
    getModulesForYear(year: number): ModuleDefinition[] {
      const yearModules = modules.filter(mod => mod.year === year);
      
      const definitions = yearModules.map((pm): ModuleDefinition => {
        const marketplaceOptions = getOptionsForBlock(pm.blockId);
        
        return {
          id: pm.id, // Keep structured ID (e.g., "y1-fall-gened-humanities")
          year: pm.year,
          term: pm.term,
          label: pm.label,
          creditsRequired: pm.creditsRequired,
          blockId: pm.blockId,
          requirementArea: deriveRequirementAreaFromBlock(pm.blockId), // Optional cross-compatibility
          marketplaceOptions,
          icon: pm.icon,
          description: pm.description,
        };
      });
      
      console.log(`[ProgramModulesAdapter] Year ${year} modules:`, {
        count: definitions.length,
        moduleIds: definitions.map(m => m.id)
      });
      
      return definitions;
    },
    
    getModuleById(id: string): ModuleDefinition | undefined {
      const module = modules.find(m => m.id === id);
      if (!module) {
        console.warn(`[ProgramModulesAdapter] Module not found: ${id}`);
        return undefined;
      }
      
      const marketplaceOptions = getOptionsForBlock(module.blockId);
      
      return {
        id: module.id,
        year: module.year,
        term: module.term,
        label: module.label,
        creditsRequired: module.creditsRequired,
        blockId: module.blockId,
        requirementArea: deriveRequirementAreaFromBlock(module.blockId),
        marketplaceOptions,
        icon: module.icon,
        description: module.description,
      };
    },
    
    getSummary() {
      const totalCredits = modules.reduce((sum, mod) => sum + mod.creditsRequired, 0);
      const years = [...new Set(modules.map(m => m.year))];
      
      return {
        totalCredits,
        totalModules: modules.length,
        yearCount: years.length
      };
    }
  };
}

/**
 * Best-effort mapping from blockId to requirement area
 * Enables cross-compatibility between program modules and templates
 * 
 * This is not perfect but allows some interoperability without
 * forcing templates to know about institution-specific block structures
 */
function deriveRequirementAreaFromBlock(blockId: string): string | undefined {
  const mapping: Record<string, string> = {
    'general-education': 'HUMANITIES', // Loose mapping
    'cs-prerequisites': 'QUANTITATIVE',
    'cs-core': 'CS_CORE',
    'science-foundation': 'NATURAL_SCIENCE',
    'electives': 'FREE_ELECTIVE',
  };
  
  return mapping[blockId];
}

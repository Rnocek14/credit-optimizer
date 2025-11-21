import type { DynamicModuleProvider, ModuleDefinition } from '../types/moduleProvider';
import type { ModuleData } from '../types/v5';

/**
 * Wraps database ModuleData in DynamicModuleProvider interface
 * Enables database-driven degree programs
 * 
 * @param modulesByYear - Database modules grouped by year
 * @returns DynamicModuleProvider implementation
 */
export function createDatabaseModulesProvider(
  modulesByYear: Record<number, ModuleData[]>
): DynamicModuleProvider {
  console.log('[DatabaseModulesAdapter] Creating provider for database modules:', {
    years: Object.keys(modulesByYear).map(Number),
    totalModules: Object.values(modulesByYear).flat().length
  });

  // Create a flat lookup map for getModuleById
  const moduleMap = new Map<string, ModuleData>();
  Object.values(modulesByYear).flat().forEach(mod => {
    moduleMap.set(mod.id, mod);
  });

  return {
    sourceType: 'database',
    
    getModulesForYear(year: number): ModuleDefinition[] {
      const yearModules = modulesByYear[year] || [];
      
      const definitions = yearModules.map((dbMod): ModuleDefinition => {
        // Extract marketplace options if present
        const marketplaceOptions = (dbMod as any).marketplaceOptions || [];
        
        return {
          id: dbMod.id,
          year: year,
          term: undefined, // Database doesn't have term yet
          label: dbMod.label,
          creditsRequired: dbMod.creditsRequired,
          blockId: dbMod.id, // Use module ID as blockId for now
          requirementArea: undefined, // Can be derived from category if needed
          marketplaceOptions,
          icon: dbMod.icon,
          description: dbMod.description,
        };
      });
      
      console.log(`[DatabaseModulesAdapter] Year ${year} modules:`, {
        count: definitions.length,
        moduleIds: definitions.map(m => m.id)
      });
      
      return definitions;
    },
    
    getModuleById(id: string): ModuleDefinition | undefined {
      const module = moduleMap.get(id);
      if (!module) {
        console.warn(`[DatabaseModulesAdapter] Module not found: ${id}`);
        return undefined;
      }
      
      const marketplaceOptions = (module as any).marketplaceOptions || [];
      
      // Find year for this module
      let moduleYear = 1;
      for (const [year, modules] of Object.entries(modulesByYear)) {
        if (modules.some(m => m.id === id)) {
          moduleYear = Number(year);
          break;
        }
      }
      
      return {
        id: module.id,
        year: moduleYear,
        term: undefined,
        label: module.label,
        creditsRequired: module.creditsRequired,
        blockId: module.id,
        requirementArea: undefined,
        marketplaceOptions,
        icon: module.icon,
        description: module.description,
      };
    },
    
    getSummary() {
      const allModules = Object.values(modulesByYear).flat();
      const totalCredits = allModules.reduce((sum, mod) => sum + mod.creditsRequired, 0);
      const years = Object.keys(modulesByYear).map(Number).filter(y => modulesByYear[y].length > 0);
      
      return {
        totalCredits,
        totalModules: allModules.length,
        yearCount: years.length
      };
    }
  };
}

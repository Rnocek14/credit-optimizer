import type { DynamicModuleProvider, ModuleDefinition } from '../types/moduleProvider';
import type { MarketplaceDegreeTemplate, YearTemplate } from '../types/templates';

/**
 * Converts marketplace templates into module structure for EduTreeV5
 * 
 * This adapter allows templates with requirement-area-based IDs 
 * (e.g., "WRITTEN_COMM", "QUANTITATIVE") to drive the UI structure
 * 
 * @param template - Marketplace degree template
 * @returns DynamicModuleProvider implementation
 */
export function createTemplateModuleProvider(
  template: MarketplaceDegreeTemplate
): DynamicModuleProvider {
  console.log('[TemplateModuleAdapter] Creating provider for template:', {
    id: template.id,
    years: template.yearTemplates?.length ?? 0,
    totalModules: template.yearTemplates?.flatMap(yt => yt.moduleTemplates ?? []).length ?? 0
  });

  return {
    sourceType: 'template',
    
    getModulesForYear(year: number): ModuleDefinition[] {
      const yearTemplate = template.yearTemplates.find((yt: YearTemplate) => yt.year === year);
      
      if (!yearTemplate) {
        console.log(`[TemplateModuleAdapter] No modules for year ${year}`);
        return [];
      }
      
      const modules = yearTemplate.moduleTemplates.map((mt, index) => {
        const options = mt.options;
        
        const module: ModuleDefinition = {
          id: mt.moduleId, // Use requirement area as primary ID (e.g., "WRITTEN_COMM")
          year,
          label: mt.moduleId, // Use moduleId as label (e.g., "WRITTEN_COMM")
          creditsRequired: options[0]?.credits || 3,
          requirementArea: mt.moduleId, // Store for dual filtering
          marketplaceOptions: options,
          recommendedCourseId: mt.recommendedCourseId,
          icon: getIconForRequirementArea(mt.moduleId),
          description: `${options.length} option${options.length !== 1 ? 's' : ''} available`,
          isCapLimited: mt.isCapLimited, // Pass through cap-limited flag for badge display
        };
        
        return module;
      });
      
      console.log(`[TemplateModuleAdapter] Year ${year} modules:`, {
        count: modules.length,
        moduleIds: modules.map(m => m.id)
      });
      
      return modules;
    },
    
    getModuleById(id: string): ModuleDefinition | undefined {
      // Search all years for matching module
      for (let year = 1; year <= 4; year++) {
        const modules = this.getModulesForYear(year);
        const found = modules.find(m => m.id === id);
        if (found) {
          console.log(`[TemplateModuleAdapter] Found module ${id} in year ${year}`);
          return found;
        }
      }
      
      console.warn(`[TemplateModuleAdapter] Module not found: ${id}`);
      return undefined;
    },
    
    getSummary() {
      const totalModules = template.yearTemplates.reduce(
        (sum, yt) => sum + (yt.moduleTemplates?.length ?? 0), 
        0
      );
      
      return {
        totalCredits: template.totals.credits,
        totalModules,
        yearCount: template.yearTemplates.length
      };
    }
  };
}

/**
 * Map requirement area codes to display icons
 */
function getIconForRequirementArea(requirementArea: string): string {
  const iconMap: Record<string, string> = {
    'WRITTEN_COMM': '✍️',
    'ORAL_COMM': '🗣️',
    'QUANTITATIVE': '🔢',
    'HUMANITIES': '📚',
    'SOCIAL_SCIENCE': '🌍',
    'NATURAL_SCIENCE': '🔬',
    'CIVIC_GLOBAL': '🌐',
    'FREE_ELECTIVE': '🎯',
    'BUS_CORE': '💼',
    'UPPER_BUSINESS': '📊',
    'CAPSTONE': '🎓',
    'CS_CORE': '💻',
    'MATH': '🧮',
  };
  
  return iconMap[requirementArea] || '📘';
}


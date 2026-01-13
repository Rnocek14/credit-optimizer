import type { MarketplaceOption } from './v5';

/**
 * Module source types for dynamic module generation
 */
export type ModuleSourceType = 'program-modules' | 'template' | 'database';

/**
 * Unified module definition across all sources
 * Abstracts away differences between structured (PROGRAM_MODULES)
 * and requirement-based (marketplace templates) module IDs
 */
export interface ModuleDefinition {
  id: string; // Primary ID (can be structured like "y1-fall-gened-humanities" OR requirement-based like "WRITTEN_COMM")
  year: number;
  term?: 'fall' | 'spring'; // Optional: Templates may not have term structure
  label: string;
  creditsRequired: number;
  icon?: string;
  description?: string;
  
  // Source-specific fields
  blockId?: string; // For program-modules (links to requirement block)
  requirementArea?: string; // For templates (requirement area code like "WRITTEN_COMM")
  
  // Marketplace options for this module
  marketplaceOptions?: MarketplaceOption[];
  
  // Optional: Recommended course for auto-fill
  recommendedCourseId?: string;
  
  // Cap-limited: true when slot was flipped from alt-credit to institutional due to cap
  isCapLimited?: boolean;
}

/**
 * Dynamic module provider interface
 * Allows EduTreeV5 to work with any module source (fixtures, templates, database)
 */
export interface DynamicModuleProvider {
  sourceType: ModuleSourceType;
  
  /**
   * Get all modules for a specific year
   * Returns modules in the order they should be displayed
   */
  getModulesForYear(year: number): ModuleDefinition[];
  
  /**
   * Get a specific module by ID
   * Used for lookups and validation
   */
  getModuleById(id: string): ModuleDefinition | undefined;
  
  /**
   * Optional: Get summary statistics about the program
   */
  getSummary?(): {
    totalCredits: number;
    totalModules: number;
    yearCount: number;
  };
}

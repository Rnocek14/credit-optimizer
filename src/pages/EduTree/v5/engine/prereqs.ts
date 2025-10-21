// src/pages/EduTree/v5/engine/prereqs.ts
import type { BasketItem, MarketplaceOption } from '../types/exports';

export interface PrereqChain {
  target: string;          // courseId
  chain: string[];         // ordered prereq courseIds (deepest → nearest)
  unsatisfiable: string[]; // prereqs not present in marketplace
}

export interface CycleError { courses: string[]; message: string; }

/**
 * Resolve prerequisite chain for target courseId.
 * - Returns prereqs that are NOT already in basket.
 * - Order is deepest → nearest (dependencies first).
 * - Collects unsatisfiable prereqs (not found in marketplace).
 */
export function resolveChain(
  targetCourseId: string,
  options: MarketplaceOption[],
  basket: BasketItem[]
): PrereqChain {
  const index = new Map(options.map(o => [o.courseId, o]));
  const inBasket = new Set(basket.map(b => b.courseId));
  const needed = new Set<string>();
  const unsatisfiable: string[] = [];
  const visited = new Set<string>();

  function dfs(courseId: string) {
    if (visited.has(courseId)) return;
    visited.add(courseId);

    const node = index.get(courseId);
    if (!node) {
      // The target might reference a prereq we don't have in marketplace.
      unsatisfiable.push(courseId);
      return;
    }

    const prereqs = node.prereq_course_ids ?? [];
    for (const p of prereqs) {
      if (!index.has(p)) unsatisfiable.push(p);
      // Recurse regardless—still record the missing id in order
      dfs(p);
      if (!inBasket.has(p)) needed.add(p);
    }
  }

  dfs(targetCourseId);

  // Topologically order by DFS finishing order: deepest → nearest
  // Since we add to `needed` after visiting, we already biased to deeper first.
  const chain = Array.from(needed);

  return { target: targetCourseId, chain, unsatisfiable };
}

/**
 * Detect cycles in the prereq graph of marketplace options.
 * Returns array of cycles (each with a course path), or null if none.
 */
export function detectCycles(options: MarketplaceOption[]): CycleError[] | null {
  const index = new Map(options.map(o => [o.courseId, o]));
  const visited = new Set<string>();
  const stack = new Set<string>();
  const cycles: CycleError[] = [];

  function dfs(courseId: string, path: string[]): boolean {
    if (stack.has(courseId)) {
      // Found a cycle: slice path from first occurrence
      const startIdx = path.indexOf(courseId);
      const cycle = path.slice(startIdx).concat(courseId);
      cycles.push({ courses: cycle, message: `Cycle detected: ${cycle.join(' → ')}` });
      return true;
    }
    if (visited.has(courseId)) return false;

    visited.add(courseId);
    stack.add(courseId);

    const node = index.get(courseId);
    const prereqs = node?.prereq_course_ids ?? [];
    for (const p of prereqs) {
      dfs(p, path.concat(p));
    }

    stack.delete(courseId);
    return false;
  }

  for (const o of options) {
    if (!visited.has(o.courseId)) dfs(o.courseId, [o.courseId]);
  }

  return cycles.length ? cycles : null;
}

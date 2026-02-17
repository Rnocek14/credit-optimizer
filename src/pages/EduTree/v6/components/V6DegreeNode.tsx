/**
 * V6DegreeNode — Wraps V5 DegreeNode with language overrides.
 * 
 * Replaces "Behind" with "Ready to Start" / "In Progress" when appropriate.
 * Zero changes to V5's DegreeNode component.
 */

import { DegreeNode } from '@/pages/EduTree/v5/components/DegreeNode';
import type { DegreeSummary } from '@/pages/EduTree/v5/types/v5';

interface V6DegreeNodeProps extends DegreeSummary {
  isCollapsed: boolean;
  onToggle: () => void;
  onClick?: () => void;
  yearCount: number;
}

export function V6DegreeNode(props: V6DegreeNodeProps) {
  // Override warnings: suppress empty-plan warnings
  const filteredWarnings = props.totalCreditsEarned === 0
    ? [] // No warnings before user has started
    : props.warnings;

  return (
    <DegreeNode
      {...props}
      warnings={filteredWarnings}
    />
  );
}

/**
 * ModuleBundleNode - ReactFlow node wrapper for ModuleCard
 * Ensures module cards participate in fitView() and zoom/pan
 */
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { ModuleCard } from './ModuleCard';
import { SubRequirement, SubRequirementStatus } from '../../types/v4';

interface ModuleBundleNodeProps {
  data: {
    module: SubRequirement;
    validation: SubRequirementStatus;
    isCollapsed: boolean;
    onToggle: () => void;
    onBrowseOptions: () => void;
  };
}

export function ModuleBundleNode({ data }: ModuleBundleNodeProps) {
  return (
    <div className="nodrag">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <ModuleCard
        module={data.module}
        validation={data.validation}
        isCollapsed={data.isCollapsed}
        onToggle={data.onToggle}
        onBrowseOptions={data.onBrowseOptions}
      />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

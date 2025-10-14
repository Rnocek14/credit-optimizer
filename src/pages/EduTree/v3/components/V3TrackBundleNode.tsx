import * as React from "react";
import { Handle, Position } from '@xyflow/react';
import { ChevronDown } from 'lucide-react';

type TrackId = "se" | "ds" | undefined;

interface Props {
  data: {
    title: string;
    year: 1 | 2 | 3 | 4;
    trackId?: TrackId;
    childCount: number;
    totalCredits: number;
    isExpanded?: boolean;
    onToggle?: () => void;
    tier?: number;
  };
}

export default function V3TrackBundleNode({ data }: Props) {
  const { title, trackId, childCount, totalCredits, isExpanded, onToggle } = data;
  const color =
    trackId === "se"
      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
      : trackId === "ds"
      ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20"
      : "border-slate-400 bg-slate-50 dark:bg-slate-800/40";

  return (
    <div className="w-[232px] min-w-[232px] max-w-[232px] box-border">
      <div
        className={
          "rounded-xl border-2 " +
          color +
          " px-3 py-2 shadow-md select-none w-full overflow-hidden"
        }
      >
      {/* Spine handles (horizontal) */}
      <Handle id="west" type="target" position={Position.Left} />
      <Handle id="east" type="source" position={Position.Right} />
      
      {/* Gate handles (vertical) */}
      <Handle id="north" type="target" position={Position.Top} />
      <Handle id="south" type="source" position={Position.Bottom} />
      
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-sm truncate">{title}</div>
        <button
          onClick={onToggle}
          className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex-shrink-0 flex items-center gap-1"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? "−" : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      <div className="mt-1 text-xs text-muted-foreground">
        {data.tier !== undefined && <span>Tier {data.tier} • </span>}
        <span>{childCount} courses • {totalCredits} credits</span>
        {trackId && (
          <span className="ml-2 font-bold text-[10px] px-1.5 py-0.5 rounded bg-background/80">
            {trackId.toUpperCase()}
          </span>
        )}
      </div>
      </div>
    </div>
  );
}

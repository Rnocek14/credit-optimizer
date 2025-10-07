import * as React from "react";
import { Handle, Position } from '@xyflow/react';

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
    <div
      className={
        "rounded-xl border-2 " +
        color +
        " px-3 py-2 shadow-md w-[var(--v3-node-w)] select-none"
      }
    >
      <Handle type="target" position={Position.Left} />
      
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-sm truncate">{title}</div>
        <button
          onClick={onToggle}
          className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex-shrink-0"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? "−" : "+"}
        </button>
      </div>

      <div className="mt-1 text-xs text-muted-foreground flex items-center gap-3">
        <span>{childCount} courses</span>
        <span className="opacity-60">•</span>
        <span>{totalCredits} credits</span>
        {trackId && (
          <>
            <span className="opacity-60">•</span>
            <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-background/80">
              {trackId.toUpperCase()}
            </span>
          </>
        )}
      </div>
      
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

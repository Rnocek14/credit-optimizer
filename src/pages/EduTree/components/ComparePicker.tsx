import * as React from "react";
import { useMemo, useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, X, Search, Shuffle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandInput, CommandEmpty, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TRACK_DEFINITIONS } from "../data/trackDefinitions";
import { PROGRAM_DEFINITIONS, formatProgramLabel } from '../data/programMetadata';
import type { Selection } from "../ctx/PathHighlightContext";

// ---- types ----
type Kind = "program" | "track";
export type CompareOption = {
  kind: Kind;
  id: string;         // e.g., "bs_cs", "bs_it", "bsn", "se", "ds"
  label: string;      // shown in UI
  group: "Programs" | "Tracks";
  meta?: string;      // optional subtitle (credits, school, etc.)
};

type ComparePickerProps = {
  options: CompareOption[];                // provide programs + tracks
  valueA: Selection | null;               // current primary
  valueB: Selection | null;               // current comparison
  setA: (sel: Selection | null) => void;
  setB: (sel: Selection | null) => void;
  onEnsureCompareAny?: () => void;        // set filterMode=compare-any
  className?: string;
};

export function ComparePicker({
  options = [],
  valueA,
  valueB,
  setA,
  setB,
  onEnsureCompareAny,
  className
}: ComparePickerProps) {
  const [openA, setOpenA] = useState(false);
  const [openB, setOpenB] = useState(false);

  // Early return if options not ready
  console.log('[ComparePicker] Options check:', { 
    options: !!options, 
    isArray: Array.isArray(options), 
    length: options?.length,
    firstOption: options?.[0]
  });
  
  if (!options || !Array.isArray(options) || options.length === 0) {
    console.log('[ComparePicker] Showing loading state because options not ready');
    return (
      <div className={`hud-card bg-background/95 backdrop-blur-sm rounded-xl shadow-lg border p-3 ${className || ""}`}>
        <div className="text-sm text-muted-foreground">Loading comparison options...</div>
      </div>
    );
  }

  // Build a map for quick lookup of labels for the chips
  const key = (k: Kind, id: string) => `${k}:${id}`;
  const optMap = useMemo(() => {
    const m = new Map(options.map(o => [key(o.kind, o.id), o]));
    return m;
  }, [options]);

  // Helpers
  const labelFor = (sel: Selection | null) =>
    sel ? (optMap.get(key(sel.kind, sel.id))?.label ?? `${sel.kind}:${sel.id}`) : "Select…";

  const setUrl = useCallback((a: Selection | null, b: Selection | null) => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (a || b) p.set("filterMode", "compare-any");
    a ? p.set("a", `${a.kind}:${a.id}`) : p.delete("a");
    b ? p.set("b", `${b.kind}:${b.id}`) : p.delete("b");
    history.replaceState(null, "", `?${p.toString()}`);
  }, []);

  useEffect(() => setUrl(valueA, valueB), [valueA, valueB, setUrl]);

  const handlePick = (slot: "A" | "B", opt: CompareOption) => {
    onEnsureCompareAny?.();
    const sel: Selection = { kind: opt.kind, id: opt.id };
    if (slot === "A") setA(sel); else setB(sel);
    slot === "A" ? setOpenA(false) : setOpenB(false);
  };

  const swap = () => {
    onEnsureCompareAny?.();
    const a = valueA ? { ...valueA } : null;
    const b = valueB ? { ...valueB } : null;
    setA(b);
    setB(a);
  };

  const clear = (slot: "A" | "B") => (slot === "A" ? setA(null) : setB(null));

  // Quick preset helper
  const pick = (kind: Kind, id: string) => {
    if (!options || options.length === 0) return null;
    return options.find(o => o.kind === kind && o.id === id) ?? options[0];
  };

  // UI
  return (
    <div
      className={`hud-card bg-background/95 backdrop-blur-sm rounded-xl shadow-lg border p-4 ${className || ""}`}
      onMouseDownCapture={(e) => e.stopPropagation()} // don't steal pan
      aria-label="Compare paths"
    >
      {/* Header */}
      <div className="text-xs font-medium text-muted-foreground mb-3">Compare Paths</div>
      
      {/* Main Controls */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PickerChip
            label={`Primary: ${labelFor(valueA)}`}
            color="primary"
            open={openA}
            onOpenChange={setOpenA}
            onClear={() => clear("A")}
            disabledClear={!valueA}
          >
            <Combobox options={options} onSelect={(o) => handlePick("A", o)} />
          </PickerChip>

          <PickerChip
            label={`Compare: ${labelFor(valueB)}`}
            color="comparison"
            open={openB}
            onOpenChange={setOpenB}
            onClear={() => clear("B")}
            disabledClear={!valueB}
          >
            <Combobox options={options} onSelect={(o) => handlePick("B", o)} />
          </PickerChip>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={swap} 
            title="Swap Primary/Compare" 
            aria-label="Swap selections"
            className="text-xs"
          >
            <ArrowLeftRight className="h-3 w-3 mr-1" />
            Swap
          </Button>

          {/* Quick presets */}
          {!valueA && !valueB && options.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Quick:</span>
              {pick("track", "software-engineering") && (
                <Badge 
                  className="cursor-pointer hover:bg-primary/20 text-xs" 
                  onClick={() => {
                    const seTrack = pick("track", "software-engineering");
                    if (seTrack) handlePick("A", seTrack);
                  }}
                >
                  SE vs
                </Badge>
              )}
              {pick("track", "data-science") && (
                <Badge 
                  className="cursor-pointer hover:bg-primary/20 text-xs" 
                  onClick={() => {
                    const dsTrack = pick("track", "data-science");
                    if (dsTrack) handlePick("B", dsTrack);
                  }}
                >
                  DS
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- internal pieces ----------

function PickerChip({
  label,
  color,
  open,
  onOpenChange,
  onClear,
  disabledClear,
  children
}: {
  label: string;
  color: "primary" | "comparison";
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onClear: () => void;
  disabledClear?: boolean;
  children: React.ReactNode;
}) {
  const colorClass = color === "primary" ? "border-primary/50 hover:border-primary" : "border-secondary/50 hover:border-secondary";
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`justify-between w-full ${colorClass}`}>
          <span className="truncate text-left text-sm">{label}</span>
          {!disabledClear && (
            <X 
              className="ml-2 h-3 w-3 opacity-70 hover:opacity-100 shrink-0" 
              onClick={(e) => { e.stopPropagation(); onClear(); }} 
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="hud-popover p-0 w-[320px]" align="start">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function Combobox({
  options,
  onSelect
}: {
  options: CompareOption[];
  onSelect: (o: CompareOption) => void;
}) {
  // Defensive check for options
  if (!options || !Array.isArray(options)) {
    return (
      <Command shouldFilter={true}>
        <CommandInput placeholder="Loading..." />
        <CommandList>
          <CommandEmpty>No options available</CommandEmpty>
        </CommandList>
      </Command>
    );
  }

  const programs = options.filter(o => o.group === "Programs");
  const tracks = options.filter(o => o.group === "Tracks");
  
  return (
    <Command shouldFilter={true}>
      <CommandInput placeholder="Search programs or tracks…" />
      <CommandList>
        <CommandEmpty>No matches</CommandEmpty>

        <CommandGroup heading="Programs">
          {programs.map(o => (
            <CommandItem key={`${o.kind}:${o.id}`} value={`${o.label} ${o.meta || ""}`} onSelect={() => onSelect(o)}>
              <span className="font-medium">{o.label}</span>
              {o.meta && <span className="ml-2 text-muted-foreground text-xs">{o.meta}</span>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Tracks">
          {tracks.map(o => (
            <CommandItem key={`${o.kind}:${o.id}`} value={`${o.label} ${o.meta || ""}`} onSelect={() => onSelect(o)}>
              <span className="font-medium">{o.label}</span>
              {o.meta && <span className="ml-2 text-muted-foreground text-xs">{o.meta}</span>}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

// Build options from existing data
export function useCompareOptions(): CompareOption[] {
  return useMemo(() => {
    console.log('[useCompareOptions] Building options...');
    console.log('[useCompareOptions] TRACK_DEFINITIONS available:', !!TRACK_DEFINITIONS, TRACK_DEFINITIONS?.length);
    
    const programs: CompareOption[] = [
      { kind: "program", id: "bs_cs", label: "BS • Computer Science", group: "Programs", meta: "4 years" },
      { kind: "program", id: "bs_it", label: "BS • Information Technology", group: "Programs", meta: "4 years" },
      { kind: "program", id: "bsn", label: "BS • Nursing", group: "Programs", meta: "4 years" },
    ];
    
    const tracks: CompareOption[] = (TRACK_DEFINITIONS || []).map(track => ({
      kind: "track" as const,
      id: track.id,
      label: track.name,
      group: "Tracks" as const,
      meta: track.description,
    }));
    
    const result = [...programs, ...tracks];
    console.log('[useCompareOptions] Built options:', result.length, 'total options');
    console.log('[useCompareOptions] Programs:', programs.length, 'Tracks:', tracks.length);
    
    return result;
  }, []);
}

// Parse URL parameters for initial state
export function parseCompareUrl(): { primarySelection: Selection | null; secondarySelection: Selection | null } {
  if (typeof window === "undefined") {
    console.log('[parseCompareUrl] SSR - returning null selections');
    return { primarySelection: null, secondarySelection: null };
  }
  
  const params = new URLSearchParams(window.location.search);
  const a = params.get("a");
  const b = params.get("b");
  
  console.log('[parseCompareUrl] RAW URL DEBUG:', {
    fullUrl: window.location.href,
    search: window.location.search,
    paramA: a,
    paramB: b,
    decodedA: a ? decodeURIComponent(a) : null,
    decodedB: b ? decodeURIComponent(b) : null
  });
  
  const parseParam = (param: string | null): Selection | null => {
    console.log('[parseCompareUrl] Parsing param:', param);
    if (!param) return null;
    
    // First decode the URL parameter
    const decoded = decodeURIComponent(param);
    console.log('[parseCompareUrl] Decoded param:', decoded);
    
    const [kind, rawId] = decoded.split(":");
    console.log('[parseCompareUrl] Split result:', { kind, rawId });
    
    if (!kind || !rawId || (kind !== "program" && kind !== "track")) {
      console.log('[parseCompareUrl] Invalid param format:', { kind, rawId });
      return null;
    }
    // Keep ID as-is since program/track IDs are already valid (bs_cs, bs_it, etc.)
    const id = rawId;
    console.log('[parseCompareUrl] Using ID as-is:', { rawId, id });
    
    if (!id) {
      console.log('[parseCompareUrl] ID became empty after cleanup:', { rawId, id });
      return null;
    }
    console.log('[parseCompareUrl] Successfully parsed:', { kind, id });
    return { kind: kind as "program" | "track", id };
  };
  
  const result = {
    primarySelection: parseParam(a),
    secondarySelection: parseParam(b),
  };
  
  console.log('[parseCompareUrl] FINAL RESULT:', result);
  return result;
}
import React, { useState } from 'react';
import { resolveEduTreeFlag, canBypassEduTreeFlag } from '@/lib/eduTreeFlags';
import { DisabledFeature } from '@/components/DisabledFeature';
import { EduTreeCanvas } from './EduTreeCanvas';
import EduTreeCanvasV2 from './EduTreeCanvasV2';
import type { FilterMode } from './data/seedDataV2';

export default function EduTree() {
  console.log('[EduTree] Component mounting...');
  
  const enabled = resolveEduTreeFlag();
  
  // TODO: Get user role from auth context when available
  const userRole = undefined; // Replace with actual user role
  const canBypass = canBypassEduTreeFlag(userRole);
  console.log('[EduTree] Can bypass:', canBypass);
  
  if (!enabled && !canBypass) {
    console.log('[EduTree] Feature disabled, showing disabled screen');
    const handleEnableForSession = () => {
      localStorage.setItem('eduTree', 'true');
      window.location.reload();
    };

    return (
      <DisabledFeature
        title="Education-First Skill Tree"
        message="This feature is currently disabled."
        hint="Add ?eduTree=true to the URL or enable it in Admin → Feature Flags."
        onEnableForSession={handleEnableForSession}
      />
    );
  }

  // Dev controls for V2 testing with localStorage persistence
  const [filterMode, setFilterMode] = useState<FilterMode>(() => 
    (localStorage.getItem('eduTree-dev-filter') as FilterMode) || "compare-tracks"
  );
  const [layoutMode, setLayoutMode] = useState<"legacy"|"manual_v1"|"grid_v2">(() =>
    (localStorage.getItem('eduTree-dev-layout') as any) || "manual_v1"
  );
  const [v2Grid, setV2Grid] = useState<boolean>(() =>
    localStorage.getItem('eduTree-dev-grid') === 'true' || true
  );

  // Persist changes to localStorage
  const handleFilterChange = (value: FilterMode) => {
    setFilterMode(value);
    localStorage.setItem('eduTree-dev-filter', value);
  };
  
  const handleLayoutChange = (value: "legacy"|"manual_v1"|"grid_v2") => {
    setLayoutMode(value);
    localStorage.setItem('eduTree-dev-layout', value);
  };
  
  const handleGridChange = (checked: boolean) => {
    setV2Grid(checked);
    localStorage.setItem('eduTree-dev-grid', String(checked));
  };

  const resetToDefaults = () => {
    setFilterMode("compare-tracks");
    setLayoutMode("manual_v1");
    setV2Grid(true);
    localStorage.removeItem('eduTree-dev-filter');
    localStorage.removeItem('eduTree-dev-layout');
    localStorage.removeItem('eduTree-dev-grid');
  };

  const copyLinkWithParams = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', filterMode);
    url.searchParams.set('eduTreeV2Grid', String(v2Grid));
    url.searchParams.set('eduTreeLayoutMode', layoutMode);
    navigator.clipboard.writeText(url.toString());
  };

  const useV2 = v2Grid && (layoutMode === 'manual_v1' || layoutMode === 'grid_v2');
  
  if (useV2) {
    console.log('[EduTree] Using V2 Canvas with dev controls...');
    return (
      <div className="w-full h-full relative">
        {/* Dev controls (hidden in production) */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="absolute top-3 left-3 z-50 rounded-xl bg-black/50 backdrop-blur p-3 flex gap-3 items-center text-sm text-white">
            <label className="flex items-center gap-2">
              Filter
              <select 
                value={filterMode} 
                onChange={e=>handleFilterChange(e.target.value as FilterMode)} 
                className="bg-white/20 border border-white/30 px-2 py-1 rounded text-white"
              >
                <option value="compare-tracks">compare-tracks</option>
                <option value="se">se</option>
                <option value="ds">ds</option>
                <option value="compare-programs">compare-programs</option>
                <option value="compare-any">compare-any</option>
                <option value="bs_cs">bs_cs</option>
                <option value="bs_it">bs_it</option>
                <option value="bsn">bsn</option>
              </select>
            </label>

            <label className="flex items-center gap-2">
              Layout
              <select 
                value={layoutMode} 
                onChange={e=>handleLayoutChange(e.target.value as any)} 
                className="bg-white/20 border border-white/30 px-2 py-1 rounded text-white"
              >
                <option value="legacy">legacy</option>
                <option value="manual_v1">manual_v1</option>
                <option value="grid_v2">grid_v2</option>
              </select>
            </label>

            <label className="flex items-center gap-2">
              Grid V2
              <input 
                type="checkbox" 
                checked={v2Grid} 
                onChange={e=>handleGridChange(e.target.checked)} 
                className="scale-110"
              />
            </label>

            <button 
              onClick={resetToDefaults}
              className="px-2 py-1 bg-white/20 border border-white/30 rounded text-xs hover:bg-white/30"
            >
              Reset
            </button>

            <button 
              onClick={copyLinkWithParams}
              className="px-2 py-1 bg-white/20 border border-white/30 rounded text-xs hover:bg-white/30"
              title="Copy URL with current settings"
            >
              📋
            </button>
          </div>
        )}

        {/* Pass overrides down */}
        <EduTreeCanvasV2
          overrideFilterMode={filterMode}
          overrideFlags={{ eduTreeV2Grid: v2Grid, eduTreeLayoutMode: layoutMode }}
        />
      </div>
    );
  }

  console.log('[EduTree] Using Legacy EduTreeCanvas...');
  return <EduTreeCanvas />;
}
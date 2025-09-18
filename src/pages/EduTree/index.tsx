import React from 'react';
import { resolveEduTreeFlag, canBypassEduTreeFlag } from '@/lib/eduTreeFlags';
import { useFeatureFlags } from '@/lib/featureFlags';
import { DisabledFeature } from '@/components/DisabledFeature';
import { EduTreeCanvas } from './EduTreeCanvas';
import EduTreeCanvasV2 from './EduTreeCanvasV2';

export default function EduTree() {
  console.log('[EduTree] Component mounting...');
  
  const enabled = resolveEduTreeFlag();
  const flags = useFeatureFlags();
  console.log('[EduTree] Flag resolved:', enabled);
  console.log('[EduTree] V2 Flags:', { 
    v2Grid: flags.eduTreeV2Grid, 
    layoutMode: flags.eduTreeLayoutMode 
  });
  
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

  // Check if V2 clean slate mode is active
  const useV2 = flags.eduTreeV2Grid && flags.eduTreeLayoutMode === 'manual_v1';
  
  if (useV2) {
    console.log('[EduTree] Using V2 Clean Slate Canvas...');
    return <EduTreeCanvasV2 />;
  }

  console.log('[EduTree] Using Legacy EduTreeCanvas...');
  return <EduTreeCanvas />;
}
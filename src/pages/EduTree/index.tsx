import React from 'react';
import { resolveEduTreeFlag, canBypassEduTreeFlag } from '@/lib/eduTreeFlags';
import { DisabledFeature } from '@/components/DisabledFeature';
import { EduTreeCanvas } from './EduTreeCanvas';

const DEV = import.meta.env.DEV;

export default function EduTree() {
  if (DEV) {
    console.log('[EduTree] Component mounting...');
  }

  const enabled = resolveEduTreeFlag();
  if (DEV) {
    console.log('[EduTree] Flag resolved:', enabled);
  }
  
  // TODO: Get user role from auth context when available
  const userRole = undefined; // Replace with actual user role
  const canBypass = canBypassEduTreeFlag(userRole);
  if (DEV) {
    console.log('[EduTree] Can bypass:', canBypass);
  }
  
  if (!enabled && !canBypass) {
    if (DEV) {
      console.log('[EduTree] Feature disabled, showing disabled screen');
    }
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

  if (DEV) {
    console.log('[EduTree] Rendering EduTreeCanvas...');
  }
  return <EduTreeCanvas />;
}
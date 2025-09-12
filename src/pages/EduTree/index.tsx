import React from 'react';
import { resolveEduTreeFlag, canBypassEduTreeFlag } from '@/lib/eduTreeFlags';
import { DisabledFeature } from '@/components/DisabledFeature';
import { EduTreeCanvas } from './EduTreeCanvas';
import { EduTreeErrorBoundary } from '@/components/EduTreeErrorBoundary';

export default function EduTree() {
  const enabled = resolveEduTreeFlag();
  // TODO: Get user role from auth context when available
  const userRole = undefined; // Replace with actual user role
  const canBypass = canBypassEduTreeFlag(userRole);
  
  if (!enabled && !canBypass) {
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

  return (
    <EduTreeErrorBoundary>
      <EduTreeCanvas />
    </EduTreeErrorBoundary>
  );
}
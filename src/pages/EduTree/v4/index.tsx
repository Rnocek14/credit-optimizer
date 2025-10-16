/**
 * EduTree V4 - Feature flag check + route entry
 * ADR 004: Isolate V4 in its own namespace
 */

import React from 'react';
import { Navigate } from 'react-router-dom';

function isEduTreeV4Enabled(): boolean {
  // URL query parameter (highest priority)
  const q = new URLSearchParams(window.location.search);
  if (q.get('v4') === '1' || q.has('v4')) {
    localStorage.setItem('flags.eduTreeV4', 'true');
    return true;
  }
  
  // localStorage override
  const stored = localStorage.getItem('flags.eduTreeV4');
  if (stored !== null) return stored === 'true';
  
  // Environment default
  return import.meta.env.VITE_EDU_TREE_V4_ENABLED === 'true' || false;
}

const EduTreeV4Page = React.lazy(() => import('./EduTreeV4Page'));

export default function EduTreeV4Route() {
  const enabled = isEduTreeV4Enabled();
  
  if (!enabled) {
    console.warn('[V4] Feature flag disabled, redirecting to V3');
    return <Navigate to="/edu-tree-v3" replace />;
  }
  
  return <EduTreeV4Page />;
}

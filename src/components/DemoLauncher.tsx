// dev-only helper; safe to delete after demo
import React from 'react';
import { Link } from 'react-router-dom';

export default function DemoLauncher() {
  if (process.env.NODE_ENV === 'production') return null;

  const base = '/edu-tree?eduTreeMultiPathOverlay=true';
  const demoFull = `${base}&primary=se&comparison=ds&cmp=1`;

  const linkStyle: React.CSSProperties = {
    display: 'inline-block',
    marginRight: 12,
    padding: '8px 12px',
    borderRadius: 8,
    background: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99,102,241,0.35)',
    color: '#e5e7eb',
    textDecoration: 'none',
    fontSize: 12,
  };

  return (
    <div style={{
      position: 'fixed',
      right: 12,
      bottom: 12,
      zIndex: 9999,
      background: 'rgba(17,24,39,0.8)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: 10,
      backdropFilter: 'blur(6px)'
    }}>
      <div style={{fontSize: 12, color: '#9ca3af', marginBottom: 6}}>Demo Launcher (dev only)</div>
      <div>
        <Link to="/sandbox/track-overlay" style={linkStyle}>Sandbox: Track Overlay</Link>
        <Link to={base} style={linkStyle}>/edu-tree (overlay ON)</Link>
        <Link to={demoFull} style={linkStyle}>/edu-tree SE vs DS</Link>
      </div>
    </div>
  );
}
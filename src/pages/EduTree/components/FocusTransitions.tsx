import React from 'react';
import { Node } from '@xyflow/react';
import { useFocus } from '../contexts/FocusContext';

interface FocusTransitionsProps {
  nodes: Node[];
  children: React.ReactNode;
}

export function FocusTransitions({ nodes, children }: FocusTransitionsProps) {
  const { focusState } = useFocus();

  return (
    <div className="w-full h-full relative">
      <div 
        className={`transition-all duration-500 ease-in-out ${
          focusState.mode === 'web-track' ? 'scale-110 -translate-y-12' :
          focusState.mode === 'mobile-track' ? 'scale-110 translate-y-12' :
          focusState.mode === 'compare-tracks' ? 'scale-95' : 'scale-100'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
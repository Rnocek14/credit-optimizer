/**
 * Keyboard shortcuts for V3 Debug
 * 
 * Shift+D - Toggle debug panel
 * Shift+C - Toggle comparison mode
 */

import { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onToggleDebug: () => void;
  onToggleCompare?: () => void;
}

export function useV3KeyboardShortcuts({ onToggleDebug, onToggleCompare }: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.shiftKey) return;
      
      if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        onToggleDebug();
      }
      
      if (e.key.toLowerCase() === 'c' && onToggleCompare) {
        e.preventDefault();
        onToggleCompare();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleDebug, onToggleCompare]);
}

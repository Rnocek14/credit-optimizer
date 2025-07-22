
import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardNavigationState {
  selectedIndex: number;
  isModalOpen: boolean;
}

export interface KeyboardNavigationOptions {
  items: Array<{ id: string; name: string }>;
  onSelect: (item: any, index: number) => void;
  onEscape?: () => void;
  onSearch?: (query: string) => void;
  disabled?: boolean;
  gridColumns?: number;
}

/**
 * Custom hook for keyboard navigation in skill tree
 * Supports arrow keys, Enter, Escape, and search
 */
export function useKeyboardNavigation({
  items,
  onSelect,
  onEscape,
  onSearch,
  disabled = false,
  gridColumns = 1
}: KeyboardNavigationOptions) {
  const selectedIndexRef = useRef(0);
  const searchQueryRef = useRef('');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled || items.length === 0) return;

    // Don't handle keys if user is typing in any input field
    const target = event.target as HTMLElement;
    if (['input', 'textarea'].includes(target.tagName.toLowerCase()) || target.isContentEditable) return;

    const currentIndex = selectedIndexRef.current;
    const maxIndex = items.length - 1;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (gridColumns === 1) {
          // List navigation
          selectedIndexRef.current = Math.min(currentIndex + 1, maxIndex);
        } else {
          // Grid navigation
          selectedIndexRef.current = Math.min(currentIndex + gridColumns, maxIndex);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (gridColumns === 1) {
          selectedIndexRef.current = Math.max(currentIndex - 1, 0);
        } else {
          selectedIndexRef.current = Math.max(currentIndex - gridColumns, 0);
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (gridColumns > 1) {
          selectedIndexRef.current = Math.min(currentIndex + 1, maxIndex);
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (gridColumns > 1) {
          selectedIndexRef.current = Math.max(currentIndex - 1, 0);
        }
        break;

      case 'Enter':
      case ' ': // Space
        event.preventDefault();
        if (items[currentIndex]) {
          onSelect(items[currentIndex], currentIndex);
        }
        break;

      case 'Escape':
        event.preventDefault();
        onEscape?.();
        break;

      case 'Home':
        event.preventDefault();
        selectedIndexRef.current = 0;
        break;

      case 'End':
        event.preventDefault();
        selectedIndexRef.current = maxIndex;
        break;

      case 'Tab':
        // Allow default tab behavior but update our index
        if (event.shiftKey) {
          selectedIndexRef.current = Math.max(currentIndex - 1, 0);
        } else {
          selectedIndexRef.current = Math.min(currentIndex + 1, maxIndex);
        }
        break;

      default:
        // Handle search typing
        if (onSearch && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          
          // Clear previous search timeout
          if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
          }
          
          // Append to search query
          searchQueryRef.current += event.key.toLowerCase();
          onSearch(searchQueryRef.current);
          
          // Auto-clear search after 1 second
          searchTimeoutRef.current = setTimeout(() => {
            searchQueryRef.current = '';
          }, 1000);
        }
        break;
    }
  }, [items, onSelect, onEscape, onSearch, disabled, gridColumns]);

  // Focus management
  const focusSelectedItem = useCallback(() => {
    const selectedElement = document.querySelector(`[data-skill-index="${selectedIndexRef.current}"]`);
    if (selectedElement && selectedElement instanceof HTMLElement) {
      selectedElement.focus();
    }
  }, []);

  // Announce current selection for screen readers
  const announceSelection = useCallback(() => {
    const currentItem = items[selectedIndexRef.current];
    if (currentItem) {
      const announcement = `Selected skill: ${currentItem.name}. ${selectedIndexRef.current + 1} of ${items.length}`;
      
      // Create or update live region for screen readers
      let liveRegion = document.getElementById('skill-tree-live-region');
      if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'skill-tree-live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        document.body.appendChild(liveRegion);
      }
      
      liveRegion.textContent = announcement;
    }
  }, [items]);

  // Setup event listeners
  useEffect(() => {
    if (disabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Cleanup search timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [handleKeyDown, disabled]);

  // Announce selection changes
  useEffect(() => {
    if (!disabled && items.length > 0) {
      announceSelection();
    }
  }, [announceSelection, disabled, items.length]);

  return {
    selectedIndex: selectedIndexRef.current,
    focusSelectedItem,
    setSelectedIndex: (index: number) => {
      selectedIndexRef.current = Math.max(0, Math.min(index, items.length - 1));
    },
    searchQuery: searchQueryRef.current
  };
}

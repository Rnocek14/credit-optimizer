import React, { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

/**
 * Drag guard for board mode with validation feedback
 */
export interface DragValidation {
  isValid: boolean;
  reason?: string;
}

export function useDragGuard() {
  const [isDragging, setIsDragging] = useState(false);
  
  const validateDrop = (
    sourceId: string, 
    targetId: string, 
    sourceData: any, 
    targetData: any
  ): DragValidation => {
    // Check if target block is unlocked
    if (!targetData.isUnlocked) {
      return {
        isValid: false,
        reason: 'Target block is locked. Complete prerequisites first.'
      };
    }
    
    // Check if moving within same year/area constraints
    if (sourceData.level_year !== targetData.level_year) {
      return {
        isValid: false,
        reason: 'Cannot move courses between different academic years.'
      };
    }
    
    return { isValid: true };
  };
  
  const handleInvalidDrop = (reason: string) => {
    // Shake animation via CSS class
    document.body.classList.add('drag-invalid');
    setTimeout(() => {
      document.body.classList.remove('drag-invalid');
    }, 500);
    
    toast({
      title: "Invalid Move",
      description: reason,
      variant: "destructive",
    });
  };
  
  return {
    isDragging,
    setIsDragging,
    validateDrop,
    handleInvalidDrop
  };
}
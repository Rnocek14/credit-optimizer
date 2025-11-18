import { ReactNode, useEffect, useState, useRef } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { ChevronUp, GripHorizontal } from 'lucide-react';

export type DrawerSize = 'tab' | 'medium' | 'full';
export type DrawerScope = 'degree' | 'year' | 'module' | null;

interface PersistentDrawerProps {
  isOpen: boolean;
  scope: DrawerScope;
  defaultSize: DrawerSize;
  currentSize: DrawerSize;
  onSizeChange: (size: DrawerSize) => void;
  onClose: () => void;
  children: ReactNode;
}

const SNAP_POINTS = {
  tab: 60,      // Collapsed tab - always visible
  medium: typeof window !== 'undefined' ? window.innerHeight * 0.5 : 400,
  full: typeof window !== 'undefined' ? window.innerHeight * 0.9 : 700,
};

function getScopeTitle(scope: DrawerScope): string {
  if (scope === 'degree') return 'Degree Analyzer';
  if (scope === 'year') return 'Year Marketplace';
  if (scope === 'module') return 'Module Options';
  return 'Decision Dock';
}

function calculateNearestSnap(currentY: number, velocity: number): DrawerSize {
  const screenHeight = window.innerHeight;
  const currentHeight = screenHeight - currentY;
  
  // Strong upward velocity -> go to full
  if (velocity < -500) return 'full';
  
  // Strong downward velocity -> go to tab
  if (velocity > 500) return 'tab';
  
  // Otherwise, snap to nearest based on current position
  const distanceToTab = Math.abs(currentHeight - SNAP_POINTS.tab);
  const distanceToMedium = Math.abs(currentHeight - SNAP_POINTS.medium);
  const distanceToFull = Math.abs(currentHeight - SNAP_POINTS.full);
  
  const minDistance = Math.min(distanceToTab, distanceToMedium, distanceToFull);
  
  if (minDistance === distanceToFull) return 'full';
  if (minDistance === distanceToMedium) return 'medium';
  return 'tab';
}

export function PersistentDrawer({
  isOpen,
  scope,
  defaultSize,
  currentSize,
  onSizeChange,
  onClose,
  children,
}: PersistentDrawerProps) {
  const controls = useAnimation();
  const constraintsRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Update snap points on window resize
  useEffect(() => {
    const handleResize = () => {
      SNAP_POINTS.medium = window.innerHeight * 0.5;
      SNAP_POINTS.full = window.innerHeight * 0.9;
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Animate to target size when currentSize changes
  useEffect(() => {
    const targetHeight = SNAP_POINTS[currentSize];
    console.log('[PersistentDrawer] Size changed:', {
      scope,
      size: currentSize,
      heightPx: targetHeight,
      isCollapsed: currentSize === 'tab',
      canDragUp: currentSize !== 'full'
    });
    
    controls.start({
      height: targetHeight,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }
    });
  }, [currentSize, controls, scope]);
  
  // Handle drag end - snap to nearest point
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    const screenHeight = window.innerHeight;
    const currentY = info.point.y;
    const velocity = info.velocity.y;
    
    const targetSize = calculateNearestSnap(currentY, velocity);
    
    console.log('[PersistentDrawer] Drag ended:', {
      currentY,
      velocity,
      targetSize,
      currentSize
    });
    
    onSizeChange(targetSize);
  };
  
  // Don't render if not open
  if (!isOpen || !scope) {
    return null;
  }
  
  const isCollapsed = currentSize === 'tab';
  
  return (
    <>
      {/* Backdrop overlay - only show when not collapsed */}
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-[100]"
          onClick={onClose}
        />
      )}
      
      {/* Drawer container */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-[110]">
        <motion.div
          drag="y"
          dragConstraints={constraintsRef}
          dragElastic={0.1}
          dragMomentum={false}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          animate={controls}
          initial={{ height: SNAP_POINTS[defaultSize] }}
          className="absolute bottom-0 left-0 right-0 bg-background border-t border-border rounded-t-2xl pointer-events-auto overflow-hidden flex flex-col"
          style={{
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Drag Handle Area */}
          <div className="relative shrink-0 cursor-grab active:cursor-grabbing touch-none select-none">
            {/* Handle bar */}
            <div className="flex items-center justify-center py-3 px-4">
              <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
            </div>
            
            {/* Collapsed Tab View - show scope title */}
            {isCollapsed && (
              <div className="absolute top-2 left-0 right-0 flex items-center justify-center gap-2 px-4">
                <div className="flex-1 h-px bg-border" />
                <button
                  onClick={() => onSizeChange(defaultSize)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-full text-sm font-medium transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                  <span>{getScopeTitle(scope)}</span>
                </button>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
          </div>
          
          {/* Content Area - only show when not collapsed */}
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
          )}
          
          {/* Dragging indicator */}
          {isDragging && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-primary/90 text-primary-foreground rounded-full text-xs font-medium pointer-events-none">
              <GripHorizontal className="w-4 h-4" />
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}

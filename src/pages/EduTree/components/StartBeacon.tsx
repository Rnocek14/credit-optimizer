import React from 'react';
import { Play, ArrowRight } from 'lucide-react';

interface StartBeaconProps {
  visible: boolean;
  lens: string;
}

export function StartBeacon({ visible, lens }: StartBeaconProps) {
  if (!visible) return null;
  
  const lensMessages = {
    fastest: 'Start here → Fastest path to graduation',
    cheapest: 'Start here → Most cost-effective path',
    roi: 'Start here → Highest ROI career path'
  };
  
  return (
    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-20">
      <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-pulse flex items-center gap-2">
        <Play className="w-4 h-4 fill-current" />
        {lensMessages[lens as keyof typeof lensMessages] || 'Start here'}
        <ArrowRight className="w-4 h-4" />
      </div>
      
      {/* Pointing arrow */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
        <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-primary animate-bounce"></div>
      </div>
    </div>
  );
}
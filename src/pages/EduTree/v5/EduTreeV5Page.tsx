import { useState } from 'react';
import { YearCard } from './components/YearCard';
import './styles/v5.css';

export default function EduTreeV5Page() {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  
  const toggleYear = (year: number) => {
    console.log('[V5 Page] Toggling year:', year);
    setCollapsed(prev => ({ 
      ...prev, 
      [year]: !prev[year] 
    }));
  };

  return (
    <div className="w-full h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">EduTree V5 - Year Spine</h1>
        <p className="text-sm text-muted-foreground">Click any year to collapse/expand</p>
        <div className="text-xs text-muted-foreground mt-2">
          Collapsed: {Object.entries(collapsed).filter(([_, v]) => v).map(([k]) => k).join(', ') || 'none'}
        </div>
      </div>
      
      {/* Year Cards */}
      <div className="flex gap-4">
        {[1, 2, 3, 4].map(year => (
          <YearCard
            key={year}
            year={year}
            isCollapsed={collapsed[year] || false}
            onToggle={() => toggleYear(year)}
          />
        ))}
      </div>
    </div>
  );
}

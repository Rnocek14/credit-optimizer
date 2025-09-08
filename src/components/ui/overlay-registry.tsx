import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export interface OverlayConfig {
  id: string;
  name: string;
  description: string;
  color: string;
  pattern?: 'solid' | 'dashed' | 'dotted' | 'striped';
  opacity?: number;
  icon?: ReactNode;
  colorBlindSafe?: string; // Alternative color for colorblind users
}

interface OverlayRegistryContextType {
  overlays: Record<string, OverlayConfig>;
  activeOverlays: Set<string>;
  registerOverlay: (config: OverlayConfig) => void;
  toggleOverlay: (id: string) => void;
  isOverlayActive: (id: string) => boolean;
  getOverlayConfig: (id: string) => OverlayConfig | undefined;
}

const OverlayRegistryContext = createContext<OverlayRegistryContextType | undefined>(undefined);

export function OverlayRegistryProvider({ children }: { children: ReactNode }) {
  const [overlays, setOverlays] = useState<Record<string, OverlayConfig>>({});
  const [activeOverlays, setActiveOverlays] = useState<Set<string>>(new Set());

  const registerOverlay = (config: OverlayConfig) => {
    setOverlays(prev => ({ ...prev, [config.id]: config }));
  };

  const toggleOverlay = (id: string) => {
    setActiveOverlays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const isOverlayActive = (id: string) => activeOverlays.has(id);

  const getOverlayConfig = (id: string) => overlays[id];

  return (
    <OverlayRegistryContext.Provider value={{
      overlays,
      activeOverlays,
      registerOverlay,
      toggleOverlay,
      isOverlayActive,
      getOverlayConfig
    }}>
      {children}
    </OverlayRegistryContext.Provider>
  );
}

export function useOverlayRegistry() {
  const context = useContext(OverlayRegistryContext);
  if (!context) {
    throw new Error('useOverlayRegistry must be used within OverlayRegistryProvider');
  }
  return context;
}

// Unified Legend Component
export function OverlayLegend() {
  const { overlays, activeOverlays, toggleOverlay } = useOverlayRegistry();

  const activeOverlayConfigs = Object.values(overlays).filter(overlay => 
    activeOverlays.has(overlay.id)
  );

  if (activeOverlayConfigs.length === 0) return null;

  return (
    <Card className="w-64 motion-safe:animate-fade-in-scale">
      <CardContent className="p-4">
        <h3 className="font-medium text-sm text-foreground mb-3">Active Overlays</h3>
        <div className="space-y-2">
          {activeOverlayConfigs.map(overlay => (
            <div key={overlay.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm border"
                  style={{ 
                    backgroundColor: overlay.color,
                    borderStyle: overlay.pattern || 'solid',
                    opacity: overlay.opacity || 1
                  }}
                />
                {overlay.icon}
                <span className="text-xs text-foreground">{overlay.name}</span>
              </div>
              <Switch
                checked={true}
                onCheckedChange={() => toggleOverlay(overlay.id)}
              />
            </div>
          ))}
        </div>
        <Separator className="my-3" />
        <p className="text-xs text-muted-foreground">
          Toggle overlays to compare different path aspects
        </p>
      </CardContent>
    </Card>
  );
}

// Overlay Toggle Panel
export function OverlayTogglePanel() {
  const { overlays, activeOverlays, toggleOverlay } = useOverlayRegistry();

  return (
    <Card className="w-72">
      <CardContent className="p-4">
        <h3 className="font-medium text-sm text-foreground mb-3">Path Overlays</h3>
        <div className="space-y-3">
          {Object.values(overlays).map(overlay => (
            <div key={overlay.id} className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div 
                  className="w-3 h-3 rounded-sm border flex-shrink-0"
                  style={{ 
                    backgroundColor: overlay.color,
                    borderStyle: overlay.pattern || 'solid',
                    opacity: overlay.opacity || 1
                  }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground">{overlay.name}</div>
                  <div className="text-xs text-muted-foreground">{overlay.description}</div>
                </div>
              </div>
              <Switch
                checked={activeOverlays.has(overlay.id)}
                onCheckedChange={() => toggleOverlay(overlay.id)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Colorblind-safe palette
export const colorBlindSafePalette = {
  primary: { normal: 'hsl(var(--primary))', safe: 'hsl(221, 83%, 53%)' },
  success: { normal: 'hsl(var(--success))', safe: 'hsl(142, 76%, 36%)' },
  warning: { normal: 'hsl(var(--warning))', safe: 'hsl(45, 93%, 47%)' },
  destructive: { normal: 'hsl(var(--destructive))', safe: 'hsl(0, 84%, 60%)' },
  info: { normal: 'hsl(var(--info))', safe: 'hsl(197, 71%, 52%)' },
  muted: { normal: 'hsl(var(--muted))', safe: 'hsl(210, 40%, 50%)' }
};
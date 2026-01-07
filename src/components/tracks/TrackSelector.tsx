
import React, { useMemo, useState } from 'react';
import { ChevronsUpDown, Plus, Archive, Pencil, RefreshCw, Settings } from 'lucide-react';
import { useTracks } from '@/hooks/useTracks';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import type { CareerTrack } from '@/types/tracks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { TrackManagerModal } from './TrackManagerModal';

interface TrackSelectorProps {
  className?: string;
}

const TrackItem: React.FC<{ track: CareerTrack; activeId: string | null; onSelect: (id: string) => void; }> = ({ track, activeId, onSelect }) => {
  const isActive = activeId === track.id;
  return (
    <DropdownMenuItem
      onSelect={() => onSelect(track.id)}
      className={`px-3 py-2 cursor-pointer ${isActive ? 'bg-primary/10 text-primary' : ''}`}
    >
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: track.color || 'var(--primary)' }} />
        <span className="truncate">{track.track_name || track.title || 'Untitled Track'}</span>
        {track.archived && <span className="ml-2 text-xs opacity-60">(Archived)</span>}
      </div>
    </DropdownMenuItem>
  );
};

export const TrackSelector: React.FC<TrackSelectorProps> = ({ className }) => {
  const { toast } = useToast();
  const { tracks, isLoading, createTrack, updateTrack, archiveTrack, refetch, error } = useTracks();
  const activeTrackId = useActiveTrackStore((s) => s.activeTrackId);
  const setActiveTrackId = useActiveTrackStore((s) => s.setActiveTrackId);
  const [search, setSearch] = useState('');

  // Debug logging
  React.useEffect(() => {
    console.log('TrackSelector mounted', { 
      tracks: tracks?.length, 
      isLoading, 
      error: error?.message, 
      activeTrackId 
    });
  }, [tracks, isLoading, error, activeTrackId]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = tracks || [];
    const filteredList = s ? list.filter(t => (t.track_name || t.title || '').toLowerCase().includes(s)) : list;
    // non-archived first
    return [...filteredList.filter(t => !t.archived), ...filteredList.filter(t => t.archived)];
  }, [tracks, search]);

  const active = tracks.find(t => t.id === activeTrackId) || null;

  const handleTrackSelect = (id: string) => {
    console.log('🎯 Track selection initiated:', { id, currentActive: activeTrackId });
    const selectedTrack = tracks.find(t => t.id === id);
    console.log('🎯 Selected track found:', selectedTrack);
    
    setActiveTrackId(id);
    setSearch('');
    
    // Enhanced success toast with track info and visual feedback
    toast({
      title: "🎯 Track Selected!",
      description: `Now focusing on: ${selectedTrack?.track_name || selectedTrack?.title || 'Untitled Track'}`,
      duration: 3000,
    });
    
    console.log('🎯 Track selection completed:', { newActive: id });
  };

  const handleCreate = async () => {
    const name = window.prompt('Enter a name for the new track (e.g., "Frontend Engineer")');
    if (!name) return;
    const newTrack = await createTrack({ track_name: name });
    setActiveTrackId(newTrack.id);
  };

  const handleRename = async () => {
    if (!active) {
      toast({ title: 'No active track', description: 'Select a track first.', variant: 'destructive' });
      return;
    }
    const newName = window.prompt('Rename track', active.track_name || active.title || '');
    if (!newName || newName === (active.track_name || active.title)) return;
    await updateTrack({ id: active.id, patch: { track_name: newName, title: newName } });
  };

  const handleArchiveToggle = async () => {
    if (!active) {
      toast({ title: 'No active track', description: 'Select a track first.', variant: 'destructive' });
      return;
    }
    await archiveTrack({ id: active.id, archived: !active.archived });
    if (!active.archived === true) {
      // if we just archived it, clear active selection
      setActiveTrackId(null);
    }
  };

  // Show error state if there's an authentication or loading issue
  if (error) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-destructive/10 text-destructive ${className || ''}`}>
        <span className="text-sm">Error loading tracks</span>
        <button 
          onClick={() => refetch()} 
          className="text-xs underline hover:no-underline"
          title={error.message}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className || ''}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`inline-flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-300 shadow-sm min-w-[200px] justify-between hover-quiet ${
              active 
                ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/40 hover:bg-primary/15 shadow-lg ring-2 ring-primary/20' 
                : 'bg-background hover:bg-muted/80 border-border'
            }`}
            data-testid="track-selector"
          >
            <div className="flex items-center gap-2">
              <span 
                className={`inline-block w-4 h-4 rounded-full flex-shrink-0 border-2 border-background transition-all duration-300 ${active ? 'shadow-lg shadow-primary/40' : ''}`} 
                style={{ backgroundColor: active?.color || 'var(--primary)' }} 
              />
              <span className={`truncate font-semibold transition-all duration-300 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    Loading tracks...
                  </span>
                ) : (
                  active?.track_name || active?.title || 'Select a track'
                )}
              </span>
              {active && <span className="text-success text-lg">✨</span>}
            </div>
            <ChevronsUpDown className={`w-4 h-4 opacity-70 flex-shrink-0 transition-transform duration-300 ${active ? 'text-primary' : ''}`} />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent 
          className="min-w-[300px] max-w-[400px] shadow-2xl z-[99999] bg-background/95 backdrop-blur-sm border-2" 
          sideOffset={4}
          align="end"
        >
          <div className="p-3 border-b bg-background/90 backdrop-blur-sm">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracks..."
              className="w-full px-3 py-2 rounded-md bg-background border-2 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="max-h-64 overflow-auto bg-background/90">
            {isLoading ? (
              <div className="px-3 py-4 text-sm opacity-70 flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                Loading tracks...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm opacity-70">
                {tracks.length === 0 ? (
                  <div className="space-y-2">
                    <div>No tracks created yet</div>
                    <div className="text-xs text-muted-foreground">Create your first track below ↓</div>
                  </div>
                ) : (
                  'No tracks match your search'
                )}
              </div>
            ) : (
              filtered.map((t) => (
                <TrackItem key={t.id} track={t} activeId={activeTrackId} onSelect={handleTrackSelect} />
              ))
            )}
          </div>

        <div className="p-3 border-t bg-background/90 backdrop-blur-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-md border-2 hover:bg-primary/10 hover:border-primary text-sm font-medium transition-all duration-200 hover-quiet"
              data-testid="create-track"
            >
              <Plus className="w-4 h-4" /> Create New
            </button>
            <button
              onClick={handleRename}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-md border hover:bg-muted text-sm transition-all duration-200"
              disabled={!active}
            >
              <Pencil className="w-4 h-4" /> Rename
            </button>
            <button
              onClick={handleArchiveToggle}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-md border hover:bg-muted text-sm transition-all duration-200"
              disabled={!active}
            >
              <Archive className="w-4 h-4" /> {active?.archived ? 'Restore' : 'Archive'}
            </button>
            <TrackManagerModal>
              <button
                className="inline-flex items-center gap-1 px-3 py-2 rounded-md border hover:bg-muted text-sm transition-all duration-200"
                title="Advanced Track Management"
              >
                <Settings className="w-4 h-4" />
              </button>
            </TrackManagerModal>
            <button
              onClick={() => refetch()}
              className="ml-auto inline-flex items-center gap-1 px-3 py-2 rounded-md border hover:bg-muted text-sm transition-all duration-200"
              title="Refresh tracks"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default TrackSelector;

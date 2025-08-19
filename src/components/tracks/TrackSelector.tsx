
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
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: track.color || 'hsl(var(--primary))' }} />
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
    console.log('Track selected:', id);
    setActiveTrackId(id);
    setSearch('');
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
    <div className={`relative ${className || ''}`} style={{ outline: '2px solid red', padding: '4px' }}>
      <div className="text-xs text-red-500 absolute -top-5 left-0">TrackSelector Debug</div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="inline-flex items-center gap-2 px-4 py-3 rounded-lg border-2 bg-background hover:bg-muted transition-all shadow-sm min-w-[200px] justify-between"
            data-testid="track-selector"
            style={{ outline: '1px solid blue' }}
          >
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: active?.color || 'hsl(var(--primary))' }} />
              <span className="truncate font-medium">
                {isLoading ? 'Loading tracks...' : (active?.track_name || active?.title || 'Select a track')}
              </span>
            </div>
            <ChevronsUpDown className="w-4 h-4 opacity-70 flex-shrink-0" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent 
          className="min-w-[300px] shadow-xl z-[9999]" 
          sideOffset={4}
          align="end"
        >
        <div className="p-2 border-b bg-background">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracks..."
            className="w-full px-2 py-2 rounded-md bg-background border"
          />
        </div>

        <div className="max-h-64 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm opacity-70">No tracks found</div>
          ) : (
            filtered.map((t) => (
              <TrackItem key={t.id} track={t} activeId={activeTrackId} onSelect={handleTrackSelect} />
            ))
          )}
        </div>

        <div className="p-2 border-t bg-background">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-muted text-sm"
              data-testid="create-track"
            >
              <Plus className="w-4 h-4" /> Create New
            </button>
            <button
              onClick={handleRename}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-muted text-sm"
            >
              <Pencil className="w-4 h-4" /> Rename
            </button>
            <button
              onClick={handleArchiveToggle}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-muted text-sm"
            >
              <Archive className="w-4 h-4" /> {active?.archived ? 'Restore' : 'Archive'}
            </button>
            <TrackManagerModal>
              <button
                className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-muted text-sm"
                title="Advanced Track Management"
              >
                <Settings className="w-4 h-4" />
              </button>
            </TrackManagerModal>
            <button
              onClick={() => refetch()}
              className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-muted text-sm"
              title="Refresh"
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

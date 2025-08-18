
import React, { useMemo, useState } from 'react';
import { ChevronsUpDown, Plus, Archive, Pencil, RefreshCw, Settings } from 'lucide-react';
import { useTracks } from '@/hooks/useTracks';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import type { CareerTrack } from '@/types/tracks';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { TrackManagerModal } from './TrackManagerModal';

interface TrackSelectorProps {
  className?: string;
}

const TrackItem: React.FC<{ track: CareerTrack; activeId: string | null; onSelect: (id: string) => void; }> = ({ track, activeId, onSelect }) => {
  const isActive = activeId === track.id;
  return (
    <Dropdown.Item
      onSelect={() => onSelect(track.id)}
      className={`px-3 py-2 cursor-pointer outline-none ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
    >
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: track.color || 'hsl(var(--primary))' }} />
        <span className="truncate">{track.track_name || track.title || 'Untitled Track'}</span>
        {track.archived && <span className="ml-2 text-xs opacity-60">(Archived)</span>}
      </div>
    </Dropdown.Item>
  );
};

export const TrackSelector: React.FC<TrackSelectorProps> = ({ className }) => {
  const { toast } = useToast();
  const { tracks, isLoading, createTrack, updateTrack, archiveTrack, refetch } = useTracks();
  const activeTrackId = useActiveTrackStore((s) => s.activeTrackId);
  const setActiveTrackId = useActiveTrackStore((s) => s.setActiveTrackId);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = tracks || [];
    const filteredList = s ? list.filter(t => (t.track_name || t.title || '').toLowerCase().includes(s)) : list;
    // non-archived first
    return [...filteredList.filter(t => !t.archived), ...filteredList.filter(t => t.archived)];
  }, [tracks, search]);

  const active = tracks.find(t => t.id === activeTrackId) || null;

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

  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-background hover:bg-muted transition ${className || ''}`}
          data-testid="track-selector"
        >
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: active?.color || 'hsl(var(--primary))' }} />
          <span className="truncate max-w-[14rem]">
            {isLoading ? 'Loading tracks...' : (active?.track_name || active?.title || 'Select a track')}
          </span>
          <ChevronsUpDown className="w-4 h-4 opacity-70" />
        </button>
      </Dropdown.Trigger>

      <Dropdown.Content className="min-w-[280px] bg-background border shadow-lg rounded-md overflow-hidden z-50">
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
              <TrackItem key={t.id} track={t} activeId={activeTrackId} onSelect={(id) => setActiveTrackId(id)} />
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
      </Dropdown.Content>
    </Dropdown.Root>
  );
};

export default TrackSelector;

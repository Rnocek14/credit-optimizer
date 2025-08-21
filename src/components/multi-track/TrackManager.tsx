import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Archive, Copy, Trash2, Hammer } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { toast } from 'sonner';
import type { CareerTrack } from '@/types/tracks';
import { usePathStore } from '@/stores/usePathStore';
import { slugify, generateUniqueSlug } from '@/lib/slugify';

export interface TrackManagerProps {
  currentTrackId?: string;
  onTrackSelect?: (trackId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
}

export function TrackManager({ currentTrackId, onTrackSelect, open, onOpenChange, modal = true }: TrackManagerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  const [newTrackName, setNewTrackName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useSecureAuth();

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['career-tracks'],
    queryFn: async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('career_tracks')
        .select('*')
        .eq('user_id', user.id)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as CareerTrack[];
    },
    enabled: !!user && isOpen, // Only fetch when dialog is open and user exists
  });

  const createTrackMutation = useMutation({
    mutationFn: async (trackName: string) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Generate slug from track name
      const baseSlug = slugify(trackName);
      
      // Get existing slugs to ensure uniqueness
      const existingSlugs = tracks.map(t => t.slug).filter(Boolean);
      const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);

      const { data, error } = await supabase
        .from('career_tracks')
        .insert({
          user_id: user.id,
          track_name: trackName,
          title: trackName,
          slug: uniqueSlug,
          order_index: tracks.length,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newTrack) => {
      queryClient.invalidateQueries({ queryKey: ['career-tracks'] });
      toast.success(`Created track: ${newTrack.track_name}`);
      setNewTrackName('');
      setIsOpen(false);
      if (onTrackSelect) {
        onTrackSelect(newTrack.id);
      }
      // Navigate to build with the new track context
      navigate(`/build?track=${encodeURIComponent(newTrack.id)}`);
    },
    onError: (error) => {
      console.error('Error creating track:', error);
      toast.error('Failed to create track');
    },
  });

  const archiveTrackMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const { error } = await supabase
        .from('career_tracks')
        .update({ archived: true })
        .eq('id', trackId);

      if (error) throw error;
      return trackId;
    },
    onSuccess: (archivedId) => {
      queryClient.invalidateQueries({ queryKey: ['career-tracks'] });
      toast.success('Track archived');
      
      // Archive safety guard - clear stale references
      const { getLastOpenedTrackId, setLastOpenedTrackId, setActiveTrackId, activeTrackId } = usePathStore.getState();
      if (getLastOpenedTrackId() === archivedId) {
        setLastOpenedTrackId(undefined);
      }
      if (activeTrackId === archivedId) {
        setActiveTrackId(undefined);
      }
      
      // Navigate away from build if user is on the archived track
      if (window.location.pathname === '/build' && new URLSearchParams(window.location.search).get('track') === archivedId) {
        navigate('/build');
      }
    },
    onError: () => {
      toast.error('Failed to archive track');
    },
  });

  const cloneTrackMutation = useMutation({
    mutationFn: async ({ sourceTrackId, newName }: { sourceTrackId: string; newName: string }) => {
      const { data, error } = await supabase.rpc('clone_career_track', {
        source_track_id: sourceTrackId,
        new_track_name: newName,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-tracks'] });
      toast.success('Track cloned successfully');
    },
    onError: () => {
      toast.error('Failed to clone track');
    },
  });

  const handleCreateTrack = async () => {
    if (!newTrackName.trim()) return;
    
    setIsCreating(true);
    try {
      await createTrackMutation.mutateAsync(newTrackName.trim());
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditInBuilder = (trackId: string) => {
    navigate(`/build?track=${encodeURIComponent(trackId)}`);
    setIsOpen(false);
    toast.success('Opened in Builder');
  };

  const activeTrackCount = tracks.filter(track => !track.archived).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen} modal={modal}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Manage Tracks
          <Badge variant="secondary" className="ml-2">
            {activeTrackCount}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Career Tracks</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Create New Track */}
          <div className="space-y-3">
            <Label htmlFor="new-track">Create New Track</Label>
            <div className="flex gap-2">
              <Input
                id="new-track"
                placeholder="e.g., Frontend Engineer, UX Designer..."
                value={newTrackName}
                onChange={(e) => setNewTrackName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateTrack();
                  }
                }}
              />
              <Button 
                onClick={handleCreateTrack}
                disabled={!newTrackName.trim() || isCreating}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Existing Tracks */}
          <div className="space-y-3">
            <Label>Your Tracks</Label>
            {isLoading ? (
              <div className="text-muted-foreground">Loading tracks...</div>
            ) : tracks.length === 0 ? (
              <div className="text-muted-foreground">No tracks created yet</div>
            ) : (
              <div className="space-y-2">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      currentTrackId === track.id ? 'border-primary bg-primary/5' : ''
                    } ${track.archived ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {track.icon && <span>{track.icon}</span>}
                      <div>
                        <div className="font-medium">{track.title || track.track_name}</div>
                        {track.goal && (
                          <div className="text-sm text-muted-foreground">{track.goal}</div>
                        )}
                      </div>
                      {track.archived && (
                        <Badge variant="secondary">Archived</Badge>
                      )}
                      {currentTrackId === track.id && (
                        <Badge>Active</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {onTrackSelect && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onTrackSelect(track.id);
                            setIsOpen(false);
                          }}
                          disabled={track.archived}
                        >
                          Select
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditInBuilder(track.id)}
                        disabled={track.archived}
                        title="Edit in Builder"
                        aria-label="Edit in Builder"
                      >
                        <Hammer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newName = prompt('Enter name for cloned track:', `${track.track_name} Copy`);
                          if (newName) {
                            cloneTrackMutation.mutate({ sourceTrackId: track.id, newName });
                          }
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {!track.archived && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => archiveTrackMutation.mutate(track.id)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

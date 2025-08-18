import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Settings, 
  Plus, 
  Copy, 
  Archive, 
  Pencil, 
  Trash2, 
  Target, 
  Clock, 
  TrendingUp,
  ChevronRight,
  Palette,
  GitBranch,
  BarChart3,
  Zap
} from 'lucide-react';
import { useTracks } from '@/hooks/useTracks';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { useToast } from '@/hooks/use-toast';
import type { CareerTrack, CreateTrackInput } from '@/types/tracks';

interface TrackManagerModalProps {
  children?: React.ReactNode;
}

const TRACK_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6366F1', // Indigo
];

const TRACK_ICONS = [
  { icon: '💻', label: 'Developer' },
  { icon: '🎨', label: 'Designer' },
  { icon: '📊', label: 'Analyst' },
  { icon: '🚀', label: 'Product' },
  { icon: '💼', label: 'Business' },
  { icon: '🔬', label: 'Research' },
  { icon: '🎯', label: 'Marketing' },
  { icon: '🏗️', label: 'Engineering' },
  { icon: '📱', label: 'Mobile' },
  { icon: '☁️', label: 'Cloud' },
];

export function TrackManagerModal({ children }: TrackManagerModalProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('manage');
  const { toast } = useToast();
  const { tracks, isLoading, createTrack, updateTrack, archiveTrack, cloneTrack } = useTracks();
  const { activeTrackId, setActiveTrackId } = useActiveTrackStore();

  // Create track form
  const [createForm, setCreateForm] = useState<CreateTrackInput>({
    track_name: '',
    goal: '',
    icon: '💻',
    color: TRACK_COLORS[0]
  });

  // Clone form
  const [cloneForm, setCloneForm] = useState({
    sourceTrackId: '',
    newName: '',
    icon: '💻',
    color: TRACK_COLORS[0]
  });

  // Comparison state
  const [comparedTracks, setComparedTracks] = useState<string[]>([]);

  const activeTrack = tracks.find(t => t.id === activeTrackId);
  const activeTracks = tracks.filter(t => !t.archived);
  const archivedTracks = tracks.filter(t => t.archived);

  const trackStats = useMemo(() => {
    return tracks.map(track => ({
      ...track,
      // Mock stats - in real implementation these would come from hooks
      courseCount: Math.floor(Math.random() * 20) + 1,
      completedCourses: Math.floor(Math.random() * 10),
      totalXP: Math.floor(Math.random() * 500) + 50,
      estimatedProgress: Math.floor(Math.random() * 100)
    }));
  }, [tracks]);

  const handleCreateTrack = async () => {
    if (!createForm.track_name.trim()) {
      toast({ title: 'Name required', description: 'Please enter a track name', variant: 'destructive' });
      return;
    }

    try {
      const newTrack = await createTrack(createForm);
      setActiveTrackId(newTrack.id);
      setCreateForm({ track_name: '', goal: '', icon: '💻', color: TRACK_COLORS[0] });
      toast({ title: 'Track created', description: `Created "${newTrack.track_name}"` });
    } catch (error) {
      console.error('Error creating track:', error);
    }
  };

  const handleCloneTrack = async () => {
    if (!cloneForm.sourceTrackId || !cloneForm.newName.trim()) {
      toast({ title: 'Missing information', description: 'Please select a source track and enter a new name', variant: 'destructive' });
      return;
    }

    try {
      await cloneTrack({
        sourceTrackId: cloneForm.sourceTrackId,
        newName: cloneForm.newName,
        icon: cloneForm.icon,
        color: cloneForm.color
      });
      setCloneForm({ sourceTrackId: '', newName: '', icon: '💻', color: TRACK_COLORS[0] });
      toast({ title: 'Track cloned', description: `Successfully cloned to "${cloneForm.newName}"` });
    } catch (error) {
      console.error('Error cloning track:', error);
    }
  };

  const handleUpdateTrack = async (trackId: string, updates: Partial<CareerTrack>) => {
    try {
      await updateTrack({ id: trackId, patch: updates });
    } catch (error) {
      console.error('Error updating track:', error);
    }
  };

  const handleArchiveTrack = async (trackId: string, archived: boolean) => {
    try {
      await archiveTrack({ id: trackId, archived });
      if (archived && trackId === activeTrackId) {
        setActiveTrackId(null);
      }
    } catch (error) {
      console.error('Error archiving track:', error);
    }
  };

  const toggleTrackComparison = (trackId: string) => {
    setComparedTracks(prev => 
      prev.includes(trackId) 
        ? prev.filter(id => id !== trackId)
        : prev.length < 3 ? [...prev, trackId] : prev
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Manage Tracks
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-background border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Track Manager
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 bg-muted">
            <TabsTrigger value="manage">Manage</TabsTrigger>
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="clone">Clone</TabsTrigger>
            <TabsTrigger value="compare">Compare</TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-auto max-h-[calc(90vh-200px)]">
            <TabsContent value="manage" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Active Tracks ({activeTracks.length})
                  </h3>
                  <div className="space-y-2">
                    {activeTracks.map(track => {
                      const stats = trackStats.find(s => s.id === track.id);
                      return (
                        <Card key={track.id} className={`transition-all ${track.id === activeTrackId ? 'ring-2 ring-primary' : ''}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{track.icon || '💻'}</span>
                                <div>
                                  <CardTitle className="text-base">{track.track_name || track.title}</CardTitle>
                                  <CardDescription className="text-sm">
                                    {track.goal || 'No goal set'}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={track.id === activeTrackId ? 'default' : 'outline'}>
                                  {track.id === activeTrackId ? 'Active' : 'Inactive'}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setActiveTrackId(track.id)}
                                  disabled={track.id === activeTrackId}
                                >
                                  Select
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Target className="h-3 w-3" />
                                  {stats?.courseCount || 0} courses
                                </span>
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  {stats?.totalXP || 0} XP
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {stats?.estimatedProgress || 0}% complete
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newName = prompt('New track name:', track.track_name || track.title);
                                  if (newName) handleUpdateTrack(track.id, { track_name: newName, title: newName });
                                }}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Rename
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleArchiveTrack(track.id, true)}
                              >
                                <Archive className="h-3 w-3 mr-1" />
                                Archive
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleTrackComparison(track.id)}
                                disabled={comparedTracks.length >= 3 && !comparedTracks.includes(track.id)}
                              >
                                <BarChart3 className="h-3 w-3 mr-1" />
                                {comparedTracks.includes(track.id) ? 'Remove from Compare' : 'Compare'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {archivedTracks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Archive className="h-5 w-5" />
                      Archived Tracks ({archivedTracks.length})
                    </h3>
                    <div className="space-y-2">
                      {archivedTracks.map(track => (
                        <Card key={track.id} className="opacity-60">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{track.icon || '💻'}</span>
                                <div>
                                  <CardTitle className="text-base">{track.track_name || track.title}</CardTitle>
                                  <CardDescription className="text-sm">Archived</CardDescription>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleArchiveTrack(track.id, false)}
                              >
                                Restore
                              </Button>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Create New Track
                  </CardTitle>
                  <CardDescription>
                    Set up a new career track with a specific goal and visual identity.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="track-name">Track Name *</Label>
                    <Input
                      id="track-name"
                      placeholder="e.g., Frontend Engineer, UX Designer"
                      value={createForm.track_name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, track_name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="track-goal">Career Goal</Label>
                    <Textarea
                      id="track-goal"
                      placeholder="Describe your target outcome for this track..."
                      value={createForm.goal}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, goal: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <Select value={createForm.icon} onValueChange={(value) => setCreateForm(prev => ({ ...prev, icon: value }))}>
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          {TRACK_ICONS.map(({ icon, label }) => (
                            <SelectItem key={icon} value={icon} className="hover:bg-muted">
                              <span className="flex items-center gap-2">
                                <span className="text-lg">{icon}</span>
                                {label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Color</Label>
                      <div className="flex flex-wrap gap-2">
                        {TRACK_COLORS.map(color => (
                          <button
                            key={color}
                            className={`w-8 h-8 rounded-full border-2 ${createForm.color === color ? 'border-foreground' : 'border-muted'}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setCreateForm(prev => ({ ...prev, color }))}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleCreateTrack} className="w-full" disabled={!createForm.track_name.trim()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Track
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="clone" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Copy className="h-5 w-5" />
                    Clone Existing Track
                  </CardTitle>
                  <CardDescription>
                    Duplicate an existing track with all its courses and settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Source Track</Label>
                    <Select value={cloneForm.sourceTrackId} onValueChange={(value) => setCloneForm(prev => ({ ...prev, sourceTrackId: value }))}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select track to clone" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        {tracks.map(track => (
                          <SelectItem key={track.id} value={track.id} className="hover:bg-muted">
                            <span className="flex items-center gap-2">
                              <span className="text-lg">{track.icon || '💻'}</span>
                              {track.track_name || track.title}
                              {track.archived && <span className="text-xs opacity-60">(Archived)</span>}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clone-name">New Track Name *</Label>
                    <Input
                      id="clone-name"
                      placeholder="Enter name for cloned track"
                      value={cloneForm.newName}
                      onChange={(e) => setCloneForm(prev => ({ ...prev, newName: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <Select value={cloneForm.icon} onValueChange={(value) => setCloneForm(prev => ({ ...prev, icon: value }))}>
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          {TRACK_ICONS.map(({ icon, label }) => (
                            <SelectItem key={icon} value={icon} className="hover:bg-muted">
                              <span className="flex items-center gap-2">
                                <span className="text-lg">{icon}</span>
                                {label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Color</Label>
                      <div className="flex flex-wrap gap-2">
                        {TRACK_COLORS.map(color => (
                          <button
                            key={color}
                            className={`w-8 h-8 rounded-full border-2 ${cloneForm.color === color ? 'border-foreground' : 'border-muted'}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setCloneForm(prev => ({ ...prev, color }))}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleCloneTrack} 
                    className="w-full" 
                    disabled={!cloneForm.sourceTrackId || !cloneForm.newName.trim()}
                  >
                    <GitBranch className="h-4 w-4 mr-2" />
                    Clone Track
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compare" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Track Comparison
                  </CardTitle>
                  <CardDescription>
                    Compare progress, courses, and outcomes across tracks. Select up to 3 tracks to compare.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {comparedTracks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select tracks from the Manage tab to compare them here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comparedTracks.map(trackId => {
                        const track = tracks.find(t => t.id === trackId);
                        const stats = trackStats.find(s => s.id === trackId);
                        if (!track) return null;

                        return (
                          <Card key={trackId}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{track.icon || '💻'}</span>
                                  <div>
                                    <CardTitle className="text-base">{track.track_name || track.title}</CardTitle>
                                    <CardDescription>{track.goal || 'No goal set'}</CardDescription>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleTrackComparison(trackId)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-primary">{stats?.courseCount || 0}</div>
                                  <div className="text-muted-foreground">Courses</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-primary">{stats?.completedCourses || 0}</div>
                                  <div className="text-muted-foreground">Completed</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-primary">{stats?.totalXP || 0}</div>
                                  <div className="text-muted-foreground">Total XP</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-primary">{stats?.estimatedProgress || 0}%</div>
                                  <div className="text-muted-foreground">Progress</div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      
                      {comparedTracks.length >= 2 && (
                        <div className="text-center pt-4">
                          <Button variant="outline">
                            <ChevronRight className="h-4 w-4 mr-2" />
                            View Detailed Comparison
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
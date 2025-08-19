import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePathStore } from '@/stores/usePathStore';
import { supabase } from '@/integrations/supabase/client';
import { 
  Save, 
  FolderOpen, 
  Plus, 
  Share, 
  FileText,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PathManagerProps {
  userId: string;
}

export function PathManager({ userId }: PathManagerProps) {
  const {
    currentPathId,
    pathTitle,
    isShared,
    isDirty,
    lastSaved,
    savePath,
    loadPath,
    loadUserPaths,
    createNewPath,
    shareOrUnsharePath,
  } = usePathStore();

  const [userPaths, setUserPaths] = useState<Array<{ id: string; title: string; updated_at: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newPathTitle, setNewPathTitle] = useState('');
  const [showLoadDialog, setShowLoadDialog] = useState(false);

  useEffect(() => {
    if (userId) {
      refreshUserPaths();
    }
  }, [userId]);

  const refreshUserPaths = async () => {
    setIsLoading(true);
    try {
      const paths = await loadUserPaths(userId);
      setUserPaths(paths);
    } catch (error) {
      console.error('Error loading user paths:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    
    setIsSaving(true);
    try {
      await savePath(userId);
      await refreshUserPaths();
    } catch (error) {
      console.error('Error saving path:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadPath = async (pathId: string) => {
    setIsLoading(true);
    try {
      await loadPath(pathId, userId);
      setShowLoadDialog(false);
      await refreshUserPaths();
    } catch (error) {
      console.error('Error loading path:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = async () => {
    if (!userId || !newPathTitle.trim()) return;
    
    setIsLoading(true);
    try {
      await createNewPath(userId, newPathTitle.trim());
      setNewPathTitle('');
      await refreshUserPaths();
    } catch (error) {
      console.error('Error creating new path:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await shareOrUnsharePath(!isShared);
    } catch (error) {
      console.error('Error updating sharing:', error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Save Button */}
      <Button
        variant={isDirty ? "default" : "outline"}
        size="sm"
        onClick={handleSave}
        disabled={isSaving || !userId}
        className="relative"
      >
        {isSaving ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {isDirty && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
        )}
      </Button>

      {/* Load/Manage Paths Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FolderOpen className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Learning Paths</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Create New Path */}
            <div className="flex gap-2">
              <Input
                placeholder="New path title..."
                value={newPathTitle}
                onChange={(e) => setNewPathTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateNew();
                  }
                }}
              />
              <Button 
                onClick={handleCreateNew}
                disabled={!newPathTitle.trim() || isLoading}
              >
                <Plus className="w-4 h-4 mr-1" />
                Create
              </Button>
            </div>

            {/* Existing Paths */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : userPaths.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2" />
                  <p>No paths yet. Create your first learning path!</p>
                </div>
              ) : (
                userPaths.map((path) => (
                  <Card 
                    key={path.id} 
                    className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                      path.id === currentPathId ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleLoadPath(path.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {path.title}
                        </CardTitle>
                        {path.id === currentPathId && (
                          <Badge variant="secondary" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="w-3 h-3 mr-1" />
                        Updated {formatDistanceToNow(new Date(path.updated_at), { addSuffix: true })}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Button */}
      {currentPathId && (
        <Button
          variant={isShared ? "default" : "outline"}
          size="sm"
          onClick={handleShare}
        >
          <Share className="w-4 h-4" />
        </Button>
      )}

      {/* Status Indicator */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {isDirty ? (
          <>
            <AlertCircle className="w-3 h-3 text-orange-500" />
            Unsaved
          </>
        ) : lastSaved ? (
          <>
            <CheckCircle className="w-3 h-3 text-green-500" />
            Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
          </>
        ) : null}
      </div>
    </div>
  );
}

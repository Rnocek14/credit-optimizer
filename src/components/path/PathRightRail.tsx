import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ProviderAlternates } from '@/components/providers/ProviderAlternates';
import { NextStepsPanel } from './NextStepsPanel';
import { usePathStore } from '@/stores/usePathStore';
import { 
  Info, 
  Shuffle, 
  Users, 
  Save,
  X,
  MessageSquare,
  Lock,
  CheckCircle,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import type { PathNode } from '@/stores/usePathStore';

interface PathRightRailProps {
  activeNode?: PathNode;
  userId: string;
}

export function PathRightRail({ activeNode, userId }: PathRightRailProps) {
  const { updateNode, removeNode, setActiveNode, validatePrerequisites } = usePathStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<PathNode['data']>>(activeNode?.data || {});

  const handleSave = () => {
    if (activeNode) {
      updateNode(activeNode.id, editData);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditData(activeNode?.data || {});
    setIsEditing(false);
  };

  const handleRemove = () => {
    if (activeNode) {
      removeNode(activeNode.id);
      setActiveNode();
    }
  };

  const handleSwapProvider = (providerId: string, teacherId?: string) => {
    if (activeNode) {
      updateNode(activeNode.id, {
        institutionId: providerId,
        teacherId,
      });
    }
  };

  if (!activeNode) {
    return (
      <div className="w-80 border-l border-border bg-card p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Info className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Node Details</h3>
            <p className="text-sm text-muted-foreground">
              Click on a node in the canvas to view and edit its details, explore alternatives, and request mentor validation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{activeNode.data.title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveNode()}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <Badge variant="outline" className="text-xs mt-1">
          {activeNode.type}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details" className="text-xs">
              <Info className="w-3 h-3 mr-1" />
              Details
            </TabsTrigger>
            <TabsTrigger value="prereqs" className="text-xs">
              <Lock className="w-3 h-3 mr-1" />
              Prereqs
            </TabsTrigger>
            <TabsTrigger value="next" className="text-xs">
              <ArrowRight className="w-3 h-3 mr-1" />
              Next
            </TabsTrigger>
            <TabsTrigger value="providers" className="text-xs">
              <Shuffle className="w-3 h-3 mr-1" />
              Providers
            </TabsTrigger>
            <TabsTrigger value="mentor" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              Mentor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="p-4 space-y-4">
            {!isEditing ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm">Description</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activeNode.data.description || 'No description provided'}
                  </p>
                </div>

                {activeNode.data.skillTags && (
                  <div>
                    <h3 className="font-medium text-sm">Skills</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {activeNode.data.skillTags.map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(activeNode.data.estimatedHours || activeNode.data.cost) && (
                  <div className="grid grid-cols-2 gap-4">
                    {activeNode.data.estimatedHours && (
                      <div>
                        <h3 className="font-medium text-sm">Duration</h3>
                        <p className="text-sm text-muted-foreground">
                          {activeNode.data.estimatedHours} hours
                        </p>
                      </div>
                    )}
                    {activeNode.data.cost && (
                      <div>
                        <h3 className="font-medium text-sm">Cost</h3>
                        <p className="text-sm text-muted-foreground">
                          ${activeNode.data.cost}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="flex-1"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemove}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={editData.title || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={editData.description || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium">Hours</label>
                    <Input
                      type="number"
                      value={editData.estimatedHours || ''}
                      onChange={(e) => setEditData(prev => ({ 
                        ...prev, 
                        estimatedHours: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cost</label>
                    <Input
                      type="number"
                      value={editData.cost || ''}
                      onChange={(e) => setEditData(prev => ({ 
                        ...prev, 
                        cost: e.target.value ? parseFloat(e.target.value) : undefined 
                      }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSave}
                    className="flex-1"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="prereqs" className="p-4 space-y-4">
            {activeNode && (() => {
              const validation = validatePrerequisites(activeNode.id);
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {validation.ok ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    )}
                    <span className="text-sm font-medium">
                      {validation.ok ? 'All prerequisites met' : 'Prerequisites missing'}
                    </span>
                  </div>
                  
                  {validation.missing.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Missing Requirements:</h4>
                      <div className="space-y-1">
                        {validation.missing.map((item, i) => (
                          <Badge key={i} variant="destructive" className="text-xs block w-fit">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Current Status:</h4>
                    <Badge variant={
                      activeNode.data.status === 'completed' ? 'default' :
                      activeNode.data.status === 'in_progress' ? 'secondary' :
                      activeNode.data.status === 'locked' ? 'destructive' : 'outline'
                    }>
                      {activeNode.data.status || 'available'}
                    </Badge>
                  </div>
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="next" className="p-4">
            <NextStepsPanel 
              activeNode={activeNode}
              userId={userId}
            />
          </TabsContent>

          <TabsContent value="providers" className="p-4">
            <ProviderAlternates
              skillTags={activeNode.data.skillTags}
              difficulty={activeNode.data.difficulty}
              estimatedHours={activeNode.data.estimatedHours}
              currentInstitutionId={activeNode.data.institutionId}
              currentTeacherId={activeNode.data.teacherId}
              onSwap={handleSwapProvider}
            />
          </TabsContent>

          <TabsContent value="mentor" className="p-4 space-y-4">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Mentor Validation</h3>
                <p className="text-sm text-muted-foreground">
                  Request a mentor to review and validate this learning item for enhanced credibility.
                </p>
              </div>
              <Button variant="outline" className="w-full">
                Request Validation
              </Button>
              <Button variant="ghost" className="w-full">
                Suggest Reviewer
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
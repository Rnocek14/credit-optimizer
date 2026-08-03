import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { 
  Download, 
  FileText, 
  Settings, 
  Eye, 
  Zap,
  Target,
  BookOpen,
  Award,
  ExternalLink,
  Copy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { useTrackResumeExport, type ExportOptions } from '@/hooks/useTrackResumeExport';
import { TrackResumePDF, MultiTrackResumePDF } from '@/components/TrackResumePDFTemplate';

interface TrackResumeExportModalProps {
  userId: string;
  children?: React.ReactNode;
}

export function TrackResumeExportModal({ userId, children }: TrackResumeExportModalProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('single');
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    selectedTrackIds: [],
    includeSharedProof: true,
    includeGlobalSkills: false,
    templateStyle: 'professional',
    includeProjectLinks: true,
    includeCRIScore: true,
    includeXPProgress: true,
  });

  const { toast } = useToast();
  const { activeTrackId } = useActiveTrackStore();
  const { 
    isExporting, 
    tracks, 
    getTrackResumeData, 
    getMultiTrackResumeData,
    exportTrackResume,
    exportMultiTrackResume 
  } = useTrackResumeExport(userId);

  // Auto-select active track
  useEffect(() => {
    if (activeTrackId && !selectedTrackIds.includes(activeTrackId)) {
      setSelectedTrackIds([activeTrackId]);
      setExportOptions(prev => ({ ...prev, selectedTrackIds: [activeTrackId] }));
    }
  }, [activeTrackId, selectedTrackIds]);

  // Generate preview data
  useEffect(() => {
    const generatePreview = async () => {
      if (selectedTrackIds.length === 0) return;

      try {
        if (activeTab === 'single' && selectedTrackIds.length === 1) {
          const data = await getTrackResumeData(selectedTrackIds[0]);
          setPreviewData(data);
        } else if (activeTab === 'multi' && selectedTrackIds.length > 1) {
          const data = await getMultiTrackResumeData(selectedTrackIds, exportOptions);
          setPreviewData(data);
        }
      } catch (error) {
        console.error('Failed to generate preview:', error);
      }
    };

    generatePreview();
  }, [selectedTrackIds, activeTab, exportOptions, getTrackResumeData, getMultiTrackResumeData]);

  const handleTrackSelection = (trackId: string, checked: boolean) => {
    if (checked) {
      setSelectedTrackIds(prev => [...prev, trackId]);
    } else {
      setSelectedTrackIds(prev => prev.filter(id => id !== trackId));
    }
    
    setExportOptions(prev => ({
      ...prev,
      selectedTrackIds: checked 
        ? [...prev.selectedTrackIds, trackId]
        : prev.selectedTrackIds.filter(id => id !== trackId)
    }));
  };

  const handleExportJSON = async () => {
    if (selectedTrackIds.length === 0) {
      toast({
        title: 'No tracks selected',
        description: 'Please select at least one track to export',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (activeTab === 'single' && selectedTrackIds.length === 1) {
        await exportTrackResume(selectedTrackIds[0], 'json');
      } else {
        await exportMultiTrackResume(selectedTrackIds, exportOptions, 'json');
      }
      
      toast({
        title: 'Export successful!',
        description: 'Resume data downloaded as JSON',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export resume data',
        variant: 'destructive',
      });
    }
  };

  const handleCopyData = async () => {
    if (!previewData) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(previewData, null, 2));
      toast({
        title: 'Data copied!',
        description: 'Resume data copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy data to clipboard',
        variant: 'destructive',
      });
    }
  };

  const getSelectedTrackNames = () => {
    return selectedTrackIds
      .map(id => tracks.find(t => t.id === id)?.track_name || tracks.find(t => t.id === id)?.title)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Track Resume
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Track-Specific Resume Export
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Track</TabsTrigger>
            <TabsTrigger value="multi">Multi-Track</TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-auto max-h-[calc(90vh-200px)]">
            <TabsContent value="single" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Select Track
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tracks.map(track => (
                      <div key={track.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedTrackIds.includes(track.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTrackIds([track.id]);
                                setExportOptions(prev => ({ ...prev, selectedTrackIds: [track.id] }));
                              } else {
                                setSelectedTrackIds([]);
                                setExportOptions(prev => ({ ...prev, selectedTrackIds: [] }));
                              }
                            }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{track.icon || '🎯'}</span>
                              <span className="font-medium">{track.track_name || track.title}</span>
                              {track.id === activeTrackId && (
                                <Badge variant="default">Active</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{track.goal}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="multi" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Select Multiple Tracks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tracks.map(track => (
                      <div key={track.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedTrackIds.includes(track.id)}
                            onCheckedChange={(checked) => handleTrackSelection(track.id, checked as boolean)}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{track.icon || '🎯'}</span>
                              <span className="font-medium">{track.track_name || track.title}</span>
                              {track.id === activeTrackId && (
                                <Badge variant="default">Active</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{track.goal}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Export Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Template Style</Label>
                    <Select
                      value={exportOptions.templateStyle}
                      onValueChange={(value: any) => setExportOptions(prev => ({ ...prev, templateStyle: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="creative">Creative</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-links">Include Project Links</Label>
                    <Switch
                      id="include-links"
                      checked={exportOptions.includeProjectLinks}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeProjectLinks: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-cri">Include CRI Score</Label>
                    <Switch
                      id="include-cri"
                      checked={exportOptions.includeCRIScore}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeCRIScore: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-xp">Include XP Progress</Label>
                    <Switch
                      id="include-xp"
                      checked={exportOptions.includeXPProgress}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeXPProgress: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-shared">Include Shared Proof</Label>
                    <Switch
                      id="include-shared"
                      checked={exportOptions.includeSharedProof}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeSharedProof: checked }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            {previewData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Export Summary</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Selected Tracks:</span>
                          <p className="font-medium">{getSelectedTrackNames()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Template:</span>
                          <p className="font-medium capitalize">{exportOptions.templateStyle}</p>
                        </div>
                        {activeTab === 'single' && previewData.courses && (
                          <div>
                            <span className="text-muted-foreground">Courses:</span>
                            <p className="font-medium">{previewData.courses.filter((c: any) => c.status === 'completed').length} completed</p>
                          </div>
                        )}
                        {activeTab === 'multi' && previewData.allCourses && (
                          <div>
                            <span className="text-muted-foreground">Total Courses:</span>
                            <p className="font-medium">{previewData.allCourses.filter((c: any) => c.status === 'completed').length} completed</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Export Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Export Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {previewData && (
                    <PDFDownloadLink
                      document={
                        activeTab === 'single' 
                          ? <TrackResumePDF data={previewData} options={exportOptions} />
                          : <MultiTrackResumePDF data={previewData} options={exportOptions} />
                      }
                      fileName={`${previewData.profile?.name || 'resume'}_${activeTab}_track.pdf`}
                    >
                      {({ loading }) => (
                        <Button disabled={loading || isExporting}>
                          <Download className="h-4 w-4 mr-2" />
                          {loading ? 'Generating...' : 'Download PDF'}
                        </Button>
                      )}
                    </PDFDownloadLink>
                  )}

                  <Button variant="outline" onClick={handleExportJSON} disabled={isExporting}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>

                  <Button variant="outline" onClick={handleCopyData} disabled={!previewData}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
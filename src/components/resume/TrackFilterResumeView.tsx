import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Filter, 
  Download, 
  Eye, 
  FileText, 
  Target,
  Award,
  ExternalLink,
  Paperclip
} from 'lucide-react';
import type { CareerTrack } from '@/types/tracks';

interface ProofItem {
  id: string;
  title: string;
  type: 'certification' | 'portfolio' | 'mentor_verified' | 'external_link';
  description: string;
  link?: string;
  trackTitle: string;
  trackId: string;
  transcriptId?: string;
  criScore?: number;
}

interface TrackFilterResumeViewProps {
  userId: string;
  tracks: CareerTrack[];
  allProofItems: ProofItem[];
  onExportPDF: (selectedTracks: string[], includeOptions: ExportOptions) => void;
  onExportJSON: (selectedTracks: string[], includeOptions: ExportOptions) => void;
}

interface ExportOptions {
  includeCRI: boolean;
  includeXP: boolean;
  includeLinks: boolean;
  includeCrossTrackProof: boolean;
  proofTypesFilter: string[];
}

export function TrackFilterResumeView({ 
  userId, 
  tracks, 
  allProofItems, 
  onExportPDF, 
  onExportJSON 
}: TrackFilterResumeViewProps) {
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'single' | 'multi' | 'compare'>('single');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeCRI: true,
    includeXP: true,
    includeLinks: true,
    includeCrossTrackProof: false,
    proofTypesFilter: ['certification', 'portfolio', 'mentor_verified', 'external_link']
  });

  const activeTracks = tracks.filter(t => !t.archived);

  // Filter proof items based on selected tracks and options
  const filteredProofItems = useMemo(() => {
    let items = allProofItems;

    // Filter by selected tracks
    if (selectedTracks.length > 0) {
      items = items.filter(item => selectedTracks.includes(item.trackId));
    }

    // Filter by proof types
    items = items.filter(item => exportOptions.proofTypesFilter.includes(item.type));

    // Group by track
    const groupedItems = items.reduce((acc, item) => {
      if (!acc[item.trackId]) {
        acc[item.trackId] = [];
      }
      acc[item.trackId].push(item);
      return acc;
    }, {} as Record<string, ProofItem[]>);

    return groupedItems;
  }, [allProofItems, selectedTracks, exportOptions.proofTypesFilter]);

  const handleTrackToggle = (trackId: string) => {
    setSelectedTracks(prev => 
      prev.includes(trackId) 
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    );
  };

  const handleSelectAllTracks = () => {
    setSelectedTracks(activeTracks.map(t => t.id));
  };

  const handleClearSelection = () => {
    setSelectedTracks([]);
  };

  const handleProofTypeToggle = (type: string) => {
    setExportOptions(prev => ({
      ...prev,
      proofTypesFilter: prev.proofTypesFilter.includes(type)
        ? prev.proofTypesFilter.filter(t => t !== type)
        : [...prev.proofTypesFilter, type]
    }));
  };

  const getProofIcon = (type: ProofItem['type']): React.ReactNode => {
    switch (type) {
      case 'certification': return <Award className="h-4 w-4" />;
      case 'portfolio': return <FileText className="h-4 w-4" />;
      case 'mentor_verified': return <Target className="h-4 w-4" />;
      case 'external_link': return <ExternalLink className="h-4 w-4" />;
      default: return <Paperclip className="h-4 w-4" />;
    }
  };

  const getProofTypeLabel = (type: string): string => {
    switch (type) {
      case 'certification': return 'Certifications';
      case 'portfolio': return 'Portfolio Projects';
      case 'mentor_verified': return 'Mentor Verified';
      case 'external_link': return 'External Links';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Track-Specific Resume Builder
          </h3>
          <p className="text-sm text-muted-foreground">
            Create targeted resumes showcasing specific tracks or compare multiple career paths.
          </p>
        </div>
        <Select value={viewMode} onValueChange={(value: 'single' | 'multi' | 'compare') => setViewMode(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Single Track</SelectItem>
            <SelectItem value="multi">Multi-Track</SelectItem>
            <SelectItem value="compare">Compare</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Track Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Select Tracks ({selectedTracks.length}/{activeTracks.length})</CardTitle>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={handleSelectAllTracks}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearSelection}>
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTracks.map((track) => {
              const isSelected = selectedTracks.includes(track.id);
              const proofCount = (allProofItems.filter(item => item.trackId === track.id) || []).length;
              
              return (
                <div
                  key={track.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleTrackToggle(track.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{track.icon || '💻'}</span>
                      <div>
                        <div className="font-medium text-sm">{track.track_name || track.title}</div>
                        <div className="text-xs text-muted-foreground">{proofCount} proof items</div>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded border ${isSelected ? 'bg-primary border-primary' : 'border-border'}`}>
                      {isSelected && <div className="w-2 h-2 bg-background rounded-sm m-0.5" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Include Options */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="include-cri"
                checked={exportOptions.includeCRI}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, includeCRI: checked }))
                }
              />
              <Label htmlFor="include-cri" className="text-sm">Include CRI Scores</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="include-xp"
                checked={exportOptions.includeXP}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, includeXP: checked }))
                }
              />
              <Label htmlFor="include-xp" className="text-sm">Include XP</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="include-links"
                checked={exportOptions.includeLinks}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, includeLinks: checked }))
                }
              />
              <Label htmlFor="include-links" className="text-sm">Include Links</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="cross-track-proof"
                checked={exportOptions.includeCrossTrackProof}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, includeCrossTrackProof: checked }))
                }
              />
              <Label htmlFor="cross-track-proof" className="text-sm">Cross-Track Proof</Label>
            </div>
          </div>

          {/* Proof Type Filters */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Include Proof Types</Label>
            <div className="flex flex-wrap gap-2">
              {['certification', 'portfolio', 'mentor_verified', 'external_link'].map((type) => {
                const isSelected = exportOptions.proofTypesFilter.includes(type);
                return (
                  <Badge
                    key={type}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleProofTypeToggle(type)}
                  >
                    {getProofIcon(type as ProofItem['type'])}
                    <span className="ml-1">{getProofTypeLabel(type)}</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {selectedTracks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Resume Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedTracks.map((trackId) => {
                const track = tracks.find(t => t.id === trackId);
                const trackProof = filteredProofItems[trackId] || [];
                
                if (!track) return null;
                
                return (
                  <div key={trackId} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xl">{track.icon || '💻'}</span>
                      <div>
                        <h4 className="font-medium">{track.track_name || track.title}</h4>
                        <p className="text-sm text-muted-foreground">{track.goal || 'No goal set'}</p>
                      </div>
                    </div>
                    
                    {trackProof.length > 0 ? (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Proof of Learning ({trackProof.length} items)</h5>
                        <div className="grid gap-2">
                          {trackProof.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                              {getProofIcon(item.type)}
                              <div className="flex-1">
                                <span className="font-medium">{item.title}</span>
                                {exportOptions.includeCRI && item.criScore && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    CRI: {item.criScore.toFixed(1)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                          {trackProof.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{trackProof.length - 3} more items
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No proof items match the current filters.</div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Actions */}
      <div className="flex gap-3">
        <Button 
          onClick={() => onExportPDF(selectedTracks, exportOptions)}
          disabled={selectedTracks.length === 0}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Export PDF Resume
        </Button>
        <Button 
          variant="outline"
          onClick={() => onExportJSON(selectedTracks, exportOptions)}
          disabled={selectedTracks.length === 0}
        >
          <FileText className="h-4 w-4 mr-2" />
          Export JSON
        </Button>
      </div>
    </div>
  );
}
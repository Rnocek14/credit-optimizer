import React from 'react';
import { Card } from '@/components/ui/card';
import { useEduTreeData } from '../hooks/useEduTreeData';
import { TRACK_DEFINITIONS } from '../data/trackDefinitions';

export function DiagnosticPanel() {
  const { data, loading, hasData } = useEduTreeData();

  // Force console logging
  React.useEffect(() => {
    console.log('[DIAGNOSTIC] EduTreeData State:', {
      loading,
      hasData,
      blocks: data.blocks?.length || 0,
      courses: data.courses?.length || 0,
      blockMembers: data.blockMembers?.length || 0,
      gates: data.gates?.length || 0,
      gateEdges: data.gateEdges?.length || 0,
      sampleBlock: data.blocks?.[0]
    });

    console.log('[DIAGNOSTIC] Track Definitions:', {
      trackCount: TRACK_DEFINITIONS.length,
      tracks: TRACK_DEFINITIONS.map(t => ({
        id: t.id,
        name: t.name,
        blockIds: t.blockIds
      }))
    });

    // Check URL params
    const params = new URLSearchParams(window.location.search);
    console.log('[DIAGNOSTIC] URL Parameters:', {
      primary: params.get('primary'),
      comparison: params.get('comparison'),
      overlayEnabled: params.get('eduTreeMultiPathOverlay'),
      phaseA: params.get('eduTreePhaseA')
    });
  }, [data, loading, hasData]);

  return (
    <Card className="fixed bottom-4 left-4 z-50 p-4 max-w-md">
      <div className="space-y-2 text-sm">
        <h3 className="font-semibold">EduTree Diagnostics</h3>
        <div>Loading: {loading ? 'YES' : 'NO'}</div>
        <div>Has Data: {hasData ? 'YES' : 'NO'}</div>
        <div>Blocks: {data.blocks?.length || 0}</div>
        <div>Courses: {data.courses?.length || 0}</div>
        <div>Block Members: {data.blockMembers?.length || 0}</div>
        <div>Gates: {data.gates?.length || 0}</div>
        <div>Gate Edges: {data.gateEdges?.length || 0}</div>
        {data.blocks?.[0] && (
          <div className="text-xs mt-2 p-2 bg-muted rounded">
            Sample Block: {data.blocks[0].title} (Level {data.blocks[0].level_year})
          </div>
        )}
      </div>
    </Card>
  );
}
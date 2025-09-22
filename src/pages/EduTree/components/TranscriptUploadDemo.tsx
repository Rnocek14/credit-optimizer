import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const TranscriptUploadDemo: React.FC = () => {
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [isSeeded, setIsSeeded] = React.useState(false);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-evidence-demo', {
        method: 'POST'
      });

      if (error) {
        toast.error('Failed to seed demo data');
        console.error('Seeding error:', error);
        return;
      }

      setIsSeeded(true);
      toast.success('Demo transcript data loaded! Check the nodes for evidence badges.');
      console.log('Demo seeding result:', data);
      
      // Refresh the page after a short delay to show the evidence
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      toast.error('Error seeding demo data');
      console.error('Seeding error:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Transcript Evidence Demo
        </CardTitle>
        <CardDescription>
          Load sample transcript data to see evidence badges on requirement nodes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Upload className="h-4 w-4" />
          Sample transcripts from 3 demo students
        </div>
        
        {isSeeded ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Demo data loaded successfully!
          </div>
        ) : (
          <Button 
            onClick={handleSeedDemo} 
            disabled={isSeeding}
            className="w-full"
          >
            {isSeeding ? 'Loading Demo Data...' : 'Load Demo Transcripts'}
          </Button>
        )}
        
        <div className="text-xs text-muted-foreground">
          This will show completed (✓), in-progress (↻), and transfer pending (✳) course indicators on nodes.
        </div>
      </CardContent>
    </Card>
  );
};
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function CareerDebugPanel() {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('Initializing...');
  const [details, setDetails] = useState<any>(null);

  const checkDatabase = async () => {
    setStatus('checking');
    setMessage('Checking database connection...');
    
    try {
      // Test 1: Check if career_paths table exists
      const { data: careerData, error: careerError } = await supabase
        .from('career_paths' as any)
        .select('id, title, slug')
        .limit(5);

      if (careerError) {
        setStatus('error');
        setMessage(`Database Error: ${careerError.message}`);
        setDetails({
          code: careerError.code,
          hint: careerError.hint,
          details: careerError.details,
        });
        return;
      }

      // Test 2: Check if career_path_programs table exists
      const { data: programData, error: programError } = await supabase
        .from('career_path_programs' as any)
        .select('id, career_path_id, program_id, anchor_school')
        .limit(5);

      if (programError) {
        setStatus('error');
        setMessage(`Program Table Error: ${programError.message}`);
        setDetails({
          code: programError.code,
          careerPathsWorked: true,
          careerCount: careerData?.length || 0,
        });
        return;
      }

      setStatus('success');
      setMessage('All systems operational!');
      setDetails({
        careerPathsCount: careerData?.length || 0,
        programMappingsCount: programData?.length || 0,
        sampleCareers: (careerData as any[])?.map((c: any) => c.title) || [],
      });
    } catch (err: any) {
      setStatus('error');
      setMessage(`Unexpected error: ${err.message}`);
      setDetails(err);
    }
  };

  useEffect(() => {
    checkDatabase();
  }, []);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          🔍 Career System Diagnostics
          <Badge variant={status === 'success' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}>
            {status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          <div className="font-medium mb-1">{message}</div>
          {details && (
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
              {JSON.stringify(details, null, 2)}
            </pre>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={checkDatabase}>
          Re-check Connection
        </Button>
      </CardContent>
    </Card>
  );
}

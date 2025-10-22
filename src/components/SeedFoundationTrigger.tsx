import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Database } from 'lucide-react';

export function SeedFoundationTrigger() {
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const handleRun = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-data-2025', { body: { confirm: true } });
      if (error) throw error;
      toast.success(data?.message || 'Seed completed');
      setDone(true);
      console.log('Seed results', data);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant={done ? 'secondary' : 'default'} onClick={handleRun} disabled={busy || done}>
      <Database className="mr-2 h-4 w-4" />
      {busy ? 'Seeding...' : done ? 'Seed Applied' : 'Seed Foundation Data'}
    </Button>
  );
}

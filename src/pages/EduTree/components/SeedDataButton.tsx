import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Database } from 'lucide-react';
import { seedEduTreeData } from '@/lib/seedData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SeedDataButton() {
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedEduTreeData();
      
      // DEV: Log seed verification
      if (import.meta.env.DEV) {
        const { data: chk1 } = await supabase.from('requirement_blocks').select('id');
        const { data: chk2 } = await supabase.from('block_members').select('id');
        const { data: chk3 } = await supabase.from('block_gates').select('id');
        const { data: chk4 } = await supabase.from('prereq_to_block').select('id');
        console.log('[EduTree] seed rows', {
          blocks: chk1?.length, 
          members: chk2?.length, 
          gates: chk3?.length, 
          edges: chk4?.length
        });
      }
      
      toast.success("Education tree data has been seeded successfully!");
      // Refresh the page to show the new data
      window.location.reload();
    } catch (error) {
      console.error('Seeding failed:', error);
      toast.error("Failed to seed data. Check console for details.");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Button
      onClick={handleSeed}
      disabled={isSeeding}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      {isSeeding ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Database className="w-4 h-4" />
      )}
      {isSeeding ? 'Seeding...' : 'Seed Data'}
    </Button>
  );
}
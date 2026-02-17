import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Database } from 'lucide-react';
import { seedEduTreeData } from '@/lib/seedData';
import { verifySeedCounts } from '@/shared/lib/api/devTools';
import { toast } from 'sonner';

export function SeedDataButton() {
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedEduTreeData();
      
      // DEV: Log seed verification
      if (import.meta.env.DEV) {
        const counts = await verifySeedCounts();
        console.log('[EduTree] seed rows', counts);
      }
      
      toast.success("Education tree data has been seeded successfully!");
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
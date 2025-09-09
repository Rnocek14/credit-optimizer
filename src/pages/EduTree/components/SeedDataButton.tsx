import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Database } from 'lucide-react';
import { seedEduTreeData } from '@/lib/seedData';
import { useToast } from '@/hooks/use-toast';

export function SeedDataButton() {
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedEduTreeData();
      toast({
        title: "Success!",
        description: "Education tree data has been seeded successfully.",
      });
      // Refresh the page to show the new data
      window.location.reload();
    } catch (error) {
      console.error('Seeding failed:', error);
      toast({
        title: "Error",
        description: "Failed to seed data. Check console for details.",
        variant: "destructive",
      });
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
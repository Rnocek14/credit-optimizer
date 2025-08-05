import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function DemoCourseSeedTrigger() {
  const [isSeeding, setIsSeeding] = useState(false);

  const triggerSeeding = async () => {
    setIsSeeding(true);
    try {
      console.log('Triggering demo course seeding...');
      
      // Clear existing data first to allow re-seeding
      await supabase.from('course_discovery_queue').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      const { data, error } = await supabase.functions.invoke('demo-course-seeder', {
        body: {}
      });

      if (error) {
        console.error('Seeding error:', error);
        toast.error('Failed to seed courses');
        return;
      }

      console.log('Seeding result:', data);
      toast.success(`Course curation system populated! ${data?.coursesProcessed || 0} courses processed.`);
      
    } catch (error) {
      console.error('Seeding failed:', error);
      toast.error('Failed to seed courses');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Course Curation System</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Populate the course curation system with demo data from Coursera API
      </p>
      <Button onClick={triggerSeeding} disabled={isSeeding}>
        {isSeeding ? 'Seeding Courses...' : 'Populate Course Data'}
      </Button>
    </div>
  );
}
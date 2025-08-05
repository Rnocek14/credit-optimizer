import { supabase } from '@/integrations/supabase/client';

export async function triggerCourseSeeding() {
  try {
    console.log('Triggering demo course seeding...');
    
    const { data, error } = await supabase.functions.invoke('demo-course-seeder', {
      body: {}
    });

    if (error) {
      console.error('Seeding error:', error);
      throw error;
    }

    console.log('Seeding result:', data);
    return data;
    
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  }
}

// Auto-trigger seeding when this module loads
triggerCourseSeeding().then(() => {
  console.log('Course seeding completed');
}).catch((error) => {
  console.error('Course seeding failed:', error);
});
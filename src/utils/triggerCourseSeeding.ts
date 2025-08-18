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

// Auto-trigger seeding only after authenticated and authorized
let seedingTriggered = false;

supabase.auth.onAuthStateChange(async (_event, session) => {
  if (seedingTriggered || !session?.user) return;
  seedingTriggered = true;

  try {
    const user = session.user;
    // Allow admins or known demo users
    const { data: role } = await supabase.rpc('get_user_role', { user_uuid: user.id });
    const isDemo = ['2b458624-d498-4cca-a63d-9341cc20e363','3c459625-e499-5ddb-b64d-a442dd21f474','4d56a736-f5aa-6eec-c75e-b553ee32e585'].includes(user.id);
    if (role === 'admin' || isDemo) {
      await triggerCourseSeeding();
      console.log('Course seeding completed after auth');
    } else {
      console.log('Skipping demo course seeding for non-admin user');
    }
  } catch (err) {
    console.error('Auth seeding trigger error:', err);
  }
});
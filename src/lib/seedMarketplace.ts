import { supabase } from "@/integrations/supabase/client";

export async function seedMarketplace() {
  try {
    console.log('Starting marketplace seeding...');
    
    const { data, error } = await supabase.functions.invoke('seed-marketplace', {
      body: {}
    });
    
    if (error) {
      console.error('Error seeding marketplace:', error);
      throw error;
    }
    
    console.log('Marketplace seeded successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to seed marketplace:', error);
    throw error;
  }
}

// Auto-seed in development mode if environment supports it
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // Only run once per session - updated key to force re-seed
  const SEED_KEY = 'marketplace_seeded_v2_phase2';
  if (!sessionStorage.getItem(SEED_KEY)) {
    console.log('🌱 Initiating marketplace seeding...');
    seedMarketplace()
      .then(() => {
        sessionStorage.setItem(SEED_KEY, 'true');
        console.log('✅ Marketplace seeded successfully');
      })
      .catch((error) => {
        console.error('❌ Failed to seed marketplace:', error);
      });
  }
}
import { supabase } from "@/integrations/supabase/client";

export async function seedMarketplace() {
  try {
    console.log('Starting V5 marketplace seeding...');
    
    const { data, error } = await supabase.functions.invoke('seed-v5-marketplace', {
      body: {}
    });
    
    if (error) {
      console.error('Error seeding V5 marketplace:', error);
      throw error;
    }
    
    console.log('V5 Marketplace seeded successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to seed V5 marketplace:', error);
    throw error;
  }
}

// Auto-seed in development mode if environment supports it
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // Only run once per session - updated key for V5 phase
  const SEED_KEY = 'marketplace_seeded_v5_phase4';
  if (!sessionStorage.getItem(SEED_KEY)) {
    console.log('🌱 Initiating V5 marketplace seeding (Phases 1-4)...');
    seedMarketplace()
      .then(() => {
        sessionStorage.setItem(SEED_KEY, 'true');
        console.log('✅ V5 Marketplace seeded successfully - templates should now work!');
      })
      .catch((error) => {
        // Gracefully handle "Failed to fetch" errors (edge function not deployed)
        const errorMessage = error?.message ?? String(error);
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('FunctionsHttpError')) {
          console.warn('⚠️ seed-v5-marketplace edge function not available (may not be deployed yet)');
        } else {
          console.error('❌ seed-v5-marketplace failed:', errorMessage);
          // Log additional details for debugging
          if (error?.context) console.error('Error context:', error.context);
        }
      });
  }
}

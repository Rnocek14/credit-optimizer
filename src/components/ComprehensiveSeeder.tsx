import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, Database, XCircle, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { seedEduTreeData } from '@/lib/seedData';
import { seedMarketplace } from '@/lib/seedMarketplace';
import { toast } from 'sonner';

interface SeedStatus {
  eduTree: 'idle' | 'loading' | 'success' | 'error';
  marketplace: 'idle' | 'loading' | 'success' | 'error';
}

export function ComprehensiveSeeder() {
  const [status, setStatus] = useState<SeedStatus>({
    eduTree: 'idle',
    marketplace: 'idle'
  });
  const [isSeeding, setIsSeeding] = useState(false);

  const seedAll = async () => {
    setIsSeeding(true);
    
    // 1. Seed EduTree
    try {
      setStatus(prev => ({ ...prev, eduTree: 'loading' }));
      console.log('🌱 Starting EduTree seeding (destructive mode)...');
      await seedEduTreeData({ destructive: true });
      setStatus(prev => ({ ...prev, eduTree: 'success' }));
      console.log('✅ EduTree data seeded successfully');
      toast.success('EduTree data seeded');
    } catch (error) {
      console.error('❌ EduTree seeding failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error
      });
      setStatus(prev => ({ ...prev, eduTree: 'error' }));
      toast.error(`EduTree seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 2. Seed Marketplace
    try {
      setStatus(prev => ({ ...prev, marketplace: 'loading' }));
      console.log('🌱 Starting marketplace seeding...');
      const result = await seedMarketplace();
      console.log('✅ Marketplace seeded successfully:', result);
      setStatus(prev => ({ ...prev, marketplace: 'success' }));
      toast.success('Marketplace seeded');
    } catch (error) {
      console.error('❌ Marketplace seeding failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error
      });
      setStatus(prev => ({ ...prev, marketplace: 'error' }));
      toast.error(`Marketplace seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusIcon = (state: 'idle' | 'loading' | 'success' | 'error') => {
    switch (state) {
      case 'loading': return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Comprehensive Data Seeding
        </CardTitle>
        <CardDescription>
          Seed all application data: EduTree courses and marketplace templates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {getStatusIcon(status.eduTree)}
            <span className="font-medium">EduTree Data</span>
            <span className="text-sm text-muted-foreground ml-auto">
              {status.eduTree === 'success' ? 'Seeded' : status.eduTree === 'loading' ? 'Seeding...' : 'Ready'}
            </span>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {getStatusIcon(status.marketplace)}
            <span className="font-medium">Marketplace Templates</span>
            <span className="text-sm text-muted-foreground ml-auto">
              {status.marketplace === 'success' ? 'Seeded' : status.marketplace === 'loading' ? 'Seeding...' : 'Ready'}
            </span>
          </div>
          

        </div>

        <Button 
          onClick={seedAll} 
          disabled={isSeeding}
          className="w-full"
          size="lg"
        >
          {isSeeding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Seeding All Data...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Seed All Application Data
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

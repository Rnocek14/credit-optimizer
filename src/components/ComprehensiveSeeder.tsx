import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { seedEduTreeData } from '@/lib/seedData';
import { seedMarketplace } from '@/lib/seedMarketplace';
import { toast } from 'sonner';

interface SeedStatus {
  eduTree: 'idle' | 'loading' | 'success' | 'error';
  marketplace: 'idle' | 'loading' | 'success' | 'error';
  demoCourses: 'idle' | 'loading' | 'success' | 'error';
}

export function ComprehensiveSeeder() {
  const [status, setStatus] = useState<SeedStatus>({
    eduTree: 'idle',
    marketplace: 'idle',
    demoCourses: 'idle'
  });
  const [isSeeding, setIsSeeding] = useState(false);

  const seedAll = async () => {
    setIsSeeding(true);
    
    // 1. Seed EduTree
    try {
      setStatus(prev => ({ ...prev, eduTree: 'loading' }));
      await seedEduTreeData({ destructive: false });
      setStatus(prev => ({ ...prev, eduTree: 'success' }));
      toast.success('EduTree data seeded');
    } catch (error) {
      console.error('EduTree seeding failed:', error);
      setStatus(prev => ({ ...prev, eduTree: 'error' }));
      toast.error('EduTree seeding failed');
    }

    // 2. Seed Marketplace
    try {
      setStatus(prev => ({ ...prev, marketplace: 'loading' }));
      await seedMarketplace();
      setStatus(prev => ({ ...prev, marketplace: 'success' }));
      toast.success('Marketplace seeded');
    } catch (error) {
      console.error('Marketplace seeding failed:', error);
      setStatus(prev => ({ ...prev, marketplace: 'error' }));
      toast.error('Marketplace seeding failed');
    }

    // 3. Seed Demo Courses
    try {
      setStatus(prev => ({ ...prev, demoCourses: 'loading' }));
      const { data, error } = await supabase.functions.invoke('demo-course-seeder', {
        body: {}
      });
      if (error) throw error;
      setStatus(prev => ({ ...prev, demoCourses: 'success' }));
      toast.success(`Demo courses seeded: ${data?.coursesProcessed || 0} processed`);
    } catch (error) {
      console.error('Demo courses seeding failed:', error);
      setStatus(prev => ({ ...prev, demoCourses: 'error' }));
      toast.error('Demo courses seeding failed');
    }

    setIsSeeding(false);
    toast.success('All seeding completed!');
  };

  const getStatusIcon = (state: 'idle' | 'loading' | 'success' | 'error') => {
    switch (state) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
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
          Seed all application data: EduTree courses, marketplace templates, and demo courses
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
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {getStatusIcon(status.demoCourses)}
            <span className="font-medium">Demo Courses</span>
            <span className="text-sm text-muted-foreground ml-auto">
              {status.demoCourses === 'success' ? 'Seeded' : status.demoCourses === 'loading' ? 'Seeding...' : 'Ready'}
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

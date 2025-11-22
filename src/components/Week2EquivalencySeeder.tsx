import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function Week2EquivalencySeeder() {
  const [showSQL, setShowSQL] = useState(false);

  const handleOpenSQL = () => {
    window.open('/scripts/seed-equivalencies-tesu-bsba.sql', '_blank');
    toast.success('Opening SQL file - copy and paste into Supabase SQL Editor');
  };

  const handleOpenDocs = () => {
    window.open('/docs/week2-equivalencies-guide.md', '_blank');
    toast.info('Opening documentation');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Week 2: Equivalency Mappings
        </CardTitle>
        <CardDescription>
          Map 50 alternative credits to TESU course codes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>What Gets Mapped</AlertTitle>
          <AlertDescription>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-2">
                  <p className="font-semibold">Gen-Ed Mappings (26)</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Written Comm:</span>
                      <Badge variant="secondary" className="text-xs">4 options</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Oral Comm:</span>
                      <Badge variant="secondary" className="text-xs">1 option</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Quantitative:</span>
                      <Badge variant="secondary" className="text-xs">5 options</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Humanities:</span>
                      <Badge variant="secondary" className="text-xs">5 options</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Social Science:</span>
                      <Badge variant="secondary" className="text-xs">10 options</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Natural Science:</span>
                      <Badge variant="secondary" className="text-xs">4 options</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Civic/Global:</span>
                      <Badge variant="secondary" className="text-xs">3 options</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="font-semibold">Major Mappings (24)</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Lower Business:</span>
                      <Badge variant="secondary" className="text-xs">8 courses</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Upper Business:</span>
                      <Badge variant="secondary" className="text-xs">16 courses</Badge>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-muted rounded text-xs">
                    <p className="font-semibold mb-1">Examples:</p>
                    <p>CLEP College Comp → ENC-101-102</p>
                    <p>Sophia Intro Business → BUS-101</p>
                    <p>Study.com Financial Acct → ACC-301</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-3 border-t">
                <p className="text-sm font-semibold mb-2">All Mappings Include:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>✅ Confidence score (1.0 = official)</div>
                  <div>✅ Gen-ed category codes</div>
                  <div>✅ Course level (100-400)</div>
                  <div>✅ Official TESU docs URLs</div>
                  <div>✅ Requirement area</div>
                  <div>✅ Last verified date</div>
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button
            onClick={handleOpenSQL}
            size="lg"
            className="flex-1"
          >
            <ArrowRightLeft className="w-5 h-5 mr-2" />
            Open SQL File
          </Button>
          <Button
            onClick={handleOpenDocs}
            variant="outline"
            size="lg"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            View Docs
          </Button>
        </div>

        {showSQL && (
          <Alert>
            <AlertTitle>Setup Instructions</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Ensure Week 1 tables and alt credits are seeded first</li>
                <li>Click "Open SQL File" to view the mappings</li>
                <li>Copy the entire SQL content</li>
                <li>Open <strong>Supabase Dashboard</strong> → <strong>SQL Editor</strong></li>
                <li>Paste and run the SQL</li>
                <li>Run verification queries to confirm mappings</li>
              </ol>
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-xs font-mono">
                  Expected: 50 equivalency mappings<br/>
                  CLEP: 15 | DSST: 10 | SOPHIA: 15 | STUDY_COM: 10<br/>
                  Gen-Ed: 26 | Major: 24 | Upper-Level: 16
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-4 gap-4 text-center pt-4 border-t">
          <div>
            <p className="text-2xl font-bold">50</p>
            <p className="text-xs text-muted-foreground">Mappings</p>
          </div>
          <div>
            <p className="text-2xl font-bold">26</p>
            <p className="text-xs text-muted-foreground">Gen-Ed</p>
          </div>
          <div>
            <p className="text-2xl font-bold">24</p>
            <p className="text-xs text-muted-foreground">Major</p>
          </div>
          <div>
            <p className="text-2xl font-bold">1.0</p>
            <p className="text-xs text-muted-foreground">Confidence</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

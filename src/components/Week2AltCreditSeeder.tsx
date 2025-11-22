import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Week2AltCreditSeeder() {
  const [showSQL, setShowSQL] = useState(false);

  const handleOpenSQL = () => {
    window.open('/scripts/seed-alt-credits-tesu-bsba.sql', '_blank');
    toast.success('Opening SQL file - copy and paste into Supabase SQL Editor');
  };

  const handleOpenDocs = () => {
    window.open('/docs/week2-alt-credits-guide.md', '_blank');
    toast.info('Opening documentation');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Week 2: Alternative Credits Seeding
        </CardTitle>
        <CardDescription>
          Seed 50 alternative credits for TESU BSBA coverage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>What Gets Seeded</AlertTitle>
          <AlertDescription>
            <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
              <div>
                <p className="font-semibold mb-1">📝 CLEP Exams (15)</p>
                <ul className="text-xs space-y-0.5 text-muted-foreground">
                  <li>• College Composition</li>
                  <li>• College Algebra</li>
                  <li>• Psychology, Sociology</li>
                  <li>• US History I & II</li>
                  <li>• Biology, Natural Sciences</li>
                </ul>
              </div>
              
              <div>
                <p className="font-semibold mb-1">📝 DSST Exams (10)</p>
                <ul className="text-xs space-y-0.5 text-muted-foreground">
                  <li>• Intro to Business</li>
                  <li>• Business Mathematics</li>
                  <li>• Organizational Behavior</li>
                  <li>• HR Management</li>
                  <li>• Principles of Finance</li>
                </ul>
              </div>
              
              <div>
                <p className="font-semibold mb-1">🎓 Sophia Courses (15)</p>
                <ul className="text-xs space-y-0.5 text-muted-foreground">
                  <li>• English Comp I & II</li>
                  <li>• Public Speaking</li>
                  <li>• Macro/Microeconomics</li>
                  <li>• Intro to Business</li>
                  <li>• Project Management</li>
                </ul>
              </div>
              
              <div>
                <p className="font-semibold mb-1">🎓 Study.com (10)</p>
                <ul className="text-xs space-y-0.5 text-muted-foreground">
                  <li>• Financial Accounting</li>
                  <li>• Managerial Accounting</li>
                  <li>• Operations Management</li>
                  <li>• Business Strategy</li>
                  <li>• Business Ethics</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t text-sm">
              <p className="font-semibold">Coverage:</p>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div>✅ All 7 gen-ed areas</div>
                <div>✅ Business core courses</div>
                <div>✅ Upper-level business</div>
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
            <BookOpen className="w-5 h-5 mr-2" />
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
                <li>Click "Open SQL File" to view the seed script</li>
                <li>Copy the entire SQL content</li>
                <li>Open <strong>Supabase Dashboard</strong> → <strong>SQL Editor</strong></li>
                <li>Paste and run the SQL</li>
                <li>Verify using the queries at the bottom</li>
              </ol>
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-xs font-mono">
                  Expected: 50 rows inserted<br/>
                  CLEP: 15 | DSST: 10 | SOPHIA: 15 | STUDY_COM: 10
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t">
          <div>
            <p className="text-2xl font-bold">50</p>
            <p className="text-xs text-muted-foreground">Alt Credits</p>
          </div>
          <div>
            <p className="text-2xl font-bold">4</p>
            <p className="text-xs text-muted-foreground">Providers</p>
          </div>
          <div>
            <p className="text-2xl font-bold">120+</p>
            <p className="text-xs text-muted-foreground">Credits Available</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

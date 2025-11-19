import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { seedGoldenBsCs } from '@/utils/seedGoldenProgram';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function SeedGoldenProgram() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handleSeed = async () => {
    setIsSeeding(true);
    setResults(null);
    
    try {
      const seedResults = await seedGoldenBsCs();
      setResults(seedResults);
      
      if (seedResults.verification.passesGating) {
        toast({
          title: '✅ Golden BS CS Seeded Successfully',
          description: `${seedResults.verification.totalCredits} credits, ${seedResults.verification.blockCount} blocks`,
        });
      } else {
        toast({
          title: '⚠️ Seeded but did not pass gating',
          description: 'Check verification results below',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Seed Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Seed Golden Programs</h1>
        <p className="text-muted-foreground mt-2">
          Populate the database with golden program data for testing and development
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Golden BS CS Program</CardTitle>
          <CardDescription>
            Inserts ~120 credits, 6 requirement blocks, and marketplace options for TESU BS CS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleSeed} 
            disabled={isSeeding}
            size="lg"
            className="w-full"
          >
            {isSeeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding...
              </>
            ) : (
              'Seed Golden BS CS Data'
            )}
          </Button>

          {results && (
            <div className="space-y-4 mt-6 p-4 bg-muted rounded-lg">
              <div className="font-semibold text-lg">Seed Results</div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Requirements</div>
                  <div className="flex items-center gap-2">
                    {results.requirements.success > 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-mono">{results.requirements.success}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Blocks</div>
                  <div className="flex items-center gap-2">
                    {results.blocks.success > 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-mono">{results.blocks.success}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Options</div>
                  <div className="flex items-center gap-2">
                    {results.options.success > 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-mono">{results.options.success}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="font-semibold">Verification</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>Total Credits: <span className="font-mono">{results.verification.totalCredits}</span></div>
                  <div>Block Count: <span className="font-mono">{results.verification.blockCount}</span></div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {results.verification.passesGating ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-green-600">Passes Gating ✓</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="font-semibold text-red-600">Does Not Pass Gating</span>
                    </>
                  )}
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="border-t pt-4 space-y-2">
                  <div className="font-semibold text-red-600">Errors</div>
                  <ul className="text-sm space-y-1">
                    {results.errors.map((err: string, i: number) => (
                      <li key={i} className="text-red-600">• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/diagnostic/career-data'}
                  className="w-full"
                >
                  View Diagnostics Page
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

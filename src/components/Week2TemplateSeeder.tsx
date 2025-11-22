import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function Week2TemplateSeeder() {
  const [showDetails, setShowDetails] = useState(false);

  const handleOpenSQL = () => {
    window.open('/scripts/seed-tesu-bsba-cheapest-template.sql', '_blank');
    toast.success('Opening template seed SQL');
  };

  const handleOpenDocs = () => {
    window.open('/docs/week2-template-guide.md', '_blank');
    toast.info('Opening template documentation');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Week 2: TESU BSBA Template
        </CardTitle>
        <CardDescription>
          Complete 120-credit degree plan optimized for lowest cost
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>Template Overview</AlertTitle>
          <AlertDescription>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold mb-2">Structure</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Total Credits:</span>
                      <Badge variant="secondary">120</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Terms:</span>
                      <Badge variant="secondary">8 terms (4 years)</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Course Slots:</span>
                      <Badge variant="secondary">40 courses</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Cost:</span>
                      <Badge variant="secondary">$2,850</Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="font-semibold mb-2">Credit Distribution</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Gen-Ed:</span>
                      <Badge variant="secondary">42 credits</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Business Core:</span>
                      <Badge variant="secondary">18 credits</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Upper Business:</span>
                      <Badge variant="secondary">30 credits</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Capstone:</span>
                      <Badge variant="secondary">4 credits</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Free Electives:</span>
                      <Badge variant="secondary">26 credits</Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <p className="font-semibold text-sm mb-2">Provider Mix (Cheapest Strategy)</p>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Sophia (42cr @ $198 total)</span>
                      <span className="font-mono">35%</span>
                    </div>
                    <Progress value={35} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>CLEP (30cr @ $930 total)</span>
                      <span className="font-mono">25%</span>
                    </div>
                    <Progress value={25} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>DSST (18cr @ $600 total)</span>
                      <span className="font-mono">15%</span>
                    </div>
                    <Progress value={15} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Study.com (15cr @ $796 total)</span>
                      <span className="font-mono">12.5%</span>
                    </div>
                    <Progress value={12.5} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>TESU (15cr @ $326 total)</span>
                      <span className="font-mono">12.5%</span>
                    </div>
                    <Progress value={12.5} className="h-2" />
                  </div>
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
            <FileText className="w-5 h-5 mr-2" />
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

        {showDetails && (
          <Alert>
            <AlertTitle>Term-by-Term Highlights</AlertTitle>
            <AlertDescription>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold">Year 1:</span> Sophia blitz - 10 courses in 2 months ($198)
                </div>
                <div>
                  <span className="font-semibold">Year 2:</span> CLEP exams + Study.com start ($1,127)
                </div>
                <div>
                  <span className="font-semibold">Year 3:</span> Upper-level focus with Study.com + DSST ($798)
                </div>
                <div>
                  <span className="font-semibold">Year 4:</span> TESU residency + capstone ($525)
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-4 border-t">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Policy Compliance
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span>120 total credits</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span>15 TESU residency credits</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span>36 upper-division credits</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span>All 7 gen-ed areas covered</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span>Within transfer limits</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span>Cornerstone + Capstone</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 text-center pt-4 border-t">
          <div>
            <p className="text-2xl font-bold">8</p>
            <p className="text-xs text-muted-foreground">Terms</p>
          </div>
          <div>
            <p className="text-2xl font-bold">40</p>
            <p className="text-xs text-muted-foreground">Courses</p>
          </div>
          <div>
            <p className="text-2xl font-bold">$2.8K</p>
            <p className="text-xs text-muted-foreground">Total Cost</p>
          </div>
          <div>
            <p className="text-2xl font-bold">105</p>
            <p className="text-xs text-muted-foreground">Alt Credits</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

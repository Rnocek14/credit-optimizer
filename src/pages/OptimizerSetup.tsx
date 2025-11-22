import { OptimizerMigrationTrigger } from '@/components/OptimizerMigrationTrigger';
import { Week2AltCreditSeeder } from '@/components/Week2AltCreditSeeder';
import { Week2EquivalencySeeder } from '@/components/Week2EquivalencySeeder';
import { Week2TemplateSeeder } from '@/components/Week2TemplateSeeder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function OptimizerSetup() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Optimizer Setup</h1>
        <p className="text-muted-foreground">
          Set up the degree optimizer database tables and seed TESU BSBA data
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Setup Overview</AlertTitle>
        <AlertDescription>
          This is a 2-week setup process to create a fully functional degree optimizer.
          Complete each step in order for best results.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="week1" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="week1">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Week 1: Database Setup
          </TabsTrigger>
          <TabsTrigger value="week2">
            <Circle className="w-4 h-4 mr-2" />
            Week 2: Data Seeding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="week1" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Week 1: Create Database Tables</CardTitle>
              <CardDescription>
                Create the 5 core optimizer tables and seed TESU policy data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">institution_credit_limits</p>
                      <p className="text-xs text-muted-foreground">
                        Policy caps & minimums (residency, transfer, alt credit)
                      </p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        11 TESU limits seeded
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">alt_credits</p>
                      <p className="text-xs text-muted-foreground">
                        Catalog of alternative credits (CLEP, DSST, Sophia, Study.com)
                      </p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        Ready for 50+ credits
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">cross_institution_equivalencies</p>
                      <p className="text-xs text-muted-foreground">
                        Maps alt credits to institutional courses with confidence scores
                      </p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        Ready for 50+ mappings
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">gened_categories</p>
                      <p className="text-xs text-muted-foreground">
                        General education requirements per institution
                      </p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        7 TESU gen-ed areas seeded
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">degree_templates</p>
                      <p className="text-xs text-muted-foreground">
                        Complete degree plan templates with term-by-term structure
                      </p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        Ready for templates
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <OptimizerMigrationTrigger />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="week2" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                  1
                </div>
                <h3 className="text-lg font-semibold">Seed Alternative Credits</h3>
              </div>
              <Week2AltCreditSeeder />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                  2
                </div>
                <h3 className="text-lg font-semibold">Create Equivalencies</h3>
              </div>
              <Week2EquivalencySeeder />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold">Generate Degree Template</h3>
            </div>
            <Week2TemplateSeeder />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps (Week 3+)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Circle className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Enhanced Constraint Validator</p>
                    <p className="text-xs text-muted-foreground">
                      Enforce residency, upper-division, gen-ed, and transfer caps
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Circle className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Optimizer Intelligence</p>
                    <p className="text-xs text-muted-foreground">
                      Multi-factor scoring, context-aware ranking, cost/time optimization
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Circle className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Additional Templates</p>
                    <p className="text-xs text-muted-foreground">
                      Generate "Fastest", "Standard", and "Alt Max" templates
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Circle className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">More Institutions</p>
                    <p className="text-xs text-muted-foreground">
                      Expand to COSC, Excelsior, WGU, UMGC
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

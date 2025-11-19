import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function DiagnosticCareerData() {
  // Query 1: Program requirements completeness
  const { data: reqsData } = useQuery({
    queryKey: ['diagnostic-reqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_requirements')
        .select('year, category, credits_required')
        .eq('program_id', 'bs_cs');
      
      if (error) throw error;
      
      // Group by year and category
      const grouped = (data || []).reduce((acc: any, row: any) => {
        const key = `${row.year}-${row.category}`;
        if (!acc[key]) {
          acc[key] = { year: row.year, category: row.category, count: 0, credits: 0 };
        }
        acc[key].count++;
        acc[key].credits += row.credits_required || 0;
        return acc;
      }, {});
      
      const totalCredits = Object.values(grouped).reduce((sum: number, g: any) => sum + g.credits, 0);
      
      return { 
        rows: Object.values(grouped),
        totalCredits,
        totalReqs: data?.length || 0
      };
    },
  });

  // Query 2: Requirement blocks
  const { data: blocksData } = useQuery({
    queryKey: ['diagnostic-blocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requirement_blocks')
        .select('*')
        .in('area', ['Computer Science', 'General Education'])
        .limit(10);
      
      if (error) {
        console.error('Blocks query error:', error);
        return { exists: false, count: 0, sample: [] };
      }
      
      return { 
        exists: (data?.length || 0) > 0,
        count: data?.length || 0,
        sample: data || []
      };
    },
  });

  // Query 3: Options coverage
  const { data: coverageData } = useQuery({
    queryKey: ['diagnostic-coverage'],
    queryFn: async () => {
      // Get all requirements for bs_cs
      const { data: reqs, error: reqsError } = await supabase
        .from('program_requirements')
        .select('id')
        .eq('program_id', 'bs_cs');
      
      if (reqsError) throw reqsError;
      
      const totalReqs = reqs?.length || 0;
      
      if (totalReqs === 0) {
        return { covered: 0, total: 0, percentage: 0 };
      }
      
      // Get options for those requirements
      const { data: options, error: optionsError } = await supabase
        .from('requirement_options')
        .select('requirement_id')
        .in('requirement_id', reqs.map(r => r.id));
      
      if (optionsError) {
        console.error('Options query error:', optionsError);
        return { covered: 0, total: totalReqs, percentage: 0 };
      }
      
      const coveredReqs = new Set(options?.map(o => o.requirement_id) || []).size;
      
      return {
        covered: coveredReqs,
        total: totalReqs,
        percentage: Math.round((coveredReqs / totalReqs) * 100)
      };
    },
  });

  const getStatusBadge = (type: 'reqs' | 'blocks' | 'coverage'): JSX.Element => {
    if (type === 'reqs') {
      const credits = Number(reqsData?.totalCredits || 0);
      if (credits >= 110) return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Good</Badge>;
      if (credits >= 60) return <Badge className="bg-yellow-600"><AlertCircle className="w-3 h-3 mr-1" />Partial</Badge>;
      return <Badge className="bg-red-600"><XCircle className="w-3 h-3 mr-1" />Missing</Badge>;
    }
    
    if (type === 'blocks') {
      const exists = blocksData?.exists;
      if (exists) return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Good</Badge>;
      return <Badge className="bg-red-600"><XCircle className="w-3 h-3 mr-1" />Missing</Badge>;
    }
    
    if (type === 'coverage') {
      const pct = Number(coverageData?.percentage || 0);
      if (pct >= 80) return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Good</Badge>;
      if (pct >= 50) return <Badge className="bg-yellow-600"><AlertCircle className="w-3 h-3 mr-1" />Okay</Badge>;
      return <Badge className="bg-red-600"><XCircle className="w-3 h-3 mr-1" />Bad</Badge>;
    }
    return <Badge>Unknown</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Career Data Foundation Audit</h1>
        <p className="text-muted-foreground">Validating BS CS program data for real template generation</p>
      </div>

      {/* Query 1: Program Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>1️⃣ Program Requirements Completeness</span>
            {getStatusBadge('reqs')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-8">
              <div>
                <div className="text-sm text-muted-foreground">Total Requirements</div>
                <div className="text-2xl font-bold">{reqsData?.totalReqs || 0}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Credits</div>
                <div className="text-2xl font-bold">{Number(reqsData?.totalCredits || 0)}</div>
              </div>
            </div>
            
            {reqsData && reqsData.rows.length > 0 ? (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Breakdown by Year & Category:</div>
                <div className="space-y-1">
                  {(reqsData.rows as any[]).map((row: any, idx) => (
                    <div key={idx} className="text-sm flex justify-between border-b pb-1">
                      <span>Year {row.year} - {row.category}</span>
                      <span className="font-mono">{row.count} reqs, {row.credits} credits</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No program requirements found for bs_cs</div>
            )}
            
            <div className="text-xs text-muted-foreground mt-4">
              ✅ Good: ≥110 credits | ⚠️ Partial: 60-110 credits | ❌ Missing: &lt;60 credits
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Query 2: Requirement Blocks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>2️⃣ Requirement Blocks Exist</span>
            {getStatusBadge('blocks')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Blocks Found</div>
              <div className="text-2xl font-bold">{blocksData?.count || 0}</div>
            </div>
            
            {blocksData?.exists ? (
              <div className="text-sm space-y-1">
                {blocksData.sample.slice(0, 3).map((block: any) => (
                  <div key={block.id} className="border-b pb-1">
                    <span className="font-medium">{block.title}</span>
                    <span className="text-muted-foreground ml-2">({block.area})</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No requirement_blocks found. Block-aware validation will be limited.
              </div>
            )}
            
            <div className="text-xs text-muted-foreground mt-4">
              Blocks enable GE/Core/Elective gating and year-level validation
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Query 3: Options Coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>3️⃣ Options Coverage</span>
            {getStatusBadge('coverage')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-8">
              <div>
                <div className="text-sm text-muted-foreground">Requirements with Options</div>
                <div className="text-2xl font-bold">{coverageData?.covered || 0} / {coverageData?.total || 0}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Coverage</div>
                <div className="text-2xl font-bold">{coverageData?.percentage || 0}%</div>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground mt-4">
              ✅ Good: ≥80% | ⚠️ Okay: 50-80% | ❌ Bad: &lt;50%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Summary & Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {reqsData && Number(reqsData.totalCredits) >= 110 && blocksData?.exists && Number(coverageData?.percentage || 0) >= 80 ? (
              <div className="text-green-600 font-medium">
                ✅ Data foundation looks good! Ready to build adapter layer for real template generation.
              </div>
            ) : (
              <div className="text-yellow-600 font-medium">
                ⚠️ Some data gaps detected. Mock templates will be used as fallback until data is complete.
              </div>
            )}
            
            <div className="mt-4 space-y-1">
              <div className="font-medium">Recommended actions:</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {(!reqsData || Number(reqsData.totalCredits) < 110) && (
                  <li>Seed program_requirements for bs_cs (need ≥110 credits)</li>
                )}
                {!blocksData?.exists && (
                  <li>Create requirement_blocks for Computer Science and General Education</li>
                )}
                {Number(coverageData?.percentage || 0) < 80 && (
                  <li>Add requirement_options to improve coverage (currently {coverageData?.percentage || 0}%)</li>
                )}
                {reqsData && Number(reqsData.totalCredits) >= 110 && blocksData?.exists && Number(coverageData?.percentage || 0) >= 80 && (
                  <li>Build useCareerV5Data hook and test real template generation</li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

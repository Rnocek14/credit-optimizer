import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Scan, FileText, Code, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { pickAndReadWorkspace } from "@/lib/collectFiles";

interface RepoScanTabProps {
  repoId: string;
}

interface ScanResult {
  filesIndexed: number;
  chunks: number;
  languages: string[];
  durationMs: number;
}

export function RepoScanTab({ repoId }: RepoScanTabProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const { toast } = useToast();

  const handleScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    
    try {
      // Pick and read workspace files
      toast({
        title: "Select Workspace",
        description: "Please select your project folder to scan.",
      });
      
      const files = await pickAndReadWorkspace();
      setScanProgress(20);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 500);

      const { data, error } = await supabase.functions.invoke('ai-analyzer-index', {
        body: { repoId, files }
      });

      clearInterval(progressInterval);
      setScanProgress(100);

      if (error) throw error;

      setTimeout(() => {
        setScanResult(data);
        setIsScanning(false);
        setScanProgress(0);
        
        toast({
          title: "Repository scan completed",
          description: `Indexed ${data.filesIndexed} files in ${data.chunks} chunks`,
        });
      }, 1000);
      
    } catch (error: any) {
      console.error('Scan failed:', error);
      setIsScanning(false);
      setScanProgress(0);
      
      toast({
        title: "Scan failed", 
        description: error.message || "Failed to scan repository",
        variant: "destructive",
      });
    }
  };

  const healthMetrics = [
    { label: "Code Quality", value: 85, status: "good" },
    { label: "Test Coverage", value: 65, status: "warning" },
    { label: "Documentation", value: 45, status: "poor" },
    { label: "Security Score", value: 90, status: "good" },
  ];

  const attentionAreas = [
    "Missing error boundaries in React components",
    "Unused imports in 12 files",
    "Large bundle size in production build",
    "Missing type definitions for API responses",
    "Deprecated dependencies need updating",
    "Inconsistent naming conventions",
    "Memory leaks in useEffect hooks",
    "Missing accessibility attributes",
    "Unhandled promise rejections",
    "Large component files need splitting"
  ];

  return (
    <div className="space-y-6">
      {/* Scan Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Repository Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Scan and index your repository for AI analysis
              </p>
              {scanResult && (
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="outline">{scanResult.filesIndexed} files</Badge>
                  <Badge variant="outline">{scanResult.chunks} chunks</Badge>
                  <Badge variant="outline">{scanResult.languages.join(", ")}</Badge>
                </div>
              )}
            </div>
            <Button 
              onClick={handleScan} 
              disabled={isScanning}
              className="gap-2"
            >
              <Scan className={`h-4 w-4 ${isScanning ? 'animate-pulse' : ''}`} />
              {isScanning ? 'Scanning...' : 'Scan Repository'}
            </Button>
          </div>

          {isScanning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Scanning files...</span>
                <span>{Math.round(scanProgress)}%</span>
              </div>
              <Progress value={scanProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {healthMetrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{metric.label}</p>
                  <p className="text-2xl font-bold">{metric.value}%</p>
                </div>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  metric.status === 'good' ? 'bg-green-100 text-green-600' :
                  metric.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {metric.status === 'good' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attention Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Top 10 Attention Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {attentionAreas.map((area, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Badge variant="outline" className="min-w-fit">
                  {index + 1}
                </Badge>
                <p className="text-sm flex-1">{area}</p>
                <Button variant="ghost" size="sm">
                  Fix
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
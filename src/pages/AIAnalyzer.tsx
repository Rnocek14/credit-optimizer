import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, RefreshCw, Clock, Activity } from "lucide-react";
import { RepoScanTab } from "@/components/analyzer/RepoScanTab";
import { FileReviewTab } from "@/components/analyzer/FileReviewTab";
import { LifePathAuditTab } from "@/components/analyzer/LifePathAuditTab";
import { RefactorsTab } from "@/components/analyzer/RefactorsTab";
import { TestsTab } from "@/components/analyzer/TestsTab";
import { TasksDrawer } from "@/components/analyzer/TasksDrawer";
import { TokenBudgetMeter } from "@/components/analyzer/TokenBudgetMeter";

export default function AIAnalyzer() {
  const [activeTab, setActiveTab] = useState("scan");
  const [lastIndexed, setLastIndexed] = useState<Date | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);

  const repoId = "current-repo"; // In a real app, this would be dynamic

  const handleReindex = async () => {
    setIsIndexing(true);
    // This would trigger the indexing process
    setTimeout(() => {
      setIsIndexing(false);
      setLastIndexed(new Date());
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">AI Analyzer</h1>
              </div>
              
              {lastIndexed && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Last indexed: {lastIndexed.toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <TokenBudgetMeter />
              
              <Button
                onClick={handleReindex}
                disabled={isIndexing}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isIndexing ? 'animate-spin' : ''}`} />
                {isIndexing ? 'Indexing...' : 'Reindex'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="scan" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Repo Scan
                </TabsTrigger>
                <TabsTrigger value="review">File Review</TabsTrigger>
                <TabsTrigger value="refactors">Refactors</TabsTrigger>
                <TabsTrigger value="tests">Tests</TabsTrigger>
                <TabsTrigger value="lifepath">Life Path Audit</TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="scan" className="space-y-6">
                  <RepoScanTab repoId={repoId} />
                </TabsContent>

                <TabsContent value="review" className="space-y-6">
                  <FileReviewTab repoId={repoId} />
                </TabsContent>

                <TabsContent value="refactors" className="space-y-6">
                  <RefactorsTab repoId={repoId} />
                </TabsContent>

                <TabsContent value="tests" className="space-y-6">
                  <TestsTab repoId={repoId} />
                </TabsContent>

                <TabsContent value="lifepath" className="space-y-6">
                  <LifePathAuditTab repoId={repoId} />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="w-80">
            <TasksDrawer />
          </div>
        </div>
      </div>
    </div>
  );
}
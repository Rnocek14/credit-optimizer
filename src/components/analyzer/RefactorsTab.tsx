import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CodeDiffViewer } from "./CodeDiffViewer";

interface RefactorsTabProps {
  repoId: string;
}

interface RefactorResult {
  refactored_code: string;
  explanation: string;
  changes_made: string[];
  benefits: string[];
  risks: string[];
}

export function RefactorsTab({ repoId }: RefactorsTabProps) {
  const [selectedFile, setSelectedFile] = useState("");
  const [goals, setGoals] = useState("");
  const [isRefactoring, setIsRefactoring] = useState(false);
  const [refactorResult, setRefactorResult] = useState<RefactorResult | null>(null);
  const { toast } = useToast();

  const handleRefactor = async () => {
    if (!selectedFile.trim() || !goals.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both file path and refactoring goals.",
        variant: "destructive",
      });
      return;
    }

    setIsRefactoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-analyzer-refactor', {
        body: {
          repoId,
          path: selectedFile.trim(),
          goals: goals.trim()
        }
      });

      if (error) throw error;
      setRefactorResult(data);
      
      toast({
        title: "Refactoring Complete",
        description: "AI-powered refactoring suggestions generated successfully.",
      });
    } catch (error: any) {
      console.error('Refactor error:', error);
      toast({
        title: "Refactoring Failed",
        description: error.message || "Failed to generate refactor suggestions.",
        variant: "destructive",
      });
    } finally {
      setIsRefactoring(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: "Refactored code copied to clipboard.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Refactoring Plans
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="file-path">File Path</Label>
              <Input
                id="file-path"
                placeholder="e.g., src/components/UserProfile.tsx"
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="refactor-goals">Refactoring Goals</Label>
              <Textarea
                id="refactor-goals"
                placeholder="Describe what you want to refactor (e.g., split large component, remove code duplication, improve performance, add TypeScript types)"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <Button 
            onClick={handleRefactor} 
            disabled={isRefactoring || !selectedFile.trim() || !goals.trim()}
            className="w-full"
          >
            {isRefactoring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Refactor Plan...
              </>
            ) : (
              "Generate Refactor Plan"
            )}
          </Button>
        </CardContent>
      </Card>

      {refactorResult && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Refactoring Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{refactorResult.explanation}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Refactored Code</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyCode(refactorResult.refactored_code)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{refactorResult.refactored_code}</code>
              </pre>
            </CardContent>
          </Card>

          {refactorResult.changes_made.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Changes Made</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {refactorResult.changes_made.map((change, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Badge variant="secondary" className="mt-0.5">
                        {index + 1}
                      </Badge>
                      <span className="text-sm">{change}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {refactorResult.benefits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Benefits</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {refactorResult.benefits.map((benefit, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {refactorResult.risks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-orange-600">Risks & Considerations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {refactorResult.risks.map((risk, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-orange-500 mt-1">•</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
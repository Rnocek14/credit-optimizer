import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, TestTube, Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TestsTabProps {
  repoId: string;
}

interface TestFile {
  filename: string;
  content: string;
}

interface TestResult {
  tests: TestFile[];
  coverage: string[];
  testing_strategy: string[];
  mocks_needed: string[];
}

export function TestsTab({ repoId }: TestsTabProps) {
  const [selectedFile, setSelectedFile] = useState("");
  const [framework, setFramework] = useState("vitest");
  const [isGenerating, setIsGenerating] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const { toast } = useToast();

  const handleGenerateTests = async () => {
    if (!selectedFile.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a file path to generate tests for.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-analyzer-tests', {
        body: {
          repoId,
          path: selectedFile.trim(),
          framework
        }
      });

      if (error) throw error;
      setTestResult(data);
      
      toast({
        title: "Tests Generated",
        description: `${data.tests?.length || 0} test files generated successfully.`,
      });
    } catch (error: any) {
      console.error('Test generation error:', error);
      toast({
        title: "Test Generation Failed",
        description: error.message || "Failed to generate tests.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyTestFile = (content: string, filename: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: `${filename} copied to clipboard.`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="test-file-path">File Path</Label>
              <Input
                id="test-file-path"
                placeholder="e.g., src/utils/calculator.ts"
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="test-framework">Testing Framework</Label>
              <Select value={framework} onValueChange={setFramework}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vitest">Vitest</SelectItem>
                  <SelectItem value="jest">Jest</SelectItem>
                  <SelectItem value="mocha">Mocha</SelectItem>
                  <SelectItem value="jasmine">Jasmine</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleGenerateTests} 
            disabled={isGenerating || !selectedFile.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Tests...
              </>
            ) : (
              "Generate Tests"
            )}
          </Button>
        </CardContent>
      </Card>

      {testResult && (
        <div className="space-y-4">
          {testResult.tests?.map((test, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {test.filename}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyTestFile(test.content, test.filename)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{test.content}</code>
                </pre>
              </CardContent>
            </Card>
          ))}

          {testResult.coverage && testResult.coverage.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Coverage Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {testResult.coverage.map((area, index) => (
                    <Badge key={index} variant="secondary">
                      {area}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {testResult.testing_strategy && testResult.testing_strategy.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Testing Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {testResult.testing_strategy.map((strategy, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">
                        {index + 1}
                      </Badge>
                      <span className="text-sm">{strategy}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {testResult.mocks_needed && testResult.mocks_needed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Mocks Needed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {testResult.mocks_needed.map((mock, index) => (
                    <Badge key={index} variant="outline">
                      {mock}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
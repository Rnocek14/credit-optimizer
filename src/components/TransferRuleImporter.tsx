import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { parseTransferRuleCSV, validateTransferRules, type ParsedTransferRule } from '@/utils/transferRuleImport';

interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export function TransferRuleImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parsedRules, setParsedRules] = useState<ParsedTransferRule[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Invalid file type', {
        description: 'Please upload a CSV file'
      });
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setParsedRules([]);

    // Parse and validate immediately
    try {
      const text = await selectedFile.text();
      const parsed = parseTransferRuleCSV(text);
      const validated = validateTransferRules(parsed);
      
      setParsedRules(validated);
      
      toast.success('CSV parsed successfully', {
        description: `${validated.length} rules ready to import`
      });
    } catch (error) {
      toast.error('Parse error', {
        description: error instanceof Error ? error.message : 'Failed to parse CSV'
      });
      setFile(null);
    }
  };

  const handleImport = async () => {
    if (!parsedRules.length) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('bulk-import-transfer-rules', {
        body: { rules: parsedRules }
      });

      if (error) throw error;

      const importResult = data as ImportResult;
      setResult(importResult);

      if (importResult.errors.length > 0) {
        toast.warning('Import completed with errors', {
          description: `${importResult.inserted} inserted, ${importResult.errors.length} errors`
        });
      } else {
        toast.success('Import successful', {
          description: `${importResult.inserted} rules imported, ${importResult.updated} updated, ${importResult.skipped} skipped`
        });
      }

      // Reset after success
      setFile(null);
      setParsedRules([]);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = `source_institution,source_course_code,target_institution,target_course_code,acceptance_status,rule_source,confidence,evidence_url
SOPHIA,CS1101,TESU,COS-101,accepted,ACE Credit,0.95,https://example.com/guide
STUDYCOM,BUS101,COSC,BUS-101,accepted,Transfer Guide,0.90,
CLEP,CALCULUS,TESU,MAT-121,accepted,CLEP Equivalency,1.00,https://example.com/clep
SOPHIA,HIST101,TESU,,elective,ACE Credit,0.85,`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transfer_rules_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Import Transfer Rules
        </CardTitle>
        <CardDescription>
          Upload a CSV file to import multiple transfer rules at once. Rules will be validated and deduplicated automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="flex-1"
          >
            <FileText className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>

        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
            disabled={isProcessing}
          />
          <label
            htmlFor="csv-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {file ? file.name : 'Click to upload CSV'}
              </p>
              <p className="text-sm text-muted-foreground">
                {file ? `${parsedRules.length} rules parsed` : 'or drag and drop'}
              </p>
            </div>
          </label>
        </div>

        {parsedRules.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{parsedRules.length} rules ready to import</span>
            </div>
            <Button
              onClick={handleImport}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {parsedRules.length} Rules
                </>
              )}
            </Button>
          </div>
        )}

        {result && (
          <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
            <h4 className="font-medium flex items-center gap-2">
              {result.errors.length === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              Import Results
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Total:</span>
                <span className="ml-2 font-medium">{result.total}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Inserted:</span>
                <span className="ml-2 font-medium text-green-600">{result.inserted}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Updated:</span>
                <span className="ml-2 font-medium text-blue-600">{result.updated}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Skipped:</span>
                <span className="ml-2 font-medium text-gray-600">{result.skipped}</span>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium text-destructive mb-2">
                  Errors ({result.errors.length}):
                </p>
                <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {result.errors.map((error, i) => (
                    <li key={i} className="text-muted-foreground">• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">CSV Format Requirements:</p>
          <ul className="space-y-0.5 ml-4 list-disc">
            <li>Required: source_institution, source_course_code, target_institution, acceptance_status</li>
            <li>Optional: target_course_code, rule_source, confidence (0-1), evidence_url</li>
            <li>acceptance_status must be: accepted, elective, or rejected</li>
            <li>Institutions should be uppercase codes (TESU, COSC, SOPHIA, etc.)</li>
            <li>Duplicates will be automatically detected and skipped</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

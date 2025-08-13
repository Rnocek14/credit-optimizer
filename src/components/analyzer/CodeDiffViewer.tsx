import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CodeDiffViewerProps {
  diff: string;
}

export function CodeDiffViewer({ diff }: CodeDiffViewerProps) {
  const { toast } = useToast();

  const copyDiff = () => {
    navigator.clipboard.writeText(diff);
    toast({
      title: "Copied to clipboard",
      description: "Diff has been copied to your clipboard",
    });
  };

  // Parse diff into lines for better rendering
  const lines = diff.split('\n');

  const getLineType = (line: string) => {
    if (line.startsWith('@@')) return 'header';
    if (line.startsWith('+')) return 'addition';
    if (line.startsWith('-')) return 'deletion';
    return 'context';
  };

  const getLineClass = (type: string) => {
    switch (type) {
      case 'header':
        return 'bg-blue-50 text-blue-800 font-medium';
      case 'addition':
        return 'bg-green-50 text-green-800';
      case 'deletion':
        return 'bg-red-50 text-red-800';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-3 border-b bg-muted/50">
          <span className="text-sm font-medium">Suggested Patch</span>
          <Button variant="ghost" size="sm" onClick={copyDiff} className="gap-2">
            <Copy className="h-3 w-3" />
            Copy
          </Button>
        </div>
        
        <div className="font-mono text-xs">
          {lines.map((line, index) => {
            const type = getLineType(line);
            return (
              <div
                key={index}
                className={`px-4 py-1 ${getLineClass(type)} border-l-2 ${
                  type === 'addition' ? 'border-green-400' :
                  type === 'deletion' ? 'border-red-400' :
                  type === 'header' ? 'border-blue-400' :
                  'border-transparent'
                }`}
              >
                <pre className="whitespace-pre-wrap break-all">{line || ' '}</pre>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';

interface ExportTreeButtonProps {
  containerRef: React.RefObject<HTMLElement>;
}

export const ExportTreeButton: React.FC<ExportTreeButtonProps> = ({ containerRef }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [filename, setFilename] = useState(() => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    return `skill-tree-${dateStr}-${timeStr}`;
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const exportTree = async () => {
    if (!containerRef.current) {
      toast.error('Unable to find skill tree canvas');
      return;
    }

    setIsExporting(true);
    
    try {
      // Get the canvas element that contains the skill tree
      const canvasElement = containerRef.current.querySelector('[data-skill-tree-canvas]') as HTMLElement;
      const targetElement = canvasElement || containerRef.current;

      const dataUrl = await toPng(targetElement, {
        quality: 1.0,
        pixelRatio: 2, // Higher resolution
        backgroundColor: '#ffffff',
        cacheBust: true,
        filter: (node) => {
          // Exclude certain elements that might interfere with export
          if (node.classList) {
            return !node.classList.contains('export-exclude');
          }
          return true;
        },
        style: {
          // Ensure good visibility in export
          transform: 'none',
          transformOrigin: 'top left',
        }
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Skill tree exported successfully!');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to export skill tree:', error);
      toast.error('Failed to export skill tree. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Tree
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Skill Tree</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="filename">Filename</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Enter filename (without extension)"
            />
            <p className="text-sm text-muted-foreground mt-1">
              File will be saved as {filename}.png
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={exportTree}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export PNG
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
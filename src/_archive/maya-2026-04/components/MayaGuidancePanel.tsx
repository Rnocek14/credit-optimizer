import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface MayaGuidancePanelProps {
  title: string;
  message: string;
  className?: string;
}

export function MayaGuidancePanel({ title, message, className }: MayaGuidancePanelProps) {
  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-primary">
          <Brain className="h-5 w-5" />
          <span className="font-medium text-sm">{title}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">
          {message}
        </p>
      </CardContent>
    </Card>
  );
}
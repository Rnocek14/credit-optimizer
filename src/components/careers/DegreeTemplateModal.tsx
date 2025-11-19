import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import type { DegreeTemplate } from '@/pages/EduTree/v5/engine/degreeTemplateGenerator';

interface DegreeTemplateModalProps {
  template: DegreeTemplate;
  onClose: () => void;
}

export function DegreeTemplateModal({
  template,
  onClose,
}: DegreeTemplateModalProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>
              {template.programId.toUpperCase()} @{' '}
              {template.anchorSchool.toUpperCase()}
            </span>
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogTitle>
          <div className="text-xs text-muted-foreground">
            {template.yearTemplates.length}-year plan •{' '}
            {template.totals.credits} credits •{' '}
            {template.totals.costUsd
              ? `$${template.totals.costUsd.toLocaleString()} total cost`
              : 'Cost estimate unavailable'}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          <Tabs defaultValue="plan" className="space-y-4">
            <TabsList>
              <TabsTrigger value="plan">Plan</TabsTrigger>
            </TabsList>

            <TabsContent value="plan">
              <div className="space-y-4">
                {template.yearTemplates.map((yt, idx) => {
                  const est = (yt as any).est ?? (yt as any).estimate ?? {};
                  return (
                    <div
                      key={(yt as any).id ?? idx}
                      className="border rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">
                          Year {idx + 1}{' '}
                          {yt.badge && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {yt.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {est.credits ?? '—'} credits •{' '}
                          {est.costUsd
                            ? `$${est.costUsd.toLocaleString()}`
                            : '—'}{' '}
                          •{' '}
                          {est.weeks
                            ? `${Math.round(est.weeks)} weeks`
                            : '—'}
                        </div>
                      </div>
                      {Array.isArray((yt as any).modules) && (yt as any).modules.length > 0 && (
                        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                          {(yt as any).modules.map((m: any) => (
                            <li key={m.id}>
                              {m.code ? `${m.code} – ` : ''}
                              {m.title ?? m.name ?? 'Untitled module'}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="pt-3 flex justify-end gap-2 border-t mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { PolicyRefreshRunsList } from '@/components/admin/policy-refresh/PolicyRefreshRunsList';
import { PolicyRefreshRunDetail } from '@/components/admin/policy-refresh/PolicyRefreshRunDetail';
import { InstitutionReviewDrawer } from '@/components/admin/policy-refresh/InstitutionReviewDrawer';

export default function PolicyRefreshAdmin() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSelectRun = (runId: string) => {
    setSelectedRunId(runId);
    setSelectedInstitution(null);
    setDrawerOpen(false);
  };

  const handleReviewInstitution = (institution: string) => {
    setSelectedInstitution(institution);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedInstitution(null);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Policy Refresh Admin</h1>
        <p className="text-sm text-muted-foreground">Review, resolve conflicts, and promote policy packs</p>
      </header>

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={30} minSize={20}>
            <PolicyRefreshRunsList 
              selectedRunId={selectedRunId}
              onSelectRun={handleSelectRun}
            />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={70}>
            {selectedRunId ? (
              <PolicyRefreshRunDetail 
                runId={selectedRunId}
                onReviewInstitution={handleReviewInstitution}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Select a run to view details
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <InstitutionReviewDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        runId={selectedRunId}
        institution={selectedInstitution}
      />
    </div>
  );
}

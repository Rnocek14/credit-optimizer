import { Navigate } from 'react-router-dom';
import { Loader2, Shield, Upload, Database, BarChart3 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { TransferRuleImporter } from '@/components/TransferRuleImporter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminTransferRules() {
  const { isAdmin, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Transfer Rules Management</h1>
        </div>
        <p className="text-muted-foreground">
          Import and manage credit transfer rules for degree planning
        </p>
      </div>

      <div className="grid gap-6">
        <TransferRuleImporter />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Transfer Rule Statistics
            </CardTitle>
            <CardDescription>
              Overview of current transfer rule coverage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="text-2xl font-bold mb-1">TBD</div>
                  <div className="text-sm text-muted-foreground">Total Rules</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold mb-1">TBD</div>
                  <div className="text-sm text-muted-foreground">Institutions Covered</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold mb-1">TBD</div>
                  <div className="text-sm text-muted-foreground">Accepted Transfers</div>
                </Card>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Detailed analytics coming soon...
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest transfer rule imports and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Activity log coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

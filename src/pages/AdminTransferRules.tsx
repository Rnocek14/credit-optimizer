import { Navigate } from 'react-router-dom';
import { Loader2, Shield, BarChart3 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { TransferRuleImporter } from '@/components/TransferRuleImporter';
import { CandidateReviewQueue } from '@/components/admin/CandidateReviewQueue';
import { useTransferCandidateStats } from '@/hooks/useTransferCandidates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function StatsCards() {
  const { data: stats, isLoading } = useTransferCandidateStats();

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-7 bg-muted rounded w-12 mb-1" />
            <div className="h-4 bg-muted rounded w-20" />
          </Card>
        ))}
      </div>
    );
  }

  const items = [
    { label: 'Total Candidates', value: stats.total },
    { label: 'Pending Review', value: stats.pending, highlight: stats.pending > 0 },
    { label: 'Promoted', value: stats.promoted },
    { label: 'Avg AI Confidence', value: `${(stats.avgConfidence * 100).toFixed(0)}%` },
    { label: 'Avg Validation', value: `${(stats.avgValidation * 100).toFixed(0)}%` },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {items.map((item) => (
        <Card key={item.label} className="p-4">
          <div className={`text-2xl font-bold mb-1 ${item.highlight ? 'text-primary' : ''}`}>
            {item.value}
          </div>
          <div className="text-xs text-muted-foreground">{item.label}</div>
        </Card>
      ))}
    </div>
  );
}

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
          Import, review, and promote AI-generated transfer rules
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Pipeline Statistics
            </CardTitle>
            <CardDescription>
              Transfer rule candidate pipeline overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatsCards />
          </CardContent>
        </Card>

        <CandidateReviewQueue />

        <TransferRuleImporter />
      </div>
    </div>
  );
}

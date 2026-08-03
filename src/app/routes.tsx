/**
 * Route Configuration
 *
 * Phase-2 cut (2026-08-03): the legacy career-platform surface (hubs, teach/
 * institution/employer portals, resume/certificates/badges, Maya/CRI pages)
 * was removed. What remains is the Pivot product: the public funnel
 * (landing → get-started → compare → plan preview → /plan), the EduTree
 * v5/v6 plan builder + multischool marketplace, the career→degree explorer,
 * and the admin optimizer/pipeline tooling.
 *
 * See docs/SALVAGE_MANIFEST.md for what was removed and why.
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// ── Auth wrappers / shell ──────────────────────────────────────
import ProtectedRoute from '@/components/ProtectedRoute';
import { StakeholderProtectedRoute } from '@/components/StakeholderProtectedRoute';
import { EnhancedErrorBoundary } from '@/components/enhanced/EnhancedErrorBoundary';
import { EduTreeError } from '@/components/EduTreeError';
import { PageLoader } from '@/components/PageLoader';
import { AppShell } from '@/components/AppShell';

// ── Core pages ─────────────────────────────────────────────────
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Onboarding from '@/pages/Onboarding';
import QuickStart from '@/pages/QuickStart';
import NotFound from '@/pages/NotFound';
import InternalError from '@/pages/InternalError';
import GetStartedPage from '@/pages/GetStarted/GetStartedPage';
import ComparePage from '@/pages/Compare/ComparePage';
import PlanHub from '@/pages/PlanHub';
import PlanPreviewPage from '@/pages/PlanPreviewPage';

// ── Plan builder / marketplace ─────────────────────────────────
import EduTreeV5Route from '@/pages/EduTree/v5';
import EduTreeV6Route from '@/pages/EduTree/v6';
import MarketplacePage from '@/pages/EduTree/marketplace/MarketplacePage';
import OptimizerSetup from '@/pages/OptimizerSetup';

// ── Career → degree explorer ───────────────────────────────────
import { CareerDetailPage } from '@/pages/CareerDetailPage';
import { CareerListPage } from '@/pages/CareerListPage';

// ── Admin (optimizer + pipeline tooling) ───────────────────────
import AdminTransferRules from '@/pages/AdminTransferRules';
import ArticulationCoverage from '@/pages/admin/ArticulationCoverage';
import ExplorationDashboard from '@/pages/Analytics/ExplorationDashboard';
import SmartWeightsAdmin from '@/pages/Admin/SmartWeightsAdmin';
import AdminAnalytics from '@/pages/Admin/AdminAnalytics';
import SeedGoldenProgram from '@/pages/Admin/SeedGoldenProgram';
import TemplateValidation from '@/pages/admin/TemplateValidation';
import DegreeIntegrityScan from '@/pages/Admin/DegreeIntegrityScan';
import PolicyRefreshAdmin from '@/pages/Admin/PolicyRefreshAdmin';
import TransferScraperDashboard from '@/pages/Admin/TransferScraperDashboard';
import PipelineHealth from '@/pages/Admin/PipelineHealth';
import PolicyPackPromotion from '@/pages/Admin/PolicyPackPromotion';
import PolicyPackPipeline from '@/pages/Admin/PolicyPackPipeline';
import PolicyFieldReview from '@/pages/Admin/PolicyFieldReview';
import GenerationJobs from '@/pages/Admin/GenerationJobs';
import SeedV5Database from '@/pages/Admin/SeedV5Database';
import OptimizerSeeding from '@/pages/Admin/OptimizerSeeding';

// ── Public SEO surfaces (no auth, indexable) ───────────────────
import GuidesIndexPage from '@/pages/public/GuidesIndexPage';
import GuidePage from '@/pages/public/GuidePage';

export function AppRoutes() {
  return (
    <Routes>
      {/* ── Core ────────────────────────────────────────────── */}
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={
        <ProtectedRoute requireAuth={false}>
          <Auth />
        </ProtectedRoute>
      } />
      <Route path="/onboarding" element={
        <ProtectedRoute requireAuth={true} redirectIfComplete={true}>
          <AppShell><Onboarding /></AppShell>
        </ProtectedRoute>
      } />
      <Route path="/quick-start" element={
        <ProtectedRoute requireAuth={true}>
          <QuickStart />
        </ProtectedRoute>
      } />

      {/* ── Public funnel (no auth gate) ────────────────────── */}
      <Route path="/get-started" element={<GetStartedPage />} />
      <Route path="/compare" element={
        <AppShell>
          <EnhancedErrorBoundary name="compare-page">
            <ComparePage />
          </EnhancedErrorBoundary>
        </AppShell>
      } />
      <Route path="/plan/preview/:templateId" element={
        <AppShell>
          <EnhancedErrorBoundary name="plan-preview">
            <PlanPreviewPage />
          </EnhancedErrorBoundary>
        </AppShell>
      } />

      {/* ── Plan (funnel terminus, authed) ──────────────────── */}
      <Route path="/plan" element={
        <ProtectedRoute requireAuth={true}>
          <AppShell>
            <EnhancedErrorBoundary name="plan-hub">
              <PlanHub />
            </EnhancedErrorBoundary>
          </AppShell>
        </ProtectedRoute>
      } />

      {/* ── Career → degree explorer ────────────────────────── */}
      <Route path="/explore/careers" element={<ProtectedRoute requireAuth={true}><AppShell><CareerListPage /></AppShell></ProtectedRoute>} />
      <Route path="/explore/careers/:careerPathId" element={<ProtectedRoute requireAuth={true}><AppShell><CareerDetailPage /></AppShell></ProtectedRoute>} />

      {/* ── Plan builder (EduTree) ──────────────────────────── */}
      <Route path="/edu-tree" element={<Navigate to="/edu-tree-v5" replace />} />
      <Route path="/edu-tree-v2" element={<Navigate to="/edu-tree-v5" replace />} />
      <Route path="/edu-tree-v3" element={<Navigate to="/edu-tree-v5" replace />} />
      <Route path="/edu-tree-v3-vertical" element={<Navigate to="/edu-tree-v5" replace />} />
      <Route path="/edu-tree-v3-harness" element={<Navigate to="/edu-tree-v5" replace />} />
      <Route path="/edu-tree-v4" element={<Navigate to="/edu-tree-v5" replace />} />
      <Route path="/edu-tree-v5" element={
        <ProtectedRoute requireAuth={true}>
          <AppShell>
            <EnhancedErrorBoundary fallback={<EduTreeError />}>
              <React.Suspense fallback={<PageLoader message="Loading V5 testbed..." />}>
                <EduTreeV5Route />
              </React.Suspense>
            </EnhancedErrorBoundary>
          </AppShell>
        </ProtectedRoute>
      } />
      <Route path="/edu-tree-v6" element={
        <ProtectedRoute requireAuth={true}>
          <AppShell>
            <EnhancedErrorBoundary fallback={<EduTreeError />}>
              <React.Suspense fallback={<PageLoader message="Loading degree planner..." />}>
                <EduTreeV6Route />
              </React.Suspense>
            </EnhancedErrorBoundary>
          </AppShell>
        </ProtectedRoute>
      } />
      <Route path="/edu-tree-v6/:templateId" element={
        <ProtectedRoute requireAuth={true}>
          <AppShell>
            <EnhancedErrorBoundary fallback={<EduTreeError />}>
              <React.Suspense fallback={<PageLoader message="Loading degree planner..." />}>
                <EduTreeV6Route />
              </React.Suspense>
            </EnhancedErrorBoundary>
          </AppShell>
        </ProtectedRoute>
      } />
      <Route path="/edu-tree-v5/marketplace" element={
        <ProtectedRoute requireAuth={true}>
          <AppShell>
            <EnhancedErrorBoundary fallback={<EduTreeError />}>
              <React.Suspense fallback={<PageLoader message="Loading marketplace..." />}>
                <MarketplacePage />
              </React.Suspense>
            </EnhancedErrorBoundary>
          </AppShell>
        </ProtectedRoute>
      } />
      <Route path="/marketplace" element={<Navigate to="/edu-tree-v5/marketplace" replace />} />

      {/* ── Legacy URL redirects (preserve inbound links) ───── */}
      <Route path="/dashboard" element={<Navigate to="/plan" replace />} />
      <Route path="/today" element={<Navigate to="/plan" replace />} />
      <Route path="/plan-hub" element={<Navigate to="/plan" replace />} />
      <Route path="/planner" element={<Navigate to="/plan" replace />} />
      <Route path="/goals" element={<Navigate to="/plan" replace />} />
      <Route path="/maya" element={<Navigate to="/plan" replace />} />
      <Route path="/maya-roadmap" element={<Navigate to="/plan" replace />} />
      <Route path="/maya-intelligence" element={<Navigate to="/plan" replace />} />
      <Route path="/career-copilot" element={<Navigate to="/plan" replace />} />
      <Route path="/workflows" element={<Navigate to="/plan" replace />} />
      <Route path="/ai-analyzer" element={<Navigate to="/plan" replace />} />
      <Route path="/cri-dashboard" element={<Navigate to="/plan" replace />} />
      <Route path="/discover" element={<Navigate to="/explore/careers" replace />} />
      <Route path="/explore" element={<Navigate to="/explore/careers" replace />} />
      <Route path="/build" element={<Navigate to="/edu-tree-v6" replace />} />

      {/* ── Admin: optimizer + pipeline tooling ─────────────── */}
      <Route path="/admin/seed-v5" element={<ProtectedRoute requireAuth={true}><SeedV5Database /></ProtectedRoute>} />
      <Route path="/optimizer-setup" element={<ProtectedRoute requireAuth={true}><OptimizerSetup /></ProtectedRoute>} />
      <Route path="/admin/optimizer-seeding" element={<ProtectedRoute requireAuth={true}><OptimizerSeeding /></ProtectedRoute>} />
      <Route path="/admin/url-review" element={
        <ProtectedRoute requireAuth={true}>
          <React.Suspense fallback={<PageLoader message="Loading URL Review..." />}>
            {React.createElement(React.lazy(() => import('@/pages/admin/UrlReviewQueue')))}
          </React.Suspense>
        </ProtectedRoute>
      } />
      <Route path="/admin/transfer-rules" element={
        <ProtectedRoute requireAuth={true}>
          <AdminTransferRules />
        </ProtectedRoute>
      } />
      <Route path="/admin/articulation-coverage" element={
        <ProtectedRoute requireAuth={true}>
          <AppShell><ArticulationCoverage /></AppShell>
        </ProtectedRoute>
      } />
      <Route path="/analytics/exploration" element={<ProtectedRoute requireAuth={true}><ExplorationDashboard /></ProtectedRoute>} />
      <Route path="/admin/smart-weights" element={
        <StakeholderProtectedRoute requiredRole="admin">
          <SmartWeightsAdmin />
        </StakeholderProtectedRoute>
      } />
      <Route path="/admin/analytics" element={
        <StakeholderProtectedRoute requiredRole="admin">
          <AdminAnalytics />
        </StakeholderProtectedRoute>
      } />
      <Route path="/admin/seed-golden" element={
        import.meta.env.DEV ? (
          <SeedGoldenProgram />
        ) : (
          <StakeholderProtectedRoute requiredRole="admin">
            <SeedGoldenProgram />
          </StakeholderProtectedRoute>
        )
      } />
      <Route path="/admin/template-validation" element={<ProtectedRoute requireAuth={true}><TemplateValidation /></ProtectedRoute>} />
      <Route path="/admin/template-validation/:templateId/invariants" element={
        <ProtectedRoute requireAuth={true}>
          <React.Suspense fallback={<PageLoader message="Loading..." />}>
            {React.createElement(React.lazy(() => import('@/pages/admin/InvariantSnapshotDrilldown')))}
          </React.Suspense>
        </ProtectedRoute>
      } />
      <Route path="/admin/invariants/bulk/:jobId" element={
        <ProtectedRoute requireAuth={true}>
          <React.Suspense fallback={<PageLoader message="Loading..." />}>
            {React.createElement(React.lazy(() => import('@/pages/admin/BulkRerunProgress')))}
          </React.Suspense>
        </ProtectedRoute>
      } />
      <Route path="/admin/degree-integrity-scan" element={<ProtectedRoute requireAuth={true}><DegreeIntegrityScan /></ProtectedRoute>} />
      <Route path="/admin/transfer-scraper" element={<ProtectedRoute requireAuth={true}><TransferScraperDashboard /></ProtectedRoute>} />
      <Route path="/admin/pipeline-health" element={<ProtectedRoute requireAuth={true}><PipelineHealth /></ProtectedRoute>} />
      <Route path="/admin/policy-refresh" element={<ProtectedRoute requireAuth={true}><PolicyRefreshAdmin /></ProtectedRoute>} />
      <Route path="/admin/policy-promotion" element={<ProtectedRoute requireAuth={true}><PolicyPackPromotion /></ProtectedRoute>} />
      <Route path="/admin/policy-pipeline" element={<ProtectedRoute requireAuth={true}><PolicyPackPipeline /></ProtectedRoute>} />
      <Route path="/admin/school-expansion" element={
        <ProtectedRoute requireAuth={true}>
          <React.Suspense fallback={<PageLoader message="Loading..." />}>
            {React.createElement(React.lazy(() => import('@/pages/Admin/SchoolExpansionPipeline')))}
          </React.Suspense>
        </ProtectedRoute>
      } />
      <Route path="/admin/policy-field-review" element={<ProtectedRoute requireAuth={true}><PolicyFieldReview /></ProtectedRoute>} />
      <Route path="/admin/add-institution" element={
        <ProtectedRoute requireAuth={true}>
          <React.Suspense fallback={<PageLoader message="Loading..." />}>
            {React.createElement(React.lazy(() => import('@/pages/Admin/AddInstitution')))}
          </React.Suspense>
        </ProtectedRoute>
      } />
      <Route path="/admin/generation-jobs" element={<ProtectedRoute requireAuth={true}><GenerationJobs /></ProtectedRoute>} />

      {/* ── Public SEO surfaces (auth-free, indexable) ──────── */}
      <Route path="/guides" element={<GuidesIndexPage />} />
      <Route path="/guides/:slug" element={<GuidePage />} />

      {/* ── Error / Catch-all ───────────────────────────────── */}
      <Route path="/500" element={<InternalError />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

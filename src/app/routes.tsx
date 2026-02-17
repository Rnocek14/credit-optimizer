/**
 * Route Configuration — extracted from App.tsx (PR1)
 * 
 * All route definitions live here. App.tsx only contains providers + shell.
 * Route order preserved exactly from original to avoid behavior changes.
 * 
 * PR2A: Removed 38 dead/legacy routes. Files preserved for PR2B deletion.
 * Redirects kept intact. Core + active surfaces unchanged.
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// ── Auth wrappers ──────────────────────────────────────────────
import ProtectedRoute from '@/components/ProtectedRoute';
import { StakeholderProtectedRoute } from '@/components/StakeholderProtectedRoute';
import { EnhancedErrorBoundary } from '@/components/enhanced/EnhancedErrorBoundary';
import { EduTreeError } from '@/components/EduTreeError';
import { PageLoader } from '@/components/PageLoader';

// ── Core pages ─────────────────────────────────────────────────
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import DevLogin from '@/pages/DevLogin';
import Onboarding from '@/pages/Onboarding';
import QuickStart from '@/pages/QuickStart';
import NotFound from '@/pages/NotFound';
import InternalError from '@/pages/InternalError';

// ── Hub pages ──────────────────────────────────────────────────
import DiscoverHub from '@/pages/DiscoverHub';
import PlanHub from '@/pages/PlanHub';
import ProgressHub from '@/pages/ProgressHub';
import TodayDashboard from '@/pages/TodayDashboard';
import ContributeTabbed from '@/pages/ContributeTabbed';
import CalmTest from '@/pages/CalmTest';

// ── Feature pages ──────────────────────────────────────────────
import Build from '@/pages/Build';
import { CompareTracks } from '@/pages/CompareTracks';
import TrackComparePage from '@/components/compare/TrackComparePage';
import EduTreeV5Route from '@/pages/EduTree/v5';
import MarketplacePage from '@/pages/EduTree/marketplace/MarketplacePage';
import DegreeMarketplace from '@/pages/DegreeMarketplace';
import OptimizerSetup from '@/pages/OptimizerSetup';

// ── Career pages ───────────────────────────────────────────────
import { CareerDetailPage } from '@/pages/CareerDetailPage';
import { CareerListPage } from '@/pages/CareerListPage';
import DiagnosticCareerData from '@/pages/DiagnosticCareerData';

// ── Teach pages ────────────────────────────────────────────────
import Teach from '@/pages/Teach';
import TeachAnalytics from '@/pages/TeachAnalytics';
import TeachCourses from '@/pages/TeachCourses';
import CourseDiscovery from '@/pages/CourseDiscovery';
import CourseCuration from '@/pages/CourseCuration';
import TeachPaths from '@/pages/TeachPaths';
import TeachValidation from '@/pages/TeachValidation';
import CourseMarketplace from '@/pages/CourseMarketplace';

// ── Stakeholder pages ──────────────────────────────────────────
import {
  Institution,
  InstitutionStudents,
  InstitutionPrograms,
  InstitutionFaculty,
  InstitutionReports,
  InstitutionSettings,
} from '@/pages/institution';
import {
  Employer,
  EmployerTalent,
  EmployerWorkforce,
  EmployerSkills,
  EmployerPartnerships,
  EmployerJobs,
} from '@/pages/employer';

// ── Admin pages ────────────────────────────────────────────────
import Admin from '@/pages/Admin';
import AdminTransferRules from '@/pages/AdminTransferRules';
import AdminBadges from '@/pages/AdminBadges';
import AdminModeration from '@/pages/AdminModeration';
import AdminSettings from '@/pages/AdminSettings';
import Analytics from '@/pages/Analytics';
import ExplorationDashboard from '@/pages/Analytics/ExplorationDashboard';
import SmartWeightsAdmin from '@/pages/Admin/SmartWeightsAdmin';
import AdminAnalytics from '@/pages/Admin/AdminAnalytics';
import SeedGoldenProgram from '@/pages/Admin/SeedGoldenProgram';
import TemplateValidation from '@/pages/admin/TemplateValidation';
import DegreeIntegrityScan from '@/pages/Admin/DegreeIntegrityScan';
import PolicyRefreshAdmin from '@/pages/Admin/PolicyRefreshAdmin';
import TransferScraperDashboard from '@/pages/Admin/TransferScraperDashboard';
import PolicyPackPromotion from '@/pages/Admin/PolicyPackPromotion';
import PolicyPackPipeline from '@/pages/Admin/PolicyPackPipeline';
import PolicyFieldReview from '@/pages/Admin/PolicyFieldReview';
import GenerationJobs from '@/pages/Admin/GenerationJobs';
import SeedV5Database from '@/pages/Admin/SeedV5Database';
import OptimizerSeeding from '@/pages/Admin/OptimizerSeeding';
import LocationManagerPanel from '@/components/LocationManagerPanel';

// ── Resume / Embed / Certificates ──────────────────────────────
import ResumeGallery from '@/pages/ResumeGallery';
import PublicResume from '@/pages/PublicResume';
import ResumeEmbed from '@/pages/ResumeEmbed';
import ResumeAnalytics from '@/pages/ResumeAnalytics';
import EmbedGenerator from '@/pages/EmbedGenerator';
import EmbedExplorer from '@/pages/EmbedExplorer';
import CertificateGallery from '@/pages/CertificateGallery';
import VerifySignature from '@/pages/VerifySignature';
import CRIDashboardPage from '@/pages/CRIDashboard';

// ── Progress / Achievement pages ───────────────────────────────
import BadgeDetail from '@/pages/BadgeDetail';

// ── Maya / Mentor / AI ─────────────────────────────────────────
import MayaPage from '@/pages/MayaPage';
import MayaIntelligence from '@/pages/MayaIntelligence';
import MentorInbox from '@/pages/MentorInbox';
import MentorChat from '@/pages/MentorChat';
import AIAnalyzer from '@/pages/AIAnalyzer';

// ── Other active pages ─────────────────────────────────────────
import ShareTrust from '@/pages/ShareTrust';
import UploadCourse from '@/pages/UploadCourse';
import Saved from '@/pages/Saved';

// ── Sandbox (DEV-only) ────────────────────────────────────────
import TrackOverlayPOCPage from '../../sandbox/TrackOverlayPOCPage';

// ════════════════════════════════════════════════════════════════
// Route definitions
// PR2A: 38 dead routes removed. Redirects preserved.
// ════════════════════════════════════════════════════════════════

export function AppRoutes() {
  return (
    <Routes>
      {/* ── Core Routes ─────────────────────────────────────── */}
      <Route path="/" element={<Index />} />
      <Route path="/dashboard" element={<Navigate to="/plan" replace />} />
      <Route path="/quick-start" element={
        <ProtectedRoute requireAuth={true}>
          <QuickStart />
        </ProtectedRoute>
      } />
      <Route path="/auth" element={
        <ProtectedRoute requireAuth={false}>
          <Auth />
        </ProtectedRoute>
      } />
      <Route path="/dev-login" element={<DevLogin />} />
      <Route path="/onboarding" element={
        <ProtectedRoute requireAuth={true} redirectIfComplete={true}>
          <Onboarding />
        </ProtectedRoute>
      } />

      {/* ── 4-Hub Routes ────────────────────────────────────── */}
      <Route path="/discover" element={
        <ProtectedRoute requireAuth={true} requireOnboarding={true}>
          <DiscoverHub />
        </ProtectedRoute>
      } />
      <Route path="/plan" element={
        <ProtectedRoute requireAuth={true} requireOnboarding={true}>
          <EnhancedErrorBoundary>
            <PlanHub />
          </EnhancedErrorBoundary>
        </ProtectedRoute>
      } />
      <Route path="/progress" element={
        <ProtectedRoute requireAuth={true} requireOnboarding={true}>
          <ProgressHub />
        </ProtectedRoute>
      } />
      <Route path="/today" element={
        <ProtectedRoute requireAuth={true} requireOnboarding={true}>
          <TodayDashboard />
        </ProtectedRoute>
      } />
      <Route path="/contribute" element={
        <ProtectedRoute requireAuth={true} requireOnboarding={true}>
          <ContributeTabbed />
        </ProtectedRoute>
      } />
      <Route path="/calm-test" element={
        <ProtectedRoute requireAuth={true} requireOnboarding={true}>
          <CalmTest />
        </ProtectedRoute>
      } />

      {/* ── DISCOVER Hub Redirects ──────────────────────────── */}
      <Route path="/explore" element={<Navigate to="/discover?tab=career" replace />} />
      <Route path="/explore/careers" element={<CareerListPage />} />
      <Route path="/explore/careers/:careerPathId" element={<CareerDetailPage />} />
      <Route path="/diagnostic/career-data" element={<DiagnosticCareerData />} />
      <Route path="/explore-hub" element={<Navigate to="/discover" replace />} />
      <Route path="/explore-courses" element={<Navigate to="/discover?tab=courses" replace />} />
      <Route path="/market-intelligence" element={<Navigate to="/discover?tab=intel" replace />} />
      <Route path="/salary-insights" element={<Navigate to="/discover?tab=intel" replace />} />

      {/* ── PLAN Hub Redirects ──────────────────────────────── */}
      <Route path="/plan-hub" element={<Navigate to="/plan" replace />} />
      <Route path="/planner" element={<Navigate to="/plan?tab=roadmap" replace />} />
      <Route path="/goals" element={<Navigate to="/plan?tab=goals" replace />} />
      <Route path="/maya-roadmap" element={<Navigate to="/plan?tab=roadmap" replace />} />
      <Route path="/career-copilot" element={<Navigate to="/plan?tab=roadmap" replace />} />
      <Route path="/workflows" element={<Navigate to="/plan?tab=workflows" replace />} />

      {/* ── EduTree & Marketplace ───────────────────────────── */}
      <Route path="/build" element={
        <ProtectedRoute requireAuth={true} requireOnboarding={true}>
          <Build />
        </ProtectedRoute>
      } />
      {/* Legacy EduTree routes - all redirect to V5 */}
      <Route path="/edu-tree" element={<Navigate to="/edu-tree-v5" replace />} />
      <Route path="/edu-tree-v2" element={<Navigate to="/edu-tree-v5" replace />} />
      <Route path="/edu-tree-v3" element={<Navigate to="/edu-tree-v5" replace />} />
      <Route path="/edu-tree-v3-vertical" element={<Navigate to="/edu-tree-v5" replace />} />
      <Route path="/edu-tree-v3-harness" element={<Navigate to="/edu-tree-v5" replace />} />
      <Route path="/edu-tree-v4" element={<Navigate to="/edu-tree-v5" replace />} />
      {/* EduTree V5 — canonical version */}
      <Route path="/edu-tree-v5" element={
        <EnhancedErrorBoundary fallback={<EduTreeError />}>
          <React.Suspense fallback={<PageLoader message="Loading V5 testbed..." />}>
            <EduTreeV5Route />
          </React.Suspense>
        </EnhancedErrorBoundary>
      } />
      {/* Marketplace V1 */}
      <Route path="/edu-tree-v5/marketplace" element={
        <EnhancedErrorBoundary fallback={<EduTreeError />}>
          <React.Suspense fallback={<PageLoader message="Loading marketplace..." />}>
            <MarketplacePage />
          </React.Suspense>
        </EnhancedErrorBoundary>
      } />
      {/* Standalone Marketplace */}
      <Route path="/marketplace" element={
        <React.Suspense fallback={<PageLoader message="Loading marketplace..." />}>
          <DegreeMarketplace />
        </React.Suspense>
      } />
      {/* Sandbox (DEV-only) */}
      <Route path="/sandbox/track-overlay" element={<TrackOverlayPOCPage />} />
      {/* Admin seeding */}
      <Route path="/admin/seed-v5" element={<SeedV5Database />} />
      <Route path="/optimizer-setup" element={<OptimizerSetup />} />
      <Route path="/admin/optimizer-seeding" element={<OptimizerSeeding />} />
      {/* URL Review Queue */}
      <Route path="/admin/url-review" element={
        <ProtectedRoute requireAuth={true}>
          <React.Suspense fallback={<PageLoader message="Loading URL Review..." />}>
            {React.createElement(React.lazy(() => import('@/pages/admin/UrlReviewQueue')))}
          </React.Suspense>
        </ProtectedRoute>
      } />
      <Route path="/compare" element={
        <ProtectedRoute requireAuth={true} requireOnboarding={true}>
          <TrackComparePage />
        </ProtectedRoute>
      } />
      <Route path="/plan/compare" element={
        <ProtectedRoute requireAuth={true} requireOnboarding={true}>
          <CompareTracks />
        </ProtectedRoute>
      } />

      {/* ── PROGRESS Hub Redirects ──────────────────────────── */}
      <Route path="/progress-hub" element={<Navigate to="/progress" replace />} />
      <Route path="/history-hub" element={<Navigate to="/progress" replace />} />
      <Route path="/history" element={<Navigate to="/progress?tab=history" replace />} />
      <Route path="/learning-history" element={<Navigate to="/progress?tab=history" replace />} />
      <Route path="/course-history" element={<Navigate to="/progress?tab=history" replace />} />
      <Route path="/skill-tree" element={<Navigate to="/progress?tab=skill-tree" replace />} />
      <Route path="/transcripts" element={<Navigate to="/progress?tab=achievements" replace />} />
      <Route path="/badges" element={<Navigate to="/progress?tab=achievements" replace />} />
      <Route path="/certificates" element={<Navigate to="/progress?tab=achievements" replace />} />
      <Route path="/resume-builder" element={<Navigate to="/progress?tab=resume" replace />} />
      <Route path="/resume-analytics" element={<Navigate to="/progress?tab=resume" replace />} />
      <Route path="/projects" element={<Navigate to="/progress?tab=portfolio" replace />} />
      <Route path="/wallet" element={<Navigate to="/progress?tab=achievements" replace />} />

      {/* ── CONTRIBUTE Hub Redirects ────────────────────────── */}
      <Route path="/teach-hub" element={<Navigate to="/contribute?tab=teach" replace />} />
      <Route path="/institution-hub" element={<Navigate to="/contribute?tab=institution" replace />} />
      <Route path="/employer-hub" element={<Navigate to="/contribute?tab=employer" replace />} />
      <Route path="/admin" element={<Navigate to="/contribute?tab=admin" replace />} />

      {/* ── Admin Transfer Rules ────────────────────────────── */}
      <Route path="/admin/transfer-rules" element={
        <ProtectedRoute requireAuth={true}>
          <AdminTransferRules />
        </ProtectedRoute>
      } />

      {/* ── Teach Feature Routes ────────────────────────────── */}
      <Route path="/teach/discovery" element={
        <StakeholderProtectedRoute stakeholderType="teach" requiredRole="mentor">
          <CourseDiscovery />
        </StakeholderProtectedRoute>
      } />
      <Route path="/teach/curation" element={
        <StakeholderProtectedRoute stakeholderType="teach" requiredRole="mentor">
          <CourseCuration />
        </StakeholderProtectedRoute>
      } />
      <Route path="/teach/paths" element={
        <StakeholderProtectedRoute stakeholderType="teach" requiredRole="mentor">
          <TeachPaths />
        </StakeholderProtectedRoute>
      } />
      <Route path="/teach/validation" element={
        <StakeholderProtectedRoute stakeholderType="teach" requiredRole="mentor">
          <TeachValidation />
        </StakeholderProtectedRoute>
      } />
      <Route path="/teach/marketplace" element={
        <StakeholderProtectedRoute stakeholderType="teach" requiredRole="mentor">
          <CourseMarketplace />
        </StakeholderProtectedRoute>
      } />
      <Route path="/teach/analytics" element={
        <StakeholderProtectedRoute stakeholderType="teach" requiredRole="mentor">
          <TeachAnalytics />
        </StakeholderProtectedRoute>
      } />
      <Route path="/teach/courses" element={
        <StakeholderProtectedRoute stakeholderType="teach" requiredRole="mentor">
          <TeachCourses />
        </StakeholderProtectedRoute>
      } />

      {/* ── Institution Feature Routes ──────────────────────── */}
      <Route path="/institution/overview" element={
        <StakeholderProtectedRoute stakeholderType="institution" requiredRole="user">
          <Institution />
        </StakeholderProtectedRoute>
      } />
      <Route path="/institution/students" element={
        <StakeholderProtectedRoute stakeholderType="institution" requiredRole="user">
          <InstitutionStudents />
        </StakeholderProtectedRoute>
      } />
      <Route path="/institution/programs" element={
        <StakeholderProtectedRoute stakeholderType="institution" requiredRole="user">
          <InstitutionPrograms />
        </StakeholderProtectedRoute>
      } />
      <Route path="/institution/faculty" element={
        <StakeholderProtectedRoute stakeholderType="institution" requiredRole="user">
          <InstitutionFaculty />
        </StakeholderProtectedRoute>
      } />
      <Route path="/institution/reports" element={
        <StakeholderProtectedRoute stakeholderType="institution" requiredRole="user">
          <InstitutionReports />
        </StakeholderProtectedRoute>
      } />
      <Route path="/institution/settings" element={
        <StakeholderProtectedRoute stakeholderType="institution" requiredRole="user">
          <InstitutionSettings />
        </StakeholderProtectedRoute>
      } />

      {/* ── Employer Feature Routes ─────────────────────────── */}
      <Route path="/employer/talent" element={
        <StakeholderProtectedRoute stakeholderType="employer" requiredRole="user">
          <EmployerTalent />
        </StakeholderProtectedRoute>
      } />
      <Route path="/employer/workforce" element={
        <StakeholderProtectedRoute stakeholderType="employer" requiredRole="user">
          <EmployerWorkforce />
        </StakeholderProtectedRoute>
      } />
      <Route path="/employer/hiring" element={
        <StakeholderProtectedRoute stakeholderType="employer" requiredRole="user">
          <EmployerTalent />
        </StakeholderProtectedRoute>
      } />
      <Route path="/employer/skills" element={
        <StakeholderProtectedRoute stakeholderType="employer" requiredRole="user">
          <EmployerSkills />
        </StakeholderProtectedRoute>
      } />
      <Route path="/employer/partnerships" element={
        <StakeholderProtectedRoute stakeholderType="employer" requiredRole="user">
          <EmployerPartnerships />
        </StakeholderProtectedRoute>
      } />
      <Route path="/employer/jobs" element={
        <StakeholderProtectedRoute stakeholderType="employer" requiredRole="user">
          <EmployerJobs />
        </StakeholderProtectedRoute>
      } />

      {/* ── Public / Embed Routes ───────────────────────────── */}
      <Route path="/resume-gallery" element={<ResumeGallery />} />
      <Route path="/resume/:userId" element={<PublicResume />} />
      <Route path="/share/trust/:token" element={<ShareTrust />} />

      {/* ── Active feature routes ───────────────────────────── */}
      <Route path="/badges/:slug" element={<BadgeDetail />} />
      <Route path="/upload-course" element={
        <ProtectedRoute requireAuth={true} requireOnboarding={true}>
          <UploadCourse />
        </ProtectedRoute>
      } />
      <Route path="/saved-courses" element={
        <ProtectedRoute requireAuth={true} requireOnboarding={true}>
          <Saved />
        </ProtectedRoute>
      } />
      <Route path="/maya-intelligence" element={
        <ProtectedRoute requireAuth={true} requireOnboarding={true}>
          <MayaIntelligence />
        </ProtectedRoute>
      } />
      <Route path="/ai-analyzer" element={
        <ProtectedRoute requireAuth={true} requireOnboarding={true}>
          <AIAnalyzer />
        </ProtectedRoute>
      } />
      <Route path="/certificate-gallery" element={<CertificateGallery />} />
      <Route path="/verify/:code?" element={<VerifySignature />} />
      <Route path="/teach" element={<Teach />} />

      {/* ── Admin Routes ────────────────────────────────────── */}
      <Route path="/admin" element={<Admin />} />
      <Route path="/mentor" element={
        <ProtectedRoute requireAuth={true} requireOnboarding={true}>
          <MentorChat />
        </ProtectedRoute>
      } />
      <Route path="/maya" element={
        <ProtectedRoute requireAuth={true} requireOnboarding={true}>
          <MayaPage />
        </ProtectedRoute>
      } />
      <Route path="/mentor-inbox" element={<MentorInbox />} />
      <Route path="/embed/:resumeId" element={<ResumeEmbed />} />
      <Route path="/embed-generator" element={<EmbedGenerator />} />
      <Route path="/analytics" element={
        <ProtectedRoute requireAuth={true} requireOnboarding={true}>
          <Analytics />
        </ProtectedRoute>
      } />
      <Route path="/analytics/exploration" element={<ExplorationDashboard />} />
      <Route path="/admin/smart-weights" element={
        <StakeholderProtectedRoute requiredRole="admin">
          <SmartWeightsAdmin />
        </StakeholderProtectedRoute>
      } />
      <Route path="/admin/badges" element={
        <StakeholderProtectedRoute requiredRole="admin">
          <AdminBadges />
        </StakeholderProtectedRoute>
      } />
      <Route path="/admin/moderation" element={
        <StakeholderProtectedRoute requiredRole="admin">
          <AdminModeration />
        </StakeholderProtectedRoute>
      } />
      <Route path="/admin/settings" element={
        <StakeholderProtectedRoute requiredRole="admin">
          <AdminSettings />
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
      <Route path="/admin/locations" element={<LocationManagerPanel />} />
      <Route path="/admin/template-validation" element={<TemplateValidation />} />
      <Route path="/admin/template-validation/:templateId/invariants" element={
        <React.Suspense fallback={<PageLoader message="Loading..." />}>
          {React.createElement(React.lazy(() => import('@/pages/admin/InvariantSnapshotDrilldown')))}
        </React.Suspense>
      } />
      <Route path="/admin/invariants/bulk/:jobId" element={
        <React.Suspense fallback={<PageLoader message="Loading..." />}>
          {React.createElement(React.lazy(() => import('@/pages/admin/BulkRerunProgress')))}
        </React.Suspense>
      } />
      <Route path="/admin/degree-integrity-scan" element={<DegreeIntegrityScan />} />
      <Route path="/admin/transfer-scraper" element={<TransferScraperDashboard />} />
      <Route path="/admin/policy-refresh" element={<PolicyRefreshAdmin />} />
      <Route path="/admin/policy-promotion" element={<PolicyPackPromotion />} />
      <Route path="/admin/policy-pipeline" element={<PolicyPackPipeline />} />
      <Route path="/admin/policy-field-review" element={<PolicyFieldReview />} />
      <Route path="/admin/add-institution" element={
        <React.Suspense fallback={<PageLoader message="Loading..." />}>
          {React.createElement(React.lazy(() => import('@/pages/Admin/AddInstitution')))}
        </React.Suspense>
      } />
      <Route path="/admin/generation-jobs" element={<GenerationJobs />} />
      <Route path="/embed-explorer" element={<EmbedExplorer />} />
      <Route path="/cri-dashboard" element={
        <ProtectedRoute requireAuth={true}>
          <CRIDashboardPage />
        </ProtectedRoute>
      } />

      {/* ── Error / Catch-all ───────────────────────────────── */}
      <Route path="/500" element={<InternalError />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

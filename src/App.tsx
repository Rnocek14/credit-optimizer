
import './utils/triggerCourseSeeding';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { UserJourneyProvider } from "./contexts/UserJourneyContext";
import { UnifiedDataProvider } from "./contexts/UnifiedDataContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DevLogin from "./pages/DevLogin";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import InternalError from "./pages/InternalError";
import ResumeGallery from "./pages/ResumeGallery";
import PublicResume from "./pages/PublicResume";
import Discover from "./pages/Discover";
import Explore from "./pages/Explore";
import Teach from "./pages/Teach";
import Saved from "./pages/Saved";
import Goals from "./pages/Goals";
import Transcript from "./pages/Transcript";
import Transcripts from "./pages/Transcripts";
import CourseHistory from "./pages/CourseHistory";
import SkillTree from "./pages/SkillTree";
import SkillTreeBuilder from "./pages/SkillTreeBuilder";
import ResumeBuilder from "./pages/ResumeBuilder";
import Admin from "./pages/Admin";
import MentorInbox from "./pages/MentorInbox";
import ResumeEmbed from "./pages/ResumeEmbed";
import EmbedGenerator from "./pages/EmbedGenerator";
import Analytics from "./pages/Analytics";
import MentorChat from "./pages/MentorChat";
import AdminBadges from "./pages/AdminBadges";
import EmbedExplorer from "./pages/EmbedExplorer";
import AdminModeration from "./pages/AdminModeration";
import AdminSettings from "./pages/AdminSettings";
import Badges from "./pages/Badges";
import BadgeDetail from "./pages/BadgeDetail";
import Demos from "./pages/Demos";
import Timeline from "./pages/Timeline";
import Plans from "./pages/Plans";
import SalaryInsights from "./pages/SalaryInsights";
import ResumeAnalytics from "./pages/ResumeAnalytics";
import MarketIntelligence from "./pages/MarketIntelligence";
import Workflows from "./pages/Workflows";
import MayaRoadmap from "./pages/MayaRoadmap";
import MayaCRIIntegration from "./pages/MayaCRIIntegration";
import MayaAutomation from "./pages/MayaAutomation";
import Certificates from "./pages/Certificates";
import VerifySignature from "./pages/VerifySignature";
import CertificateGallery from "./pages/CertificateGallery";
import CRIDashboardPage from "./pages/CRIDashboard";
import UploadCourse from "./pages/UploadCourse";
import ExploreCourses from "./pages/ExploreCourses";
import LearningHistory from "./pages/LearningHistory";
import Planner from "./pages/Planner";
import ProtectedRoute from "./components/ProtectedRoute";
import LocationManagerPanel from "./components/LocationManagerPanel";
import ExploreHub from "./pages/ExploreHub";
import PlanHub from "./pages/PlanHub";
import HistoryHub from "./pages/HistoryHub";
import DiscoverHub from "./pages/DiscoverHub";
import ProgressHub from "./pages/ProgressHub";
import TodayDashboard from "./pages/TodayDashboard";
import ContributeTabbed from "./pages/ContributeTabbed";
import CareerCopilot from "./pages/CareerCopilot";
import SprintBoard from "./pages/SprintBoard";
import TeachAnalytics from "./pages/TeachAnalytics";
import TeachCourses from "./pages/TeachCourses";
import CourseDiscovery from "./pages/CourseDiscovery";
import CourseCuration from "./pages/CourseCuration";
import LearningPaths from "./pages/LearningPaths";
import TeachPaths from "./pages/TeachPaths";
import TeachValidation from "./pages/TeachValidation";
import CourseMarketplace from "./pages/CourseMarketplace";
import Phase2Dashboard from "./pages/Phase2Dashboard";
import InterventionHistory from "./pages/InterventionHistory";
import Gamification from "./pages/Gamification";
import MayaIntelligence from "./pages/MayaIntelligence";
import SocialLearning from "./pages/SocialLearning";
import { SocialLearningTest } from "./components/SocialLearningTest";
import Phase4 from "./pages/Phase4";
import Phase5 from "./pages/Phase5";
import Phase6 from "./pages/Phase6";
import Phase7 from "./pages/Phase7";
import ShareTrust from "./pages/ShareTrust";
import Projects from "./pages/Projects";
import Wallet from "./pages/Wallet";
import Institution from "./pages/Institution";
import Employer from "./pages/Employer";
import AIAnalyzer from "./pages/AIAnalyzer";
import { StakeholderProtectedRoute } from "./components/StakeholderProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <UserJourneyProvider>
          <UnifiedDataProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
        <Routes>
          {/* Core Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Navigate to="/plan" replace />} />
          <Route 
            path="/auth" 
            element={
              <ProtectedRoute requireAuth={false}>
                <Auth />
              </ProtectedRoute>
            } 
          />
          <Route path="/dev-login" element={<DevLogin />} />
          <Route 
            path="/onboarding" 
            element={
              <ProtectedRoute requireAuth={true} redirectIfComplete={true}>
                <Onboarding />
              </ProtectedRoute>
            } 
          />

          {/* 4-Hub Routes - KEEP Features */}
          <Route 
            path="/discover" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <DiscoverHub />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/plan" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <PlanHub />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/progress" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <ProgressHub />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/today" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <TodayDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/contribute" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <ContributeTabbed />
              </ProtectedRoute>
            } 
          />

          {/* DISCOVER Hub Redirects */}
          <Route path="/explore" element={<Navigate to="/discover?tab=career" replace />} />
          <Route path="/explore-hub" element={<Navigate to="/discover" replace />} />
          <Route path="/explore-courses" element={<Navigate to="/discover?tab=courses" replace />} />
          <Route path="/market-intelligence" element={<Navigate to="/discover?tab=intel" replace />} />
          <Route path="/salary-insights" element={<Navigate to="/discover?tab=intel" replace />} />

          {/* PLAN Hub Redirects */}
          <Route path="/plan-hub" element={<Navigate to="/plan" replace />} />
          <Route path="/planner" element={<Navigate to="/plan?tab=roadmap" replace />} />
          <Route path="/goals" element={<Navigate to="/plan?tab=goals" replace />} />
          <Route path="/maya-roadmap" element={<Navigate to="/plan?tab=roadmap" replace />} />
          <Route path="/career-copilot" element={<Navigate to="/plan?tab=roadmap" replace />} />
          <Route path="/workflows" element={<Navigate to="/plan?tab=workflows" replace />} />

          {/* PROGRESS Hub Redirects */}
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

          {/* CONTRIBUTE Hub Redirects */}
          <Route path="/teach-hub" element={<Navigate to="/contribute?tab=teach" replace />} />
          <Route path="/institution-hub" element={<Navigate to="/contribute?tab=institution" replace />} />
          <Route path="/employer-hub" element={<Navigate to="/contribute?tab=employer" replace />} />
          <Route path="/admin" element={<Navigate to="/contribute?tab=admin" replace />} />

          {/* Teach Feature Routes */}
          <Route 
            path="/teach/discovery" 
            element={
              <StakeholderProtectedRoute stakeholderType="teach" requiredRole="mentor">
                <CourseDiscovery />
              </StakeholderProtectedRoute>
            } 
          />
          <Route 
            path="/teach/curation" 
            element={
              <StakeholderProtectedRoute stakeholderType="teach" requiredRole="mentor">
                <CourseCuration />
              </StakeholderProtectedRoute>
            } 
          />
          <Route 
            path="/teach/paths" 
            element={
              <StakeholderProtectedRoute stakeholderType="teach" requiredRole="mentor">
                <TeachPaths />
              </StakeholderProtectedRoute>
            } 
          />
          <Route 
            path="/teach/validation" 
            element={
              <StakeholderProtectedRoute stakeholderType="teach" requiredRole="mentor">
                <TeachValidation />
              </StakeholderProtectedRoute>
            } 
          />
          <Route 
            path="/teach/marketplace" 
            element={
              <StakeholderProtectedRoute stakeholderType="teach" requiredRole="mentor">
                <CourseMarketplace />
              </StakeholderProtectedRoute>
            } 
          />
          <Route 
            path="/teach/analytics" 
            element={
              <StakeholderProtectedRoute stakeholderType="teach" requiredRole="mentor">
                <TeachAnalytics />
              </StakeholderProtectedRoute>
            } 
          />
          <Route 
            path="/teach/courses" 
            element={
              <StakeholderProtectedRoute stakeholderType="teach" requiredRole="mentor">
                <TeachCourses />
              </StakeholderProtectedRoute>
            } 
          />

          {/* Institution Feature Routes */}
          <Route 
            path="/institution/overview" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Institution />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/institution/students" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Analytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/institution/programs" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <TeachAnalytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/institution/faculty" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <TeachCourses />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/institution/reports" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <ResumeAnalytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/institution/settings" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <AdminSettings />
              </ProtectedRoute>
            } 
          />

          {/* Employer Feature Routes */}
          <Route 
            path="/employer/talent" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <ResumeGallery />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employer/workforce" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Analytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employer/hiring" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Employer />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employer/skills" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <ResumeAnalytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employer/partnerships" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Institution />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employer/jobs" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Employer />
              </ProtectedRoute>
            } 
          />

          {/* Legacy Phase Routes */}
          <Route 
            path="/phase4" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Phase4 />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/phase5" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Phase5 />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/phase6" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Phase6 />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/phase7" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Phase7 />
              </ProtectedRoute>
            } 
          />
          
          <Route path="/resume-gallery" element={<ResumeGallery />} />
          <Route path="/resume/:userId" element={<PublicResume />} />
          <Route path="/share/trust/:token" element={<ShareTrust />} />
          <Route path="/demos" element={<Demos />} />
          <Route 
            path="/sprint-board" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <SprintBoard />
              </ProtectedRoute>
            } 
          />
          {/* Other Protected Routes */}
          <Route path="/badges" element={<Badges />} />
          <Route path="/badges/:slug" element={<BadgeDetail />} />
          <Route path="/discover-legacy" element={<Discover />} />
          <Route path="/explore-legacy" element={<Explore />} />
          <Route path="/explore-courses-legacy" element={<ExploreCourses />} />
          <Route path="/salary-insights-legacy" element={<SalaryInsights />} />
          <Route 
            path="/market-intelligence-legacy" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <MarketIntelligence />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/workflows-legacy" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Workflows />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/career-copilot-legacy" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <CareerCopilot />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/maya-roadmap-legacy" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <MayaRoadmap />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/maya-cri-integration" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <MayaCRIIntegration />
              </ProtectedRoute>
            } 
          />
           <Route 
             path="/maya-automation" 
             element={
               <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                 <MayaAutomation />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/ai-analyzer" 
             element={
               <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                 <AIAnalyzer />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/certificates-legacy" 
             element={
               <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                 <Certificates />
               </ProtectedRoute>
             } 
            />
           <Route path="/certificate-gallery" element={<CertificateGallery />} />
           <Route path="/verify/:code?" element={<VerifySignature />} />
          <Route path="/teach" element={<Teach />} />
          <Route 
            path="/upload-course" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <UploadCourse />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/saved-courses" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Saved />
              </ProtectedRoute>
            } 
          />
           <Route 
             path="/goals-legacy" 
             element={
               <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                 <Goals />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/gamification" 
             element={
               <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                 <Gamification />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/maya-intelligence" 
             element={
               <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                 <MayaIntelligence />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/social-learning" 
             element={
               <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                 <SocialLearning />
               </ProtectedRoute>
             } 
           />
           <Route path="/social-learning-test" element={<SocialLearningTest />} />
          <Route 
            path="/transcript" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Transcript />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/transcripts" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Transcripts />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/skill-tree" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <SkillTree />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/skill-tree-builder" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <SkillTreeBuilder />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/timeline" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Timeline />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/plans" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Plans />
              </ProtectedRoute>
            } 
          />
           <Route 
             path="/resume-builder-legacy" 
             element={
               <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                 <ResumeBuilder />
               </ProtectedRoute>
             } 
           />
        <Route path="/admin" element={<Admin />} />
        <Route 
          path="/mentor" 
          element={
            <ProtectedRoute requireAuth={true} requireOnboarding={true}>
              <MentorChat />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/maya" 
          element={
            <ProtectedRoute requireAuth={true} requireOnboarding={true}>
              <MentorChat />
            </ProtectedRoute>
          } 
        />
        <Route path="/mentor-inbox" element={<MentorInbox />} />
        <Route path="/embed/:resumeId" element={<ResumeEmbed />} />
        <Route path="/embed-generator" element={<EmbedGenerator />} />
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute requireAuth={true} requireOnboarding={true}>
              <Analytics />
            </ProtectedRoute>
          } 
        />
        <Route path="/admin/badges" element={<AdminBadges />} />
        <Route path="/admin/moderation" element={<AdminModeration />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/locations" element={<LocationManagerPanel />} />
        <Route path="/embed-explorer" element={<EmbedExplorer />} />
          <Route 
            path="/resume-analytics" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <ResumeAnalytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/cri-dashboard" 
            element={
              <ProtectedRoute requireAuth={true}>
                <CRIDashboardPage />
              </ProtectedRoute>
            } 
          />
          {/* These routes now redirect to /contribute hub */}
          <Route path="/projects" element={<Projects />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/institution" element={<Institution />} />
          <Route path="/employer" element={<Employer />} />
           <Route 
             path="/phase2-demo" 
             element={
               <ProtectedRoute requireAuth={true}>
                 <Phase2Dashboard />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/intervention-history" 
             element={
               <ProtectedRoute requireAuth={true}>
                 <InterventionHistory />
               </ProtectedRoute>
             } 
           />
           <Route path="/500" element={<InternalError />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
          </UnifiedDataProvider>
        </UserJourneyProvider>
    </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;

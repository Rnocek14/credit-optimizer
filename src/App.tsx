
import './utils/triggerCourseSeeding';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
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
import TeachHub from "./pages/TeachHub";
import InstitutionHub from "./pages/InstitutionHub";
import EmployerHub from "./pages/EmployerHub";
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
import { StakeholderProtectedRoute } from "./components/StakeholderProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
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
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
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
          {/* Hub Routes */}
          <Route path="/explore-hub" element={<ExploreHub />} />
          <Route path="/plan-hub" element={<PlanHub />} />
          <Route path="/history-hub" element={<HistoryHub />} />
          
          <Route path="/resume-gallery" element={<ResumeGallery />} />
          <Route path="/resume/:userId" element={<PublicResume />} />
          <Route path="/demos" element={<Demos />} />
          <Route path="/badges" element={<Badges />} />
          <Route path="/badges/:slug" element={<BadgeDetail />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/explore-courses" element={<ExploreCourses />} />
          <Route path="/salary-insights" element={<SalaryInsights />} />
          <Route 
            path="/market-intelligence" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <MarketIntelligence />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/workflows" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Workflows />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/maya-roadmap" 
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
            path="/learning-history" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <LearningHistory />
              </ProtectedRoute>
            } 
           />
           <Route 
             path="/planner" 
             element={
               <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                 <Planner />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/certificates" 
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
             path="/goals" 
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
            path="/course-history" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <CourseHistory />
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
            path="/resume-builder" 
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
          <Route 
            path="/teach-hub" 
            element={
              <StakeholderProtectedRoute stakeholderType="teach">
                <TeachHub />
              </StakeholderProtectedRoute>
            } 
          />
          <Route 
            path="/teach/analytics" 
            element={
              <StakeholderProtectedRoute stakeholderType="teach">
                <TeachAnalytics />
              </StakeholderProtectedRoute>
            } 
          />
          <Route 
            path="/teach/courses" 
            element={
              <StakeholderProtectedRoute stakeholderType="teach">
                <TeachCourses />
              </StakeholderProtectedRoute>
            } 
          />
          <Route 
            path="/teach/discovery" 
            element={
              <StakeholderProtectedRoute stakeholderType="teach">
                <CourseDiscovery />
              </StakeholderProtectedRoute>
            } 
          />
          <Route 
            path="/teach/curation" 
            element={
              <StakeholderProtectedRoute stakeholderType="teach">
                <CourseCuration />
              </StakeholderProtectedRoute>
            } 
          />
          <Route 
            path="/teach/paths" 
            element={
              <StakeholderProtectedRoute stakeholderType="teach">
                <TeachPaths />
              </StakeholderProtectedRoute>
            } 
          />
          <Route 
            path="/teach/validation" 
            element={
              <StakeholderProtectedRoute stakeholderType="teach">
                <TeachValidation />
              </StakeholderProtectedRoute>
            } 
          />
          <Route 
            path="/teach/marketplace" 
            element={
              <StakeholderProtectedRoute stakeholderType="teach">
                <CourseMarketplace />
              </StakeholderProtectedRoute>
            } 
          />
          <Route 
            path="/institution-hub"
            element={
              <StakeholderProtectedRoute stakeholderType="institution">
                <InstitutionHub />
              </StakeholderProtectedRoute>
            } 
          />
          <Route 
            path="/employer-hub" 
            element={
              <StakeholderProtectedRoute stakeholderType="employer">
                <EmployerHub />
              </StakeholderProtectedRoute>
            } 
          />
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
    </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;

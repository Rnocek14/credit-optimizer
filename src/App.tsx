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
import Admin from "./pages/Admin";
import MentorInbox from "./pages/MentorInbox";
import ResumeEmbed from "./pages/ResumeEmbed";
import EmbedGenerator from "./pages/EmbedGenerator";
import Analytics from "./pages/Analytics";
import AdminBadges from "./pages/AdminBadges";
import EmbedExplorer from "./pages/EmbedExplorer";
import AdminModeration from "./pages/AdminModeration";
import AdminSettings from "./pages/AdminSettings";
import ProtectedRoute from "./components/ProtectedRoute";

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
          <Route path="/resume-gallery" element={<ResumeGallery />} />
          <Route path="/resume/:userId" element={<PublicResume />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/teach" element={<Teach />} />
          <Route 
            path="/saved" 
            element={
              <ProtectedRoute requireAuth={true} requireOnboarding={true}>
                <Saved />
              </ProtectedRoute>
            } 
          />
        <Route path="/admin" element={<Admin />} />
        <Route path="/mentor" element={<MentorInbox />} />
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
        <Route path="/embed-explorer" element={<EmbedExplorer />} />
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

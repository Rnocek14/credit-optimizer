import { useSecureAuth } from "@/hooks/useSecureAuth";
import SecureLandingPage from "@/components/SecureLandingPage";
import { Navigate } from "react-router-dom";

export default function Index() {
  const { user, isLoading: authLoading } = useSecureAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <SecureLandingPage />;
  }

  // Authenticated users land on their plan; ProtectedRoute on /plan handles
  // anything else (magic-link users go straight to their saved plan).
  return <Navigate to="/plan" replace />;
}

import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserJourneyProvider } from "@/contexts/UserJourneyContext";
import { UnifiedDataProvider } from "@/contexts/UnifiedDataContext";
import TutorialProvider from "@/tutorial/TutorialProvider";
import { EnhancedErrorBoundary } from "@/components/enhanced/EnhancedErrorBoundary";
import { ProductionErrorBoundary } from "@/components/enhanced/ProductionErrorBoundary";

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ProductionErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <TooltipProvider>
              <TutorialProvider>
                <AuthProvider>
                  <UserJourneyProvider>
                    <UnifiedDataProvider>
                      <EnhancedErrorBoundary
                        onError={(error) => {
                          console.error('App-level error:', error);
                        }}
                      >
                        <Toaster />
                        <Sonner />
                        {children}
                      </EnhancedErrorBoundary>
                    </UnifiedDataProvider>
                  </UserJourneyProvider>
                </AuthProvider>
              </TutorialProvider>
            </TooltipProvider>
          </ThemeProvider>
        </HelmetProvider>
      </QueryClientProvider>
    </ProductionErrorBoundary>
  );
}

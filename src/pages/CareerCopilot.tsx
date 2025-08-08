import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { MayaCareerCopilot } from "@/components/maya/MayaCareerCopilot";
import { EnhancedPivotAdvisor } from "@/components/EnhancedPivotAdvisor";

export default function CareerCopilot() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    loadUser();
  }, []);

  return (
    <>
      <Helmet>
        <title>Career Co-Pilot | Smart Career Hub</title>
        <meta name="description" content="Career Co-Pilot hub with Maya AI chat, pivot advisor, and personalized guidance." />
        <link rel="canonical" href="/career-copilot" />
      </Helmet>
      <Navigation />
      <main className="min-h-screen bg-background">
        <header className="container mx-auto px-4 pt-8">
          <h1 className="text-2xl font-bold">Career Co-Pilot</h1>
        </header>
        <section className="container mx-auto px-4 py-6 grid gap-6 lg:grid-cols-3">
          <article className="lg:col-span-2">
            {userId ? (
              <MayaCareerCopilot userId={userId} />
            ) : (
              <div className="rounded-lg border p-6">Please sign in to chat with Maya.</div>
            )}
          </article>
          <aside className="lg:col-span-1 space-y-6">
            <div className="rounded-lg border p-4">
              <h2 className="text-lg font-semibold mb-3">Smart Pivot Advisor</h2>
              {userId ? (
                <EnhancedPivotAdvisor userId={userId} onViewComparison={() => {}} />
              ) : (
                <div className="text-sm text-muted-foreground">Sign in to see personalized pivot suggestions.</div>
              )}
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}

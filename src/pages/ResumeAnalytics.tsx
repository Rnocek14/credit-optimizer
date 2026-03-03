// HubNavigation now provided by AppShell at route level
import ResumeAnalyticsDashboard from "@/components/ResumeAnalyticsDashboard";
import { useTutorialDeeplink } from "@/tutorial/useTutorialDeeplink";

export default function ResumeAnalytics() {
  useTutorialDeeplink();
  
  return (
    <>
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Resume Analytics
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Comprehensive insights into your learning journey and career progress
            </p>
          </div>
          
          <section id="ra-snapshot">
            <ResumeAnalyticsDashboard />
          </section>
        </div>
      </div>
    </>
  );
}
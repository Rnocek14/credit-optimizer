import Navigation from "@/components/Navigation";
import ResumeAnalyticsDashboard from "@/components/ResumeAnalyticsDashboard";

export default function ResumeAnalytics() {
  return (
    <>
      <Navigation />
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
          
          <ResumeAnalyticsDashboard />
        </div>
      </div>
    </>
  );
}
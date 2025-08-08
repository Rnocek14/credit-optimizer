import { Link } from "react-router-dom";
import { Search, Compass, Users, Globe, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HubNavigation } from "@/components/HubNavigation";
import TrackSelector from "@/components/tracks/TrackSelector";
import { useActiveTrackStore } from "@/stores/useActiveTrackStore";

const exploreFeatures = [
  {
    title: "Course Discovery",
    description: "Explore thousands of courses across platforms",
    href: "/explore-courses",
    icon: Search,
    color: "bg-blue-500/10 text-blue-600"
  },
  {
    title: "Career Exploration", 
    description: "Discover career paths and opportunities",
    href: "/explore",
    icon: Compass,
    color: "bg-green-500/10 text-green-600"
  },
  {
    title: "Mentor Discovery",
    description: "Connect with mentors in your field",
    href: "/discover",
    icon: Users,
    color: "bg-purple-500/10 text-purple-600"
  },
  {
    title: "Global Insights",
    description: "View market trends and demand",
    href: "/market-intelligence",
    icon: TrendingUp,
    color: "bg-orange-500/10 text-orange-600"
  }
];

export default function ExploreHub() {
  const activeTrackId = useActiveTrackStore(s => s.activeTrackId);
  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      
      <div className="container mx-auto px-4 py-8 mb-20 md:mb-8">
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2">
            {activeTrackId && (
              <span data-testid="track-chip" className="text-xs px-2 py-1 rounded bg-muted">Track: {activeTrackId.slice(0,8)}</span>
            )}
            <TrackSelector />
          </div>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Explore Your Career Universe
            </h1>
            <p className="text-lg text-muted-foreground">
              Discover courses, career paths, mentors, and market insights to guide your journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exploreFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.href} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${feature.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                        <CardDescription>{feature.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <Link to={feature.href}>
                        Explore Now
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
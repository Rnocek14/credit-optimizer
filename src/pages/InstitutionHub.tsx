import { Link } from "react-router-dom";
import { Building, Users, BarChart3, GraduationCap, Settings, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// HubNavigation now provided by AppShell at route level

const institutionFeatures = [
  { id: "overview", title: "Institution Overview", description: "View institutional metrics and KPIs", icon: BarChart3, href: "/institution/overview", color: "text-blue-600" },
  { id: "students", title: "Student Management", description: "Manage student enrollment and records", icon: Users, href: "/institution/students", color: "text-green-600" },
  { id: "programs", title: "Program Analytics", description: "Track program performance and outcomes", icon: GraduationCap, href: "/institution/programs", color: "text-purple-600" },
  { id: "faculty", title: "Faculty Dashboard", description: "Manage teaching staff and resources", icon: Building, href: "/institution/faculty", color: "text-orange-600" },
  { id: "reports", title: "Institutional Reports", description: "Generate compliance and performance reports", icon: FileText, href: "/institution/reports", color: "text-indigo-600" },
  { id: "settings", title: "Institution Settings", description: "Configure institutional preferences", icon: Settings, href: "/institution/settings", color: "text-pink-600" },
];

export default function InstitutionHub() {
  return (
    <div className="min-h-screen bg-background">
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Institution Hub</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive institutional management and analytics platform
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {institutionFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Icon className={`h-8 w-8 ${feature.color}`} />
                    <div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={feature.href}>
                      Coming Soon
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
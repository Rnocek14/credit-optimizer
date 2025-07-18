import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Target, ArrowLeft, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const devLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

type DevLoginData = z.infer<typeof devLoginSchema>;

// Global dev user interface
declare global {
  interface Window {
    __devUser__?: {
      id: string;
      email: string;
      role: string;
      name?: string;
    };
  }
}

export default function DevLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<DevLoginData>({
    resolver: zodResolver(devLoginSchema),
    defaultValues: {
      email: "founder@lifepath.dev",
      name: "Dev Admin",
    },
  });

  // Check for existing dev user on mount
  useEffect(() => {
    if (window.__devUser__) {
      toast({
        title: "Dev mode active",
        description: `Logged in as ${window.__devUser__.email}`,
      });
      navigate("/admin/moderation");
    }
  }, [navigate, toast]);

  const handleDevLogin = async (data: DevLoginData) => {
    setIsLoading(true);
    try {
      const isAdmin = data.email === "founder@lifepath.dev" || data.email.includes("admin");
      const devUser = {
        id: `dev-${Date.now()}`,
        email: data.email,
        role: isAdmin ? "admin" : "user",
        name: data.name,
      };

      // Set global dev user
      window.__devUser__ = devUser;

      // Store in localStorage for persistence
      localStorage.setItem("devUser", JSON.stringify(devUser));

      // Try to create/update profile in database
      try {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", devUser.id)
          .maybeSingle();

        if (!existingProfile) {
          await supabase
            .from("profiles")
            .insert({
              user_id: devUser.id,
              name: devUser.name,
              role: devUser.role,
            });
        }
      } catch (dbError) {
        console.warn("Could not create dev profile in database:", dbError);
        // Continue anyway - dev mode should work without database
      }

      toast({
        title: "Dev login successful!",
        description: `Logged in as ${devUser.email} (${devUser.role})`,
      });

      // Redirect based on role
      if (devUser.role === "admin") {
        navigate("/admin/moderation");
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Dev login error:", error);
      toast({
        title: "Dev login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdmin = () => {
    window.__devUser__ = {
      id: "dev-admin-quick",
      email: "founder@lifepath.dev",
      role: "admin",
      name: "Quick Admin",
    };
    localStorage.setItem("devUser", JSON.stringify(window.__devUser__));
    toast({
      title: "Quick admin activated!",
      description: "Logged in as founder@lifepath.dev",
    });
    navigate("/admin/moderation");
  };

  const handleClearDevMode = () => {
    delete window.__devUser__;
    localStorage.removeItem("devUser");
    toast({
      title: "Dev mode cleared",
      description: "Returned to normal auth flow",
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              PathfindAI
            </span>
          </Link>
          <div className="flex items-center justify-center space-x-2">
            <Settings className="h-5 w-5 text-orange-500" />
            <h1 className="text-2xl font-bold text-orange-500">Dev Login</h1>
          </div>
          <p className="text-muted-foreground">Development mode authentication bypass</p>
        </div>

        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="text-orange-600 dark:text-orange-400">Development Authentication</CardTitle>
            <CardDescription>
              Skip normal auth flow for development and testing
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleDevLogin)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter dev email" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter display name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isLoading} variant="outline">
                  {isLoading ? "Setting up dev user..." : "Dev Login"}
                </Button>
              </form>
            </Form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Quick Options</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleQuickAdmin}>
                Quick Admin
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearDevMode}>
                Clear Dev Mode
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Pro tip:</strong> Use <code>window.__devUser__</code> in console</p>
              <p><strong>Admin emails:</strong> founder@lifepath.dev or any email with "admin"</p>
              <p><strong>Auto-redirect:</strong> Admins → /admin/moderation, Users → /dashboard</p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-2">
          <Button variant="ghost" asChild>
            <Link to="/auth" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Normal Auth</span>
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/" className="flex items-center space-x-2">
              <span>Back to Home</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
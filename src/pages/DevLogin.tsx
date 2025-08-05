import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Target, ArrowLeft, Settings, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  isProduction, 
  sanitizeString, 
  sanitizeHtml, 
  checkRateLimit, 
  generateRateLimitKey, 
  clearDevMode,
  secureStorage,
  DEV_SESSION_TIMEOUT
} from "@/lib/security";

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

  // SECURITY: Block dev login in production
  if (isProduction()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Development Login Disabled</CardTitle>
            <CardDescription>
              Dev login is disabled in production for security reasons.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Please use the standard authentication flow.
            </p>
            <Button asChild className="w-full">
              <Link to="/auth">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const form = useForm<DevLoginData>({
    resolver: zodResolver(devLoginSchema),
    defaultValues: {
      email: "founder@lifepath.dev",
      name: "Dev Admin",
    },
  });

  // Check for existing dev user on mount
  useEffect(() => {
    const checkExistingDevUser = async () => {
      if (window.__devUser__) {
        toast({
          title: "Dev mode active",
          description: `Logged in as ${sanitizeHtml(window.__devUser__.email)}`,
        });
        
        // Get secure role from database for navigation
        try {
          const { data: secureRole } = await supabase.rpc('get_user_role', { 
            user_uuid: window.__devUser__.id 
          });
          
          if (secureRole === "admin") {
            navigate("/admin/moderation");
          } else {
            navigate("/dashboard");
          }
        } catch (error) {
          console.warn("Could not validate dev user role:", error);
          navigate("/dashboard");
        }
      }
    };
    
    checkExistingDevUser();
  }, [navigate, toast]);

  const handleDevLogin = async (data: DevLoginData) => {
    setIsLoading(true);
    
    try {
      // Rate limiting for dev login attempts
      const rateLimitKey = generateRateLimitKey(data.email, "dev_login");
      if (!checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000)) {
        toast({
          title: "Too many attempts",
          description: "Please wait before trying again",
          variant: "destructive",
        });
        return;
      }

      // SECURITY: Enhanced dev user creation with session tracking
      const devUser = {
        id: `dev-${Date.now()}`,
        email: sanitizeString(data.email),
        role: "user", // Always start as user - admin roles must be assigned via database
        name: sanitizeString(data.name),
        sessionStart: Date.now(),
        sessionTimeout: DEV_SESSION_TIMEOUT
      };

      // Set global dev user
      window.__devUser__ = devUser;

      // Store in secure localStorage with integrity checking
      secureStorage.setItem("devUser", devUser);

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

      // Get secure role from database for navigation
      let secureRole = "user";
      try {
        const { data: roleData } = await supabase.rpc('get_user_role', { 
          user_uuid: devUser.id 
        });
        secureRole = roleData || "user";
      } catch (roleError) {
        console.warn("Could not fetch secure role:", roleError);
      }
      
      // Redirect based on secure role
      if (secureRole === "admin") {
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

  const handleQuickAdmin = async () => {
    // SECURITY: Remove direct admin assignment - check database role
    const devUser = {
      id: "dev-admin-quick",
      email: "founder@lifepath.dev",
      role: "user", // Start as user, will be validated against database
      name: "Quick Admin",
    };
    
    window.__devUser__ = devUser;
    secureStorage.setItem("devUser", devUser);
    
    // Check actual role from database
    try {
      const { data: secureRole } = await supabase.rpc('get_user_role', { 
        user_uuid: devUser.id 
      });
      
      if (secureRole === "admin") {
        toast({
          title: "Quick admin activated!",
          description: "Logged in with admin privileges",
        });
        navigate("/admin/moderation");
      } else {
        toast({
          title: "Quick login activated!",
          description: "No admin privileges found in database",
          variant: "destructive",
        });
        navigate("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Role validation failed",
        description: "Could not verify admin status",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  };

  const handleClearDevMode = () => {
    clearDevMode();
    
    toast({
      title: "Dev mode cleared",
      description: "Development authentication has been cleared securely",
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

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Demo Accounts</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => {
                  const demoUser = {
                    id: '2b458624-d498-4cca-a63d-9341cc20e363',
                    email: 'aisha@demo.com',
                    role: 'mentor',
                    name: 'Aisha Khan'
                  };
                  window.__devUser__ = demoUser;
                  secureStorage.setItem("devUser", demoUser);
                  toast({ title: "Demo Login", description: "Logged in as Aisha Khan (Frontend Developer)" });
                  navigate("/dashboard");
                }}
              >
                🚀 Aisha Khan (Frontend Dev, 200 XP)
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => {
                  const demoUser = {
                    id: '3c459625-e499-5ddb-b64d-a442dd21f474',
                    email: 'mateo@demo.com',
                    role: 'mentor',
                    name: 'Mateo Silva'
                  };
                  window.__devUser__ = demoUser;
                  secureStorage.setItem("devUser", demoUser);
                  toast({ title: "Demo Login", description: "Logged in as Mateo Silva (DevOps Engineer)" });
                  navigate("/dashboard");
                }}
              >
                ⚙️ Mateo Silva (DevOps Engineer, 350 XP)
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => {
                  const demoUser = {
                    id: '4d56a736-f5aa-6eec-c75e-b553ee32e585',
                    email: 'jade@demo.com',
                    role: 'admin',
                    name: 'Jade Chen'
                  };
                  window.__devUser__ = demoUser;
                  secureStorage.setItem("devUser", demoUser);
                  toast({ title: "Demo Login", description: "Logged in as Jade Chen (ML Research Scientist)" });
                  navigate("/dashboard");
                }}
              >
                🧠 Jade Chen (ML Scientist, 500 XP) ⭐
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Pro tip:</strong> Use <code>window.__devUser__</code> in console</p>
              <p><strong>Admin emails:</strong> founder@lifepath.dev or any email with "admin"</p>
              <p><strong>Auto-redirect:</strong> Admins → /admin/moderation, Users → /dashboard</p>
              <p><strong>View demo resumes:</strong> <Link to="/resume-gallery" className="text-primary hover:underline">Resume Gallery</Link></p>
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
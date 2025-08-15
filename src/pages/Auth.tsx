import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Target, ArrowLeft, Linkedin, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { enableDevAuth } from "@/lib/security";
import { setupDevUser } from "@/lib/devUserSetup";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthData = z.infer<typeof authSchema>;

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('OAuth error:', error);
        toast({
          title: "Authentication failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.session) {
        const importType = searchParams.get('import');
        if (importType === 'linkedin') {
          // Handle LinkedIn import after OAuth
          navigate('/onboarding?step=import&source=linkedin');
        } else {
          navigate('/dashboard');
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, toast]);

  const form = useForm<AuthData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSignIn = async (data: AuthData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      // Get user and create/update profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if profile exists
        let { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        // Create profile if it doesn't exist
        if (!profile) {
          const { data: newProfile } = await supabase
            .from("profiles")
            .insert({
              user_id: user.id,
              name: user.email?.split("@")[0] || "User"
            })
            .select()
            .single();
          profile = newProfile;
          
          // Create default user role entry
          await supabase
            .from("user_roles")
            .insert({
              user_id: user.id,
              role: "user"
            });
        }

        toast({
          title: "Welcome back!",
          description: "You've been signed in successfully.",
        });

        // Redirect to explore-hub for all users
        navigate("/explore-hub");
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast({
        title: "Sign in failed",
        description: error.message || "Invalid login credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (data: AuthData) => {
    setIsLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });

      if (error) throw error;

      // Auto-create profile for new users
      if (authData.user) {
        await supabase
          .from("profiles")
          .insert({
            user_id: authData.user.id,
            name: data.email.split("@")[0] || "User"
          });
          
        // Create default user role entry
        await supabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: "user"
          });
      }

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkedInSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          scopes: 'r_liteprofile r_emailaddress',
          redirectTo: `${window.location.origin}/auth/callback?import=linkedin`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("LinkedIn OAuth error:", error);
      toast({
        title: "LinkedIn sign in failed",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      // Enable dev auth and set up demo user
      enableDevAuth();
      setupDevUser('mateo');
      
      toast({
        title: "Demo account ready!",
        description: "You're now signed in as Mateo (demo user).",
      });
      
      // Navigate to explore-hub
      navigate("/explore-hub");
    } catch (error: any) {
      console.error("Demo login error:", error);
      toast({
        title: "Demo login failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
          <h1 className="text-2xl font-bold">Welcome</h1>
          <p className="text-muted-foreground">Sign in to access your career roadmap</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="mt-4">
                <CardTitle>Sign In</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-4">
                <CardTitle>Create Account</CardTitle>
                <CardDescription>
                  Start your AI-powered career journey today
                </CardDescription>
              </TabsContent>
            </Tabs>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsContent value="signin">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSignIn)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your email" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your password" type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                     <Button type="submit" className="w-full" disabled={isLoading} variant="gradient">
                       {isLoading ? (
                         <>
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                           Signing in...
                         </>
                       ) : (
                         "Sign In"
                       )}
                     </Button>
                     
                     <div className="relative">
                       <div className="absolute inset-0 flex items-center">
                         <Separator className="w-full" />
                       </div>
                       <div className="relative flex justify-center text-xs uppercase">
                         <span className="bg-background px-2 text-muted-foreground">
                           Or continue with
                         </span>
                       </div>
                     </div>
                     
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full" 
                        disabled={isLoading}
                        onClick={handleLinkedInSignIn}
                      >
                        <Linkedin className="mr-2 h-4 w-4" />
                        Sign in with LinkedIn
                      </Button>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <Separator className="w-full" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            Or try demo
                          </span>
                        </div>
                      </div>
                      
                      <Button 
                        type="button" 
                        variant="secondary" 
                        className="w-full" 
                        disabled={isLoading}
                        onClick={handleDemoLogin}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Try demo account
                      </Button>
                   </form>
                 </Form>
              </TabsContent>
              
              <TabsContent value="signup">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSignUp)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your email" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input placeholder="Create a password (min. 6 characters)" type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full" disabled={isLoading} variant="gradient">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="ghost" asChild>
            <Link to="/" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
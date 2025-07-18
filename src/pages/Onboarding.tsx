import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, User, Target, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  experience_level: z.enum(["beginner", "intermediate", "advanced"]),
  role_title: z.string().min(2, "Role title is required"),
  industry: z.string().min(2, "Industry is required"),
  skills: z.string().min(2, "Skills are required"),
  education: z.string().min(2, "Education is required"),
  years_experience: z.number().min(0).max(50),
  career_goals: z.string().min(10, "Please provide more detailed career goals"),
  interests: z.string().min(2, "Interests are required"),
  learning_style: z.enum(["project-based", "video", "reading", "hands-on", "mentorship"]),
  availability: z.string().min(2, "Availability is required"),
  location: z.string().min(2, "Location is required"),
  willing_to_relocate: z.boolean(),
  salary_expectations: z.number().min(0),
  work_preferences: z.enum(["remote-first", "in-office", "hybrid"]),
});

type FormData = z.infer<typeof formSchema>;

export default function Onboarding() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      experience_level: "beginner",
      role_title: "",
      industry: "",
      skills: "",
      education: "",
      years_experience: 0,
      career_goals: "",
      interests: "",
      learning_style: "project-based",
      availability: "",
      location: "",
      willing_to_relocate: false,
      salary_expectations: 0,
      work_preferences: "remote-first",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to continue",
          variant: "destructive",
        });
        return;
      }

      // Convert comma-separated strings to arrays
      const profileData = {
        ...data,
        user_id: user.id,
        skills: data.skills.split(",").map(s => s.trim()),
        interests: data.interests.split(",").map(s => s.trim()),
      };

      // Save profile to database
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .insert(profileData)
        .select()
        .single();

      if (profileError) {
        throw profileError;
      }

      // Format data for the edge function
      const edgeFunctionPayload = {
        user_id: profile.id,
        profile_data: {
          user_background: {
            experience_level: data.experience_level,
            role_title: data.role_title,
            industry: data.industry,
            skills: data.skills.split(",").map(s => s.trim()),
            education: data.education,
            years_experience: data.years_experience,
          },
          goals_and_interests: {
            career_goals: data.career_goals,
            interests: data.interests.split(",").map(s => s.trim()),
            preferred_learning_style: data.learning_style,
            availability: data.availability,
          },
          context: {
            location: data.location,
            willing_to_relocate: data.willing_to_relocate,
            salary_expectations: data.salary_expectations,
            work_preferences: data.work_preferences,
          },
        },
      };

      // Call the generate-roadmap edge function
      const { error: roadmapError } = await supabase.functions.invoke("generate-roadmap", {
        body: edgeFunctionPayload,
      });

      if (roadmapError) {
        throw roadmapError;
      }

      toast({
        title: "Profile Created Successfully!",
        description: "Your personalized roadmap is being generated...",
      });

      // Navigate to dashboard
      navigate("/dashboard");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create Your Career Profile
          </h1>
          <p className="text-muted-foreground">
            Tell us about yourself to generate your personalized career roadmap
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Basic information about your background
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="experience_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experience Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select experience level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="years_experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Years of Experience</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Role Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Graphic Designer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Technology, Design" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skills (comma-separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Figma, Photoshop, Illustrator" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Education</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., BA in Graphic Design" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Goals and Interests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Goals & Interests
                </CardTitle>
                <CardDescription>
                  What you want to achieve and how you learn best
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="career_goals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Career Goals</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your career aspirations and what you want to achieve..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interests (comma-separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., User Experience, Mobile Apps, Data Science" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="learning_style"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Learning Style</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="project-based">Project-based</SelectItem>
                            <SelectItem value="video">Video Learning</SelectItem>
                            <SelectItem value="reading">Reading/Documentation</SelectItem>
                            <SelectItem value="hands-on">Hands-on Practice</SelectItem>
                            <SelectItem value="mentorship">Mentorship</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="availability"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weekly Availability</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 10 hours/week" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Work Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Work Preferences
                </CardTitle>
                <CardDescription>
                  Your location and work style preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., San Francisco, CA or Remote" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="salary_expectations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salary Expectations (USD)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="80000"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <FormField
                    control={form.control}
                    name="work_preferences"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Preferences</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="remote-first">Remote-first</SelectItem>
                            <SelectItem value="in-office">In-office</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="willing_to_relocate"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Willing to Relocate</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Profile & Generating Roadmap...
                </>
              ) : (
                "Create Profile & Generate Roadmap"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
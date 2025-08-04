import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDataImport } from "@/hooks/useDataImport";
import { Linkedin, User, Briefcase, GraduationCap, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface LinkedInImportProps {
  onImportComplete?: () => void;
}

interface ImportStatus {
  step: string;
  progress: number;
  message: string;
}

export function LinkedInImport({ onImportComplete }: LinkedInImportProps) {
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const { toast } = useToast();
  const { importFromLinkedIn, isImporting } = useDataImport();

  // Check for LinkedIn OAuth callback on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('linkedin_import_state');
    
    if (code && state && storedState === state) {
      handleLinkedInCallback(code);
      // Clean up URL and localStorage
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.removeItem('linkedin_import_state');
    }
  }, []);

  const handleLinkedInImport = async () => {
    setImportResult(null);
    
    try {
      setImportStatus({
        step: "auth",
        progress: 10,
        message: "Preparing LinkedIn authentication..."
      });

      // Get LinkedIn Client ID from edge function (which has access to secrets)
      const { data: configData, error: configError } = await supabase.functions.invoke('linkedin-import', {
        body: { action: 'get_config' }
      });
      
      if (configError || !configData?.clientId) {
        throw new Error('LinkedIn configuration not found. Please contact support.');
      }

      setImportStatus({
        step: "auth",
        progress: 20,
        message: "Redirecting to LinkedIn..."
      });

      // Create LinkedIn OAuth URL for data access
      const redirectUri = encodeURIComponent(`${window.location.origin}/onboarding`);
      const scope = encodeURIComponent("profile openid email");
      const state = Math.random().toString(36).substring(7);
      
      // Store state for security
      localStorage.setItem('linkedin_import_state', state);
      
      const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${configData.clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
      
      // Redirect to LinkedIn OAuth
      window.location.href = linkedInAuthUrl;
      
    } catch (error: any) {
      console.error("LinkedIn import error:", error);
      toast({
        title: "LinkedIn Import Failed",
        description: error.message,
        variant: "destructive",
      });
      setImportStatus(null);
    }
  };

  const handleLinkedInCallback = async (authCode: string) => {
    try {
      setImportStatus({
        step: "processing",
        progress: 30,
        message: "Exchanging authorization code..."
      });

      // Call the import function with the authorization code
      const result = await importFromLinkedIn(authCode);
      
      setImportStatus({
        step: "processing",
        progress: 80,
        message: "Processing LinkedIn data..."
      });

      setImportStatus({
        step: "complete",
        progress: 100,
        message: "Import completed successfully!"
      });

      // Set result with actual data from import
      setImportResult({
        success: true,
        skillsExtracted: result?.skillsExtracted || 0,
        message: result?.message || "LinkedIn import completed",
        profileImported: true,
        experienceCount: result?.experience_count || 0,
        educationCount: result?.education_count || 0
      });

      onImportComplete?.();
      
    } catch (error: any) {
      console.error("LinkedIn callback error:", error);
      toast({
        title: "LinkedIn Import Failed",
        description: error.message,
        variant: "destructive",
      });
      setImportStatus(null);
    }
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Linkedin className="h-5 w-5 text-blue-600" />
          <CardTitle>Import from LinkedIn</CardTitle>
        </div>
        <CardDescription>
          Instantly import your professional profile, experience, and skills from LinkedIn
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isImporting && !importResult && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Profile information (name, headline, summary)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Briefcase className="h-4 w-4" />
                <span>Work experience and current role</span>
              </div>
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-4 w-4" />
                <span>Education and certifications</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>AI-powered skill extraction</span>
              </div>
            </div>
            
            <Separator />
            
            <Button 
              onClick={handleLinkedInImport} 
              className="w-full"
              variant="default"
              size="lg"
            >
              <Linkedin className="mr-2 h-5 w-5" />
              Connect LinkedIn Account
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              We'll only access your public profile information and never post on your behalf
            </p>
          </div>
        )}

        {isImporting && importStatus && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{importStatus.message}</span>
                <span className="text-sm text-muted-foreground">{importStatus.progress}%</span>
              </div>
              <Progress value={importStatus.progress} className="w-full" />
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>This may take a few moments...</span>
            </div>
          </div>
        )}

        {importResult && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Import Successful!</span>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <h4 className="font-medium">Profile Data Imported</h4>
                <p className="text-sm text-muted-foreground">
                  {importResult.message}
                </p>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {importResult.skillsExtracted || 0} skills extracted
                  </Badge>
                  <Badge variant="outline">
                    LinkedIn Data
                  </Badge>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={() => {
                setImportResult(null);
                setImportStatus(null);
              }}
              variant="outline"
              className="w-full"
            >
              Import Another Source
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
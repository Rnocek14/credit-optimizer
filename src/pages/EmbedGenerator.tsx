import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, ExternalLink, Eye, Code } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/Navigation';

export default function EmbedGenerator() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [embedConfig, setEmbedConfig] = useState({
    theme: 'light',
    size: 'default'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      setUser(user);

      // Fetch user profile
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(profileData);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmbedUrl = () => {
    if (!user) return '';
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      theme: embedConfig.theme,
      size: embedConfig.size
    });
    return `${baseUrl}/embed/${user.id}?${params.toString()}`;
  };

  const getIframeCode = () => {
    const url = getEmbedUrl();
    const height = embedConfig.size === 'mini' ? '280' : embedConfig.size === 'large' ? '400' : '320';
    const width = embedConfig.size === 'mini' ? '320' : embedConfig.size === 'large' ? '640' : '400';
    
    return `<iframe 
  src="${url}"
  width="${width}" 
  height="${height}"
  frameborder="0"
  style="border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"
  title="Resume Widget">
</iframe>`;
  };

  const getScriptCode = () => {
    const url = getEmbedUrl();
    return `<script>
  (function() {
    const iframe = document.createElement('iframe');
    iframe.src = '${url}';
    iframe.width = '${embedConfig.size === 'mini' ? '320' : embedConfig.size === 'large' ? '640' : '400'}';
    iframe.height = '${embedConfig.size === 'mini' ? '280' : embedConfig.size === 'large' ? '400' : '320'}';
    iframe.frameBorder = '0';
    iframe.style.borderRadius = '8px';
    iframe.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    iframe.title = 'Resume Widget';
    document.getElementById('resume-widget').appendChild(iframe);
  })();
</script>
<div id="resume-widget"></div>`;
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${type} code copied to clipboard`
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const enableGallery = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ gallery_enabled: true })
        .eq('user_id', user?.id);

      if (error) throw error;

      setProfile({ ...profile, gallery_enabled: true });
      toast({
        title: "Success",
        description: "Resume is now public and embeddable"
      });
    } catch (error) {
      console.error('Error enabling gallery:', error);
      toast({
        title: "Error",
        description: "Failed to enable public access",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-8">
              <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
              <p className="text-muted-foreground mb-4">
                Please complete your onboarding first.
              </p>
              <Button onClick={() => navigate('/onboarding')}>
                Complete Onboarding
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Embed Your Resume</h1>
          <p className="text-muted-foreground">
            Generate embeddable widgets to showcase your Life Path resume on any website
          </p>
        </div>

        {!profile.gallery_enabled && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-yellow-800">Public Access Required</h3>
                  <p className="text-sm text-yellow-700">
                    Your resume must be public to create embeddable widgets.
                  </p>
                </div>
                <Button onClick={enableGallery} variant="outline">
                  Enable Public Access
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Widget Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <Select 
                    value={embedConfig.theme} 
                    onValueChange={(value) => setEmbedConfig(prev => ({ ...prev, theme: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="size">Size</Label>
                  <Select 
                    value={embedConfig.size} 
                    onValueChange={(value) => setEmbedConfig(prev => ({ ...prev, size: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mini">Mini (320×280)</SelectItem>
                      <SelectItem value="default">Default (400×320)</SelectItem>
                      <SelectItem value="large">Large (640×400)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open(getEmbedUrl(), '_blank')}
                    disabled={!profile.gallery_enabled}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate(`/resume/${user?.id}`)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Full Resume
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Embed Codes */}
            <Card>
              <CardHeader>
                <CardTitle>Embed Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="iframe">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="iframe">HTML (iframe)</TabsTrigger>
                    <TabsTrigger value="script">JavaScript</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="iframe" className="space-y-4">
                    <div>
                      <Label>HTML Embed Code</Label>
                      <div className="relative">
                        <Textarea
                          value={getIframeCode()}
                          readOnly
                          className="font-mono text-sm"
                          rows={8}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(getIframeCode(), 'HTML')}
                          disabled={!profile.gallery_enabled}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Paste this HTML code directly into your website or blog.
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="script" className="space-y-4">
                    <div>
                      <Label>JavaScript Embed Code</Label>
                      <div className="relative">
                        <Textarea
                          value={getScriptCode()}
                          readOnly
                          className="font-mono text-sm"
                          rows={12}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(getScriptCode(), 'JavaScript')}
                          disabled={!profile.gallery_enabled}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Use this for dynamic loading or when you prefer JavaScript implementation.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Live Preview
                  <Badge variant="outline">{embedConfig.size} • {embedConfig.theme}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.gallery_enabled ? (
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <iframe
                      src={getEmbedUrl()}
                      width={embedConfig.size === 'mini' ? '320' : embedConfig.size === 'large' ? '640' : '400'}
                      height={embedConfig.size === 'mini' ? '280' : embedConfig.size === 'large' ? '400' : '320'}
                      className="border-0 rounded-lg shadow-sm mx-auto block"
                      title="Resume Widget Preview"
                    />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <h3 className="font-medium text-muted-foreground mb-2">Preview Unavailable</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable public access to see the preview
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
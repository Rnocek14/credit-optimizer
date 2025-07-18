import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, Palette, Shield, Database, Key, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    // Platform Branding
    platformName: 'Resume AI Platform',
    logoUrl: '',
    primaryColor: '#3b82f6',
    accentColor: '#10b981',
    metaDescription: 'AI-powered resume analysis and career guidance platform',
    
    // AI Thresholds
    minAiScore: 60,
    maxResumeLength: 5000,
    aiReviewTimeout: 30,
    autoFlagThreshold: 40,
    
    // Gallery Settings
    galleryEnabled: true,
    maxGalleryItems: 100,
    featuredItemsLimit: 12,
    publicViewingEnabled: true,
    
    // Content Moderation
    bannedKeywords: ['inappropriate', 'offensive'],
    autoModeration: true,
    profanityFilter: true,
    spamDetection: true,
    
    // API & Access
    adminEmails: ['admin@example.com'],
    apiRateLimit: 100,
    requireApproval: false,
    maintenanceMode: false
  });

  const [newKeyword, setNewKeyword] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');

  const handleSave = async (section: string) => {
    try {
      // Here you would save to your backend/database
      toast({
        title: "Settings saved",
        description: `${section} settings have been updated successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !settings.bannedKeywords.includes(newKeyword.trim())) {
      setSettings(prev => ({
        ...prev,
        bannedKeywords: [...prev.bannedKeywords, newKeyword.trim()]
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setSettings(prev => ({
      ...prev,
      bannedKeywords: prev.bannedKeywords.filter(k => k !== keyword)
    }));
  };

  const addAdminEmail = () => {
    if (newAdminEmail.trim() && !settings.adminEmails.includes(newAdminEmail.trim())) {
      setSettings(prev => ({
        ...prev,
        adminEmails: [...prev.adminEmails, newAdminEmail.trim()]
      }));
      setNewAdminEmail('');
    }
  };

  const removeAdminEmail = (email: string) => {
    setSettings(prev => ({
      ...prev,
      adminEmails: prev.adminEmails.filter(e => e !== email)
    }));
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground">
            Configure global platform settings and preferences
          </p>
        </div>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="branding">
            <Palette className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Database className="h-4 w-4 mr-2" />
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="gallery">
            <Globe className="h-4 w-4 mr-2" />
            Gallery
          </TabsTrigger>
          <TabsTrigger value="moderation">
            <Shield className="h-4 w-4 mr-2" />
            Moderation
          </TabsTrigger>
          <TabsTrigger value="access">
            <Key className="h-4 w-4 mr-2" />
            Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Platform Branding</CardTitle>
              <CardDescription>
                Customize the look and feel of your platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input
                    id="platformName"
                    value={settings.platformName}
                    onChange={(e) => setSettings(prev => ({ ...prev, platformName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={settings.logoUrl}
                    onChange={(e) => setSettings(prev => ({ ...prev, logoUrl: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-16"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => setSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                      className="w-16"
                    />
                    <Input
                      value={settings.accentColor}
                      onChange={(e) => setSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={settings.metaDescription}
                  onChange={(e) => setSettings(prev => ({ ...prev, metaDescription: e.target.value }))}
                  rows={3}
                />
              </div>

              <Button onClick={() => handleSave('Branding')}>
                Save Branding Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>
                Configure AI analysis thresholds and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="minAiScore">Minimum AI Score</Label>
                  <Input
                    id="minAiScore"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.minAiScore}
                    onChange={(e) => setSettings(prev => ({ ...prev, minAiScore: parseInt(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Resumes below this score will be flagged for review
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxResumeLength">Max Resume Length (characters)</Label>
                  <Input
                    id="maxResumeLength"
                    type="number"
                    value={settings.maxResumeLength}
                    onChange={(e) => setSettings(prev => ({ ...prev, maxResumeLength: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="aiReviewTimeout">AI Review Timeout (seconds)</Label>
                  <Input
                    id="aiReviewTimeout"
                    type="number"
                    value={settings.aiReviewTimeout}
                    onChange={(e) => setSettings(prev => ({ ...prev, aiReviewTimeout: parseInt(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="autoFlagThreshold">Auto-Flag Threshold</Label>
                  <Input
                    id="autoFlagThreshold"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.autoFlagThreshold}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoFlagThreshold: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <Button onClick={() => handleSave('AI Settings')}>
                Save AI Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery">
          <Card>
            <CardHeader>
              <CardTitle>Gallery Settings</CardTitle>
              <CardDescription>
                Configure public gallery behavior and limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Gallery Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow public viewing of resume gallery
                  </p>
                </div>
                <Switch
                  checked={settings.galleryEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, galleryEnabled: checked }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Public Viewing</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow non-authenticated users to browse
                  </p>
                </div>
                <Switch
                  checked={settings.publicViewingEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, publicViewingEnabled: checked }))}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maxGalleryItems">Max Gallery Items</Label>
                  <Input
                    id="maxGalleryItems"
                    type="number"
                    value={settings.maxGalleryItems}
                    onChange={(e) => setSettings(prev => ({ ...prev, maxGalleryItems: parseInt(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="featuredItemsLimit">Featured Items Limit</Label>
                  <Input
                    id="featuredItemsLimit"
                    type="number"
                    value={settings.featuredItemsLimit}
                    onChange={(e) => setSettings(prev => ({ ...prev, featuredItemsLimit: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <Button onClick={() => handleSave('Gallery Settings')}>
                Save Gallery Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation">
          <Card>
            <CardHeader>
              <CardTitle>Content Moderation</CardTitle>
              <CardDescription>
                Configure automated content filtering and moderation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Moderation</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable automated content screening
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoModeration}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoModeration: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Profanity Filter</Label>
                    <p className="text-sm text-muted-foreground">
                      Filter inappropriate language
                    </p>
                  </div>
                  <Switch
                    checked={settings.profanityFilter}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, profanityFilter: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Spam Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Detect and flag potential spam content
                    </p>
                  </div>
                  <Switch
                    checked={settings.spamDetection}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, spamDetection: checked }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Banned Keywords</Label>
                <div className="flex gap-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Add banned keyword..."
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                  />
                  <Button onClick={addKeyword} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.bannedKeywords.map((keyword) => (
                    <Badge key={keyword} variant="destructive" className="cursor-pointer" onClick={() => removeKeyword(keyword)}>
                      {keyword} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <Button onClick={() => handleSave('Moderation Settings')}>
                Save Moderation Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access">
          <Card>
            <CardHeader>
              <CardTitle>Access Control</CardTitle>
              <CardDescription>
                Manage admin access and API configurations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      New users require admin approval
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireApproval}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requireApproval: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Temporarily disable public access
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, maintenanceMode: checked }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="apiRateLimit">API Rate Limit (requests/minute)</Label>
                <Input
                  id="apiRateLimit"
                  type="number"
                  value={settings.apiRateLimit}
                  onChange={(e) => setSettings(prev => ({ ...prev, apiRateLimit: parseInt(e.target.value) }))}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Admin Email Addresses</Label>
                <div className="flex gap-2">
                  <Input
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="admin@example.com"
                    type="email"
                    onKeyPress={(e) => e.key === 'Enter' && addAdminEmail()}
                  />
                  <Button onClick={addAdminEmail} variant="outline">
                    Add Admin
                  </Button>
                </div>
                <div className="space-y-2">
                  {settings.adminEmails.map((email) => (
                    <div key={email} className="flex items-center justify-between p-2 border rounded">
                      <span>{email}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAdminEmail(email)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={() => handleSave('Access Settings')}>
                Save Access Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
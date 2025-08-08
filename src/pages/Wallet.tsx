import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DemoBadge {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  issued_at: string;
  issuer: string;
  description: string;
}

const demoBadges: DemoBadge[] = [
  {
    id: '1',
    name: 'React Fundamentals',
    slug: 'react-fundamentals',
    emoji: '⚛️',
    issued_at: '2024-01-15',
    issuer: 'Maya Learning Platform',
    description: 'Mastered core React concepts including components, state, and props'
  },
  {
    id: '2',
    name: 'Full Stack Developer',
    slug: 'full-stack-developer',
    emoji: '🏗️',
    issued_at: '2024-02-20',
    issuer: 'Maya Learning Platform',
    description: 'Demonstrated proficiency in both frontend and backend development'
  },
  {
    id: '3',
    name: 'Problem Solver',
    slug: 'problem-solver',
    emoji: '🧩',
    issued_at: '2024-03-10',
    issuer: 'Maya Learning Platform',
    description: 'Consistently solved complex programming challenges'
  },
];

const Wallet: React.FC = () => {
  const [exporting, setExporting] = useState<string | null>(null);
  const { toast } = useToast();

  const handleExportOpenBadge = async (badge: DemoBadge) => {
    setExporting(badge.id);
    try {
      const { data, error } = await supabase.functions.invoke('openbadge-export', {
        body: { badge: { slug: badge.slug, name: badge.name } }
      });

      if (error) throw error;

      // Create and download the JSON file
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data.badge_json, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${badge.slug}-openbadge.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();

      toast({
        title: "Badge Exported!",
        description: `${badge.name} OpenBadge JSON downloaded`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Could not export OpenBadge JSON",
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  const handleViewCert = async (badge: DemoBadge) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-certificate', {
        body: { 
          code: 'demo-123'
        }
      });

      if (error) throw error;

      console.log('Certificate verification result:', data);
      toast({
        title: "Certificate Viewed",
        description: `Certificate for ${badge.name} viewed in console`,
      });
    } catch (error) {
      console.error('Certificate view error:', error);
      toast({
        title: "View Failed",
        description: "Could not view certificate",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Credential Wallet | Digital Badges & Certificates</title>
        <meta name="description" content="Manage and export your digital badges and certificates" />
        <link rel="canonical" href="/wallet" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Credential Wallet</h1>
          <p className="text-muted-foreground">
            Your digital badges and certificates in one secure place
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {demoBadges.map((badge) => (
            <Card key={badge.id} className="relative">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{badge.emoji}</div>
                  <div>
                    <CardTitle className="text-lg">{badge.name}</CardTitle>
                    <CardDescription>{badge.issuer}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {badge.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    Issued: {new Date(badge.issued_at).toLocaleDateString()}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportOpenBadge(badge)}
                    disabled={exporting === badge.id}
                    data-testid="export-openbadge"
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exporting === badge.id ? 'Exporting...' : 'Export OpenBadge'}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleViewCert(badge)}
                    className="px-3"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
              
              <div className="absolute top-2 right-2">
                <Badge className="bg-green-100 text-green-800">
                  Verified
                </Badge>
              </div>
            </Card>
          ))}
        </div>

        {demoBadges.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold mb-2">No credentials yet</h3>
              <p className="text-muted-foreground">
                Complete learning paths to earn digital badges and certificates
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Wallet;
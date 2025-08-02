import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, MessageSquare, Share2, Globe, Zap, Crown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Phase6CollaborationHubProps {
  userId: string;
}

export function Phase6CollaborationHub({ userId }: Phase6CollaborationHubProps) {
  const { toast } = useToast();
  const [activeCollaborations, setActiveCollaborations] = useState([
    { id: 1, type: 'Mentorship', partner: 'Dr. Sarah Chen', status: 'active', progress: 87 },
    { id: 2, type: 'Peer Learning', partner: 'Tech Innovators Group', status: 'active', progress: 72 },
    { id: 3, type: 'Expert Review', partner: 'Industry Veterans', status: 'pending', progress: 45 },
  ]);

  const [collaborationFeatures] = useState([
    { name: 'Real-time Skill Sharing', users: 2847, status: 'active' },
    { name: 'AI-Matched Partnerships', users: 1923, status: 'active' },
    { name: 'Cross-Enterprise Learning', users: 567, status: 'beta' },
    { name: 'Global Knowledge Exchange', users: 4521, status: 'active' },
    { name: 'Intelligent Group Formation', users: 1205, status: 'active' },
  ]);

  const initiateCollaboration = () => {
    toast({
      title: "Collaboration Initiated",
      description: "AI is finding the best partners for your learning goals...",
    });
  };

  return (
    <div className="space-y-6">
      {/* Collaboration Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">23.4K</div>
            <div className="text-sm text-muted-foreground">Active Collaborators</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">847</div>
            <div className="text-sm text-muted-foreground">Active Sessions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Share2 className="w-8 h-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">156</div>
            <div className="text-sm text-muted-foreground">Knowledge Exchanges</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Globe className="w-8 h-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">67</div>
            <div className="text-sm text-muted-foreground">Countries Connected</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Collaborations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Your Active Collaborations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeCollaborations.map((collab) => (
            <div key={collab.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{collab.partner.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{collab.partner}</h4>
                  <p className="text-sm text-muted-foreground">{collab.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium">{collab.progress}% Complete</div>
                  <Badge variant={collab.status === 'active' ? 'default' : 'secondary'}>
                    {collab.status}
                  </Badge>
                </div>
                <Button size="sm" variant="outline">
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          
          <Button onClick={initiateCollaboration} className="w-full">
            <Zap className="w-4 h-4 mr-2" />
            Find New Collaborators
          </Button>
        </CardContent>
      </Card>

      {/* Collaboration Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Enterprise Collaboration Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {collaborationFeatures.map((feature) => (
              <div key={feature.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{feature.name}</h4>
                  <p className="text-sm text-muted-foreground">{feature.users.toLocaleString()} active users</p>
                </div>
                <Badge variant={feature.status === 'active' ? 'default' : feature.status === 'beta' ? 'secondary' : 'outline'}>
                  {feature.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Intelligent Matching */}
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Partner Matching</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-primary/5 rounded-lg">
            <h4 className="font-medium mb-2">Recommended Collaborations</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Machine Learning Mentor Match</span>
                <Badge>96% Compatibility</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Data Science Peer Group</span>
                <Badge>89% Compatibility</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Industry Expert Review Panel</span>
                <Badge>92% Compatibility</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
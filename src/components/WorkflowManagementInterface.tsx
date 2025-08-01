import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Plus, 
  Copy, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Settings,
  Calendar,
  BarChart3,
  Share,
  Download,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkflowTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedDuration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  steps: number;
  usage: number;
  rating: number;
  tags: string[];
  author: string;
  isPublic: boolean;
}

interface ActiveWorkflow {
  id: string;
  templateId: string;
  title: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  estimatedCompletion: Date;
  currentStep: string;
  performance: {
    efficiency: number;
    accuracy: number;
    userSatisfaction: number;
  };
}

export function WorkflowManagementInterface() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Mock workflow templates
  const [templates] = useState<WorkflowTemplate[]>([
    {
      id: '1',
      title: 'Data Scientist Career Path',
      description: 'Complete transition from any background to data science with structured learning path',
      category: 'career_transition',
      estimatedDuration: '6-8 months',
      difficulty: 'intermediate',
      steps: 12,
      usage: 2547,
      rating: 4.8,
      tags: ['python', 'machine-learning', 'statistics'],
      author: 'Maya AI',
      isPublic: true
    },
    {
      id: '2',
      title: 'Full Stack Developer Bootcamp',
      description: 'From zero to full stack developer with hands-on projects and portfolio building',
      category: 'skill_development',
      estimatedDuration: '4-6 months',
      difficulty: 'beginner',
      steps: 15,
      usage: 1823,
      rating: 4.6,
      tags: ['javascript', 'react', 'node.js'],
      author: 'Community',
      isPublic: true
    },
    {
      id: '3',
      title: 'Product Manager Transition',
      description: 'Transition to product management role with industry best practices',
      category: 'career_transition',
      estimatedDuration: '3-4 months',
      difficulty: 'intermediate',
      steps: 8,
      usage: 892,
      rating: 4.5,
      tags: ['product-management', 'strategy', 'analytics'],
      author: 'Expert Contributor',
      isPublic: false
    }
  ]);

  // Mock active workflows
  const [activeWorkflows] = useState<ActiveWorkflow[]>([
    {
      id: '1',
      templateId: '1',
      title: 'Data Scientist Career Path',
      status: 'running',
      progress: 65,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      estimatedCompletion: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      currentStep: 'Complete Python Advanced Course',
      performance: {
        efficiency: 85,
        accuracy: 92,
        userSatisfaction: 88
      }
    },
    {
      id: '2',
      templateId: '2',
      title: 'Full Stack Developer Bootcamp',
      status: 'paused',
      progress: 30,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      estimatedCompletion: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      currentStep: 'Build React Portfolio Project',
      performance: {
        efficiency: 70,
        accuracy: 78,
        userSatisfaction: 75
      }
    }
  ]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateWorkflow = (templateId: string) => {
    toast({
      title: "Workflow Created",
      description: "New workflow has been created and started.",
    });
  };

  const handleCloneTemplate = (templateId: string) => {
    toast({
      title: "Template Cloned",
      description: "Template has been cloned to your custom templates.",
    });
  };

  const filteredTemplates = templates.filter(template => 
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedCategory === 'all' || template.category === selectedCategory)
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="active">Active Workflows</TabsTrigger>
          <TabsTrigger value="custom">Custom Builder</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search workflow templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">All Categories</option>
                  <option value="career_transition">Career Transition</option>
                  <option value="skill_development">Skill Development</option>
                  <option value="certification">Certification</option>
                </select>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{template.title}</CardTitle>
                      <CardDescription className="text-sm">
                        By {template.author}
                      </CardDescription>
                    </div>
                    <Badge className={getDifficultyColor(template.difficulty)}>
                      {template.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-medium">{template.estimatedDuration}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Steps</p>
                      <p className="font-medium">{template.steps}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Usage</p>
                      <p className="font-medium">{template.usage.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Rating</p>
                      <p className="font-medium">⭐ {template.rating}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="flex-1"
                      onClick={() => handleCreateWorkflow(template.id)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleCloneTemplate(template.id)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline">
                      <Share className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Workflows</CardTitle>
              <CardDescription>
                Monitor and manage your currently running workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeWorkflows.map((workflow) => (
                  <div key={workflow.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{workflow.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Current: {workflow.currentStep}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(workflow.status)}>
                          {workflow.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          {workflow.status === 'running' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{workflow.progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${workflow.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Efficiency</p>
                        <p className="font-medium">{workflow.performance.efficiency}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Accuracy</p>
                        <p className="font-medium">{workflow.performance.accuracy}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Satisfaction</p>
                        <p className="font-medium">{workflow.performance.userSatisfaction}%</p>
                      </div>
                    </div>

                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Started: {workflow.createdAt.toLocaleDateString()}</span>
                      <span>Est. Completion: {workflow.estimatedCompletion.toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Workflow Builder</CardTitle>
              <CardDescription>
                Create your own workflows from scratch or modify existing templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Workflow Builder</h3>
                <p className="text-muted-foreground mb-4">
                  Visual workflow builder coming soon. Create custom learning paths with drag-and-drop interface.
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Request Early Access
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Workflow Analytics
              </CardTitle>
              <CardDescription>
                Performance insights and optimization recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">24</p>
                  <p className="text-sm text-muted-foreground">Total Workflows</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">18</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">87%</p>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">4.6</p>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                </div>
              </div>

              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
                <p className="text-muted-foreground">
                  Detailed analytics and insights coming soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
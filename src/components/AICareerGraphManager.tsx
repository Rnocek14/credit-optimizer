import React, { useState } from 'react';
import { useAICareerGraph, type AIGraphNode, type SemanticMatch } from '@/hooks/useAICareerGraph';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Brain, Search, GitMerge, Target, Zap } from 'lucide-react';
import { toast } from 'sonner';

export const AICareerGraphManager: React.FC = () => {
  const {
    nodes,
    loading,
    error,
    statistics,
    loadNodes,
    findSemanticMatches,
    validatePath,
    searchNodes,
    getOrphanedNodes,
    getNodesByType
  } = useAICareerGraph();

  const [selectedNode, setSelectedNode] = useState<AIGraphNode | null>(null);
  const [semanticMatches, setSemanticMatches] = useState<SemanticMatch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AIGraphNode[]>([]);
  const [reconnectionProgress, setReconnectionProgress] = useState<{
    inProgress: boolean;
    processed: number;
    total: number;
    logs: string[];
  }>({
    inProgress: false,
    processed: 0,
    total: 0,
    logs: []
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const results = searchNodes(searchQuery);
    setSearchResults(results);
  };

  const handleSemanticMatch = async (nodeId: string, targetType: string) => {
    try {
      setSemanticMatches([]);
      toast.info('Finding semantic matches...');
      
      const matches = await findSemanticMatches(nodeId, targetType);
      setSemanticMatches(matches);
      
      toast.success(`Found ${matches.length} semantic matches`);
    } catch (error) {
      toast.error('Failed to find semantic matches');
      console.error(error);
    }
  };

  const handleReconnectOrphans = async () => {
    try {
      setReconnectionProgress({ inProgress: true, processed: 0, total: 0, logs: [] });
      
      const orphans = await getOrphanedNodes();
      const maxOrphans = Math.min(orphans.length, 50); // Limit to 50
      
      setReconnectionProgress(prev => ({ 
        ...prev, 
        total: maxOrphans,
        logs: [`🔍 Found ${orphans.length} orphaned nodes, processing ${maxOrphans}...`]
      }));

      let reconnectedSkills = 0;
      let reconnectedCourses = 0;
      let totalEdgesCreated = 0;

      for (let i = 0; i < maxOrphans; i++) {
        const orphan = orphans[i];
        
        setReconnectionProgress(prev => ({
          ...prev,
          processed: i + 1,
          logs: [...prev.logs, `Processing ${orphan.node_type}: ${orphan.title}`]
        }));

        if (orphan.node_type === 'skill') {
          const courseMatches = await findSemanticMatches(orphan.id, 'course', 3);
          const skillMatches = await findSemanticMatches(orphan.id, 'skill', 2);
          
          const edgesCreated = courseMatches.length + skillMatches.length;
          totalEdgesCreated += edgesCreated;
          reconnectedSkills++;
          
          setReconnectionProgress(prev => ({
            ...prev,
            logs: [...prev.logs, `  ✅ Created ${edgesCreated} edges for skill`]
          }));
        } else if (orphan.node_type === 'course') {
          const skillMatches = await findSemanticMatches(orphan.id, 'skill', 3);
          const stepMatches = await findSemanticMatches(orphan.id, 'step', 2);
          
          const edgesCreated = skillMatches.length + stepMatches.length;
          totalEdgesCreated += edgesCreated;
          reconnectedCourses++;
          
          setReconnectionProgress(prev => ({
            ...prev,
            logs: [...prev.logs, `  ✅ Created ${edgesCreated} edges for course`]
          }));
        }

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setReconnectionProgress(prev => ({
        ...prev,
        logs: [
          ...prev.logs,
          '',
          '📊 RECONNECTION SUMMARY:',
          `Skills reconnected: ${reconnectedSkills}`,
          `Courses reconnected: ${reconnectedCourses}`,
          `Total new edges added: ${totalEdgesCreated}`
        ]
      }));

      toast.success(`Reconnection complete! Created ${totalEdgesCreated} new edges`);
      
      // Refresh the nodes to reflect changes
      await loadNodes();

    } catch (error) {
      toast.error('Reconnection failed');
      console.error(error);
    } finally {
      setReconnectionProgress(prev => ({ ...prev, inProgress: false }));
    }
  };

  const renderNodeCard = (node: AIGraphNode) => (
    <Card key={node.id} className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setSelectedNode(node)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{node.title}</CardTitle>
          <Badge variant="secondary">{node.node_type}</Badge>
        </div>
        {node.category && (
          <CardDescription>{node.category}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {node.semantic_tags && node.semantic_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {node.semantic_tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
            {node.semantic_tags.length > 3 && (
              <Badge variant="outline" className="text-xs">+{node.semantic_tags.length - 3}</Badge>
            )}
          </div>
        )}
        {node.ai_confidence_score && (
          <div className="mt-2 text-xs text-muted-foreground">
            AI Confidence: {Math.round(node.ai_confidence_score)}%
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Error: {error}</p>
          <Button onClick={() => loadNodes()} className="mt-2">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{statistics.totalNodes}</p>
                <p className="text-sm text-muted-foreground">Total Nodes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{statistics.semanticallyEnhanced}</p>
                <p className="text-sm text-muted-foreground">AI Enhanced</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <GitMerge className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {Object.values(statistics.nodesByType).reduce((a, b) => a + b, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Button 
              onClick={handleReconnectOrphans}
              disabled={loading || reconnectionProgress.inProgress}
              className="w-full"
            >
              {reconnectionProgress.inProgress ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Target className="h-4 w-4 mr-2" />
              )}
              Reconnect Orphans
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="search">Search & Explore</TabsTrigger>
          <TabsTrigger value="semantic">Semantic Matching</TabsTrigger>
          <TabsTrigger value="reconnection">Reconnection Logs</TabsTrigger>
          <TabsTrigger value="statistics">Node Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Search nodes by title, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.length > 0 ? (
              searchResults.map(renderNodeCard)
            ) : searchQuery ? (
              <p className="text-muted-foreground col-span-full text-center py-8">
                No nodes found matching "{searchQuery}"
              </p>
            ) : (
              nodes.slice(0, 12).map(renderNodeCard)
            )}
          </div>
        </TabsContent>

        <TabsContent value="semantic" className="space-y-4">
          {selectedNode ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Selected Node: {selectedNode.title}</CardTitle>
                  <CardDescription>
                    Type: {selectedNode.node_type} | Category: {selectedNode.category || 'Unknown'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <Select onValueChange={(value) => handleSemanticMatch(selectedNode.id, value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Find matches with..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skill">Skills</SelectItem>
                        <SelectItem value="course">Courses</SelectItem>
                        <SelectItem value="job">Jobs</SelectItem>
                        <SelectItem value="step">Steps</SelectItem>
                        <SelectItem value="project">Projects</SelectItem>
                        <SelectItem value="certification">Certifications</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {semanticMatches.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Semantic Matches</h3>
                  {semanticMatches.map((match, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">Similarity: {match.similarityScore}%</p>
                            <p className="text-sm text-muted-foreground">
                              Relationship: {match.relationshipType}
                            </p>
                            <p className="text-sm">{match.reasoning}</p>
                          </div>
                          <Badge variant={match.confidence > 80 ? 'default' : 'secondary'}>
                            {match.confidence}% confidence
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Select a node from the search tab to analyze semantic matches
            </p>
          )}
        </TabsContent>

        <TabsContent value="reconnection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orphaned Node Reconnection</CardTitle>
              <CardDescription>
                AI-powered reconnection progress and logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reconnectionProgress.inProgress && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{reconnectionProgress.processed}/{reconnectionProgress.total}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(reconnectionProgress.processed / reconnectionProgress.total) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}
              
              <div className="max-h-96 overflow-y-auto space-y-1">
                {reconnectionProgress.logs.map((log, index) => (
                  <p key={index} className="text-sm font-mono text-muted-foreground">
                    {log}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(statistics.nodesByType).map(([type, count]) => (
              <Card key={type}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-muted-foreground capitalize">{type}s</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
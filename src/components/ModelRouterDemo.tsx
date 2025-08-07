import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useModelRouter } from '@/hooks/useModelRouter';
import { Loader2, Send, Image, MessageSquare, FileText, RefreshCw } from 'lucide-react';

export const ModelRouterDemo = () => {
  const [prompt, setPrompt] = useState('');
  const [task, setTask] = useState<'chat' | 'json' | 'image'>('chat');
  const [complexity, setComplexity] = useState<'low' | 'medium' | 'high'>('medium');
  const [modelOverride, setModelOverride] = useState('');
  const [response, setResponse] = useState<any>(null);

  const { 
    loading, 
    error, 
    lastResponse, 
    usageStats, 
    callRouter, 
    chatCompletion, 
    jsonCompletion, 
    imageGeneration, 
    fetchUsageStats,
    retryLastRequest 
  } = useModelRouter();

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setResponse(null);

    let result;
    switch (task) {
      case 'chat':
        result = await chatCompletion([
          { role: 'user', content: prompt }
        ], {
          complexity,
          model_override: modelOverride || undefined
        });
        break;
      case 'json':
        result = await jsonCompletion(prompt, undefined, {
          complexity,
          model_override: modelOverride || undefined
        });
        break;
      case 'image':
        result = await imageGeneration(prompt, {}, {
          complexity,
          model_override: modelOverride || undefined
        });
        break;
    }

    setResponse(result);
  };

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'chat': return <MessageSquare className="w-4 h-4" />;
      case 'json': return <FileText className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🤖 AI Model Router Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Task Type</label>
              <Select value={task} onValueChange={(value: any) => setTask(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chat">💬 Chat Completion</SelectItem>
                  <SelectItem value="json">📄 JSON Response</SelectItem>
                  <SelectItem value="image">🖼️ Image Generation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Complexity</label>
              <Select value={complexity} onValueChange={(value: any) => setComplexity(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low (Fast)</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="high">🔴 High (Best Quality)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Model Override (Optional)</label>
              <Input 
                placeholder="e.g., gpt-4o"
                value={modelOverride}
                onChange={(e) => setModelOverride(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              {task === 'image' ? 'Image Description' : 'Prompt'}
            </label>
            <Textarea 
              placeholder={
                task === 'chat' ? 'Ask a question or start a conversation...' :
                task === 'json' ? 'Request structured data (will be returned as JSON)...' :
                'Describe the image you want to generate...'
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !prompt.trim()}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <>
                  {getTaskIcon(task)}
                  <span className="ml-2">Send {task.charAt(0).toUpperCase() + task.slice(1)} Request</span>
                </>
              )}
            </Button>
            
            {lastResponse && (
              <Button 
                variant="outline" 
                onClick={retryLastRequest}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={fetchUsageStats}
              disabled={loading}
            >
              📊 Stats
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm font-medium">Error:</p>
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {usageStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usage Statistics (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{usageStats.totalRequests}</p>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{usageStats.successRate}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{usageStats.averageLatency}ms</p>
                <p className="text-sm text-muted-foreground">Avg Latency</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{usageStats.totalTokens.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Tokens</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {response && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {getTaskIcon(response.route)}
                Response
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">{response.model}</Badge>
                <Badge variant="secondary">{response.route}</Badge>
                {response.request_id && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {response.request_id.slice(-8)}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {response.route === 'image' && response.images?.[0] && (
              <div className="flex justify-center">
                <img 
                  src={`data:image/png;base64,${response.images[0].b64_json}`}
                  alt="Generated image"
                  className="max-w-md rounded-lg shadow-lg"
                />
              </div>
            )}
            
            {(response.route === 'chat' || response.route === 'json') && response.message && (
              <div className="space-y-2">
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm">
                    {typeof response.message.content === 'string' 
                      ? response.message.content 
                      : JSON.stringify(response.message.content, null, 2)}
                  </pre>
                </div>
                
                {response.usage && (
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>In: {response.usage.prompt_tokens || 0} tokens</span>
                    <span>Out: {response.usage.completion_tokens || 0} tokens</span>
                    <span>Total: {response.usage.total_tokens || 0} tokens</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
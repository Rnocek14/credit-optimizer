import React from 'react';
import { HubNavigation } from "@/components/HubNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TreePine, AlertTriangle, RefreshCw, CheckCircle } from "lucide-react";
import { CalmModeTestCanvas } from "@/components/calm/CalmModeTestCanvas";
import { CalmModeErrorBoundary } from "@/components/calm/CalmModeErrorBoundary";
import { Link } from "react-router-dom";

export default function CalmTest() {
  const [testMode, setTestMode] = React.useState<'isolated' | 'with-data' | 'force-error'>('isolated');
  
  React.useEffect(() => {
    console.log('🧪 CalmTest: Page loaded with test mode:', testMode);
  }, [testMode]);

  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Calm Mode Test Lab</h1>
            <p className="text-muted-foreground">
              Isolated testing environment for calm mode debugging
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            <TreePine className="h-4 w-4 mr-2" />
            Test Environment
          </Badge>
        </div>

        {/* Test Mode Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button 
                variant={testMode === 'isolated' ? 'default' : 'outline'}
                onClick={() => setTestMode('isolated')}
              >
                Isolated Test
              </Button>
              <Button 
                variant={testMode === 'with-data' ? 'default' : 'outline'}
                onClick={() => setTestMode('with-data')}
              >
                With Real Data
              </Button>
              <Button 
                variant={testMode === 'force-error' ? 'default' : 'outline'}
                onClick={() => setTestMode('force-error')}
              >
                Force Error
              </Button>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p><strong>Isolated Test:</strong> Uses mock data to test rendering without dependencies</p>
              <p><strong>With Real Data:</strong> Fetches actual data from Supabase</p>
              <p><strong>Force Error:</strong> Intentionally triggers errors to test error boundaries</p>
            </div>
          </CardContent>
        </Card>

        {/* Test Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Test Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Page loaded successfully</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Error boundaries active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Test mode: {testMode}</span>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/progress?st_calm=1">
                  Test Real Calm Mode
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/progress">
                  Back to Normal Mode
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Test Canvas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TreePine className="h-5 w-5" />
              Calm Mode Canvas Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CalmModeErrorBoundary
              onError={(error) => {
                console.error('🚨 Calm Mode Test Error:', error);
              }}
              fallbackMessage="Calm mode test failed - this is expected for error testing"
            >
              <div className="bg-muted/20 rounded-lg p-4 min-h-[500px]">
                <CalmModeTestCanvas 
                  testMode={testMode}
                  onStatusChange={(status) => {
                    console.log('🧪 Test status changed:', status);
                  }}
                />
              </div>
            </CalmModeErrorBoundary>
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono bg-muted/50 p-4 rounded">
              <div>Current URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</div>
              <div>Test Mode: {testMode}</div>
              <div>Timestamp: {new Date().toISOString()}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Check the browser console for detailed debug logs
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
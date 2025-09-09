import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface DisabledFeatureProps {
  title: string;
  message: string;
  hint?: string;
  onEnableForSession?: () => void;
}

export function DisabledFeature({ 
  title, 
  message, 
  hint,
  onEnableForSession 
}: DisabledFeatureProps) {
  return (
    <>
      {/* SEO: Prevent indexing disabled feature pages */}
      <meta name="robots" content="noindex,nofollow" />
      
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {hint && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {hint}
              </div>
            )}
            
            {onEnableForSession && (
              <Button 
                onClick={onEnableForSession}
                variant="outline" 
                className="w-full"
              >
                Enable for this session
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
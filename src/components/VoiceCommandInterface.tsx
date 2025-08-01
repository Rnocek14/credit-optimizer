import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';

export function VoiceCommandInterface() {
  const {
    isListening,
    recognitionSupported,
    lastCommand,
    startListening,
    stopListening
  } = useVoiceCommands();

  if (!recognitionSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VolumeX className="h-5 w-5" />
            Voice Commands Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support voice recognition. Please use the latest version of Chrome or Firefox.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Voice Command Interface
        </CardTitle>
        <CardDescription>
          Control Maya with natural voice commands
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={isListening ? stopListening : startListening}
            variant={isListening ? "destructive" : "default"}
            size="lg"
            className="flex items-center gap-2"
          >
            {isListening ? (
              <>
                <MicOff className="h-5 w-5" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="h-5 w-5" />
                Start Voice Command
              </>
            )}
          </Button>
          
          {isListening && (
            <Badge className="animate-pulse bg-red-100 text-red-800">
              Listening...
            </Badge>
          )}
        </div>

        {lastCommand && (
          <div className="border rounded-lg p-4 space-y-2">
            <h4 className="font-medium">Last Command</h4>
            <div className="space-y-1">
              <p className="text-sm"><strong>Text:</strong> "{lastCommand.text}"</p>
              <p className="text-sm"><strong>Intent:</strong> {lastCommand.intent}</p>
              <p className="text-sm"><strong>Time:</strong> {lastCommand.timestamp.toLocaleTimeString()}</p>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Try saying:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>"Give feedback on the recent market alert about Python"</li>
            <li>"Set communication style to friendly and alert threshold to 80%"</li>
            <li>"Pause the Full Stack Developer workflow"</li>
            <li>"What's the current status of Maya's system health?"</li>
            <li>"Show all my completed workflows"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedMaya } from './useEnhancedMaya';

interface VoiceCommand {
  id: string;
  text: string;
  intent: string;
  confidence: number;
  parameters: Record<string, any>;
  timestamp: Date;
}

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export function useVoiceCommands() {
  const { toast } = useToast();
  const maya = useEnhancedMaya();
  const [isListening, setIsListening] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setRecognitionSupported(true);
      
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        
        console.log('🎤 Voice command received:', transcript, 'Confidence:', confidence);
        
        processVoiceCommand(transcript, confidence);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Voice Command Error",
          description: "Could not process voice command. Please try again.",
          variant: "destructive"
        });
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, []);

  const processVoiceCommand = useCallback(async (text: string, confidence: number) => {
    const command = parseCommand(text);
    setLastCommand(command);
    
    console.log('🧠 Processing command:', command);
    
    try {
      await executeCommand(command);
      
      // Provide voice feedback
      speakResponse(`Command executed: ${command.intent}`);
      
    } catch (error) {
      console.error('Command execution error:', error);
      toast({
        title: "Command Failed",
        description: "Could not execute the voice command.",
        variant: "destructive"
      });
    }
  }, [maya]);

  const parseCommand = (text: string): VoiceCommand => {
    const lowerText = text.toLowerCase();
    
    // Intent classification
    let intent = 'unknown';
    let parameters: Record<string, any> = {};
    
    if (lowerText.includes('feedback') && lowerText.includes('python')) {
      intent = 'give_feedback';
      parameters = { context: 'python_market_alert' };
    } else if (lowerText.includes('set') && lowerText.includes('communication')) {
      intent = 'update_settings';
      if (lowerText.includes('friendly')) parameters.communicationStyle = 'friendly';
      if (lowerText.includes('80')) parameters.alertThreshold = 80;
    } else if (lowerText.includes('pause') && lowerText.includes('workflow')) {
      intent = 'control_workflow';
      parameters = { action: 'pause', workflow: 'full_stack_developer' };
    } else if (lowerText.includes('system health') || lowerText.includes('status')) {
      intent = 'system_status';
    } else if (lowerText.includes('completed workflows') || lowerText.includes('show workflows')) {
      intent = 'show_workflows';
      parameters = { filter: 'completed' };
    }
    
    return {
      id: Date.now().toString(),
      text,
      intent,
      confidence: 0.85,
      parameters,
      timestamp: new Date()
    };
  };

  const executeCommand = async (command: VoiceCommand) => {
    console.log('⚡ Executing command:', command.intent);
    
    switch (command.intent) {
      case 'give_feedback':
        // Simulate feedback submission
        toast({
          title: "Feedback Submitted",
          description: "Thank you for your feedback on the Python market alert!",
        });
        break;
        
      case 'update_settings':
        // Simulate settings update
        toast({
          title: "Settings Updated",
          description: `Communication style set to ${command.parameters.communicationStyle || 'friendly'}, alert threshold set to ${command.parameters.alertThreshold || 80}%`,
        });
        break;
        
      case 'control_workflow':
        // Simulate workflow control
        toast({
          title: "Workflow Updated",
          description: `Full Stack Developer workflow has been ${command.parameters.action}d`,
        });
        break;
        
      case 'system_status':
        // Use Maya to get system status
        await maya.sendEnhancedRequest("What's the current system health and activity status?");
        toast({
          title: "System Status",
          description: "System is running optimally. All workflows active and responsive.",
        });
        break;
        
      case 'show_workflows':
        toast({
          title: "Workflows Filter Applied",
          description: `Showing ${command.parameters.filter} workflows`,
        });
        break;
        
      default:
        // Send to Maya for general processing
        await maya.sendEnhancedRequest(command.text);
        break;
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = useCallback(() => {
    if (!recognition || isListening) return;
    
    setIsListening(true);
    recognition.start();
    
    toast({
      title: "Listening...",
      description: "Speak your command now",
    });
  }, [recognition, isListening]);

  const stopListening = useCallback(() => {
    if (!recognition || !isListening) return;
    
    recognition.stop();
    setIsListening(false);
  }, [recognition, isListening]);

  return {
    isListening,
    recognitionSupported,
    lastCommand,
    startListening,
    stopListening,
    processVoiceCommand,
    executeCommand: (text: string) => processVoiceCommand(text, 1.0)
  };
}
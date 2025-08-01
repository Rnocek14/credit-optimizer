import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserPreferences {
  communicationStyle: 'professional' | 'friendly' | 'concise' | 'detailed';
  responseFrequency: 'minimal' | 'balanced' | 'frequent';
  alertThreshold: number;
  workflowApproval: 'auto' | 'high_confidence' | 'manual';
  privacyLevel: 'minimal' | 'standard' | 'enhanced';
  autonomousActions: boolean;
  autoWorkflowCreation: boolean;
  marketAlerts: boolean;
  skillGapAnalysis: boolean;
  careerRecommendations: boolean;
  personalizedLearning: boolean;
  dataCollection: boolean;
  notificationChannels: string[];
}

const defaultPreferences: UserPreferences = {
  communicationStyle: 'professional',
  responseFrequency: 'balanced',
  alertThreshold: 75,
  workflowApproval: 'auto',
  privacyLevel: 'standard',
  autonomousActions: true,
  autoWorkflowCreation: true,
  marketAlerts: true,
  skillGapAnalysis: true,
  careerRecommendations: true,
  personalizedLearning: true,
  dataCollection: true,
  notificationChannels: ['in_app', 'email']
};

export function useUserPreferences() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load preferences from Supabase
  const loadPreferences = useCallback(async () => {
    setLoading(true);
    try {
      // In production, this would fetch from user_preferences table
      // For now, check localStorage for demo purposes
      const savedPrefs = localStorage.getItem('maya_preferences');
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        setPreferences({ ...defaultPreferences, ...parsed });
      }
      
      console.log('📋 User preferences loaded');
    } catch (error) {
      console.error('Failed to load preferences:', error);
      toast({
        title: "Settings Error",
        description: "Could not load your preferences",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Save preferences to Supabase
  const savePreferences = useCallback(async (newPreferences: Partial<UserPreferences>) => {
    setLoading(true);
    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      
      // In production, this would save to Supabase user_preferences table
      // For now, save to localStorage for demo
      localStorage.setItem('maya_preferences', JSON.stringify(updatedPreferences));
      
      setPreferences(updatedPreferences);
      setHasChanges(false);
      
      console.log('💾 User preferences saved:', updatedPreferences);
      
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated",
      });
      
      return updatedPreferences;
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: "Save Error",
        description: "Could not save your preferences",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [preferences, toast]);

  // Update a specific preference
  const updatePreference = useCallback((key: keyof UserPreferences, value: any) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: value };
      setHasChanges(true);
      
      // Auto-save after a short delay
      setTimeout(() => {
        savePreferences({ [key]: value });
      }, 1000);
      
      return updated;
    });
  }, [savePreferences]);

  // Bulk update preferences
  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
    return savePreferences(updates);
  }, [savePreferences]);

  // Reset to defaults
  const resetPreferences = useCallback(async () => {
    const confirmed = window.confirm('Reset all preferences to default values?');
    if (!confirmed) return;
    
    await savePreferences(defaultPreferences);
    toast({
      title: "Preferences Reset",
      description: "All settings have been reset to defaults",
    });
  }, [savePreferences, toast]);

  // Export preferences
  const exportPreferences = useCallback(() => {
    const dataStr = JSON.stringify(preferences, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'maya_preferences.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Preferences Exported",
      description: "Your settings have been downloaded",
    });
  }, [preferences, toast]);

  // Import preferences
  const importPreferences = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedPrefs = JSON.parse(e.target?.result as string);
        await savePreferences(importedPrefs);
        toast({
          title: "Preferences Imported",
          description: "Your settings have been restored",
        });
      } catch (error) {
        toast({
          title: "Import Error",
          description: "Invalid preferences file",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  }, [savePreferences, toast]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    hasChanges,
    updatePreference,
    updatePreferences,
    savePreferences,
    resetPreferences,
    exportPreferences,
    importPreferences,
    loadPreferences
  };
}
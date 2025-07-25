import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Simple test component to verify career path switching works
export const CareerPathSwitchTest = () => {
  const testCareerSwitching = () => {
    console.log('🧪 Testing career path switching functionality');
    
    // Simulate the new action object format
    const testAction = {
      type: 'Analyze This Market',
      careerPath: 'Nurse Practitioner',
      location: 'California'
    };
    
    console.log('🎯 Test action object:', testAction);
    console.log('✅ Career path switching test setup complete');
  };

  return (
    <Card className="border-2 border-dashed border-primary/20">
      <CardHeader>
        <CardTitle>Career Path Switch Test</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={testCareerSwitching} variant="outline">
          Test Career Path Switching
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          Click to test the new career path switching functionality in console.
        </p>
      </CardContent>
    </Card>
  );
};
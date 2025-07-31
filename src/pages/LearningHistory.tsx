import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LearningHistory() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Learning History</h1>
        <p className="text-muted-foreground">
          Track your learning progress, achievements, and milestones
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Learning Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Learning history dashboard is loading...</p>
        </CardContent>
      </Card>
    </div>
  );
}
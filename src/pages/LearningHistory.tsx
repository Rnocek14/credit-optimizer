import React from 'react';
import { LearningHistoryDashboard } from '@/components/LearningHistoryDashboard';
import { HubNavigation } from '@/components/HubNavigation';

export default function LearningHistory() {
  return (
    <>
      <HubNavigation />
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Learning History</h1>
        <p className="text-muted-foreground">
          Track your learning progress, achievements, and milestones
        </p>
      </div>
      
        <LearningHistoryDashboard />
      </div>
    </>
  );
}
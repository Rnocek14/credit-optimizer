import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

export function SocialLearningTest() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedingResults, setSeedingResults] = useState('');

  const seedData = async () => {
    setIsSeeding(true);
    try {
      console.log('Calling social-learning-seeder...');
      const { data, error } = await supabase.functions.invoke('social-learning-seeder', {
        body: {}
      });
      
      if (error) {
        console.error('Seeder error:', error);
        toast({
          title: "Error",
          description: `Failed to seed data: ${error.message}`,
          variant: "destructive"
        });
        setSeedingResults(`Error: ${error.message}`);
      } else {
        console.log('Seeder response:', data);
        toast({
          title: "Success",
          description: "Social learning data seeded successfully!",
        });
        setSeedingResults(`Success: ${JSON.stringify(data, null, 2)}`);
        
        // Check data after seeding
        await checkSeedingResults();
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      toast({
        title: "Error",
        description: "Unexpected error occurred",
        variant: "destructive"
      });
      setSeedingResults(`Unexpected error: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const checkSeedingResults = async () => {
    try {
      const { data: groups } = await supabase.from('study_groups').select('name').limit(5);
      const { data: challenges } = await supabase.from('learning_challenges').select('title').limit(5);
      const { data: feedback } = await supabase.from('peer_feedback').select('feedback_text').limit(5);

      const results = `
Study Groups: ${groups?.length || 0}
Learning Challenges: ${challenges?.length || 0}
Peer Feedback: ${feedback?.length || 0}
      `;
      
      setSeedingResults(prev => prev + '\n\nData Counts:' + results);
    } catch (error) {
      console.error('Error checking results:', error);
    }
  };

  const testSocialData = async () => {
    try {
      // Test getting study groups
      const { data: groups, error: groupsError } = await supabase
        .from('study_groups')
        .select('id, name')
        .limit(3);

      if (groupsError) {
        throw groupsError;
      }

      // Test getting challenges
      const { data: challenges, error: challengesError } = await supabase
        .from('learning_challenges')
        .select('id, title, status')
        .limit(3);

      if (challengesError) {
        throw challengesError;
      }

      const testResults = `
Available Study Groups:
${groups?.map((g: any) => `- ${g.name}`).join('\n') || 'None found'}

Available Challenges:
${challenges?.map((c: any) => `- ${c.title} (${c.status || 'unknown'})`).join('\n') || 'None found'}
      `;

      setSeedingResults(prev => prev + '\n\nTest Data:' + testResults);

      toast({
        title: "Success",
        description: "Social data test completed!",
      });

    } catch (error: any) {
      console.error('Test error:', error);
      toast({
        title: "Error",
        description: `Test failed: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Phase 3.5 Social Learning Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Button 
              onClick={seedData} 
              disabled={isSeeding}
              size="lg"
            >
              {isSeeding ? 'Seeding...' : 'Execute Social Learning Seeder'}
            </Button>
            
            <Button 
              onClick={testSocialData} 
              variant="outline"
              size="lg"
            >
              Test Social Data
            </Button>
          </div>

          {seedingResults && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Results</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap">
                  {seedingResults}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
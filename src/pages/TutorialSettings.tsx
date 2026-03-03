import { Helmet } from 'react-helmet-async';
import { TutorialDashboard } from '@/components/tutorial/TutorialDashboard';

export default function TutorialSettings() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Helmet>
        <title>Tutorial Settings | Pivot</title>
        <meta name="description" content="Configure tutorial mode and explore available help features." />
      </Helmet>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tutorial Settings</h1>
        <p className="text-muted-foreground">
          Configure interactive help tips and explore available tutorial features
        </p>
      </div>

      <TutorialDashboard />
    </div>
  );
}
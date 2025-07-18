import { RoadmapTester } from '@/components/RoadmapTester';

const Index = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Career Roadmap Generator</h1>
          <p className="text-xl text-muted-foreground">Test the AI-powered roadmap generation system</p>
        </div>
        <RoadmapTester />
      </div>
    </div>
  );
};

export default Index;

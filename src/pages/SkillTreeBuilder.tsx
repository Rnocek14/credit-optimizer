import { SimpleSkillTree } from '@/components/SimpleSkillTree';

const SkillTreeBuilder = () => {
  // Mock data for testing
  const mockSkills = [
    { id: '1', name: 'JavaScript', category: 'Programming', xp_value: 100, difficulty_level: 2, slug: 'javascript' },
    { id: '2', name: 'React', category: 'Frontend', xp_value: 150, difficulty_level: 3, slug: 'react' },
    { id: '3', name: 'Node.js', category: 'Backend', xp_value: 120, difficulty_level: 3, slug: 'nodejs' },
  ];

  const mockProgress = [
    { skill_id: '1', status: 'completed' as const, xp_earned: 100 },
    { skill_id: '2', status: 'in_progress' as const, xp_earned: 75 },
    { skill_id: '3', status: 'available' as const, xp_earned: 0 },
  ];

  const mockEdges = [
    { prerequisite_skill_id: '1', skill_id: '2' },
    { prerequisite_skill_id: '2', skill_id: '3' },
  ];

  const mockCareerSteps = [
    { id: 'step1', title: 'Frontend Basics', level: 1, completed: true },
    { id: 'step2', title: 'Advanced React', level: 2, completed: false },
    { id: 'step3', title: 'Full Stack Development', level: 3, completed: false },
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Skill Tree Builder</h1>
      <SimpleSkillTree
        skills={mockSkills}
        userProgress={mockProgress}
        skillEdges={mockEdges}
        careerSteps={mockCareerSteps}
        careerPathName="Full Stack Developer"
        onSkillClick={(skill) => console.log('Clicked skill:', skill)}
      />
    </div>
  );
};

export default SkillTreeBuilder;
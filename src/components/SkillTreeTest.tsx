import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TestSkill {
  id: string;
  name: string;
  category: string;
  difficulty_level: number;
}

interface TestSkillEdge {
  prerequisite_skill_id: string;
  skill_id: string;
}

// Hardcoded test dataset
const filteredSkills: TestSkill[] = [
  { id: 'html', name: 'HTML', category: 'Markup', difficulty_level: 1 },
  { id: 'css', name: 'CSS', category: 'Styling', difficulty_level: 2 },
  { id: 'js', name: 'JavaScript', category: 'Programming', difficulty_level: 3 },
  { id: 'react', name: 'React', category: 'Framework', difficulty_level: 4 },
  { id: 'node', name: 'Node.js', category: 'Backend', difficulty_level: 4 },
];

const skillEdges: TestSkillEdge[] = [
  { prerequisite_skill_id: 'html', skill_id: 'css' },
  { prerequisite_skill_id: 'css', skill_id: 'js' },
  { prerequisite_skill_id: 'js', skill_id: 'react' },
  { prerequisite_skill_id: 'js', skill_id: 'node' },
];

export default function SkillTreeTest() {
  // Enhanced getSkillLevels logic from SkillTreeCanvas
  const getSkillLevels = useMemo(() => {
    const levels = new Map<string, number>();
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const filteredSkillIds = new Set(filteredSkills.map(s => s.id));
    const validEdges = skillEdges.filter(
      edge =>
        filteredSkillIds.has(edge.skill_id) &&
        filteredSkillIds.has(edge.prerequisite_skill_id)
    );

    const getPrereqs = (skillId: string) =>
      validEdges.filter(e => e.skill_id === skillId).map(e => e.prerequisite_skill_id);

    const calculateDepth = (skillId: string): number => {
      if (visited.has(skillId)) return levels.get(skillId)!;
      if (visiting.has(skillId)) {
        console.warn(`⚠️ Cycle detected for skill ${skillId}`);
        return 0;
      }

      visiting.add(skillId);
      const prereqs = getPrereqs(skillId);

      if (prereqs.length === 0) {
        levels.set(skillId, 0);
      } else {
        const maxPrereqDepth = Math.max(...prereqs.map(pid => calculateDepth(pid)));
        levels.set(skillId, maxPrereqDepth + 1);
      }

      visiting.delete(skillId);
      visited.add(skillId);
      return levels.get(skillId)!;
    };

    // First pass: Calculate levels for connected skills
    filteredSkills.forEach(skill => {
      if (!levels.has(skill.id)) {
        calculateDepth(skill.id);
      }
    });

    // Enhanced orphaned skill handling
    const connectedIds = new Set(validEdges.flatMap(e => [e.skill_id, e.prerequisite_skill_id]));
    const orphanedSkills = filteredSkills.filter(skill => !connectedIds.has(skill.id));
    
    if (orphanedSkills.length > 0) {
      console.log(`🔗 Found ${orphanedSkills.length} orphaned skills:`, orphanedSkills.map(s => s.name));
      
      const foundationCategories = ['Markup', 'Styling', 'Programming'];
      const advancedCategories = ['Framework', 'Backend', 'Cloud', 'DevOps'];
      
      orphanedSkills.forEach(skill => {
        let suggestedLevel = 0;
        
        // Place foundation skills at level 0-1
        if (foundationCategories.includes(skill.category)) {
          suggestedLevel = skill.difficulty_level <= 2 ? 0 : 1;
        }
        // Place advanced skills at level 2-3
        else if (advancedCategories.includes(skill.category)) {
          suggestedLevel = skill.difficulty_level <= 3 ? 2 : 3;
        }
        // Use difficulty level as a guide for other categories
        else {
          suggestedLevel = Math.max(0, skill.difficulty_level - 1);
        }
        
        levels.set(skill.id, suggestedLevel);
        console.log(`📍 Placed orphaned skill ${skill.name} (${skill.category}, difficulty ${skill.difficulty_level}) at level ${suggestedLevel}`);
      });
    }

    const levelStats = Array.from(levels.entries()).reduce((acc, [, level]) => {
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    console.log('📊 Final Level Distribution:', levelStats);
    console.log('🔗 Skill Graph Completeness:', {
      totalSkills: filteredSkills.length,
      totalEdges: validEdges.length,
      connectedSkills: connectedIds.size,
      orphanedSkills: orphanedSkills.length,
      orphanedSkillNames: orphanedSkills.map(s => s.name)
    });
    
    return levels;
  }, []);

  // Group skills by computed level
  const skillsByLevel = useMemo(() => {
    const groups = new Map<number, TestSkill[]>();
    
    filteredSkills.forEach(skill => {
      const level = getSkillLevels.get(skill.id) || 0;
      if (!groups.has(level)) {
        groups.set(level, []);
      }
      groups.get(level)!.push(skill);
    });
    
    return groups;
  }, [getSkillLevels]);

  const maxLevel = Math.max(...Array.from(getSkillLevels.values()));

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Skill Tree Level Test</h1>
        <div className="text-muted-foreground">
          Testing the getSkillLevels() algorithm with hardcoded dataset
        </div>
        
        {/* Debug Stats */}
        <Card className="p-4 bg-muted/20">
          <h3 className="font-semibold mb-2 text-foreground">Debug Information</h3>
          <div className="text-sm space-y-1 text-muted-foreground">
            <div>Total Skills: {filteredSkills.length}</div>
            <div>Total Edges: {skillEdges.length}</div>
            <div>Max Level: {maxLevel}</div>
            <div>Levels: {Array.from(skillsByLevel.keys()).sort().join(', ')}</div>
          </div>
        </Card>
      </div>

      {/* Skills Grid by Level */}
      <div className="space-y-8">
        {Array.from({ length: maxLevel + 1 }, (_, level) => (
          <div key={level} className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              Level {level}
              <Badge variant="secondary" className="text-xs">
                {skillsByLevel.get(level)?.length || 0} skills
              </Badge>
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {skillsByLevel.get(level)?.map(skill => (
                <Card key={skill.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-2">
                    <h3 className="font-medium text-foreground">{skill.name}</h3>
                    <div className="text-sm space-y-1">
                      <div className="text-muted-foreground">
                        Category: {skill.category}
                      </div>
                      <div className="text-muted-foreground">
                        Difficulty: {skill.difficulty_level}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        ID: {skill.id}
                      </Badge>
                    </div>
                  </div>
                </Card>
              )) || (
                <div className="text-muted-foreground italic col-span-full">
                  No skills at this level
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Raw Data Display */}
      <Card className="p-4 bg-muted/20">
        <h3 className="font-semibold mb-4 text-foreground">Raw Level Assignments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {filteredSkills.map(skill => (
            <div key={skill.id} className="flex justify-between items-center py-1">
              <span className="text-foreground">{skill.name}</span>
              <Badge variant="secondary">
                Level {getSkillLevels.get(skill.id)}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
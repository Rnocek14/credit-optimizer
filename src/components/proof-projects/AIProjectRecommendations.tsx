import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Clock, Star, Users, ArrowRight, Sparkles } from 'lucide-react';
import { ProjectTemplate } from '@/types/proofProjects';

interface AIProjectRecommendationsProps {
  trackId?: string | null;
  onUseTemplate?: (template: ProjectTemplate) => void;
}

// Mock project templates - in a real app, these would come from an API
const mockProjectTemplates: ProjectTemplate[] = [
  {
    id: '1',
    title: 'Customer Churn Prediction Model',
    description: 'Build a machine learning model to predict customer churn using historical data and feature engineering',
    difficulty_level: 3,
    estimated_hours: 25,
    skills_to_validate: ['Python', 'Pandas', 'Scikit-learn', 'Data Visualization'],
    project_type: 'personal',
    template_data: {
      milestones: [
        { title: 'Data Collection & Exploration', description: 'Gather and explore customer data', milestone_order: 1, status: 'pending' },
        { title: 'Feature Engineering', description: 'Create meaningful features for the model', milestone_order: 2, status: 'pending' },
        { title: 'Model Training', description: 'Train and evaluate different models', milestone_order: 3, status: 'pending' },
        { title: 'Deployment', description: 'Deploy model with a simple interface', milestone_order: 4, status: 'pending' },
      ],
      validation_criteria: [
        { skill: 'Python', requirement: 'Demonstrate data manipulation and model building', completed: false },
        { skill: 'Machine Learning', requirement: 'Implement and evaluate ML algorithms', completed: false },
      ],
      recommended_tools: ['Jupyter Notebook', 'Pandas', 'Scikit-learn', 'Matplotlib'],
      learning_resources: [
        { title: 'Pandas Documentation', url: 'https://pandas.pydata.org/', type: 'docs' },
        { title: 'Scikit-learn Tutorials', url: 'https://scikit-learn.org/', type: 'tutorial' },
      ],
    },
  },
  {
    id: '2',
    title: 'Interactive Sales Dashboard',
    description: 'Create a dynamic dashboard to visualize sales trends, KPIs, and business metrics',
    difficulty_level: 2,
    estimated_hours: 18,
    skills_to_validate: ['Python', 'Streamlit', 'Plotly', 'Data Analysis'],
    project_type: 'personal',
    template_data: {
      milestones: [
        { title: 'Data Preparation', description: 'Clean and structure sales data', milestone_order: 1, status: 'pending' },
        { title: 'Dashboard Design', description: 'Design layout and user interface', milestone_order: 2, status: 'pending' },
        { title: 'Interactive Features', description: 'Add filters and interactive elements', milestone_order: 3, status: 'pending' },
        { title: 'Deployment', description: 'Deploy dashboard online', milestone_order: 4, status: 'pending' },
      ],
      validation_criteria: [
        { skill: 'Data Visualization', requirement: 'Create clear and informative charts', completed: false },
        { skill: 'Streamlit', requirement: 'Build interactive web application', completed: false },
      ],
      recommended_tools: ['Streamlit', 'Plotly', 'Pandas', 'Python'],
      learning_resources: [
        { title: 'Streamlit Documentation', url: 'https://streamlit.io/', type: 'docs' },
        { title: 'Plotly Tutorials', url: 'https://plotly.com/', type: 'tutorial' },
      ],
    },
  },
  {
    id: '3',
    title: 'RESTful API with Authentication',
    description: 'Build a secure REST API with user authentication, CRUD operations, and proper documentation',
    difficulty_level: 4,
    estimated_hours: 35,
    skills_to_validate: ['Node.js', 'Express', 'JWT', 'Database Design', 'API Security'],
    project_type: 'personal',
    template_data: {
      milestones: [
        { title: 'API Structure Setup', description: 'Set up Express server and routing', milestone_order: 1, status: 'pending' },
        { title: 'Authentication System', description: 'Implement JWT-based authentication', milestone_order: 2, status: 'pending' },
        { title: 'CRUD Operations', description: 'Build complete CRUD functionality', milestone_order: 3, status: 'pending' },
        { title: 'Documentation & Testing', description: 'Create API docs and tests', milestone_order: 4, status: 'pending' },
      ],
      validation_criteria: [
        { skill: 'Node.js', requirement: 'Build scalable server-side application', completed: false },
        { skill: 'API Security', requirement: 'Implement proper authentication and authorization', completed: false },
      ],
      recommended_tools: ['Node.js', 'Express', 'MongoDB', 'Postman', 'Jest'],
      learning_resources: [
        { title: 'Express.js Guide', url: 'https://expressjs.com/', type: 'docs' },
        { title: 'JWT.io', url: 'https://jwt.io/', type: 'docs' },
      ],
    },
  },
];

export function AIProjectRecommendations({ trackId, onUseTemplate }: AIProjectRecommendationsProps) {
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const getDifficultyColor = (level: number) => {
    if (level <= 2) return 'text-green-600 bg-green-100';
    if (level <= 3) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getDifficultyLabel = (level: number) => {
    switch (level) {
      case 1: return 'Beginner';
      case 2: return 'Easy';
      case 3: return 'Intermediate';
      case 4: return 'Advanced';
      case 5: return 'Expert';
      default: return 'Unknown';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <CardTitle>AI Project Recommendations</CardTitle>
        </div>
        <CardDescription>
          Personalized project suggestions based on your track and skill level
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockProjectTemplates.map((template) => (
            <div key={template.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{template.title}</h4>
                  <p className="text-muted-foreground text-sm mt-1">
                    {template.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <Badge className={getDifficultyColor(template.difficulty_level)}>
                  <Star className="h-3 w-3 mr-1" />
                  {getDifficultyLabel(template.difficulty_level)}
                </Badge>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {template.estimated_hours}h
                </Badge>
                <Badge variant="outline">
                  {template.project_type}
                </Badge>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Skills you'll practice:</div>
                <div className="flex flex-wrap gap-1">
                  {template.skills_to_validate.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {expandedProject === template.id && (
                <div className="mt-4 space-y-4 border-t pt-4">
                  <div>
                    <h5 className="font-medium mb-2">Project Milestones:</h5>
                    <div className="space-y-2">
                      {template.template_data.milestones.map((milestone, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium mt-0.5">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{milestone.title}</div>
                            <div className="text-muted-foreground">{milestone.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium mb-2">Recommended Tools:</h5>
                    <div className="flex flex-wrap gap-1">
                      {template.template_data.recommended_tools.map((tool) => (
                        <Badge key={tool} variant="outline" className="text-xs">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedProject(
                    expandedProject === template.id ? null : template.id
                  )}
                >
                  {expandedProject === template.id ? 'Show Less' : 'Show Details'}
                </Button>
                <Button 
                  size="sm"
                  onClick={() => onUseTemplate?.(template)}
                >
                  Use Template
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
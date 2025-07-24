import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { usePivotRecommendations } from '@/hooks/usePivotRecommendations';
import { toast } from 'sonner';

// Types
export interface CareerPath {
  id: string;
  title: string;
  description: string;
  average_salary?: number;
  roi_score?: number;
  growth_outlook?: string;
  industry?: string;
  level?: string;
}

export interface CareerStep {
  id: string;
  title: string;
  description: string;
  level: number;
  is_terminal: boolean;
  estimated_duration: string;
  prerequisites: string[];
  step_type?: string;
  estimated_cost?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty_level?: number;
  xp_value?: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  platform: string;
  cost: string;
  difficulty: string;
  skill_tags: string[];
  url?: string;
  is_ai_recommended?: boolean;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimated_time: string;
  skills_demonstrated: string[];
  project_type: string;
  github_url?: string;
  live_url?: string;
}

export interface Certification {
  id: string;
  title: string;
  issuer: string;
  description: string;
  cost: string;
  validity_years: number;
  skills_validated: string[];
  exam_duration?: string;
  industry_recognition: 'high' | 'medium' | 'low';
  registration_url?: string;
}

export interface StepSkillMapping {
  step_id: string;
  skill_id: string;
  importance_score: number;
}

export interface DisplayControls {
  showSkills: boolean;
  showCourses: boolean;
  showProjects: boolean;
  showCertifications: boolean;
  showJobs: boolean;
  showPivots: boolean;
  showProgress: boolean;
  viewMode: 'branched' | 'clustered' | 'traditional';
  pathHighlighting: boolean;
}

export interface GraphLayout {
  type: 'hierarchical' | 'force' | 'circular';
  direction: 'vertical' | 'horizontal';
}

// State interface
interface SkillTreeState {
  // Data
  careerPaths: CareerPath[];
  selectedCareerPath: string;
  careerSteps: CareerStep[];
  skills: Skill[];
  courses: Course[];
  projects: Project[];
  certifications: Certification[];
  stepSkillMappings: StepSkillMapping[];
  
  // User data
  currentUser: any;
  userSkills: string[];
  
  // UI controls
  displayControls: DisplayControls;
  graphLayout: GraphLayout;
  
  // Loading states
  loading: boolean;
  dataLoaded: boolean;
}

// Actions
type SkillTreeAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CAREER_PATHS'; payload: CareerPath[] }
  | { type: 'SET_SELECTED_CAREER_PATH'; payload: string }
  | { type: 'SET_CAREER_DATA'; payload: { steps: CareerStep[]; skills: Skill[]; courses: Course[]; projects: Project[]; certifications: Certification[]; mappings: StepSkillMapping[] } }
  | { type: 'SET_CURRENT_USER'; payload: any }
  | { type: 'SET_USER_SKILLS'; payload: string[] }
  | { type: 'UPDATE_DISPLAY_CONTROLS'; payload: Partial<DisplayControls> }
  | { type: 'UPDATE_GRAPH_LAYOUT'; payload: Partial<GraphLayout> }
  | { type: 'SET_DATA_LOADED'; payload: boolean };

// Initial state
const initialState: SkillTreeState = {
  careerPaths: [],
  selectedCareerPath: '',
  careerSteps: [],
  skills: [],
  courses: [],
  projects: [],
  certifications: [],
  stepSkillMappings: [],
  currentUser: null,
  userSkills: [],
  displayControls: {
    showSkills: true,
    showCourses: false,
    showProjects: false,
    showCertifications: false,
    showJobs: true,
    showPivots: false,
    showProgress: true,
    viewMode: 'branched',
    pathHighlighting: true,
  },
  graphLayout: {
    type: 'hierarchical',
    direction: 'vertical'
  },
  loading: false,
  dataLoaded: false
};

// Reducer
function skillTreeReducer(state: SkillTreeState, action: SkillTreeAction): SkillTreeState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_CAREER_PATHS':
      return { ...state, careerPaths: action.payload };
    case 'SET_SELECTED_CAREER_PATH':
      return { ...state, selectedCareerPath: action.payload, dataLoaded: false };
    case 'SET_CAREER_DATA':
      return {
        ...state,
        careerSteps: action.payload.steps,
        skills: action.payload.skills,
        courses: action.payload.courses,
        projects: action.payload.projects,
        certifications: action.payload.certifications,
        stepSkillMappings: action.payload.mappings,
        dataLoaded: true
      };
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    case 'SET_USER_SKILLS':
      return { ...state, userSkills: action.payload };
    case 'UPDATE_DISPLAY_CONTROLS':
      return { ...state, displayControls: { ...state.displayControls, ...action.payload } };
    case 'UPDATE_GRAPH_LAYOUT':
      return { ...state, graphLayout: { ...state.graphLayout, ...action.payload } };
    case 'SET_DATA_LOADED':
      return { ...state, dataLoaded: action.payload };
    default:
      return state;
  }
}

// Context
interface SkillTreeContextValue extends SkillTreeState {
  dispatch: React.Dispatch<SkillTreeAction>;
  loadCareerPaths: () => Promise<void>;
  loadCareerData: (careerPathId: string) => Promise<void>;
  loadCurrentUser: () => Promise<void>;
  updateDisplayControls: (updates: Partial<DisplayControls>) => void;
  updateGraphLayout: (updates: Partial<GraphLayout>) => void;
  selectCareerPath: (pathId: string) => void;
  
  // Integrated hooks data
  criScore: number | null;
  userProgress: any[] | null;
  isCriLoading: boolean;
  pivotRecommendations: any[] | null;
  pivotLoading: boolean;
  markCompleted?: (id: string, type: string) => void;
  isCompleted?: (id: string, type: string) => boolean;
  isInProgress?: (id: string, type: string) => boolean;
}

const SkillTreeContext = createContext<SkillTreeContextValue | undefined>(undefined);

// Provider component
export const SkillTreeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(skillTreeReducer, initialState);

  // Integrated hooks
  const selectedPath = state.careerPaths.find(p => p.id === state.selectedCareerPath);
  
  const { 
    criScore, 
    userProgress, 
    isCriLoading,
    markCompleted,
    isCompleted,
    isInProgress,
  } = useCareerReadiness({ 
    userId: state.currentUser?.id, 
    targetJobId: state.selectedCareerPath, 
    enabled: !!state.currentUser?.id 
  });

  const { 
    data: pivotRecommendations, 
    isLoading: pivotLoading 
  } = usePivotRecommendations({
    current_career: selectedPath?.title || '',
    user_skills: state.userSkills,
    preferred_locations: ['remote'],
    enabled: state.displayControls.showPivots && !!selectedPath
  });

  // Actions
  const loadCareerPaths = async () => {
    try {
      const { data, error } = await supabase
        .from('career_paths')
        .select(`
          id, 
          title, 
          summary,
          career_steps!inner(id)
        `)
        .order('title');

      if (error) throw error;
      
      const pathsWithSteps = (data || [])
        .reduce((acc, item) => {
          if (!acc.find(p => p.id === item.id)) {
            acc.push({
              id: item.id,
              title: item.title,
              description: item.summary || ''
            });
          }
          return acc;
        }, [] as CareerPath[]);
      
      dispatch({ type: 'SET_CAREER_PATHS', payload: pathsWithSteps });
      console.log('Loaded career paths:', pathsWithSteps.length);
    } catch (error) {
      console.error('Error loading career paths:', error);
      toast.error('Failed to load career paths');
    }
  };

  const loadCareerData = async (careerPathId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Load career steps with levels
      const { data: stepsData, error: stepsError } = await supabase
        .rpc('calculate_career_step_levels', { career_path_id_param: careerPathId });

      if (stepsError) throw stepsError;

      // Load skills
      const { data: skillsData, error: skillsError } = await supabase
        .from('skills')
        .select('*')
        .order('category, name');

      if (skillsError) throw skillsError;

      // Load courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('recommended_courses')
        .select('*')
        .eq('active', true)
        .order('title');

      if (coursesError) console.warn('Error loading courses:', coursesError);

      // Load step-skill mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('career_step_skills')
        .select('*')
        .in('step_id', stepsData?.map(s => s.id) || []);

      if (mappingsError) throw mappingsError;

      // Mock data for projects and certifications
      const mockProjects: Project[] = stepsData?.slice(0, 3).map((step, index) => ({
        id: `project-${step.id}`,
        title: `${step.title} Project`,
        description: `Build a practical project to demonstrate ${step.title} skills`,
        difficulty: step.level > 2 ? 'advanced' : step.level > 1 ? 'intermediate' : 'beginner',
        estimated_time: '2-4 weeks',
        skills_demonstrated: ['React', 'TypeScript', 'Node.js'],
        project_type: 'portfolio',
        github_url: 'https://github.com',
        live_url: 'https://demo.com'
      })) || [];

      const mockCertifications: Certification[] = [
        {
          id: 'aws-cert',
          title: 'AWS Solutions Architect',
          issuer: 'Amazon',
          description: 'Validates expertise in designing distributed systems on AWS',
          cost: '$150',
          validity_years: 3,
          skills_validated: ['Cloud Architecture', 'AWS Services', 'Security'],
          exam_duration: '130 minutes',
          industry_recognition: 'high',
          registration_url: 'https://aws.amazon.com/certification'
        }
      ];

      dispatch({ 
        type: 'SET_CAREER_DATA', 
        payload: {
          steps: stepsData || [],
          skills: skillsData || [],
          courses: coursesData || [],
          projects: mockProjects,
          certifications: mockCertifications,
          mappings: mappingsData || []
        }
      });

      console.log('Loaded career data:', {
        steps: stepsData?.length,
        skills: skillsData?.length,
        courses: coursesData?.length,
        projects: mockProjects.length,
        certifications: mockCertifications.length,
        mappings: mappingsData?.length
      });

      if (!stepsData || stepsData.length === 0) {
        toast.error('No career steps found for this path. Try generating a new path or select a different one.');
      }

    } catch (error) {
      console.error('Error loading career data:', error);
      toast.error('Failed to load career data');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    dispatch({ type: 'SET_CURRENT_USER', payload: user });
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('skills')
        .eq('user_id', user.id)
        .single();
      
      dispatch({ type: 'SET_USER_SKILLS', payload: profile?.skills || [] });
    }
  };

  const updateDisplayControls = (updates: Partial<DisplayControls>) => {
    dispatch({ type: 'UPDATE_DISPLAY_CONTROLS', payload: updates });
  };

  const updateGraphLayout = (updates: Partial<GraphLayout>) => {
    dispatch({ type: 'UPDATE_GRAPH_LAYOUT', payload: updates });
  };

  const selectCareerPath = (pathId: string) => {
    dispatch({ type: 'SET_SELECTED_CAREER_PATH', payload: pathId });
    if (pathId) {
      loadCareerData(pathId);
    }
  };

  // Load initial data
  useEffect(() => {
    loadCurrentUser();
    loadCareerPaths();
  }, []);

  const contextValue: SkillTreeContextValue = {
    ...state,
    dispatch,
    loadCareerPaths,
    loadCareerData,
    loadCurrentUser,
    updateDisplayControls,
    updateGraphLayout,
    selectCareerPath,
    criScore: typeof criScore === 'number' ? criScore : null,
    userProgress,
    isCriLoading,
    pivotRecommendations,
    pivotLoading,
    markCompleted,
    isCompleted,
    isInProgress,
  };

  return (
    <SkillTreeContext.Provider value={contextValue}>
      {children}
    </SkillTreeContext.Provider>
  );
};

// Hook
export const useSkillTree = () => {
  const context = useContext(SkillTreeContext);
  if (context === undefined) {
    throw new Error('useSkillTree must be used within a SkillTreeProvider');
  }
  return context;
};
import { create } from 'zustand';

export interface ProjectLite {
  id: string;
  title: string;
  skills: string[];
  links: string[];
  verified: boolean;
  created_at: string;
}

interface ProjectsState {
  items: ProjectLite[];
  addProject: (project: ProjectLite) => void;
  removeProject: (id: string) => void;
  toggleVerified: (id: string) => void;
  clear: () => void;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  items: [],
  addProject: (project) => set((state) => ({ 
    items: [project, ...state.items] 
  })),
  removeProject: (id) => set((state) => ({ 
    items: state.items.filter(item => item.id !== id) 
  })),
  toggleVerified: (id) => set((state) => ({
    items: state.items.map(item => 
      item.id === id ? { ...item, verified: !item.verified } : item
    )
  })),
  clear: () => set({ items: [] }),
}));
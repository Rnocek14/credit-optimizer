import { FileContent } from "./collectFiles";

export const DEMO_FILES: FileContent[] = [
  {
    path: "package.json",
    content: `{
  "name": "demo-react-app",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@types/node": "^18.15.0",
    "@types/react": "^18.0.28",
    "@types/react-dom": "^18.0.11",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.1",
    "typescript": "^4.9.5",
    "vite": "^4.1.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}`
  },
  {
    path: "src/App.tsx",
    content: `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { UserProvider } from './contexts/UserContext';

function App() {
  return (
    <UserProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </UserProvider>
  );
}

export default App;`
  },
  {
    path: "src/components/Header.tsx",
    content: `import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../hooks/useUser';

export function Header() {
  const { user, isLoading } = useUser();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-blue-600">
            Demo App
          </Link>
          
          <nav className="flex items-center space-x-6">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              Home
            </Link>
            <Link to="/about" className="text-gray-600 hover:text-gray-900">
              About
            </Link>
            
            {isLoading ? (
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
            ) : user ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Welcome, {user.name}</span>
                <button className="text-red-600 hover:text-red-700">
                  Logout
                </button>
              </div>
            ) : (
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Login
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}`
  },
  {
    path: "src/components/UserCard.tsx",
    content: `import React from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface UserCardProps {
  user: User;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border">
      <div className="flex items-center space-x-4">
        {user.avatar ? (
          <img 
            src={user.avatar} 
            alt={user.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-600 font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
          <p className="text-gray-600">{user.email}</p>
        </div>
        
        <div className="flex space-x-2">
          {onEdit && (
            <button
              onClick={() => onEdit(user.id)}
              className="text-blue-600 hover:text-blue-700 px-3 py-1 rounded"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(user.id)}
              className="text-red-600 hover:text-red-700 px-3 py-1 rounded"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}`
  },
  {
    path: "src/hooks/useUser.ts",
    content: `import { useState, useEffect } from 'react';
import { User } from '../types/user';
import { userService } from '../services/userService';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        setIsLoading(true);
        const userData = await userService.getCurrentUser();
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user');
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, []);

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    
    try {
      const updatedUser = await userService.updateUser(user.id, updates);
      setUser(updatedUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  return {
    user,
    isLoading,
    error,
    updateUser
  };
}`
  },
  {
    path: "src/services/userService.ts",
    content: `import { User } from '../types/user';

class UserService {
  private baseUrl = '/api/users';

  async getCurrentUser(): Promise<User | null> {
    const response = await fetch(\`\${this.baseUrl}/me\`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error('Failed to fetch user');
    }
    
    return response.json();
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const response = await fetch(\`\${this.baseUrl}/\${id}\`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to update user');
    }
    
    return response.json();
  }

  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to create user');
    }
    
    return response.json();
  }
}

export const userService = new UserService();`
  },
  {
    path: "src/utils/helpers.ts",
    content: `export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}`
  },
  {
    path: "src/types/user.ts",
    content: `export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}`
  },
  {
    path: "src/pages/HomePage.tsx",
    content: `import React from 'react';
import { UserCard } from '../components/UserCard';
import { useUser } from '../hooks/useUser';

export function HomePage() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Demo App
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          This is a sample React application demonstrating modern development practices
          with TypeScript, React Router, and clean architecture.
        </p>
      </div>

      {user && (
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Your Profile</h2>
          <UserCard user={user} />
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Feature 1</h3>
          <p className="text-gray-600">
            Description of the first feature in this application.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Feature 2</h3>
          <p className="text-gray-600">
            Description of the second feature in this application.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Feature 3</h3>
          <p className="text-gray-600">
            Description of the third feature in this application.
          </p>
        </div>
      </div>
    </div>
  );
}`
  },
  {
    path: "tsconfig.json",
    content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`
  },
  {
    path: "vite.config.ts",
    content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});`
  },
  {
    path: "README.md",
    content: `# Demo React App

This is a sample React application built with:

- **React 18** with TypeScript
- **Vite** for fast development
- **React Router** for navigation
- **Tailwind CSS** for styling

## Features

- Modern React with hooks
- TypeScript for type safety
- Component-based architecture
- User management system
- Responsive design

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Project Structure

\`\`\`
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── services/      # API services
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── App.tsx        # Main application component
\`\`\`

## Architecture

This application follows modern React best practices:

- Functional components with hooks
- Custom hooks for state management
- Service layer for API calls
- TypeScript for type safety
- Component composition patterns
`
  }
];

export function getDemoFiles(): FileContent[] {
  return DEMO_FILES;
}

export function generateDemoScanResult() {
  const languages = ['TypeScript', 'JavaScript', 'JSON', 'Markdown'];
  const filesIndexed = DEMO_FILES.length;
  const chunks = Math.ceil(filesIndexed * 2.5); // Simulate chunking
  const durationMs = 1500 + Math.random() * 1000; // Simulate realistic timing

  return {
    filesIndexed,
    chunks,
    languages,
    durationMs: Math.round(durationMs)
  };
}
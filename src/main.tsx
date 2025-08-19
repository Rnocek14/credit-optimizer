import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { UnifiedDataProvider } from "./contexts/UnifiedDataContext"
import App from './App.tsx'
import './index.css'

// Persist demo mode across reloads
if (typeof window !== 'undefined') {
  const key = '__LP_DEMO_MODE__';
  const saved = localStorage.getItem(key);
  if (saved != null) {
    (window as any).__LP_DEMO_MODE__ = saved === 'true';
  }
}

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <UnifiedDataProvider>
      <App />
    </UnifiedDataProvider>
  </QueryClientProvider>
);

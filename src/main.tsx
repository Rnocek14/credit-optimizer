import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { UnifiedDataProvider } from "./contexts/UnifiedDataContext"
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <UnifiedDataProvider>
      <App />
    </UnifiedDataProvider>
  </QueryClientProvider>
);

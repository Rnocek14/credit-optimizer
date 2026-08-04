import { createRoot } from 'react-dom/client'
import { OverlayRegistryProvider } from '@/components/ui/overlay-registry'
import App from './App.tsx'
import './index.css'
import '@xyflow/react/dist/style.css'

createRoot(document.getElementById('root')!).render(
  <OverlayRegistryProvider>
    <App />
  </OverlayRegistryProvider>
);

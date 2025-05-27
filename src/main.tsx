import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initMobileCompatibility } from './utils/mobileCompatibility';

// Initialize mobile compatibility features for Android WebView
initMobileCompatibility();

// Render the application
const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}

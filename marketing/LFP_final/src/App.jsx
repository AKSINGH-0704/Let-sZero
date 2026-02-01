import { useEffect } from 'react'
import LandingExperience from '../LandingExperience'

function App() {
  useEffect(() => {
    // Add postMessage bridge for iframe communication
    const handleClick = (e) => {
      const button = e.target.closest('button');
      const link = e.target.closest('a');
      
      if (button) {
        const text = button.textContent.toLowerCase();
        
        // Sign In button -> /login
        if (text.trim() === 'sign in') {
          e.preventDefault();
          if (window.parent !== window) {
            window.parent.postMessage({ type: 'NAVIGATE', path: '/login' }, '*');
          }
          return;
        }
        
        // Explore RepMail / Get Started buttons -> /products/repmail
        if (text.includes('explore repmail') || 
            text.includes('start') || 
            text.includes('trial') || 
            text.includes('get started')) {
          e.preventDefault();
          if (window.parent !== window) {
            window.parent.postMessage({ type: 'NAVIGATE', path: '/products/repmail' }, '*');
          }
          return;
        }
      }
      
      // Footer RepMail link -> /products/repmail
      if (link && link.textContent === 'RepMail') {
        e.preventDefault();
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'NAVIGATE', path: '/products/repmail' }, '*');
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return <LandingExperience />
}

export default App

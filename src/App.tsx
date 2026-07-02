import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import RedirectHandler from './components/RedirectHandler';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    // Listen to standard popstate (back/forward navigation)
    window.addEventListener('popstate', handleLocationChange);

    // Patch pushState and replaceState to trigger re-renders on custom route transitions
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      handleLocationChange();
    };

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      handleLocationChange();
    };

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  // Determine if we need to perform a short-URL redirect
  // Support clean path (/t/slug), query parameter (?t=slug), and hash route (#/t/slug)
  // This guarantees 100% compatibility across all static hosting providers (Vercel, Netlify, etc.)
  const searchParams = new URLSearchParams(window.location.search);
  const querySlug = searchParams.get('t');
  
  const hashPath = window.location.hash;
  const hashSlug = hashPath.startsWith('#/t/') ? hashPath.substring(4) : '';

  const isPathRedirect = currentPath.startsWith('/t/');
  const pathSlug = isPathRedirect ? currentPath.substring(3) : '';

  const redirectSlug = pathSlug || querySlug || hashSlug;
  const isRedirect = !!redirectSlug;

  if (isRedirect && redirectSlug) {
    return <RedirectHandler slug={redirectSlug} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <main className="py-4">
        <Dashboard />
      </main>
    </div>
  );
}

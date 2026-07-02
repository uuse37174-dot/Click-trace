import { useEffect, useState } from 'react';
import { getLink, recordClick } from '../firebase';
import { LinkData } from '../types';
import { motion } from 'motion/react';
import { AlertCircle, Home } from 'lucide-react';

interface RedirectHandlerProps {
  slug: string;
}

export default function RedirectHandler({ slug }: RedirectHandlerProps) {
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error' | 'not_found'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    let active = true;

    async function handleRedirect() {
      try {
        const linkData = await getLink(slug);
        if (!active) return;

        if (!linkData) {
          setStatus('not_found');
          return;
        }

        setStatus('redirecting');

        // Log the click in Firestore first, then immediately redirect.
        // We await the click recording so the network request completes before the browser unloads the page.
        try {
          await recordClick(slug, document.referrer);
        } catch (clickErr) {
          // If click logging fails for some reason, we still want the user to be redirected smoothly
          console.error('Click logging failed:', clickErr);
        }

        if (active) {
          window.location.replace(linkData.originalUrl);
        }

      } catch (err: any) {
        console.error('Redirection error:', err);
        if (active) {
          setErrorMsg(err.message || 'An unexpected error occurred.');
          setStatus('error');
        }
      }
    }

    handleRedirect();

    return () => {
      active = false;
    };
  }, [slug]);

  // Completely silent/background UI for normal states to make it look 100% natural and instant
  if (status === 'loading' || status === 'redirecting') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          {/* A tiny, high-end neutral spinner that works in the background */}
          <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (status === 'not_found') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 px-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 max-w-md w-full text-center flex flex-col items-center"
        >
          <div className="p-3 bg-rose-50 rounded-full text-rose-600 mb-5">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Link Not Found</h2>
          <p className="text-sm text-slate-500 mt-2">
            The tracking slug <span className="font-mono font-semibold text-rose-600">/t/{slug}</span> does not exist or has been removed.
          </p>
          <button
            onClick={() => window.location.replace('/')}
            className="mt-6 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium px-5 py-2.5 rounded-xl transition duration-150 shadow-sm w-full cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Go to LinkClick Tracker Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 max-w-md w-full text-center flex flex-col items-center"
      >
        <div className="p-3 bg-amber-50 rounded-full text-amber-600 mb-5">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Redirection Error</h2>
        <p className="text-sm text-slate-500 mt-2">
          {errorMsg || 'We were unable to complete the redirect.'}
        </p>
        <button
          onClick={() => window.location.replace('/')}
          className="mt-6 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium px-5 py-2.5 rounded-xl transition duration-150 shadow-sm w-full cursor-pointer"
        >
          <Home className="w-4 h-4" />
          Back to Dashboard
        </button>
      </motion.div>
    </div>
  );
}


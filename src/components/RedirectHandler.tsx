import { useEffect, useState } from 'react';
import { getLink, recordClick } from '../firebase';
import { LinkData } from '../types';
import { motion } from 'motion/react';
import { AlertCircle, Home, ExternalLink, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

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

        // Log the click event to Firestore first.
        // This is extremely fast (approx 100-200ms) and guarantees analytics traces are recorded before page unload.
        try {
          await recordClick(slug, document.referrer);
        } catch (clickErr) {
          console.error('Click logging error (bypassing):', clickErr);
        }

        // Direct, instant redirection to the target destination
        if (active) {
          let targetUrl = linkData.originalUrl.trim();
          if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl;
          }
          window.location.replace(targetUrl);
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

  if (status === 'loading' || status === 'redirecting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-600 px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm text-slate-500 font-medium font-sans">Redirecting...</p>
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


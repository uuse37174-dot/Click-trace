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
  const [link, setLink] = useState<LinkData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(2);

  useEffect(() => {
    let intervalId: any;
    if (status === 'redirecting') {
      intervalId = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [status]);

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

        setLink(linkData);
        setStatus('redirecting');

        // Log the click in Firestore in the background.
        const trackingPromise = recordClick(slug, document.referrer);

        // Guarantee a minimum of 2000ms delay to give Firestore background sockets ample time to flush before unloading the page.
        const delayPromise = new Promise((resolve) => setTimeout(resolve, 2000));

        try {
          await Promise.allSettled([trackingPromise, delayPromise]);
        } catch (clickErr) {
          console.error('Background click logging completed with notice:', clickErr);
        }

        // Smoothly proceed to the original destination URL
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

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none"></div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center flex flex-col items-center shadow-2xl relative z-10"
        >
          <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full mb-6 animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Resolving short URL</h2>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Connecting to secure cloud database to trace and load link details for:
          </p>
          <div className="mt-4 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-indigo-400 font-bold">
            /t/{slug}
          </div>
        </motion.div>
      </div>
    );
  }

  if (status === 'redirecting' && link) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none"></div>
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center flex flex-col items-center shadow-2xl relative z-10"
        >
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full mb-6">
            <ShieldCheck className="w-8 h-8 animate-bounce" />
          </div>
          
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider mb-2">
            Link Verified
          </span>
          
          <h2 className="text-xl font-bold tracking-tight text-white truncate max-w-full px-2" title={link.title}>
            {link.title}
          </h2>
          
          {link.description && (
            <p className="text-xs text-slate-400 mt-2 line-clamp-2 px-4 leading-relaxed">
              {link.description}
            </p>
          )}

          <div className="w-full border-t border-slate-800/80 my-5"></div>

          <p className="text-xs text-slate-500 font-medium">Redirecting you to target page:</p>
          
          <div className="mt-2.5 px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-indigo-400 font-mono font-medium break-all flex items-center justify-center gap-2 max-w-full shadow-inner">
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{link.originalUrl}</span>
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs text-slate-300 font-medium bg-slate-800/40 px-3.5 py-2 rounded-xl border border-slate-800/60">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Click Traced in Background <span className="font-bold text-indigo-400 font-mono">({countdown}s)</span></span>
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <span>Redirecting...</span>
          </div>
        </motion.div>
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


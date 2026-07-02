import React, { useState, useEffect } from 'react';
import { getAllLinks, createLink, getClickLogs, LinkData, ClickLog } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Link as LinkIcon, 
  ExternalLink, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  BarChart3, 
  Clock, 
  Globe, 
  Smartphone, 
  Monitor, 
  Laptop,
  AlertCircle, 
  ArrowRight, 
  Calendar, 
  Loader2, 
  Sparkles,
  RefreshCw,
  Info,
  Wifi,
  WifiOff,
  Download
} from 'lucide-react';

export default function Dashboard() {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLink, setSelectedLink] = useState<LinkData | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<ClickLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // PWA & Connection states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showPwaInfo, setShowPwaInfo] = useState(false);

  // Listen for PWA installation prompts and connection status
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleOnlineStatus = () => {
      setIsOnline(true);
    };

    const handleOfflineStatus = () => {
      setIsOnline(false);
    };

    // Check standalone mode
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (navigator as any).standalone;
    if (checkStandalone) {
      setIsInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  // Form states
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch all links on mount
  const fetchLinks = async (autoSelectFirst = false) => {
    try {
      setLoading(true);
      const allLinks = await getAllLinks();
      setLinks(allLinks);
      
      // If we need to select first link automatically
      if (allLinks.length > 0) {
        if (autoSelectFirst && !selectedLink) {
          setSelectedLink(allLinks[0]);
        } else if (selectedLink) {
          // Refresh current selection
          const updated = allLinks.find(l => l.id === selectedLink.id);
          if (updated) setSelectedLink(updated);
        }
      }
    } catch (error) {
      console.error('Failed to fetch links:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks(true);
  }, []);

  // Fetch click logs when selectedLink changes
  useEffect(() => {
    if (selectedLink) {
      const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
          const logs = await getClickLogs(selectedLink.id);
          setSelectedLogs(logs);
        } catch (error) {
          console.error('Failed to fetch click logs:', error);
        } finally {
          setLoadingLogs(false);
        }
      };
      fetchLogs();
    } else {
      setSelectedLogs([]);
    }
  }, [selectedLink]);

  // Generate a random slug
  const handleGenerateSlug = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSlug(result);
  };

  // Submit form
  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    // Validations
    if (!title.trim()) {
      setFormError('Please enter a descriptive title.');
      return;
    }
    if (!originalUrl.trim()) {
      setFormError('Please enter a target destination URL.');
      return;
    }
    
    // Add protocol if missing
    let url = originalUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    try {
      new URL(url);
    } catch (_) {
      setFormError('Invalid destination URL format. Please include http:// or https://');
      return;
    }

    const finalSlug = slug.trim() || Math.random().toString(36).substring(2, 8);
    if (!/^[a-zA-Z0-9_-]+$/.test(finalSlug)) {
      setFormError('Slug can only contain letters, numbers, hyphens (-) and underscores (_).');
      return;
    }

    setSubmitting(true);
    try {
      // Check if slug exists
      const existing = links.find(l => l.id.toLowerCase() === finalSlug.toLowerCase());
      if (existing) {
        setFormError(`The slug "${finalSlug}" is already in use. Please choose another one.`);
        setSubmitting(false);
        return;
      }

      const newLink = await createLink({
        id: finalSlug,
        title: title.trim(),
        originalUrl: url,
        description: description.trim()
      });

      setFormSuccess(`Link shortener "/t/${finalSlug}" created successfully!`);
      
      // Reset form
      setSlug('');
      setTitle('');
      setOriginalUrl('');
      setDescription('');

      // Refresh list
      const allLinks = await getAllLinks();
      setLinks(allLinks);
      
      // Select the newly created link
      const created = allLinks.find(l => l.id === finalSlug);
      if (created) setSelectedLink(created);

    } catch (error: any) {
      console.error('Error creating link:', error);
      setFormError(error.message || 'Failed to register short link.');
    } finally {
      setSubmitting(false);
    }
  };

  // Copy helper
  const handleCopy = (shortUrl: string, id: string) => {
    try {
      navigator.clipboard.writeText(shortUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      // Fallback
      const input = document.createElement('input');
      input.value = shortUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Filter links by search
  const filteredLinks = links.filter(link => {
    const q = searchQuery.toLowerCase();
    return (
      link.title.toLowerCase().includes(q) ||
      link.id.toLowerCase().includes(q) ||
      link.originalUrl.toLowerCase().includes(q) ||
      (link.description && link.description.toLowerCase().includes(q))
    );
  });

  // Analytics Math
  const getDeviceStats = () => {
    const devices: { [key: string]: number } = { Desktop: 0, Mobile: 0, Tablet: 0 };
    selectedLogs.forEach(log => {
      const dev = log.device || 'Desktop';
      if (devices[dev] !== undefined) {
        devices[dev]++;
      } else {
        devices['Desktop']++;
      }
    });
    return devices;
  };

  const getBrowserStats = () => {
    const browsers: { [key: string]: number } = {};
    selectedLogs.forEach(log => {
      const b = log.browser || 'Unknown';
      browsers[b] = (browsers[b] || 0) + 1;
    });
    return Object.entries(browsers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const getReferrerStats = () => {
    const referrers: { [key: string]: number } = {};
    selectedLogs.forEach(log => {
      const r = log.referrer || 'Direct / No Referrer';
      // Clean up referrer domain if possible
      let domain = r;
      if (r.startsWith('http')) {
        try {
          domain = new URL(r).hostname;
        } catch (_) {}
      }
      referrers[domain] = (referrers[domain] || 0) + 1;
    });
    return Object.entries(referrers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const deviceStats = getDeviceStats();
  const browserStats = getBrowserStats();
  const referrerStats = getReferrerStats();
  const totalLogsCount = selectedLogs.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* App Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-8 border-b border-slate-100 gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <LinkIcon className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">
              Firebase Synced
            </span>
            {isOnline ? (
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5" />
                Online Mode
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1.5">
                <WifiOff className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                Offline (Only Online Works)
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">LinkClick Tracker</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create tracking shortlinks, capture visitor details in Firestore, and review click insights in real-time.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setShowPwaInfo(true)}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-2 rounded-xl transition border border-slate-100 font-medium text-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Install Tips
          </button>
          
          <button
            onClick={() => fetchLinks()}
            disabled={loading}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl transition shadow-sm font-medium text-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Sync Database
          </button>
        </div>
      </header>

      {/* Online/Offline Banner if they go completely offline */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3"
        >
          <WifiOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-800">You are currently offline</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              This application requires an active internet connection to sync tracking links with the cloud database and track click logs in real-time. Please check your network connection.
            </p>
          </div>
        </motion.div>
      )}

      {/* PWA Install Promo Widget */}
      {deferredPrompt && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/40 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none"></div>

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 shrink-0">
                <Smartphone className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold tracking-tight text-white">Add LinkClick to Home Screen</h3>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">PWA App</span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-xl">
                  Download and install LinkClick Tracker on your phone, tablet, or desktop. Run it in a high-performance standalone window directly from your home screen with zero browser address bar clutter!
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
              <button
                onClick={() => setShowPwaInfo(true)}
                className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
              >
                Manual Guide
              </button>
              <button
                onClick={handleInstallClick}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition hover:scale-[1.02] cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Install App
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* PWA Info Dialog Modal */}
      <AnimatePresence>
        {showPwaInfo && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 text-slate-900"
            >
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600" />
                Installation Guide
              </h3>
              
              <div className="mt-4 space-y-4 text-xs text-slate-600 leading-relaxed">
                <p>
                  Installing LinkClick Tracker turns this web tool into a dedicated app on your device. The app will open in a clean, standalone, high-performance window without any browser tabs.
                </p>
                
                <div className="border-t border-slate-100 pt-3">
                  <h4 className="font-bold text-slate-800 mb-1">Android & Windows (Chrome / Edge)</h4>
                  <p>Click the <strong>"Install App"</strong> button on the dashboard banner, or open your browser menu (the three dots) and click <strong>"Install LinkClick Tracker"</strong>.</p>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <h4 className="font-bold text-slate-800 mb-1">iOS / iPhone & iPad (Safari)</h4>
                  <p>iOS Safari does not support automated install buttons. To install manually:</p>
                  <ol className="list-decimal list-inside mt-1.5 space-y-1 pl-1">
                    <li>Tap the <strong>Share</strong> button (square icon with up arrow) in Safari.</li>
                    <li>Scroll down and select <strong>"Add to Home Screen"</strong>.</li>
                    <li>Tap <strong>Add</strong> in the top-right corner to complete the installation.</li>
                  </ol>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <h4 className="font-bold text-slate-800 mb-1">macOS (Safari / Chrome)</h4>
                  <p>In Safari, click the <strong>Share</strong> button in the toolbar, then select <strong>"Add to Dock"</strong>. In Chrome, click the install icon in the URL bar.</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowPwaInfo(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form & Links Directory (Cols 1 to 5) */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          
          {/* Section 1: Create Tracking Link */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                Create New Tracker
              </h2>
              <span className="text-xs text-slate-400 font-medium">Step 1 of 2</span>
            </div>

            <form onSubmit={handleCreateLink} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Link Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer Campaign Newsletter"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 transition outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Destination URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://example.com/promo/summer-2026?id=ref"
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 transition outline-none font-mono text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Custom Short Slug <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateSlug}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-generate
                  </button>
                </div>
                <div className="flex rounded-xl shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-400 text-xs font-mono">
                    /t/
                  </span>
                  <input
                    type="text"
                    placeholder="promo2026"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    className="flex-1 block w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-r-xl px-3 py-2.5 text-sm text-slate-800 transition outline-none font-mono"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Leave blank to get a randomized 6-character unique identifier.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Description / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Link placed inside email footer for affiliate tracking."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-sm text-slate-800 transition outline-none resize-none"
                />
              </div>

              {/* Messages */}
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs flex items-start gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Creation Failed:</span> {formError}
                  </div>
                </div>
              )}

              {formSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs flex items-start gap-2">
                  <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <div>
                    <span className="font-semibold">Success!</span> {formSuccess}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-slate-950 hover:bg-slate-900 text-white font-semibold py-3 px-4 rounded-xl shadow-sm transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registering in Firestore...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Tracking Link
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Section 2: Links Directory */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-[400px]">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" />
                Active Short Links
                <span className="text-xs bg-slate-100 text-slate-600 font-normal px-2.5 py-0.5 rounded-full font-mono">
                  {links.length}
                </span>
              </h2>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search title, slug, or destination..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 transition outline-none"
                />
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-50 overflow-y-auto max-h-[450px] flex-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <span className="text-xs font-medium">Fetching directory...</span>
                </div>
              ) : filteredLinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center px-4">
                  <p className="text-sm font-semibold text-slate-700">No links match your search</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Create a new tracker above or update your search filter.
                  </p>
                </div>
              ) : (
                filteredLinks.map((link) => {
                  const isSelected = selectedLink?.id === link.id;
                  const formattedDate = link.createdAt?.toDate 
                    ? link.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : new Date(link.createdAt).toLocaleDateString();

                  return (
                    <div
                      key={link.id}
                      onClick={() => setSelectedLink(link)}
                      className={`p-4 transition cursor-pointer flex flex-col gap-2 relative border-l-4 ${
                        isSelected 
                          ? 'bg-indigo-50/50 border-indigo-600' 
                          : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 pr-2">
                          <h3 className="font-semibold text-slate-900 text-sm truncate">
                            {link.title}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-mono text-xs text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                              /t/{link.id}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formattedDate}
                            </span>
                          </div>
                        </div>

                        {/* Click count badge */}
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg font-mono">
                            {link.clickCount} clicks
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 font-mono truncate max-w-full">
                        {link.originalUrl}
                      </p>

                      {/* Action buttons inside listing */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/50">
                        <span className="text-xs text-slate-400 truncate max-w-[180px]">
                          {link.description || 'No description provided.'}
                        </span>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleCopy(`${window.location.origin}/t/${link.id}`, link.id)}
                            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition shadow-sm cursor-pointer relative"
                            title="Copy link to clipboard"
                          >
                            {copiedId === link.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <a
                            href={`${window.location.origin}/t/${link.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition shadow-sm"
                            title="Test redirection"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Click Analytics (Cols 6 to 12) */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {selectedLink ? (
              <motion.div
                key={selectedLink.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-6"
              >
                {/* Analytics Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-4">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                      Analytics Module
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 mt-1 truncate">
                      {selectedLink.title}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-1 bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-max truncate">
                      Destination: <a href={selectedLink.originalUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5 truncate">{selectedLink.originalUrl} <ExternalLink className="w-3 h-3 shrink-0" /></a>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {/* Copy short link */}
                    <button
                      onClick={() => handleCopy(`${window.location.origin}/t/${selectedLink.id}`, 'selected')}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-sm transition cursor-pointer"
                    >
                      {copiedId === 'selected' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Shortlink
                        </>
                      )}
                    </button>
                    <a
                      href={`${window.location.origin}/t/${selectedLink.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition shadow-sm"
                      title="Test tracker URL"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* KPI Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 text-center sm:text-left">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                      Total Clicks
                    </span>
                    <p className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                      {selectedLink.clickCount}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">All-time visits tracked</p>
                  </div>

                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 text-center sm:text-left">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      Created On
                    </span>
                    <p className="text-lg font-bold text-slate-800 mt-3 flex items-center justify-center sm:justify-start gap-1">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {selectedLink.createdAt?.toDate 
                        ? selectedLink.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        : new Date(selectedLink.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">First active registered date</p>
                  </div>

                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 text-center sm:text-left">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
                      <Globe className="w-3.5 h-3.5 text-indigo-500" />
                      Latest Tracker Slug
                    </span>
                    <p className="text-lg font-bold text-indigo-600 mt-3 font-mono bg-indigo-50/80 px-2 py-0.5 rounded inline-block">
                      /t/{selectedLink.id}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Active redirection target</p>
                  </div>
                </div>

                {/* Platform Compatibility & Dynamic Link Formats */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      Platform Compatibility & Link Formats
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Static hosting services (like Vercel or Netlify) throw 404s if clean subpaths are not rewritten. Choose the format that best fits your hosting setup:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Format 1: Clean Path */}
                    <div className="bg-white border border-slate-100 p-3.5 rounded-xl shadow-sm flex flex-col justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Clean Path</span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">Vercel Ready</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                          Requires rewrite configuration. We have included a preconfigured <code className="font-mono bg-slate-100 px-1 rounded">vercel.json</code> file so standard URLs work out-of-the-box on Vercel!
                        </p>
                        <p className="text-xs font-mono text-indigo-600 font-bold mt-2 truncate bg-slate-50 px-2 py-1 rounded" title={`${window.location.origin}/t/${selectedLink.id}`}>
                          /t/{selectedLink.id}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopy(`${window.location.origin}/t/${selectedLink.id}`, 'clean')}
                        className="w-full py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition cursor-pointer shadow-sm"
                      >
                        {copiedId === 'clean' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === 'clean' ? 'Copied Clean!' : 'Copy Clean Path'}
                      </button>
                    </div>

                    {/* Format 2: Query Param */}
                    <div className="bg-white border border-slate-100 p-3.5 rounded-xl shadow-sm flex flex-col justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Query Param</span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-medium">Ultra Safe</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                          Guaranteed to work on <strong>absolutely any</strong> static host without any server config because the index page is always served. Safe fallback format.
                        </p>
                        <p className="text-xs font-mono text-indigo-600 font-bold mt-2 truncate bg-slate-50 px-2 py-1 rounded" title={`${window.location.origin}/?t=${selectedLink.id}`}>
                          /?t={selectedLink.id}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopy(`${window.location.origin}/?t=${selectedLink.id}`, 'query_param')}
                        className="w-full py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition cursor-pointer shadow-sm"
                      >
                        {copiedId === 'query_param' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === 'query_param' ? 'Copied Query!' : 'Copy Query Link'}
                      </button>
                    </div>

                    {/* Format 3: Hash Route */}
                    <div className="bg-white border border-slate-100 p-3.5 rounded-xl shadow-sm flex flex-col justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Hash Fragment</span>
                          <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium">No Setup</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                          Alternative client-side fallback route that utilizes hash fragments. Highly portable and requires zero host-specific server configurations.
                        </p>
                        <p className="text-xs font-mono text-indigo-600 font-bold mt-2 truncate bg-slate-50 px-2 py-1 rounded" title={`${window.location.origin}/#/t/${selectedLink.id}`}>
                          /#/t/{selectedLink.id}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopy(`${window.location.origin}/#/t/${selectedLink.id}`, 'hash_fragment')}
                        className="w-full py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition cursor-pointer shadow-sm"
                      >
                        {copiedId === 'hash_fragment' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === 'hash_fragment' ? 'Copied Hash!' : 'Copy Hash Link'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Logs Status / Info Banner */}
                {selectedLink.clickCount === 0 && (
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                    <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-indigo-900">No clicks tracked yet</h4>
                      <p className="text-xs text-indigo-700/80 mt-1 leading-relaxed">
                        To test, click on <span className="font-semibold">Copy Shortlink</span> or tap the redirect test icon above. Visit that link in another window or tab! Once you open the URL, click <span className="font-semibold">Sync Database</span> above to see visitor logs populated here in real-time.
                      </p>
                    </div>
                  </div>
                )}

                {/* Visual breakdowns (Only shown if click count is > 0) */}
                {selectedLink.clickCount > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Device breakdown card */}
                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/30">
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-indigo-500" />
                        Device Distribution
                      </h3>
                      
                      <div className="space-y-3.5">
                        {/* Desktop */}
                        <div>
                          <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                            <span className="flex items-center gap-1"><Monitor className="w-3.5 h-3.5" /> Desktop</span>
                            <span className="font-mono">{deviceStats.Desktop} ({totalLogsCount > 0 ? Math.round((deviceStats.Desktop / totalLogsCount) * 100) : 0}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-slate-900 h-full rounded-full"
                              style={{ width: `${totalLogsCount > 0 ? (deviceStats.Desktop / totalLogsCount) * 100 : 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Mobile */}
                        <div>
                          <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                            <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> Mobile</span>
                            <span className="font-mono">{deviceStats.Mobile} ({totalLogsCount > 0 ? Math.round((deviceStats.Mobile / totalLogsCount) * 100) : 0}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full"
                              style={{ width: `${totalLogsCount > 0 ? (deviceStats.Mobile / totalLogsCount) * 100 : 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Tablet */}
                        <div>
                          <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                            <span className="flex items-center gap-1"><Laptop className="w-3.5 h-3.5" /> Tablet</span>
                            <span className="font-mono">{deviceStats.Tablet} ({totalLogsCount > 0 ? Math.round((deviceStats.Tablet / totalLogsCount) * 100) : 0}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-amber-500 h-full rounded-full"
                              style={{ width: `${totalLogsCount > 0 ? (deviceStats.Tablet / totalLogsCount) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Browser breakdown card */}
                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/30">
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-indigo-500" />
                        Top Browsers
                      </h3>
                      
                      {browserStats.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-4">No browser logs captured</p>
                      ) : (
                        <div className="space-y-3">
                          {browserStats.map(([browserName, count]) => {
                            const pct = totalLogsCount > 0 ? Math.round((count / totalLogsCount) * 100) : 0;
                            return (
                              <div key={browserName}>
                                <div className="flex justify-between text-xs text-slate-700 mb-1 font-medium">
                                  <span>{browserName}</span>
                                  <span className="font-mono">{count} clicks ({pct}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-indigo-500 h-full rounded-full" 
                                    style={{ width: `${pct}%` }} 
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Referrer Statistics */}
                {selectedLink.clickCount > 0 && (
                  <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/30">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <ExternalLink className="w-4 h-4 text-indigo-500" />
                      Traffic Sources & Referrers
                    </h3>
                    
                    {referrerStats.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">No referrers logged yet</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {referrerStats.map(([domain, count]) => (
                          <div key={domain} className="py-2 flex items-center justify-between text-xs">
                            <span className="font-mono text-slate-700 truncate max-w-sm" title={domain}>
                              {domain}
                            </span>
                            <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded font-mono">
                              {count} visits
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Click Logs Table */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                    <span>Recent Visitor Activity Logs</span>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-normal font-mono">
                      Showing up to 50 entries
                    </span>
                  </h3>

                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-inner max-h-[280px] overflow-y-auto">
                    {loadingLogs ? (
                      <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                        <span className="text-xs">Loading logs...</span>
                      </div>
                    ) : selectedLogs.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <p className="text-xs italic">No activity logs recorded yet.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                            <th className="p-3">Time</th>
                            <th className="p-3">Device & Browser</th>
                            <th className="p-3">Operating System</th>
                            <th className="p-3">Referrer</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                          {selectedLogs.map((log) => {
                            const date = log.timestamp?.toDate 
                              ? log.timestamp.toDate() 
                              : new Date(log.timestamp);
                            
                            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

                            return (
                              <tr key={log.id} className="hover:bg-slate-50/50">
                                <td className="p-3 font-mono whitespace-nowrap">
                                  <div className="font-semibold">{timeStr}</div>
                                  <div className="text-[10px] text-slate-400">{dateStr}</div>
                                </td>
                                <td className="p-3">
                                  <div className="font-semibold flex items-center gap-1">
                                    {log.device === 'Mobile' ? (
                                      <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                                    ) : (
                                      <Monitor className="w-3.5 h-3.5 text-indigo-500" />
                                    )}
                                    {log.browser}
                                  </div>
                                </td>
                                <td className="p-3 font-mono text-slate-500">
                                  {log.os}
                                </td>
                                <td className="p-3 max-w-[150px] truncate font-mono text-[11px] text-slate-500" title={log.referrer}>
                                  {log.referrer}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </motion.div>
            ) : (
              <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center flex flex-col items-center justify-center min-h-[500px]">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
                  <BarChart3 className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Select a Link to View Insights</h2>
                <p className="text-sm text-slate-500 mt-2 max-w-sm">
                  Choose any tracking link from the left directory to inspect its performance metrics, traffic sources, and real-time visitor logs.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

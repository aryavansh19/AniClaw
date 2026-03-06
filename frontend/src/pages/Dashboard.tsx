import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Trash2, Clock, LogOut, Settings, Home, Bell, X, PlayCircle, CheckCircle, TrendingUp, Flame } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// --- Types & Data ---
type Anime = {
  id: number;
  anilist_id?: number;
  title: string;
  image: string;
  currentEpisode: number;
  nextEpisodeTime: string | null; // ISO string
  status?: string;
};

// --- Helper Components ---

function Countdown({ targetDate, status }: { targetDate: string | null, status?: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [computedState, setComputedState] = useState<'tba' | 'waiting' | 'airing' | 'fetching' | 'completed'>('waiting');

  useEffect(() => {
    const updateState = () => {
      if (status === 'tba') {
        setComputedState('tba');
        return;
      }
      if (status === 'completed') {
        setComputedState('completed');
        return;
      }
      if (status === 'fetching') {
        setComputedState('fetching');
        return;
      }
      if (!targetDate) {
        setComputedState('tba');
        return;
      }

      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference > 0) {
        setComputedState('waiting');
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else if (difference <= 0 && difference > -3600000) {
        // Between exactly 0 and 3600 seconds (1 hour buffer)
        setComputedState('airing');
      } else {
        // More than 1 hour past the target and status hasn't reset
        setComputedState('fetching');
      }
    };

    updateState();
    const interval = setInterval(updateState, 1000);
    return () => clearInterval(interval);
  }, [targetDate, status]);

  if (computedState === 'tba') {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-zinc-900 border border-white/10 rounded-2xl">
        <h3 className="text-gray-300 font-bold text-lg mb-1">To Be Announced</h3>
        <p className="text-gray-500 text-sm text-center">Release date is currently unknown.</p>
      </div>
    );
  }

  if (computedState === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-zinc-900 border border-green-500/30 rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.15)]">
        <h3 className="text-green-500 font-bold text-lg mb-1">Season Completed</h3>
        <p className="text-gray-400 text-sm text-center">All episodes have aired.</p>
      </div>
    );
  }

  if (computedState === 'airing') {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-zinc-900 border border-blue-500/30 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.15)]">
        <div className="animate-pulse mb-4 rounded-full h-4 w-4 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]"></div>
        <h3 className="text-blue-500 font-bold text-lg mb-1">Airing Now</h3>
        <p className="text-gray-400 text-sm text-center">The episode is currently broadcasting in Japan.</p>
      </div>
    );
  }

  if (computedState === 'fetching') {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-zinc-900 border border-[#E50914]/30 rounded-2xl shadow-[0_0_20px_rgba(229,9,20,0.15)]">
        <div className="animate-spin mb-4 rounded-full h-10 w-10 border-t-2 border-[#E50914] border-r-2 border-r-transparent"></div>
        <h3 className="text-[#E50914] font-bold text-lg mb-1">Fetching Links...</h3>
        <p className="text-gray-400 text-sm text-center">The episode has aired! We are gathering the streams from our sources.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 justify-center p-6 bg-zinc-900 border border-white/5 rounded-2xl text-center shadow-lg">
      {[
        { label: 'Days', value: timeLeft.days },
        { label: 'Hours', value: timeLeft.hours },
        { label: 'Mins', value: timeLeft.minutes },
        { label: 'Secs', value: timeLeft.seconds },
      ].map((item, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="w-16 h-16 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-[0_0_15px_rgba(229,9,20,0.2)]">
            {item.value.toString().padStart(2, '0')}
          </div>
          <span className="text-xs text-gray-500 mt-2 uppercase tracking-wider font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

const ANILIST_QUERY = `
query ($search: String) {
  Page(perPage: 10) {
    media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
      id
      title {
        english
        romaji
      }
      coverImage {
        large
      }
      nextAiringEpisode {
        airingAt
        episode
      }
      status
    }
  }
}
`;

async function fetchAniList(search: string) {
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: ANILIST_QUERY,
      variables: { search }
    }),
  });
  const result = await response.json();
  return result.data.Page.media;
}


export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'discover' | 'notifications' | 'settings'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [watchlist, setWatchlist] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyActiveSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate('/');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        await supabase.auth.signOut();
        navigate('/');
      }
    };

    verifyActiveSession();
  }, [navigate]);

  // --- Helper to get grid state ---
  const getComputedState = (anime: Anime) => {
    if (anime.status === 'tba') return 'tba';
    if (anime.status === 'completed') return 'completed';
    if (anime.status === 'fetching') return 'fetching';
    if (!anime.nextEpisodeTime) return 'tba';

    const now = new Date().getTime();
    const target = new Date(anime.nextEpisodeTime).getTime();
    const diff = target - now;

    if (diff > 0) return 'waiting';
    if (diff <= 0 && diff > -3600000) return 'airing';
    return 'fetching';
  };

  // --- Profile State ---
  const [userProfile, setUserProfile] = useState<{ email: string; full_name: string; whatsapp_number: string | null } | null>(null);
  const [whatsappInput, setWhatsappInput] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // --- Notifications State ---
  const [notifications, setNotifications] = useState<any[]>([]);
  const triggeredRefs = useRef<Set<string>>(new Set());

  // Load notifications from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('aniclaw_notifications');
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch (e) { }
    }
  }, []);

  const addNotification = (title: string, message: string) => {
    const newNotif = {
      id: Date.now().toString(),
      title,
      message,
      time: 'Just now',
      unread: true
    };
    setNotifications(prev => {
      const next = [newNotif, ...prev];
      localStorage.setItem('aniclaw_notifications', JSON.stringify(next));
      return next;
    });
  };

  // --- Timer & Logic Monitor ---
  useEffect(() => {
    const checkTimers = () => {
      const now = new Date().getTime();
      const currentList = [...watchlist];

      currentList.forEach((anime, index) => {
        if (!anime.nextEpisodeTime) return;

        const target = new Date(anime.nextEpisodeTime).getTime();
        const diff = target - now;
        const diffMinutes = Math.floor(diff / 60000);

        const epLabel = anime.currentEpisode ? anime.currentEpisode + 1 : '?';

        // 30 Mins Reminder
        const id30 = `${anime.id}-30m-${epLabel}`;
        if (diffMinutes === 30 && !triggeredRefs.current.has(id30)) {
          triggeredRefs.current.add(id30);
          addNotification(anime.title, `Episode ${epLabel} is dropping in 30 minutes!`);
        }

        // Exact Time Reminder (When it hits 0 -> Airing Now)
        const id0 = `${anime.id}-0m-${epLabel}`;
        if (diff <= 0 && !triggeredRefs.current.has(id0)) {
          triggeredRefs.current.add(id0);
          addNotification(anime.title, `Episode ${epLabel} is Airing Now!`);
        }
      });
    };

    const interval = setInterval(checkTimers, 10000); // Check every 10 seconds
    checkTimers(); // Immediate initial check

    return () => clearInterval(interval);
  }, [watchlist, selectedAnime]);

  // Realtime Supabase Subscription
  useEffect(() => {
    // Listen to changes on the 'anime' table
    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'anime' },
        (payload) => {
          console.log("Realtime Anime Update received:", payload);
          // When an anime is updated, just fetch the fresh watchlist to keep UI in sync
          fetchMyWatchlist();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Create a function to fetch the data
  const fetchMyWatchlist = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserProfile({
        email: user.email || '',
        full_name: user.user_metadata?.full_name || '',
        whatsapp_number: user.user_metadata?.whatsapp_number || null
      });

      // The "Magic" Query: Join subs with anime
      const { data, error } = await supabase
        .from('subs')
        .select(`
        id,
        anilist_id,
        anime (
          title,
          image_url,
          last_ep,
          next_airing_at,
          status
        )
      `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Flatten the nested 'anime' object so it works with your existing Card component
      const formattedData = data.map((item: any) => ({
        id: item.id, // The ID of the subscription
        anilist_id: item.anilist_id,
        title: item.anime.title,
        image: item.anime.image_url,
        currentEpisode: item.anime.last_ep,
        status: item.anime.status,
        // Convert Unix timestamp (seconds) to JS Date (milliseconds)
        nextEpisodeTime: item.anime.next_airing_at !== 2147483647
          ? new Date(item.anime.next_airing_at * 1000).toISOString()
          : null
      }));

      setWatchlist(formattedData);
    } catch (err) {
      console.error("Error fetching watchlist:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectWhatsapp = async () => {
    if (!whatsappInput) return;
    setIsUpdatingProfile(true);
    const { error } = await supabase.auth.updateUser({
      data: { whatsapp_number: whatsappInput }
    });
    if (!error && userProfile) {
      setUserProfile({ ...userProfile, whatsapp_number: whatsappInput });
      setWhatsappInput('');
    }
    setIsUpdatingProfile(false);
  };

  const handleDeleteWhatsapp = async () => {
    if (!confirm('Are you sure you want to disconnect your WhatsApp number? You will no longer receive episode reminders.')) return;
    setIsUpdatingProfile(true);
    const { error } = await supabase.auth.updateUser({
      data: { whatsapp_number: null }
    });
    if (!error && userProfile) {
      setUserProfile({ ...userProfile, whatsapp_number: null });
    }
    setIsUpdatingProfile(false);
  };

  const handleDeleteAccount = async () => {
    showDialog(
      "Delete Account",
      "Are you sure you want to completely delete your account and all tracking data? This action cannot be undone.",
      "confirm",
      async () => {
        setIsUpdatingProfile(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const response = await fetch('http://localhost:8000/api/user/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id })
          });

          const result = await response.json();
          if (result.success) {
            // Wipe persistent frontend data tied to this deleted identity 
            localStorage.removeItem('aniclaw_notifications');
            await supabase.auth.signOut();
            window.location.href = '/';
          } else {
            showDialog("Delete Failed", result.message || "Failed to delete account.", "error");
          }
        } catch (err) {
          console.error("Delete account error", err);
          showDialog("Connection Error", "Failed to connect to backend securely.", "error");
        } finally {
          setIsUpdatingProfile(false);
        }
      }
    );
  };

  // Fetch on initial load
  useEffect(() => {
    fetchMyWatchlist();
  }, []);

  const handleDelete = async (e: React.MouseEvent, subId: number) => {
    e.stopPropagation();

    // Show custom confirmation dialog
    showDialog("Stop Tracking Anime", "Are you sure you want to stop tracking this anime? This action cannot be undone.", "confirm", async () => {
      try {
        const { error } = await supabase
          .from('subs')
          .delete()
          .eq('id', subId);

        if (error) throw error;

        // Refresh the list immediately
        fetchMyWatchlist();
      } catch (err) {
        console.error("Delete error:", err);
        showDialog("Delete Error", "Failed to delete from tracking.", "error");
      }
    });
  };

  // 1. New States
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingAnimeId, setAddingAnimeId] = useState<number | null>(null);
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean,
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'confirm',
    onConfirm?: () => void
  }>({ isOpen: false, title: '', message: '', type: 'info' });

  const showDialog = (title: string, message: string, type: 'success' | 'error' | 'info' | 'confirm' = 'info', onConfirm?: () => void) => {
    setDialogState({ isOpen: true, title, message, type, onConfirm });
  };

  const closeDialog = () => setDialogState(prev => ({ ...prev, isOpen: false }));

  // 2. Search Effect (Debounced)
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await fetchAniList(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 500); // Wait 500ms after typing stops

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleAdd = async (anime: any) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      showDialog("Authentication Required", "You must be logged in to track anime.", "error");
      return;
    }

    // Check if already tracking
    const isTracking = watchlist.some((item) => item.anilist_id === anime.id);
    if (isTracking) {
      showDialog("Already Tracking", "You are already tracking this anime.", "info");
      return;
    }

    // Check if the anime has already finished airing
    if (anime.status === 'FINISHED') {
      showDialog("Season Completed", "This anime has finished airing, so tracking is not available.", "info");
      return;
    }

    setAddingAnimeId(anime.id);

    try {
      const response = await fetch('http://localhost:8000/api/track/web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anilist_id: anime.id,
          user_id: user.id
        })
      });

      const result = await response.json();
      if (result.success) {
        showDialog("Tracking Added", `Scout is now tracking ${result.title}!`, "success");
        // Refresh your watchlist here
        fetchMyWatchlist();
      } else {
        showDialog("Tracking Failed", "Could not add anime to scout.", "error");
      }
    } catch (err) {
      console.error("Failed to call Python API", err);
      showDialog("Connection Error", "Failed to connect to the tracking server.", "error");
    } finally {
      setAddingAnimeId(null);
    }
  };


  const totalWatchedCount = watchlist.reduce((sum, anime) => sum + (anime.currentEpisode || 0), 0);
  const upcomingThisWeekCount = watchlist.filter(anime => {
    if (!anime.nextEpisodeTime) return false;
    const diff = new Date(anime.nextEpisodeTime).getTime() - Date.now();
    // In the future (within 7 days) OR currently in the 1 hour airing buffer
    return (diff > -3600000 && diff <= 7 * 24 * 60 * 60 * 1000);
  }).length;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex font-sans selection:bg-[#E50914] selection:text-white">

      {/* Sidebar */}
      <aside className="w-64 bg-zinc-950 border-r border-white/5 hidden md:flex flex-col">
        <div className="p-8">
          <Link to="/" className="flex items-center gap-3 cursor-pointer group">
            <span className="text-[#E50914] font-display font-extrabold text-3xl tracking-widest drop-shadow-[0_0_15px_rgba(229,9,20,0.5)]">ANICLAW</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 flex flex-col gap-2 mt-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-[#E50914]/10 text-[#E50914]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Home className="w-5 h-5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'discover' ? 'bg-[#E50914]/10 text-[#E50914]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Search className="w-5 h-5" />
            Discover
          </button>
          <button
            onClick={() => {
              setActiveTab('notifications');
              // Mark as read after a short 2-sec delay
              setTimeout(() => {
                setNotifications(prev => {
                  const updated = prev.map(n => ({ ...n, unread: false }));
                  localStorage.setItem('aniclaw_notifications', JSON.stringify(updated));
                  return updated;
                });
              }, 2000);
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors relative ${activeTab === 'notifications' ? 'bg-[#E50914]/10 text-[#E50914]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Bell className="w-5 h-5" />
            Notifications
            {notifications.some(n => n.unread) && (
              <span className="absolute top-3 right-4 w-2 h-2 bg-[#E50914] rounded-full shadow-[0_0_5px_rgba(229,9,20,0.8)] animate-pulse"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'settings' ? 'bg-[#E50914]/10 text-[#E50914]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors">
            <LogOut className="w-5 h-5" />
            Log Out
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Topbar */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-xl font-bold">
            {activeTab === 'dashboard' && 'My Watchlist'}
            {activeTab === 'discover' && 'Discover Anime'}
            {activeTab === 'notifications' && 'Notifications'}
            {activeTab === 'settings' && 'Settings'}
          </h1>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden">
              <img src="https://picsum.photos/seed/avatar/100/100" alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">

          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-gray-400 text-sm font-medium mb-2">Tracking</h3>
                  <p className="text-3xl font-bold">{watchlist.length} <span className="text-lg text-gray-500 font-normal">Anime</span></p>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-gray-400 text-sm font-medium mb-2">Upcoming This Week</h3>
                  <p className="text-3xl font-bold text-[#E50914]">{upcomingThisWeekCount} <span className="text-lg text-gray-500 font-normal">Episodes</span></p>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-gray-400 text-sm font-medium mb-2">Total Watched</h3>
                  <p className="text-3xl font-bold">{totalWatchedCount} <span className="text-lg text-gray-500 font-normal">Episodes</span></p>
                </div>
              </div>

              {/* Watchlist Grid */}
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-[#E50914]" />
                Currently Tracking
              </h2>

              {isLoading ? (
                <div className="flex justify-center p-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#E50914] border-r-2 border-r-transparent"></div>
                </div>
              ) : watchlist.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <AnimatePresence>
                    {watchlist.map(anime => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={anime.id}
                        onClick={() => setSelectedAnime(anime)}
                        className="group relative bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 hover:border-[#E50914]/50 transition-colors cursor-pointer shadow-lg"
                      >
                        <div className="aspect-[3/4] relative overflow-hidden">
                          <img
                            src={anime.image}
                            alt={anime.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                          {/* Remove Button */}
                          <button
                            onClick={(e) => handleDelete(e, anime.id)}
                            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-[#E50914] backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* Info */}
                          <div className="absolute bottom-0 left-0 w-full p-5">
                            <h3 className="font-bold text-lg leading-tight mb-1">{anime.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                              <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">EP {anime.currentEpisode || '?'}</span>
                              {(() => {
                                const state = getComputedState(anime);
                                if (state === 'tba') return <span className="flex items-center gap-1 text-gray-400 font-medium">TBA</span>;
                                if (state === 'completed') return <span className="flex items-center gap-1 text-green-500 font-medium">Completed</span>;
                                if (state === 'fetching') return <span className="flex items-center gap-1 text-[#E50914] font-medium animate-pulse"><Clock className="w-3 h-3" /> Fetching</span>;
                                if (state === 'airing') return <span className="flex items-center gap-1 text-blue-500 font-medium animate-pulse"><Clock className="w-3 h-3" /> Airing Now</span>;
                                return <span className="flex items-center gap-1 text-[#E50914] font-medium"><Clock className="w-3 h-3" /> Upcoming</span>;
                              })()}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-20 bg-zinc-900/50 rounded-3xl border border-dashed border-white/10">
                  <p className="text-gray-400">Your Scout list is empty.</p>
                  <p className="text-sm text-gray-500 mt-1">Search for an anime in the Discover tab to start tracking!</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'discover' && (
            <div className="w-full flex flex-col gap-6 h-[calc(100vh-120px)]">
              {/* Top 20% - Search Box */}
              <div className="flex-none h-[20%] min-h-[120px] bg-transparent border border-dashed border-white/10 rounded-3xl p-6 flex flex-col justify-center relative">
                <div className="w-full flex gap-3 relative">
                  <div className="relative flex-1">
                    <Search className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 ${isSearching ? 'animate-pulse text-[#E50914]' : 'text-gray-500'}`} />
                    <input
                      type="text"
                      placeholder="Search for anime..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-white focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] shadow-lg text-lg transition-all h-full"
                    />
                  </div>
                  <button
                    onClick={() => { }}
                    className="px-8 bg-[#E50914] hover:bg-[#b80710] text-white font-bold rounded-2xl shadow-[0_0_20px_rgba(229,9,20,0.3)] hover:shadow-[0_0_30px_rgba(229,9,20,0.5)] transition-all flex items-center gap-2"
                  >
                    Search
                  </button>
                </div>
              </div>

              {/* Bottom 80% - Results Box */}
              <div className="flex-1 bg-transparent border border-dashed border-white/10 rounded-3xl p-6 overflow-y-auto custom-scrollbar">
                {!searchQuery && searchResults.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <p className="flex items-center gap-2"><Search className="w-4 h-4" /> Search for an anime to start tracking...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 pb-6">
                    {searchResults.map((anime) => (
                      <motion.div key={anime.id} layout className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 shadow-lg relative group">
                        <div className="aspect-[3/4] relative overflow-hidden">
                          <img src={anime.coverImage.large} alt="cover" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
                            {anime.status === 'RELEASING' && <span className="bg-[#E50914] text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-lg">RELEASING</span>}
                            {anime.status === 'FINISHED' && <span className="bg-green-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-lg backdrop-blur-sm">FINISHED</span>}
                            {anime.status === 'NOT_YET_RELEASED' && <span className="bg-blue-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-lg backdrop-blur-sm">UPCOMING</span>}
                            {anime.status === 'HIATUS' && <span className="bg-yellow-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-lg backdrop-blur-sm">HIATUS</span>}
                            {anime.status === 'CANCELLED' && <span className="bg-red-900/90 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-lg backdrop-blur-sm">CANCELLED</span>}
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent p-3 flex flex-col justify-end opacity-90 group-hover:opacity-100 transition-opacity">
                            <h3 className="font-bold text-xs leading-snug line-clamp-2">{anime.title.english || anime.title.romaji}</h3>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleAdd(anime)}
                              disabled={addingAnimeId === anime.id}
                              className="mt-2 w-full bg-[#E50914] py-2 rounded text-[11px] font-bold hover:bg-[#b80710] disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1 shadow-[0_0_10px_rgba(229,9,20,0.2)]"
                            >
                              {addingAnimeId === anime.id ? (
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <Plus className="w-3 h-3" />
                              )}
                              {addingAnimeId === anime.id ? 'Loading' : 'Scout'}
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="w-full">
              {notifications.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {notifications.map(notif => (
                    <div key={notif.id} className={`p-5 rounded-2xl border ${notif.unread ? 'bg-zinc-900 border-[#E50914]/30' : 'bg-zinc-900/50 border-white/5'} flex items-start gap-4 transition-colors duration-300`}>
                      <div className={`p-3 rounded-full ${notif.unread ? 'bg-[#E50914]/20 text-[#E50914]' : 'bg-white/5 text-gray-400'}`}>
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">{notif.title}</h4>
                        <p className="text-gray-400 mt-1">{notif.message}</p>
                        <span className="text-xs text-gray-500 mt-2 block">{notif.time}</span>
                      </div>
                      {notif.unread && <div className="w-3 h-3 rounded-full bg-[#E50914] mt-2 shadow-[0_0_8px_rgba(229,9,20,0.8)]"></div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-zinc-900/50 rounded-3xl border border-dashed border-white/10">
                  <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
                  <p className="text-gray-400 text-lg">You have no notifications yet.</p>
                  <p className="text-sm text-gray-500 mt-2">We'll alert you when new episodes are about to drop!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="w-full">
              <div className="flex flex-col gap-10">
                <div className="pb-8 border-b border-white/5">
                  <h3 className="text-lg font-bold mb-4">Profile Information</h3>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Full Name</label>
                      <input type="text" readOnly value={userProfile?.full_name || ''} className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E50914] opacity-70 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Email Address</label>
                      <input type="email" readOnly value={userProfile?.email || ''} className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E50914] opacity-70 cursor-not-allowed" />
                    </div>
                  </div>
                </div>

                <div className="pb-8 border-b border-white/5">
                  <h3 className="text-lg font-bold mb-4">WhatsApp Integration</h3>
                  <p className="text-sm text-gray-400 mb-4">Connect your WhatsApp number to receive instant episode reminders.</p>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Phone Number</label>
                    <div className="flex gap-4">
                      {userProfile?.whatsapp_number ? (
                        <>
                          <div className="flex-1 bg-zinc-950 border border-green-500/50 rounded-xl px-4 py-3 text-green-500 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" /> Connected: {userProfile.whatsapp_number}
                          </div>
                          <button onClick={handleDeleteWhatsapp} disabled={isUpdatingProfile} className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-colors">Disconnect</button>
                        </>
                      ) : (
                        <>
                          <input type="tel" value={whatsappInput} onChange={(e) => setWhatsappInput(e.target.value)} placeholder="+1 (555) 000-0000" className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E50914]" />
                          <button onClick={handleConnectWhatsapp} disabled={isUpdatingProfile || !whatsappInput} className="bg-[#E50914] hover:bg-[#b80710] disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-colors">
                            {isUpdatingProfile ? 'Connecting...' : 'Connect'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pb-8">
                  <h3 className="text-lg font-bold mb-4 text-red-500">Danger Zone</h3>
                  <button className="border border-red-500/50 text-red-500 hover:bg-red-500/10 px-6 py-3 rounded-xl font-bold transition-colors" onClick={handleDeleteAccount} disabled={isUpdatingProfile}>
                    {isUpdatingProfile ? 'Deleting...' : 'Delete Account'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Anime Detail / Countdown Modal */}
      <AnimatePresence>
        {selectedAnime && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAnime(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
            >
              <button
                onClick={() => setSelectedAnime(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-white/10 backdrop-blur-md rounded-full text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="h-64 relative">
                <img src={selectedAnime.image} alt={selectedAnime.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
              </div>

              <div className="p-8 -mt-20 relative z-10">
                <div className="inline-block bg-[#E50914] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4 shadow-[0_0_10px_rgba(229,9,20,0.5)]">
                  Episode {selectedAnime.currentEpisode + 1}
                </div>
                <h2 className="text-4xl font-display font-extrabold mb-2">{selectedAnime.title}</h2>
                <p className="text-gray-400 mb-8">Get ready for the next episode. WhatsApp reminder will be sent 15 minutes before release.</p>

                <Countdown targetDate={selectedAnime.nextEpisodeTime} status={selectedAnime.status} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Dialog Modal */}
      <AnimatePresence>
        {dialogState.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDialog}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-[#E50914]/50 via-[#E50914] to-[#E50914]/50" />
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 pr-8 text-white">{dialogState.title}</h3>
                <p className="text-gray-300 mb-6 font-medium">{dialogState.message}</p>
                <div className="flex justify-end gap-3 mt-4">
                  {dialogState.type === 'confirm' ? (
                    <>
                      <button
                        onClick={closeDialog}
                        className="bg-transparent border border-white/20 hover:bg-white/10 text-white px-5 py-2 rounded-xl font-bold transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (dialogState.onConfirm) dialogState.onConfirm();
                          closeDialog();
                        }}
                        className="bg-[#E50914] hover:bg-[#b80710] text-white px-6 py-2 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(229,9,20,0.3)] hover:shadow-[0_0_20px_rgba(229,9,20,0.5)]"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={closeDialog}
                      className="bg-[#E50914] hover:bg-[#b80710] text-white px-6 py-2 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(229,9,20,0.3)] hover:shadow-[0_0_20px_rgba(229,9,20,0.5)]"
                    >
                      Okay
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={closeDialog}
                className="absolute top-5 right-4 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

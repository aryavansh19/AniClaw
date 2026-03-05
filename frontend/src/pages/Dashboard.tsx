import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Trash2, Clock, LogOut, Settings, Home, Bell, X, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
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

const MOCK_NOTIFICATIONS = [
  { id: 1, title: 'Jujutsu Kaisen', message: 'Episode 48 is releasing in 1 hour!', time: '1 hour ago', unread: true },
  { id: 2, title: 'Demon Slayer', message: 'Episode 55 is now available!', time: '2 days ago', unread: false },
  { id: 3, title: 'System', message: 'Welcome to ANICLAW! Add your first anime to get started.', time: '1 week ago', unread: false },
];

// --- Helper Components ---

function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="flex gap-4 justify-center mt-6">
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

  // Create a function to fetch the data
  const fetchMyWatchlist = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
    }
  };


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
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'notifications' ? 'bg-[#E50914]/10 text-[#E50914]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Bell className="w-5 h-5" />
            Notifications
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
              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-gray-400 text-sm font-medium mb-2">Tracking</h3>
                  <p className="text-3xl font-bold">{watchlist.length} <span className="text-lg text-gray-500 font-normal">Anime</span></p>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-gray-400 text-sm font-medium mb-2">Upcoming This Week</h3>
                  <p className="text-3xl font-bold text-[#E50914]">2 <span className="text-lg text-gray-500 font-normal">Episodes</span></p>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-gray-400 text-sm font-medium mb-2">Total Watched</h3>
                  <p className="text-3xl font-bold">114 <span className="text-lg text-gray-500 font-normal">Episodes</span></p>
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
                              {anime.nextEpisodeTime && (
                                <span className="flex items-center gap-1 text-[#E50914] font-medium">
                                  <Clock className="w-3 h-3" /> Upcoming
                                </span>
                              )}
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
            <div className="max-w-3xl mx-auto">
              <div className="relative mb-10">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isSearching ? 'animate-pulse text-[#E50914]' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Search for anime (e.g. Solo Leveling)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-12 pr-5 py-4 text-white focus:outline-none focus:border-[#E50914] transition-colors shadow-lg text-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((anime) => (
                  <motion.div key={anime.id} layout className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 shadow-lg">
                    <div className="aspect-[3/4] relative">
                      <img src={anime.coverImage.large} alt="cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black p-4 flex flex-col justify-end">
                        <h3 className="font-bold text-sm leading-tight">{anime.title.english || anime.title.romaji}</h3>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleAdd(anime)}
                          className="mt-2 w-full bg-[#E50914] py-2 rounded-lg text-xs font-bold hover:bg-[#b80710] transition-colors flex items-center justify-center gap-1 shadow-[0_0_10px_rgba(229,9,20,0.2)] hover:shadow-[0_0_15px_rgba(229,9,20,0.5)]"
                        >
                          <Plus className="w-3 h-3" /> Add to Scout
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-3xl mx-auto">
              <div className="flex flex-col gap-4">
                {MOCK_NOTIFICATIONS.map(notif => (
                  <div key={notif.id} className={`p-5 rounded-2xl border ${notif.unread ? 'bg-zinc-900 border-[#E50914]/30' : 'bg-zinc-900/50 border-white/5'} flex items-start gap-4`}>
                    <div className={`p-3 rounded-full ${notif.unread ? 'bg-[#E50914]/20 text-[#E50914]' : 'bg-white/5 text-gray-400'}`}>
                      <Bell className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg">{notif.title}</h4>
                      <p className="text-gray-400 mt-1">{notif.message}</p>
                      <span className="text-xs text-gray-500 mt-2 block">{notif.time}</span>
                    </div>
                    {notif.unread && <div className="w-3 h-3 rounded-full bg-[#E50914] mt-2"></div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <h3 className="text-lg font-bold mb-4">Profile Information</h3>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Full Name</label>
                      <input type="text" defaultValue="Weeb Master" className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E50914]" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Email Address</label>
                      <input type="email" defaultValue="weeb@example.com" className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E50914]" />
                    </div>
                  </div>
                </div>

                <div className="p-6 border-b border-white/5">
                  <h3 className="text-lg font-bold mb-4">WhatsApp Integration</h3>
                  <p className="text-sm text-gray-400 mb-4">Connect your WhatsApp number to receive instant episode reminders.</p>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Phone Number</label>
                    <div className="flex gap-4">
                      <input type="tel" placeholder="+1 (555) 000-0000" className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E50914]" />
                      <button className="bg-[#E50914] hover:bg-[#b80710] text-white px-6 py-3 rounded-xl font-bold transition-colors">Connect</button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold mb-4 text-red-500">Danger Zone</h3>
                  <button className="border border-red-500/50 text-red-500 hover:bg-red-500/10 px-6 py-3 rounded-xl font-bold transition-colors">Delete Account</button>
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

                <div className="bg-zinc-900 border border-white/5 rounded-2xl p-8 text-center">
                  {selectedAnime.nextEpisodeTime ? (
                    <>
                      <h3 className="text-gray-300 font-medium mb-4 flex items-center justify-center gap-2">
                        <Clock className="w-5 h-5 text-[#E50914]" />
                        Time until release
                      </h3>
                      <Countdown targetDate={selectedAnime.nextEpisodeTime} />
                    </>
                  ) : (
                    <div className="py-8">
                      <h3 className="text-xl font-bold text-gray-300 mb-2">Season Complete / Hiatus</h3>
                      <p className="text-gray-500">No upcoming episodes scheduled at this time.</p>
                    </div>
                  )}
                </div>
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

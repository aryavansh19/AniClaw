import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, User, Phone, CheckCircle } from 'lucide-react';
import SlantedPanels from '../components/SlantedPanels';
import { supabase } from '../lib/supabase';

function AuthBackground() {
  return (
    <div className="absolute inset-0 z-0 bg-black overflow-hidden">
      <SlantedPanels />
      {/* Gradient overlay to blend with the UI and ensure readability */}
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />
      <div className="absolute inset-0 z-20 bg-gradient-to-r from-black/90 via-black/40 to-black/90 pointer-events-none" />
    </div>
  );
}

export default function Auth({ defaultIsLogin = true }: { defaultIsLogin?: boolean }) {
  const [isLogin, setIsLogin] = useState(defaultIsLogin);
  const [signupStep, setSignupStep] = useState<'details' | 'whatsapp'>('details');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  const handleSignupStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setError('Please fill in all fields.');
      return;
    }
    setError(null);
    setSignupStep('whatsapp');
  };

  const handleSignupStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappNumber) {
      setError('Please enter your WhatsApp number.');
      return;
    }
    setLoading(true);
    setError(null);

    // [TESTING OVERRIDE] Hardcoded verification
    // Instead of opening WhatsApp, we just simulate a successful verification delay
    setTimeout(async () => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            whatsapp_number: whatsappNumber,
            whatsapp_verified: true // storing a flag that we verified it
          }
        }
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        navigate('/dashboard');
      }
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (isLogin) {
      handleLogin(e);
    } else if (signupStep === 'details') {
      handleSignupStep1(e);
    } else {
      handleSignupStep2(e);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden selection:bg-[#E50914] selection:text-white font-sans">
      <AuthBackground />

      {/* Back Button */}
      <Link
        to="/"
        className="absolute top-8 left-8 z-20 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Home</span>
      </Link>

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md p-8 sm:p-10 bg-zinc-950/90 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.8)] mx-4"
      >
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <span className="text-[#E50914] font-display font-extrabold text-4xl tracking-widest drop-shadow-[0_0_15px_rgba(229,9,20,0.3)]">ANICLAW</span>
        </div>

        {/* Toggle */}
        <div className="flex p-1 mb-8 bg-zinc-900/80 rounded-xl relative border border-white/5">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-3 text-center font-bold text-sm transition-colors z-10 rounded-lg ${isLogin ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-3 text-center font-bold text-sm transition-colors z-10 rounded-lg ${!isLogin ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Sign Up
          </button>

          {/* Active Indicator */}
          <motion.div
            className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-[#E50914] rounded-lg shadow-lg"
            animate={{ x: isLogin ? '0%' : '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        </div>

        {/* Form */}
        <AnimatePresence mode="wait">
          <motion.form
            key={isLogin ? 'login' : signupStep}
            initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-4"
            onSubmit={handleSubmit}
          >
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg text-center">
                {error}
              </div>
            )}

            {!isLogin && signupStep === 'whatsapp' ? (
              // STEP 2: WhatsApp Verification
              <>
                <div className="text-center mb-2">
                  <p className="text-gray-300 text-sm">Step 2 of 2: Phone Verification</p>
                  <p className="text-gray-500 text-xs mt-1">We need to verify your number to secure your account.</p>
                </div>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="WhatsApp Number (e.g. +1234567890)"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-12 pr-5 py-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#25D366]/50 focus:bg-zinc-800 transition-all"
                  />
                </div>
                <button
                  disabled={loading}
                  className="w-full bg-[#25D366] hover:bg-[#1ebd5b] disabled:opacity-50 text-white rounded-xl px-5 py-4 font-bold text-lg transition-all shadow-[0_4px_14px_0_rgba(37,211,102,0.39)] hover:shadow-[0_6px_20px_rgba(37,211,102,0.23)] hover:-translate-y-0.5 mt-4 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">Verifying <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" /></span>
                  ) : (
                    <>Open WhatsApp to Verify <CheckCircle className="w-5 h-5" /></>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSignupStep('details')}
                  className="text-sm text-gray-400 hover:text-white transition-colors mt-2"
                >
                  Back to Details
                </button>
              </>
            ) : (
              // LOGIN or STEP 1: Details
              <>
                {!isLogin && (
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-12 pr-5 py-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E50914]/50 focus:bg-zinc-800 transition-all"
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-12 pr-5 py-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E50914]/50 focus:bg-zinc-800 transition-all"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-12 pr-5 py-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E50914]/50 focus:bg-zinc-800 transition-all"
                  />
                </div>

                <button
                  disabled={loading}
                  className="w-full bg-[#E50914] hover:bg-[#b80710] disabled:opacity-50 text-white rounded-xl px-5 py-4 font-bold text-lg transition-all shadow-[0_4px_14px_0_rgba(229,9,20,0.39)] hover:shadow-[0_6px_20px_rgba(229,9,20,0.23)] hover:-translate-y-0.5 mt-4"
                >
                  {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Continue')}
                </button>

                {isLogin && (
                  <div className="text-center mt-4">
                    <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Forgot your password?</a>
                  </div>
                )}
              </>
            )}
          </motion.form>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from "../lib/supabase.js";
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-indigo-600/20 rounded-full blur-[120px] animate-blob" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[100px] animate-blob animation-delay-2000" />
    <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
  </div>
);

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isLogin, setIsLogin] = useState(location.pathname.includes("login"));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: ''
  });

  useEffect(() => {
    setIsLogin(location.pathname.includes("login"));
    setError("");
  }, [location]);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      if (isLogin) {
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (loginErr) throw loginErr;
        navigate('/dashboard', { replace: true });
      } else {
        if (formData.password !== formData.confirmPassword) throw new Error("Passwords do not match");
        const { error: signUpErr } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { name: formData.name }, emailRedirectTo: window.location.origin + '/dashboard' },
        });
        if (signUpErr) throw signUpErr;
        setIsSuccess(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Check your email</h2>
          <p className="text-sm text-slate-500 mt-2">We sent a verification link to <br/><span className="font-semibold text-slate-700">{formData.email}</span></p>
          <button onClick={() => { setIsSuccess(false); navigate('/auth/login'); }} className="mt-6 text-indigo-600 font-bold hover:underline text-sm">Back to login</button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 h-screen w-full bg-white flex flex-row overflow-hidden" 
    >
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(20px, -30px) scale(1.05); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 10s infinite alternate ease-in-out; }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>

      {/* ── LEFT SIDE ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F172A] p-12 flex-col justify-between relative overflow-hidden shrink-0 h-full">
        <MotionBackground />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12 cursor-pointer transition-transform active:scale-95 w-fit" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-sm rotate-45" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">MeetHub</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
            Turn meetings into <br />
            <span className="text-indigo-400">actionable insights.</span>
          </h1>
          <p className="text-slate-400 mt-6 text-base max-w-md leading-relaxed">
            Join thousands of teams using AI to capture decisions and track sentiment automatically.
          </p>
        </div>
      </div>

      {/* ── RIGHT SIDE ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-50 relative h-full overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div 
            key={isLogin ? 'login' : 'signup'}
            initial={{ opacity: 0, x: 15 }} 
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-[360px] my-auto"
          >
            <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-7 md:p-8">
              <div className="mb-6 text-center lg:text-left">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {isLogin ? 'Welcome back' : 'Create account'}
                </h2>
                <p className="text-slate-500 text-[13px] mt-1 font-medium">
                  {isLogin ? 'Enter your credentials' : 'Start your free trial today'}
                </p>
              </div>

              <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-slate-700 text-[13px] font-semibold hover:bg-slate-50 transition-all active:scale-[0.98] mb-6 shadow-sm">
                <img src="https://www.svgrepo.com/show/355037/google.svg" className="w-4 h-4" alt="G" />
                Continue with Google
              </button>

              <div className="relative mb-4 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <span className="relative bg-white px-2 text-[10px] text-slate-400 uppercase font-bold tracking-widest">Or</span>
              </div>

              {error && (
                <div className="mb-4 p-2.5 bg-red-50 border border-red-100 text-red-600 text-[12px] rounded-lg flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {!isLogin && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Full Name</label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500" />
                      <input type="text" name="name" required placeholder="Jane Doe" className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white outline-none transition-all" onChange={handleInputChange} />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Email address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500" />
                    <input 
                      type="email" 
                      name="email" // <--- ADDED NAME ATTRIBUTE
                      required 
                      placeholder="name@work.com" 
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white outline-none transition-all" 
                      onChange={handleInputChange} 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Password</label>
                    {isLogin && <button type="button" className="text-[10px] font-bold text-indigo-600">Forgot?</button>}
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      name="password" // <--- ADDED NAME ATTRIBUTE
                      required 
                      placeholder="••••••••" 
                      className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white outline-none transition-all" 
                      onChange={handleInputChange} 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-all">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Confirm Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        name="confirmPassword" // <--- ADDED NAME ATTRIBUTE
                        required 
                        placeholder="••••••••" 
                        className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white outline-none transition-all" 
                        onChange={handleInputChange} 
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-all">
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={isLoading} className="w-full bg-[#0F172A] text-white py-2.5 rounded-xl font-bold mt-2 hover:bg-black active:scale-[0.98] transition-all disabled:opacity-70 text-sm flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{isLogin ? 'Login' : 'Sign Up'} <ArrowRight className="w-3.5 h-3.5" /></>}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-[13px] text-slate-500 font-medium">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                  <button onClick={() => { navigate(isLogin ? "/auth/signup" : "/auth/login"); setError(""); }} className="text-indigo-600 font-bold hover:underline ml-1">
                    {isLogin ? 'Sign up' : 'Log in'}
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
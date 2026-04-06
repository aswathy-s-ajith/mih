import React, { useEffect, useRef, useState } from 'react';
import {
  Upload,
  CheckCircle,
  MessageSquare,
  BarChart3,
  ArrowRight,
  Users,
  Briefcase,
  UserCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ── Rings Background ──────────────────────────────────────────────
const MotionBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
    {/* Animated Gradient Orbs */}
    <div 
      className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50/50 rounded-full blur-[120px] animate-blob" 
    />
    <div 
      className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-blue-50/50 rounded-full blur-[100px] animate-blob animation-delay-2000" 
    />
    <div 
      className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-slate-50/60 rounded-full blur-[80px] animate-blob animation-delay-4000" 
    />

    {/* Subtle Grid overlay for that "SaaS" look */}
    <div 
      className="absolute inset-0 opacity-[0.03]" 
      style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}
    />
    
    {/* Fade out the bottom so it doesn't clash with the dashboard section */}
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white" />
  </div>
);

// ── Particles Background ──────────────────────────────────────────
const ParticlesBackground = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let particles = [];
    let W, H, raf;
    const resize = () => {
      W = cv.width = cv.offsetWidth;
      H = cv.height = cv.offsetHeight;
    };
    const init = () => {
      particles = Array.from({ length: 70 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.4 + 0.3,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        alpha: Math.random() * 0.35 + 0.08,
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x = (p.x + p.vx + W) % W;
        p.y = (p.y + p.vy + H) % H;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, ${p.alpha})`; // Indigo particles
        ctx.fill();
      });
      particles.forEach((a, i) => {
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 90) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.1 * (1 - d / 90)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });
      raf = requestAnimationFrame(draw);
    };
    resize(); init(); draw();
    window.addEventListener('resize', () => { resize(); init(); });
    return () => { cancelAnimationFrame(raf); };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

// ── Aurora Background ─────────────────────────────────────────────
const AuroraBackground = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H, t = 0, raf;
    const resize = () => {
      W = cv.width = cv.offsetWidth;
      H = cv.height = cv.offsetHeight;
    };
    const bands = [
      { y: 0.30, amp: 45, freq: 0.006, speed: 0.007, alpha: 0.04 },
      { y: 0.44, amp: 55, freq: 0.005, speed: 0.005, alpha: 0.06 },
      { y: 0.57, amp: 38, freq: 0.007, speed: 0.009, alpha: 0.05 },
    ];
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      bands.forEach(b => {
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 4) {
          const y =
            H * b.y +
            Math.sin(x * b.freq + t * b.speed * 60) * b.amp +
            Math.sin(x * b.freq * 1.8 + t * b.speed * 40) * b.amp * 0.35;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, H * b.y - b.amp * 2, 0, H * b.y + b.amp * 2);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, `rgba(99, 102, 241, ${b.alpha})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fill();
      });
      t++;
      raf = requestAnimationFrame(draw);
    };
    resize(); draw();
    window.addEventListener('resize', resize);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

// ── Grid + Orbs Background ────────────────────────────────────────
const GridOrbsBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* dot grid */}
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          'radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    />
    {/* vignette */}
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse 65% 65% at 50% 50%, transparent 30%, #ffffff 85%)',
      }}
    />
    {/* orbs */}
    {[
      { size: 220, top: '-60px', left: '18%', delay: '0s', dur: '9s' },
      { size: 160, bottom: '-20px', right: '12%', delay: '-3s', dur: '7s' },
      { size: 130, top: '30%', right: '5%', delay: '-5s', dur: '11s' },
    ].map((o, i) => (
      <div
        key={i}
        className="absolute rounded-full"
        style={{
          width: o.size,
          height: o.size,
          top: o.top,
          bottom: o.bottom,
          left: o.left,
          right: o.right,
          background: 'rgba(99, 102, 241, 0.05)',
          filter: 'blur(55px)',
          animation: `orbFloat ${o.dur} ease-in-out infinite`,
          animationDelay: o.delay,
        }}
      />
    ))}
  </div>
);

// ── Headline with staggered word reveal ───────────────────────────
const AnimatedHeadline = () => {
  const line1 = 'Stop Reading Meeting Transcripts.'.split(' ');
  const line2 = 'Start Using Them.'.split(' ');
  return (
    <h1
      className="text-3xl md:text-5xl font-extrabold text-[#18181B] mb-6 leading-[1.08]"
      style={{ letterSpacing: '-1px' }}
    >
      {line1.map((word, i) => (
        <span
          key={i}
          className="inline-block"
          style={{
            animation: 'wordReveal 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
            animationDelay: `${0.1 + i * 0.08}s`,
            opacity: 0,
            marginRight: '0.25em',
          }}
        >
          {word}
        </span>
      ))}
      <br />
      {line2.map((word, i) => (
        <span
          key={i}
          className="inline-block text-[#6366F1]"
          style={{
            animation: 'wordReveal 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
            animationDelay: `${0.1 + (line1.length + i) * 0.08}s`,
            opacity: 0,
            marginRight: '0.25em',
          }}
        >
          {word}
        </span>
      ))}
    </h1>
  );
};

// ── Reusable Components ───────────────────────────────────────────
const Navbar = () => (
  <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b border-[#E4E4E7]">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-white border border-[#E4E4E7] rounded-lg flex items-center justify-center shadow-sm">
        <div className="w-3 h-3 bg-[#6366F1] rounded-sm rotate-45" />
      </div>
      <span className="font-bold text-xl tracking-tight text-[#18181B]">MeetHub</span>
    </div>
    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#71717A]">
      <a href="#features" className="hover:text-[#18181B] transition-colors duration-200">Features</a>
      <a href="#how-it-works" className="hover:text-[#18181B] transition-colors duration-200">How it Works</a>
      
    </div>
    <div className="flex items-center gap-6">
      <Link to="/auth/login" className="text-sm font-medium text-[#71717A] hover:text-[#18181B] transition-colors duration-200">
        Log in
      </Link>
      <Link to="/auth/signup" className="bg-[#18181B] text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-[#27272A] transition-all">
        Sign Up
      </Link>
    </div>
  </nav>
);

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="p-7 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] hover:bg-white hover:border-[#6366F1]/30 transition-all duration-200 hover:scale-[1.01] hover:shadow-xl hover:shadow-indigo-500/5">
    <div className="w-10 h-10 bg-white border border-[#E4E4E7] rounded-xl flex items-center justify-center mb-5 shadow-sm">
      <Icon className="w-5 h-5 text-[#6366F1]" />
    </div>
    <h3 className="text-base font-semibold mb-2 text-[#18181B]">{title}</h3>
    <p className="text-[#71717A] text-sm leading-relaxed">{description}</p>
  </div>
);

const Step = ({ number, title, description }) => (
  <div className="flex flex-col items-center text-center px-4">
    <div className="w-9 h-9 rounded-full bg-white border border-[#E4E4E7] text-[#6366F1] flex items-center justify-center font-bold text-sm mb-4 shadow-sm">
      {number}
    </div>
    <h4 className="font-semibold text-sm text-[#18181B] mb-2">{title}</h4>
    <p className="text-[#71717A] text-sm leading-relaxed">{description}</p>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────
export default function LandingPage() {

  // 🔁 Change this to: 'rings' | 'particles' | 'aurora' | 'grid'
  const BG = 'rings';

  return (
    <div className="min-h-screen bg-white text-[#18181B] font-sans">

      {/* Global keyframes */}
      <style>{`
        @keyframes ringPulse {
          0%, 100% { transform: scale(1);    opacity: 0.4; }
          50%        { transform: scale(1.06); opacity: 1;   }
        }
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px)   translateX(0px);  }
          33%        { transform: translateY(-18px)  translateX(10px); }
          66%        { transform: translateY(10px)   translateX(-14px);}
        }
        @keyframes wordReveal {
          0%   { opacity: 0; transform: translateY(24px) skewY(3deg); }
          100% { opacity: 1; transform: translateY(0px)  skewY(0deg); }
        }
        @keyframes fadeUp {
          0%   { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0);    }
        }
        @keyframes blob {
          0%   { transform: translate(0px, 0px) scale(1); }
          33%  { transform: translate(30px, -50px) scale(1.1); }
          66%  { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 12s infinite alternate ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>

      <Navbar />

      {/* ── HERO ── */}
      <header className="relative pt-24 pb-20 px-6 text-center max-w-5xl mx-auto overflow-hidden" style={{ minHeight: '520px' }}>

        {/* Background layer */}
        {BG === 'rings'     && <MotionBackground />}
        {BG === 'particles' && <ParticlesBackground />}
        {BG === 'aurora'    && <AuroraBackground />}
        {BG === 'grid'      && <GridOrbsBackground />}

        {/* Content */}
        <div className="relative z-10">

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 bg-[#F4F4F5] border border-[#E4E4E7] rounded-full px-4 py-2 text-sm text-[#71717A] mb-10 shadow-sm"
            style={{ animation: 'fadeUp 0.6s ease forwards', animationDelay: '0.05s', opacity: 0 }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
            AI-powered meeting intelligence
          </div>

          {/* Animated headline */}
          <AnimatedHeadline />

          {/* Subtext */}
          <p
            className="text-xl text-[#71717A] mb-10 leading-relaxed max-w-2xl mx-auto"
            style={{ animation: 'fadeUp 0.7s ease forwards', animationDelay: '0.75s', opacity: 0 }}
          >
            Turn hours of meeting conversations into decisions, action items, and insights instantly using AI.
          </p>

          {/* CTA */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            style={{ animation: 'fadeUp 0.7s ease forwards', animationDelay: '0.9s', opacity: 0 }}
          >
            <Link to="/auth" className="w-full sm:w-auto px-7 py-3.5 bg-[#6366F1] text-white rounded-full font-bold text-sm hover:bg-[#4F46E5] transition-all duration-200 hover:scale-[1.05] flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
              Get Started
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

        </div>
      </header>

      {/* ── DASHBOARD PREVIEW ── */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto bg-white rounded-3xl p-px border border-[#E4E4E7] shadow-2xl">
          <div className="bg-[#F8F8F8] rounded-3xl p-5 flex flex-col md:flex-row gap-4 min-h-[320px]">
            <div className="w-full md:w-48 space-y-2 pt-1">
              <div className="h-2.5 w-3/4 bg-[#E4E4E7] rounded" />
              <div className="h-2.5 w-2/5 bg-[#E4E4E7] rounded opacity-40" />
              <div className="pt-5 space-y-2">
                <div className="h-9 w-full bg-white rounded-lg border border-[#E4E4E7] shadow-sm" />
                <div className="h-9 w-full bg-[#F1F1F1] rounded-lg opacity-50" />
                <div className="h-9 w-full bg-[#F1F1F1] rounded-lg opacity-50" />
              </div>
            </div>
            <div className="flex-1 bg-white rounded-2xl p-5 border border-[#E4E4E7] shadow-inner">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[#18181B] font-semibold text-sm">Weekly Sync Summary</h3>
                <span className="text-xs text-[#71717A] bg-[#F4F4F5] border border-[#E4E4E7] px-2.5 py-1 rounded-md">
                  March 24, 2026
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="p-3.5 bg-[#FDFDFD] border border-[#E4E4E7] rounded-xl">
                  <p className="text-[#10B981] text-[10px] font-bold uppercase tracking-widest mb-2">Decisions</p>
                  <p className="text-[#52525B] text-xs font-medium">✓ Move Q3 launch to Sept 14th</p>
                </div>
                <div className="p-3.5 bg-[#FDFDFD] border border-[#E4E4E7] rounded-xl">
                  <p className="text-[#6366F1] text-[10px] font-bold uppercase tracking-widest mb-2">Action Items</p>
                  <p className="text-[#52525B] text-xs font-medium">@Sarah to update roadmap</p>
                </div>
              </div>
              <div className="p-3.5 bg-[#FAFAFA] rounded-xl border border-[#E4E4E7]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
                  <p className="text-[#71717A] text-[10px] font-mono tracking-widest uppercase">AI Assistant</p>
                </div>
                <p className="text-[#71717A] text-xs italic leading-relaxed">
                  "The team generally felt positive about the new design, though budget concerns were raised by David."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 border-t border-[#F4F4F5] px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-[#18181B]" style={{ letterSpacing: '-0.5px' }}>
              Everything you need to stay in sync
            </h2>
            <p className="text-[#71717A] text-sm">Powering high-performance teams with automated intelligence.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { title: 'Upload Transcripts', desc: 'Drop in .txt, .vtt, or zoom exports. We handle parsing and cleanup instantly.', icon: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12' },
              { title: 'Extract Decisions', desc: 'Our AI identifies key outcomes so nothing falls through the cracks.', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
              { title: 'Ask Questions', desc: "Chat with your meeting. Get answers to 'why did we decide X?' in seconds.", icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
              { title: 'Sentiment Analysis', desc: 'Visualize engagement and mood shifts throughout the call.', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            ].map(({ title, desc, icon }) => (
              <FeatureCard key={title} icon={() => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={icon} /></svg>} title={title} description={desc} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 border-t border-[#F4F4F5] px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-3xl font-bold mb-16 text-[#18181B]" style={{ letterSpacing: '-0.5px' }}>
            Three steps to clarity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-4 left-1/4 right-1/4 h-px border-t border-dashed border-[#E4E4E7]" />
            {[
              { n: '1', title: 'Upload', desc: 'Drag and drop your meeting transcript into our secure dashboard.' },
              { n: '2', title: 'Process', desc: 'Our specialized LLM analyzes the context, speakers, and core topics.' },
              { n: '3', title: 'Review', desc: 'Instantly browse key insights and chat with your transcripts to verify decisions.' },
            ].map(({ n, title, desc }) => (
              <Step key={n} number={n} title={title} description={desc} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-6 border-t border-[#F4F4F5] bg-white">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 items-center">
          
          {/* Left Column */}
          <div className="flex justify-start items-center gap-2">
            <div className="w-5 h-5 bg-white border border-[#E4E4E7] rounded flex items-center justify-center shadow-sm">
              <div className="w-2.5 h-2.5 bg-[#6366F1] rounded-sm rotate-45" />
            </div>
            <span className="font-bold text-sm text-[#18181B]">MeetHub</span>
          </div>

          {/* Middle Column (Text Center) */}
          <div className="flex justify-center gap-6 text-xs text-[#71717A] font-medium py-4 md:py-0">
            {['About', 'Contact', 'GitHub', 'Privacy'].map((l) => (
              <a key={l} href="#" className="hover:text-[#18181B] transition-colors duration-200">{l}</a>
            ))}
          </div>

          {/* Right Column (Text Right) */}
          <p className="text-xs text-[#A1A1AA] md:text-right">
            © 2026 MeetHub. All rights reserved.
          </p>
          
        </div>
      </footer>

    </div>
  );
}
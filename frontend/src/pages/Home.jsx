import React, { useState } from 'react';
import { 
  Upload, 
  CheckCircle, 
  MessageSquare, 
  BarChart3, 
  ArrowRight, 
  Play, 
  Users, 
  Briefcase, 
  UserCircle,
  Menu,
  X
} from 'lucide-react';

// --- Reusable Components ---

const Navbar = () => (
  <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
        <div className="w-4 h-4 bg-white rounded-sm rotate-45" />
      </div>
      <span className="font-bold text-xl tracking-tight text-slate-900">MeetingHub</span>
    </div>
    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
      <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
      <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How it Works</a>
      <a href="#use-cases" className="hover:text-indigo-600 transition-colors">Use Cases</a>
    </div>
    <div className="flex items-center gap-4">
      <button className="text-sm font-medium text-slate-600 hover:text-slate-900">Log in</button>
      <button className="bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-slate-800 transition-all">
        Get Started
      </button>
    </div>
  </nav>
);

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="p-8 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-6">
      <Icon className="w-6 h-6 text-indigo-600" />
    </div>
    <h3 className="text-xl font-semibold mb-3 text-slate-900">{title}</h3>
    <p className="text-slate-500 leading-relaxed">{description}</p>
  </div>
);

const Step = ({ number, title, description }) => (
  <div className="flex flex-col items-center text-center px-4">
    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold mb-4">
      {number}
    </div>
    <h4 className="font-semibold text-lg mb-2">{title}</h4>
    <p className="text-slate-500 text-sm">{description}</p>
  </div>
);

// --- Main Page ---

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-100">
      <Navbar />

      {/* 1. Hero Section */}
      <header className="pt-20 pb-16 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-6 tracking-wide uppercase">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
          </span>
          v2.0 is now live
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
          Stop Reading Meeting Transcripts. <span className="text-indigo-600">Start Using Them.</span>
        </h1>
        <p className="text-xl text-slate-500 mb-10 leading-relaxed max-w-2xl mx-auto">
          Turn hours of meeting conversations into decisions, action items, and insights instantly using AI.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-full font-semibold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2">
            Get Started <ArrowRight className="w-5 h-5" />
          </button>
          <button className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-full font-semibold text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
            <Play className="w-4 h-4 fill-current" /> View Demo
          </button>
        </div>
      </header>

      {/* Dashboard Preview Section (Visual Hook) */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto bg-slate-900 rounded-3xl p-4 shadow-2xl overflow-hidden border border-slate-800">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 flex flex-col md:flex-row gap-6 min-h-[400px]">
            {/* Sidebar Mock */}
            <div className="w-full md:w-64 space-y-4">
              <div className="h-4 w-3/4 bg-slate-700 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-slate-700 rounded opacity-50" />
              <div className="pt-8 space-y-3">
                <div className="h-10 w-full bg-indigo-600/20 rounded-lg border border-indigo-500/30" />
                <div className="h-10 w-full bg-slate-700/30 rounded-lg" />
              </div>
            </div>
            {/* Main Content Mock */}
            <div className="flex-1 bg-slate-900 rounded-xl p-6 border border-slate-700">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-white font-bold text-lg">Weekly Sync Summary</h3>
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">March 24, 2026</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-emerald-400 text-xs font-bold uppercase mb-2">Decisions</p>
                  <p className="text-slate-300 text-sm">✓ Move Q3 launch to Sept 14th</p>
                </div>
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                  <p className="text-indigo-400 text-xs font-bold uppercase mb-2">Action Items</p>
                  <p className="text-slate-300 text-sm">@Sarah to update roadmap</p>
                </div>
              </div>
              <div className="mt-8 p-4 bg-slate-800 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  <p className="text-indigo-400 text-xs font-mono">AI ASSISTANT</p>
                </div>
                <p className="text-slate-300 text-sm italic">"The team generally felt positive about the new design, though budget concerns were raised by David."</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Features Section */}
      <section id="features" className="py-24 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to stay in sync</h2>
            <p className="text-slate-500">Powering high-performance teams with automated intelligence.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard 
              icon={Upload} 
              title="Upload Transcripts" 
              description="Drop in .txt, .vtt, or zoom exports. We'll handle the parsing and cleanup instantly."
            />
            <FeatureCard 
              icon={CheckCircle} 
              title="Extract Decisions" 
              description="Our AI identifies key outcomes and action items so nothing falls through the cracks."
            />
            <FeatureCard 
              icon={MessageSquare} 
              title="Ask Questions" 
              description="Chat with your meeting. 'Why did we decide to delay the project?' Get the answer in seconds."
            />
            <FeatureCard 
              icon={BarChart3} 
              title="Sentiment Analysis" 
              description="Understand the room. Visualize engagement and mood shifts throughout the call."
            />
          </div>
        </div>
      </section>

      {/* 3. How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-3xl font-bold mb-16">Three steps to clarity</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-5 left-1/4 right-1/4 h-0.5 border-t-2 border-dashed border-slate-200 -z-10" />
            <Step 
              number="1" 
              title="Upload" 
              description="Drag and drop your meeting transcript into our secure dashboard."
            />
            <Step 
              number="2" 
              title="Process" 
              description="Our specialized LLM analyzes the context, speakers, and core topics."
            />
            <Step 
              number="3" 
              title="Act" 
              description="Export action items to Notion or Jira, and share insights with the team."
            />
          </div>
        </div>
      </section>

      {/* 5. Use Cases */}
      <section id="use-cases" className="py-24 bg-white border-t border-slate-100 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="md:w-1/2">
              <h2 className="text-4xl font-bold mb-6">Designed for modern workflows</h2>
              <div className="space-y-6">
                <div className="flex gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><Briefcase className="w-5 h-5"/></div>
                  <div>
                    <h4 className="font-bold text-lg">Product Managers</h4>
                    <p className="text-slate-500">Document user interviews and feature requests without taking manual notes.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600"><Users className="w-5 h-5"/></div>
                  <div>
                    <h4 className="font-bold text-lg">Team Leads</h4>
                    <p className="text-slate-500">Keep cross-functional teams aligned on decisions made during weekly syncs.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600"><UserCircle className="w-5 h-5"/></div>
                  <div>
                    <h4 className="font-bold text-lg">Consultants</h4>
                    <p className="text-slate-500">Provide clients with instant, professional summaries of every strategy session.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="md:w-1/2 w-full h-80 bg-slate-100 rounded-3xl overflow-hidden shadow-inner border border-slate-200 flex items-center justify-center text-slate-400">
               [Visual Placeholder: Team Collaboration Graphic]
            </div>
          </div>
        </div>
      </section>

      {/* 6. CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-indigo-600 rounded-[3rem] p-12 md:p-20 text-center text-white shadow-2xl shadow-indigo-200">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Start saving time in meetings today</h2>
          <p className="text-indigo-100 text-lg mb-10 max-w-xl mx-auto">
            Join 500+ forward-thinking teams turning talk into action. No credit card required.
          </p>
          <button className="px-10 py-5 bg-white text-indigo-600 rounded-full font-bold text-xl hover:bg-slate-50 transition-all shadow-xl">
            Sign Up Free
          </button>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="py-12 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-sm rotate-45" />
            </div>
            <span className="font-bold text-lg text-slate-900">MeetingHub</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-500 font-medium">
            <a href="#" className="hover:text-slate-900">About</a>
            <a href="#" className="hover:text-slate-900">Contact</a>
            <a href="#" className="hover:text-slate-900">GitHub</a>
            <a href="#" className="hover:text-slate-900">Privacy</a>
          </div>
          <p className="text-sm text-slate-400">© 2026 Meeting Intelligence Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
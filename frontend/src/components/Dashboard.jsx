import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FolderRoot, 
  FileText, 
  Lightbulb, 
  MessageSquare, 
  Search, 
  Plus, 
  LogOut, 
  MoreVertical, 
  CheckCircle2, 
  Send,
  FileUp,
  Loader2
} from 'lucide-react';
import { supabase } from "../lib/supabase";
import { useNavigate } from 'react-router-dom';

// --- Reusable Sub-Components ---
const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
      active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    }`}
  >
    <Icon className="w-5 h-5" />
    {label}
  </button>
);

const StatCard = ({ label, value, icon: Icon, trend }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-50 rounded-lg text-slate-600"><Icon className="w-5 h-5" /></div>
      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{trend}</span>
    </div>
    <p className="text-slate-500 text-sm font-medium">{label}</p>
    <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
  </div>
);

export default function Dashboard() {
    const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isUploading, setIsUploading] = useState(false);
ī
  // --- 1. State Management ---
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 2. Fetch User and Dashboard Data ---
  useEffect(() => {
    const initDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/login');
      setUser(user);
      await fetchDashboardData();
    };
    initDashboard();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [projRes, transRes, decRes] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('transcripts').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('decisions').select('*').order('created_at', { ascending: false })
      ]);

      if (projRes.data) setProjects(projRes.data);
      if (transRes.data) setTranscripts(transRes.data);
      if (decRes.data) setDecisions(decRes.data);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. UI Helper Logic ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleUpload = () => {
    setIsUploading(true);
    // Simulating a delay for AI processing
    setTimeout(() => {
      setIsUploading(false);
      fetchDashboardData(); // Refresh data after "upload"
    }, 3000);
  };

  const getProjectName = (id) => {
    const project = projects.find(p => p.id === id);
    return project ? project.name : 'General';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recent';
    return new Date(dateString).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Extract actual user info
  const userDisplayName = user?.user_metadata?.name || user?.email?.split('@')[0] || "User";
  const userInitials = userDisplayName.substring(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      
      {/* 1. Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm rotate-45" />
          </div>
          <span className="font-bold text-lg tracking-tight">MeetingHub</span>
        </div>

        <nav className="flex-1 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} />
          <SidebarItem icon={FolderRoot} label="Projects" active={activeTab === 'Projects'} onClick={() => setActiveTab('Projects')} />
          <SidebarItem icon={FileText} label="Transcripts" active={activeTab === 'Transcripts'} onClick={() => setActiveTab('Transcripts')} />
          <SidebarItem icon={Lightbulb} label="Insights" active={activeTab === 'Insights'} onClick={() => setActiveTab('Insights')} />
          <SidebarItem icon={MessageSquare} label="Chat" active={activeTab === 'Chat'} onClick={() => setActiveTab('Chat')} />
        </nav>

        {/* ACTUAL USER INFO SECTION */}
        <div className="pt-6 border-t border-slate-100 space-y-1">
          <div className="flex items-center gap-3 px-3 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
              {userInitials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate text-slate-900">{userDisplayName}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        
        {/* 2. Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search meetings..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
              <Plus className="w-4 h-4" /> New Project
            </button>
            
            {/* ACTUAL USER AVATAR */}
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold border border-slate-200 overflow-hidden">
               {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="avatar" />
              ) : (
                userInitials
              )}
            </div>
          </div>
        </header>

        {/* 3. Main Dashboard Content */}
        <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Total Projects" value={loading ? "..." : projects.length} icon={FolderRoot} trend="+2 this month" />
            <StatCard label="Transcripts" value={loading ? "..." : transcripts.length} icon={FileText} trend="+12%" />
            <StatCard label="Action Items" value={loading ? "..." : decisions.filter(d => d.type === 'action').length} icon={CheckCircle2} trend="Active" />
            <StatCard label="AI Queries" value="156" icon={MessageSquare} trend="High" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              
              {/* Upload Area */}
              <section className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-indigo-400 transition-colors group">
                <div className="max-w-xs mx-auto">
                  <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <FileUp className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h4 className="font-bold text-slate-900">Upload new transcript</h4>
                  <p className="text-slate-500 text-sm mt-1 mb-6">Drag and drop your .vtt or .txt files here</p>
                  <button 
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing AI...</>
                    ) : 'Select Files'}
                  </button>
                </div>
              </section>

              {/* Transcripts Table */}
              <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-lg">Recent Transcripts</h3>
                  <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
                        <th className="px-6 py-4">File Name</th>
                        <th className="px-6 py-4">Project</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Words</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transcripts.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                          <td className="px-6 py-4 font-medium text-sm flex items-center gap-3">
                            <FileText className="w-4 h-4 text-slate-400" /> {item.filename}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{getProjectName(item.project_id)}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{formatDate(item.created_at)}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 font-mono">{item.word_count || 0}</td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-1 hover:bg-slate-200 rounded-md"><MoreVertical className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                      {!loading && transcripts.length === 0 && (
                        <tr>
                            <td colSpan="5" className="px-6 py-10 text-center text-slate-400 italic">No transcripts found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* Right Column: Insights & Chat */}
            <div className="space-y-8">
              <section className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-lg mb-6">Key Insights</h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-3">Decisions Made</p>
                    <ul className="space-y-3">
                      {decisions.filter(d => d.type === 'decision').slice(0, 3).map(item => (
                        <li key={item.id} className="text-sm text-slate-700 flex gap-2">
                          <span className="text-emerald-500 mt-0.5 font-bold">✓</span>
                          {item.description}
                        </li>
                      ))}
                      {decisions.filter(d => d.type === 'decision').length === 0 && (
                          <li className="text-sm text-slate-400 italic">No decisions recorded</li>
                      )}
                    </ul>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-3">Action Items</p>
                    <div className="space-y-3">
                      {decisions.filter(d => d.type === 'action').slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <p className="text-xs font-medium truncate">{item.description}</p>
                          <span className="text-[10px] bg-white px-2 py-1 rounded border border-slate-200 text-slate-500 font-bold">
                            {item.owner || "Unassigned"}
                          </span>
                        </div>
                      ))}
                      {decisions.filter(d => d.type === 'action').length === 0 && (
                          <p className="text-sm text-slate-400 italic">No pending actions</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-indigo-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                  <h3 className="font-bold text-sm">Ask Meeting AI</h3>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 mb-4 border border-slate-700">
                  <p className="text-[11px] text-slate-400 mb-1 italic">Last answer:</p>
                  <p className="text-xs leading-relaxed">Ask a question about your processed transcripts to get insights.</p>
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Ask about your meetings..." 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 rounded-lg">
                    <Send className="w-3 h-3 text-white" />
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
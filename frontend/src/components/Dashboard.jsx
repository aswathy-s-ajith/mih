import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, FolderRoot, FileText, Lightbulb, 
  MessageSquare, Search, Plus, LogOut, MoreVertical, 
  CheckCircle2, Send, FileUp, Loader2, X, Check
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
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isUploading, setIsUploading] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // --- 1. State Management ---
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 2. Initialization ---
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
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
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

  // --- 3. Project Management ---
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ name: newProjectName.trim(), user_id: user.id }])
        .select();

      if (error) throw error;

      setProjects([data[0], ...projects]);
      setNewProjectName("");
      setShowProjectModal(false);
    } catch (error) {
      console.error("Create project error:", error);
      alert("Failed to create project: " + error.message);
    }
  };

  // --- 4. Real Upload Logic (Connected to FastAPI) ---
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file || !user) return;

    setIsUploading(true);

    try {
      // Step A: Ensure a Project exists to satisfy DB constraints
      let targetProjectId = projects[0]?.id;
      if (!targetProjectId) {
        const { data: newProj, error: projErr } = await supabase
          .from('projects')
          .insert([{ name: 'General', user_id: user.id }])
          .select().single();
        if (projErr) throw projErr;
        targetProjectId = newProj.id;
      }

      // Step B: Prepare FormData for FastAPI
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', targetProjectId);

      // Step C: Send to Backend API
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.detail || 'Upload failed');

      // Step D: Refresh UI Data
      await fetchDashboardData();
      alert('Meeting processed successfully!');

    } catch (error) {
      console.error('Upload error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
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

  const userDisplayName = user?.user_metadata?.name || user?.email?.split('@')[0] || "User";
  const userInitials = userDisplayName.substring(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-10 px-2 cursor-pointer" onClick={() => navigate('/')}>
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

        <div className="pt-6 border-t border-slate-100 space-y-1">
          <div className="flex items-center gap-3 px-3 py-3 mb-2 text-sm">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
              {userInitials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-bold truncate text-slate-900">{userDisplayName}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all">
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="relative w-96 text-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search meetings..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowProjectModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
              <Plus className="w-4 h-4" /> New Project
            </button>
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold border border-slate-200 uppercase">
              {userInitials}
            </div>
          </div>
        </header>

        <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Total Projects" value={loading ? "..." : projects.length} icon={FolderRoot} trend="Active" />
            <StatCard label="Transcripts" value={loading ? "..." : transcripts.length} icon={FileText} trend="Live" />
            <StatCard label="Action Items" value={loading ? "..." : decisions.filter(d => d.type === 'action_item').length} icon={CheckCircle2} trend="Pending" />
            <StatCard label="AI Insights" value={loading ? "..." : decisions.length} icon={Lightbulb} trend="Extracted" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8 text-sm">
              <section className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-indigo-400 transition-colors group">
                <div className="max-w-xs mx-auto">
                  <FileUp className="w-12 h-12 text-indigo-100 mx-auto mb-4 group-hover:text-indigo-600 transition-colors" />
                  <h4 className="font-bold text-slate-900">Upload transcript</h4>
                  <p className="text-slate-500 text-xs mt-1 mb-6">Process .txt or .vtt with AI</p>
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".txt,.vtt" className="hidden" />
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isUploading} 
                    className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing insights...</> : 'Select File'}
                  </button>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 font-bold">Recent Transcripts</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b">
                        <th className="px-6 py-4">File Name</th>
                        <th className="px-6 py-4">Project</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Words</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transcripts.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium flex items-center gap-3">
                            <FileText className="w-4 h-4 text-slate-400" /> {item.filename}
                          </td>
                          <td className="px-6 py-4 text-slate-500">{getProjectName(item.project_id)}</td>
                          <td className="px-6 py-4 text-slate-500">{formatDate(item.created_at)}</td>
                          <td className="px-6 py-4 text-slate-500 font-mono">{item.word_count || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section className="bg-white rounded-2xl border border-slate-200 p-6 text-sm">
                <h3 className="font-bold mb-6">Key Insights</h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-3">Decisions</p>
                    <ul className="space-y-3">
                      {decisions.filter(d => d.type === 'decision').slice(0, 3).map(item => (
                        <li key={item.id} className="text-slate-700 flex gap-2"><Check className="text-emerald-500 shrink-0" size={16} /> {item.description}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-3">Actions</p>
                    <div className="space-y-3">
                      {decisions.filter(d => d.type === 'action_item').slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <p className="text-xs truncate">{item.description}</p>
                          <span className="text-[10px] bg-white px-2 py-0.5 rounded border font-bold uppercase">{item.owner || "Team"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-slate-900 rounded-2xl p-6 text-white h-[350px] flex flex-col shadow-xl shadow-indigo-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                  <h3 className="font-bold text-xs">Meeting AI Chat</h3>
                </div>
                <div className="flex-1 bg-slate-800/50 rounded-xl p-3 text-[11px] text-slate-400 italic mb-4">
                  Ask a question about your recent meetings to get started.
                </div>
                <div className="relative">
                  <input type="text" placeholder="Ask AI..." className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-indigo-500" />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-white transition-colors"><Send size={16}/></button>
                </div>
              </section>
            </div>
          </div>
        </div>

        {showProjectModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">New Project</h3>
                <button onClick={() => setShowProjectModal(false)}><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <input autoFocus value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Project Name" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
                <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all">Create Project</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
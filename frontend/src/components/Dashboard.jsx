import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, FolderRoot, FileText, Lightbulb, 
  MessageSquare, Search, Plus, LogOut, MoreVertical, 
  CheckCircle2, Send, FileUp, Loader2, X, Check, ChevronRight, Download, FileType
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

  // --- 1. State Management ---
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

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
        supabase.from('transcripts').select('*').order('created_at', { ascending: false }),
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

  // --- 3. Export Logic ---
  const handleExportCSV = () => {
    if (projectDecisions.length === 0) return alert("No data to export");
    
    const headers = ["Type,Description,Responsible,Deadline\n"];
    const rows = projectDecisions.map(d => 
      `${d.type},"${d.description.replace(/"/g, '""')}",${d.owner || 'N/A'},${d.due_date || 'N/A'}`
    );
    
    const blob = new Blob([headers + rows.join("\n")], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${activeProject.name}_Insights.csv`);
    a.click();
  };

  const handleExportPDF = () => {
    window.print();
  };

  // --- 4. Handlers ---
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
    } catch (error) { alert(error.message); }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedProjectId) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', selectedProjectId);

      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Backend processing failed');
      await fetchDashboardData();
    } catch (error) { alert(error.message); }
    finally { 
      setIsUploading(false); 
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // --- 5. Filtering Logic for Project View ---
  const activeProject = projects.find(p => p.id === selectedProjectId);
  const projectTranscripts = transcripts.filter(t => t.project_id === selectedProjectId);
  const projectDecisions = decisions.filter(d => projectTranscripts.some(t => t.id === d.transcript_id));

  // --- 6. UI Helpers ---
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent';
  const userDisplayName = user?.user_metadata?.name || user?.email?.split('@')[0] || "User";
  const userInitials = userDisplayName.substring(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900 print:bg-white">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-6 sticky top-0 h-screen print:hidden">
        <div className="flex items-center gap-2 mb-10 px-2 cursor-pointer" onClick={() => setSelectedProjectId(null)}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
            <div className="w-4 h-4 bg-white rounded-sm rotate-45" />
          </div>
          <span className="font-bold text-lg tracking-tight">MeetingHub</span>
        </div>

        <nav className="flex-1 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={!selectedProjectId} onClick={() => setSelectedProjectId(null)} />
          <SidebarItem icon={FolderRoot} label="Projects" active={!!selectedProjectId} onClick={() => setSelectedProjectId(null)} />
          <SidebarItem icon={MessageSquare} label="AI Chat" onClick={() => alert("Chat page coming soon!")} />
        </nav>

        <div className="pt-6 border-t border-slate-100 space-y-1">
          <div className="flex items-center gap-3 px-3 py-3 mb-2 text-sm">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase border border-white shadow-sm">
              {userInitials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-bold truncate text-slate-900">{userDisplayName}</p>
              <p className="text-[10px] text-slate-400 truncate uppercase tracking-widest font-bold">Pro Account</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP BAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className={`cursor-pointer ${!selectedProjectId ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => setSelectedProjectId(null)}>
              Dashboard
            </span>
            {activeProject && (
              <>
                <ChevronRight size={14} className="text-slate-300" />
                <span className="text-indigo-600 font-bold">{activeProject.name}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowProjectModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">
              <Plus size={16} /> New Project
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl mx-auto w-full print:p-0">
          
          {/* --- VIEW 1: GLOBAL DASHBOARD --- */}
          {!selectedProjectId ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Projects" value={loading ? "..." : projects.length} icon={FolderRoot} trend="Active" />
                <StatCard label="Transcripts" value={loading ? "..." : transcripts.length} icon={FileText} trend="Live" />
                <StatCard label="Action Items" value={loading ? "..." : decisions.filter(d => d.type === 'action_item').length} icon={CheckCircle2} trend="Pending" />
                <StatCard label="AI Insights" value={loading ? "..." : decisions.length} icon={Lightbulb} trend="Extracted" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">Your Projects</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map(p => (
                      <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 transition-colors">
                            <FolderRoot size={20} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{transcripts.filter(t => t.project_id === p.id).length} Files</span>
                        </div>
                        <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{p.name}</h4>
                        <p className="text-xs text-slate-400 mt-1">Updated {formatDate(p.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-6">
                  <h3 className="font-bold text-slate-900">Recent Global Actions</h3>
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 divide-y divide-slate-50 shadow-sm">
                    {decisions.filter(d => d.type === 'action_item').slice(0, 5).map(action => (
                      <div key={action.id} className="py-3 first:pt-0 last:pb-0">
                        <p className="text-xs font-semibold text-slate-800 line-clamp-1">{action.description}</p>
                        <p className="text-[10px] text-indigo-500 font-bold mt-1 uppercase">{action.owner || 'Unassigned'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* --- VIEW 2: PROJECT DETAIL VIEW --- */
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div className="flex justify-between items-center print:hidden">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">{activeProject.name}</h2>
                  <p className="text-slate-500 text-sm mt-1">Accepting .TXT and .VTT transcript formats.</p>
                </div>
                <div className="flex gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".txt,.vtt" className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all">
                    {isUploading ? <Loader2 className="animate-spin" size={18} /> : <FileUp size={18} />}
                    {isUploading ? "Extracting..." : "Upload Transcript"}
                  </button>
                  <button onClick={handleExportCSV} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                    <Download size={16} /> CSV
                  </button>
                  <button onClick={handleExportPDF} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                    <FileType size={16} /> PDF
                  </button>
                </div>
              </div>

              {/* Print Header */}
              <div className="hidden print:block border-b-2 border-slate-200 pb-4 mb-6">
                <h1 className="text-2xl font-bold">{activeProject.name} - Meeting Insights</h1>
                <p className="text-slate-500 text-sm">Generated on {new Date().toLocaleDateString()}</p>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {/* DECISIONS SECTION */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-100 font-bold text-sm bg-slate-50/50">Decisions (Final Agreements)</div>
                  <div className="p-6 space-y-3">
                    {projectDecisions.filter(d => d.type === 'decision').map(d => (
                      <div key={d.id} className="flex gap-3 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <Check size={18} className="text-emerald-500 shrink-0" /> 
                        <span className="font-medium">{d.description}</span>
                      </div>
                    ))}
                    {projectDecisions.filter(d => d.type === 'decision').length === 0 && (
                      <p className="text-slate-400 text-center py-4 italic">No decisions extracted yet.</p>
                    )}
                  </div>
                </div>

                {/* ACTION ITEMS TABLE (WHO, WHAT, BY WHEN) */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-100 font-bold text-sm bg-slate-50/50 text-orange-600">Action Items (Tasks)</div>
                  <table className="w-full text-left">
                    <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/30">
                      <tr>
                        <th className="px-6 py-4">Responsible (Who)</th>
                        <th className="px-6 py-4">Task (What)</th>
                        <th className="px-6 py-4">Deadline (By When)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {projectDecisions.filter(d => d.type === 'action_item').map(d => (
                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{d.owner || 'Unassigned'}</span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-800">{d.description}</td>
                          <td className="px-6 py-4 text-slate-500 font-mono italic">{d.due_date || 'TBD'}</td>
                        </tr>
                      ))}
                      {projectDecisions.filter(d => d.type === 'action_item').length === 0 && (
                        <tr>
                          <td colSpan="3" className="px-6 py-10 text-center text-slate-400 italic">No action items extracted yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PROJECT TRANSCRIPTS LIST */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm print:hidden">
                  <div className="px-6 py-4 border-b border-slate-100 font-bold text-sm bg-slate-50/50 flex items-center gap-2">
                    <FileText size={16} className="text-slate-500" /> Transcripts in this Project
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projectTranscripts.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-4 border rounded-xl bg-slate-50/50">
                          <div className="flex items-center gap-3">
                            <FileText size={18} className="text-slate-400" />
                            <div>
                              <p className="text-sm font-bold">{t.filename}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{t.word_count} Words • {formatDate(t.created_at)}</p>
                            </div>
                          </div>
                          <button className="text-indigo-600 hover:text-indigo-800 font-bold text-xs transition-colors">View File</button>
                        </div>
                      ))}
                      {projectTranscripts.length === 0 && (
                        <p className="col-span-2 text-center text-slate-400 text-sm italic py-4">No transcripts uploaded to this project.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL: NEW PROJECT */}
        {showProjectModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Initialize Workspace</h3>
                <button onClick={() => setShowProjectModal(false)}><X size={20}/></button>
              </div>
              <form onSubmit={handleCreateProject} className="space-y-5">
                <input autoFocus value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Workspace Name..." className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium" required />
                <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Create Project</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
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
  const [isDragging, setIsDragging] = useState(false);
  const [showDropZone, setShowDropZone] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [viewingTranscript, setViewingTranscript] = useState(null);

  // --- NEW: Chat States ---
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);


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

  const handleDeleteTranscript = async (transcriptId) => {
    if (!window.confirm("Are you sure you want to delete this transcript?")) return;

    try {
      const { error } = await supabase
        .from('transcripts')
        .delete()
        .eq('id', transcriptId);

      if (error) throw error;

      await fetchDashboardData();
      alert("Transcript deleted successfully");
    } catch (error) {
      alert("Error deleting: " + error.message);
    }
  };

  // SECURED UPLOAD LOGIC
  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !selectedProjectId) return;

    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Session expired. Please login again.");
        return navigate('/login');
      }

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', selectedProjectId);

        const response = await fetch('http://localhost:8000/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Backend processing failed');
        }
      }

      await fetchDashboardData();
      setShowDropZone(false);
      alert('AI Analysis Complete!');
    } catch (error) { 
      alert(error.message); 
    } finally { 
      setIsUploading(false); 
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      const event = { target: { files } };
      handleFileSelect(event);
    }
  };

  // --- NEW: Chat Handler ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmedInput = chatInput.trim();
    if (!trimmedInput || !selectedProjectId) return;

    const userMessage = { role: 'user', content: trimmedInput };
    setChatHistory(prev => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Please login again.");

      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          question: trimmedInput
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Chat failed");

      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: data.answer, 
        sources: data.sources 
      }]);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsChatLoading(false);
    }
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
          <span className="font-bold text-lg tracking-tight">Meeting Intelligence Hub</span>
        </div>

        <nav className="flex-1 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={!selectedProjectId} onClick={() => setSelectedProjectId(null)} />
          <SidebarItem icon={FolderRoot} label="Projects" active={!!selectedProjectId} onClick={() => setSelectedProjectId(null)} />
          <SidebarItem 
            icon={MessageSquare} 
            label="AI Chat" 
            active={showChat}
            onClick={() => {
               if (selectedProjectId) setShowChat(true);
               else alert("Please select a project first to start chatting!");
            }} 
          />
        </nav>

        <div className="pt-6 border-t border-slate-100 space-y-1">
          <div className="flex items-center gap-3 px-3 py-3 mb-2 text-sm">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase border border-white shadow-sm">
              {userInitials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-bold truncate text-slate-900">{userDisplayName}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        
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
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div className="flex justify-between items-center print:hidden">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">{activeProject.name}</h2>
                  <p className="text-slate-500 text-sm mt-1">Accepting .TXT and .VTT transcript formats.</p>
                </div>
                <div className="flex items-center gap-3">
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".txt,.vtt" multiple className="hidden" />
                  <button onClick={() => setShowDropZone(prev => !prev)} disabled={isUploading} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all">
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

              {showDropZone && (
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-12 transition-all duration-300 flex flex-col items-center justify-center gap-4 ${
                    isDragging 
                      ? 'border-indigo-600 bg-indigo-50/50 scale-[1.01]' 
                      : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50/50'
                  }`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                    isDragging ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50'
                  }`}>
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <FileUp className="w-8 h-8" />
                    )}
                  </div>

                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">
                      {isUploading ? "AI is analyzing your meeting..." : "Drop your transcript here"}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      or click to browse from your computer
                    </p>
                  </div>

                  <div className="flex gap-4 mt-2">
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">.txt</span>
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">.vtt</span>
                  </div>

                  {isUploading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] rounded-3xl flex items-center justify-center z-10">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                        <span className="font-bold text-indigo-600 animate-pulse">Extracting Insights...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-8">
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
                    </tbody>
                  </table>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm print:hidden">
                  <div className="px-6 py-4 border-b border-slate-100 font-bold text-sm bg-slate-50/50 flex items-center gap-2">
                    <FileText size={16} className="text-slate-500" /> Transcripts in this Project
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projectTranscripts.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-4 border rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <FileText size={18} className="text-slate-400" />
                            <div>
                              <p className="text-sm font-bold">{t.filename}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">
                                {t.word_count} Words • {formatDate(t.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button 
                              onClick={() => setViewingTranscript(t)} 
                              className="text-indigo-600 hover:text-indigo-800 font-bold text-xs"
                            >
                              View File
                            </button>
                            <button 
                              onClick={() => handleDeleteTranscript(t.id)} 
                              className="text-red-500 hover:text-red-700 font-bold text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODALS */}
        {viewingTranscript && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold">{viewingTranscript.filename}</h3>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">Full Transcript Text</p>
                </div>
                <button onClick={() => setViewingTranscript(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
              </div>
              <div className="flex-1 overflow-y-auto bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {viewingTranscript.content || "No content found for this transcript."}
                </pre>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setViewingTranscript(null)} className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all text-sm">Close Reader</button>
              </div>
            </div>
          </div>
        )}

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

        {/* --- FLOATING CHAT TOGGLE BUTTON --- */}
        {selectedProjectId && !showChat && (
          <button 
            onClick={() => setShowChat(true)}
            className="fixed bottom-8 right-8 bg-indigo-600 text-white p-4 rounded-2xl shadow-2xl hover:bg-indigo-700 transition-all z-40 flex items-center gap-2 group"
          >
            <MessageSquare size={24} />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold">Ask AI</span>
          </button>
        )}

        {/* --- SLIDE-OVER CHAT PANEL --- */}
        <div className={`fixed top-0 right-0 h-screen w-[400px] bg-white border-l border-slate-200 shadow-2xl z-[150] transition-transform duration-300 transform ${showChat ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900">Project AI Chat</h3>
                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">RAG Context Enabled</p>
              </div>
              <button onClick={() => setShowChat(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC]">
              {chatHistory.length === 0 && (
                <div className="text-center mt-10">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lightbulb size={32} />
                  </div>
                  <p className="text-sm font-bold text-slate-900">Ask anything about this project</p>
                  <p className="text-xs text-slate-400 mt-1 px-10">"What were the budget concerns?" or "Summarize the tech stack discussion."</p>
                </div>
              )}
              
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 rounded-tr-none' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                  }`}>
                    {msg.content}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-tighter">Sources Found</p>
                        <div className="flex gap-1 mt-1">
                          {msg.sources.slice(0, 3).map((s, i) => (
                            <span key={i} title={s.snippet} className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] border border-slate-200">Ref {i+1}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none">
                    <Loader2 className="animate-spin text-indigo-600" size={18} />
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input Area */}
            <form onSubmit={handleSendMessage} className="p-6 border-t border-slate-100 bg-white">
              <div className="relative flex items-center">
                <input 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type your question..."
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="absolute right-2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
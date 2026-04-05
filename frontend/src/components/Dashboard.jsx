import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, FolderRoot, FileText, Lightbulb, 
  MessageSquare, Plus, LogOut, 
  CheckCircle2, Send, FileUp, Loader2, X, Check, ChevronRight, Download, FileType,
  Sparkles
} from 'lucide-react';
import { supabase } from "../lib/supabase.js";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

const API = import.meta.env.VITE_API_URL || 'https://mih-1.onrender.com';

// ─────────────────────────────────────────────
// REUSABLE UI COMPONENTS
// ─────────────────────────────────────────────

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
      <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{trend}</span>
    </div>
    <p className="text-slate-500 text-sm font-medium">{label}</p>
    <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
  </div>
);

// ─────────────────────────────────────────────
// SENTIMENT COMPONENTS
// ─────────────────────────────────────────────

const EMOTION_TO_SENTIMENT = {
  joy:      { color: '#22c55e' },
  surprise: { color: '#84cc16' },
  neutral:  { color: '#94a3b8' },
  fear:     { color: '#f59e0b' },
  sadness:  { color: '#f97316' },
  anger:    { color: '#ef4444' },
  disgust:  { color: '#dc2626' },
};

function VibeScoreCard({ overall }) {
  if (!overall) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: '24px 32px',
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      marginBottom: 24,
      flexWrap: 'wrap'
    }}>
      <div style={{ fontSize: 48 }}>{overall.emoji}</div>
      <div>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontWeight: 500 }}>
          OVERALL MEETING VIBE
        </p>
        <h2 style={{ fontSize: 32, fontWeight: 800, margin: '4px 0', color: overall.color }}>
          {overall.vibe_score} / 100
        </h2>
        <p style={{ fontSize: 15, color: '#334155', margin: 0, fontWeight: 600 }}>
          {overall.label}
        </p>
      </div>
      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
        <div style={{
          background: overall.color + '20',
          border: `1px solid ${overall.color}40`,
          borderRadius: 8,
          padding: '6px 14px',
          fontSize: 12,
          color: overall.color,
          fontWeight: 700
        }}>
          {overall.vibe_score >= 65
            ? 'Team was aligned and energized'
            : overall.vibe_score >= 40
            ? 'Mixed reactions across the meeting'
            : 'Significant tension detected'}
        </div>
      </div>
    </div>
  );
}

function SentimentTimeline({ segments, onSegmentClick, activeIndex }) {
  if (!segments?.length) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: 24,
      marginBottom: 24
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 16, letterSpacing: '0.05em' }}>
        SENTIMENT TIMELINE
      </h3>

      <div style={{
        display: 'flex',
        height: 48,
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 12,
        cursor: 'pointer'
      }}>
        {segments.map((seg, i) => (
          <div
            key={i}
            onClick={() => onSegmentClick(i)}
            title={`${seg.speaker} — ${seg.label}`}
            style={{
              flex: 1,
              background: seg.color || '#94a3b8',
              opacity: activeIndex === null || activeIndex === i ? 1 : 0.35,
              transition: 'opacity 0.2s',
              borderRight: i < segments.length - 1 ? '1px solid rgba(255,255,255,0.3)' : 'none',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>Start of meeting</span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>End of meeting</span>
      </div>

      <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
        Click any segment to view the original transcript text
      </p>

      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        {[
          { color: '#22c55e', label: 'Enthusiastic' },
          { color: '#84cc16', label: 'Engaged' },
          { color: '#94a3b8', label: 'Neutral' },
          { color: '#f59e0b', label: 'Concerned' },
          { color: '#f97316', label: 'Uncertain' },
          { color: '#ef4444', label: 'Frustrated' },
          { color: '#dc2626', label: 'Conflicted' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: item.color, flexShrink: 0
            }} />
            <span style={{ fontSize: 11, color: '#64748b' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SegmentDetail({ segment, onClose }) {
  if (!segment) return null;
  return (
    <div style={{
      background: '#fff',
      border: `2px solid ${segment.color}`,
      borderRadius: 16,
      padding: 24,
      marginBottom: 24,
      position: 'relative'
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: 'none',
          fontSize: 20, cursor: 'pointer', color: '#94a3b8'
        }}
      >✕</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{
          background: segment.color + '20',
          border: `1px solid ${segment.color}`,
          borderRadius: 8, padding: '4px 12px',
          fontSize: 12, fontWeight: 700, color: segment.color
        }}>
          {segment.label}
        </div>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
          {segment.speaker}
        </span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          Segment {segment.segment_index + 1}
        </span>
      </div>

      <p style={{
        fontSize: 14, lineHeight: 1.7, color: '#334155',
        background: '#f8fafc', borderRadius: 10,
        padding: 16, margin: 0,
        borderLeft: `4px solid ${segment.color}`
      }}>
        "{segment.text}"
      </p>

      {segment.all_emotions && Object.keys(segment.all_emotions).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>
            EMOTION BREAKDOWN
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(segment.all_emotions)
              .sort(([, a], [, b]) => b - a)
              .map(([emotion, score]) => (
                <div key={emotion} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#64748b', width: 80, textTransform: 'capitalize' }}>
                    {emotion}
                  </span>
                  <div style={{
                    flex: 1, height: 6, background: '#f1f5f9',
                    borderRadius: 3, overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${Math.round(score * 100)}%`,
                      height: '100%',
                      background: EMOTION_TO_SENTIMENT[emotion]?.color || '#94a3b8',
                      borderRadius: 3,
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#94a3b8', width: 36, textAlign: 'right' }}>
                    {Math.round(score * 100)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SpeakerBreakdown({ speakers }) {
  if (!speakers?.length) return null;

  if (speakers.every(s => s.speaker === 'Unknown')) {
    return (
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 16, padding: 24, marginBottom: 24
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 8, letterSpacing: '0.05em' }}>
          PER-SPEAKER BREAKDOWN
        </h3>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>
          Speaker names were not detected in this transcript. Format lines as "Name: dialogue" for per-speaker analysis.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0',
      borderRadius: 16, padding: 24, marginBottom: 24
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 20, letterSpacing: '0.05em' }}>
        PER-SPEAKER BREAKDOWN
      </h3>

      <ResponsiveContainer width="100%" height={Math.max(180, speakers.length * 48)}>
        <BarChart data={speakers} layout="vertical" margin={{ left: 80, right: 30 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="speaker"
            tick={{ fontSize: 12, fontWeight: 600 }}
            width={75}
          />
          <Tooltip
            formatter={(value) => [`${value}/100`, 'Vibe Score']}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="vibe_score" radius={[0, 6, 6, 0]}>
            {speakers.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.vibe_score >= 65 ? '#22c55e'
                  : entry.vibe_score >= 40 ? '#f59e0b'
                  : '#ef4444'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12, marginTop: 20
      }}>
        {speakers.map((s, i) => {
          const color = s.vibe_score >= 65 ? '#22c55e'
            : s.vibe_score >= 40 ? '#f59e0b' : '#ef4444';
          return (
            <div key={i} style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10, padding: '12px 16px'
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
                {s.speaker}
              </p>
              <p style={{ fontSize: 11, color, fontWeight: 600, margin: '0 0 8px' }}>
                {s.dominant_label} · {s.vibe_score}/100
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { key: 'positive_count', color: '#22c55e', label: '✓' },
                  { key: 'neutral_count',  color: '#94a3b8', label: '–' },
                  { key: 'negative_count', color: '#ef4444', label: '!' },
                ].map(item => (
                  <div key={item.key} style={{
                    flex: 1, textAlign: 'center',
                    background: item.color + '15',
                    borderRadius: 6, padding: '4px 0'
                  }}>
                    <span style={{ fontSize: 10, color: item.color, fontWeight: 700 }}>
                      {item.label} {s[item.key]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SentimentDashboard({ transcriptId, token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);
  const [activeSegment, setActiveSegment] = useState(null);

  useEffect(() => {
    if (!transcriptId || !token) return;
    setLoading(true);
    setError(null);
    setData(null);
    setActiveIndex(null);
    setActiveSegment(null);

    axios.get(`${API}/sentiment/${transcriptId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load sentiment data'))
      .finally(() => setLoading(false));
  }, [transcriptId, token]);

  const handleSegmentClick = (index) => {
    if (activeIndex === index) {
      setActiveIndex(null);
      setActiveSegment(null);
    } else {
      setActiveIndex(index);
      setActiveSegment(data.segments[index]);
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#475569' }}>
        Analyzing sentiment across the transcript...
      </p>
      <p style={{ fontSize: 12, color: '#cbd5e1', marginTop: 6 }}>
        Running locally — first analysis may take 15–30 seconds
      </p>
    </div>
  );

  if (error) return (
    <div style={{
      background: '#fef2f2', border: '1px solid #fecaca',
      borderRadius: 12, padding: 20, color: '#dc2626', fontSize: 14
    }}>
      ⚠️ {error}
    </div>
  );

  if (!data) return null;

  return (
    <div>
      {data.cached && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 8, padding: '6px 14px', fontSize: 11,
          color: '#16a34a', fontWeight: 600, marginBottom: 16,
          display: 'inline-block'
        }}>
          ✓ Loaded from cache
        </div>
      )}
      <VibeScoreCard overall={data.overall} />
      <SentimentTimeline
        segments={data.segments}
        onSegmentClick={handleSegmentClick}
        activeIndex={activeIndex}
      />
      {activeSegment && (
        <SegmentDetail
          segment={activeSegment}
          onClose={() => { setActiveIndex(null); setActiveSegment(null); }}
        />
      )}
      <SpeakerBreakdown speakers={data.speakers} />
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN DASHBOARD COMPONENT
// ─────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);

  // --- State ---
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
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
  const [newProjectName, setNewProjectName] = useState('');
  const [viewingTranscript, setViewingTranscript] = useState(null);

  // Chat States
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Sentiment States
  const [sentimentTranscriptId, setSentimentTranscriptId] = useState(null);
  const [showSentiment, setShowSentiment] = useState(false);

  // --- Init ---
  useEffect(() => {
    const initDashboard = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate('/login');
      setToken(session.access_token);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/login');
      setUser(user);
      await fetchDashboardData();
    };
    initDashboard();
  }, [navigate]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatLoading]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [projRes, transRes, decRes] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('transcripts').select('*').order('created_at', { ascending: false }),
        supabase.from('decisions').select('*').order('created_at', { ascending: false }),
      ]);
      if (projRes.data) setProjects(projRes.data);
      if (transRes.data) setTranscripts(transRes.data);
      if (decRes.data) setDecisions(decRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Export ---
  const handleExportCSV = () => {
    if (projectDecisions.length === 0) return alert('No data to export');
    const headers = 'Type,Description,Responsible,Deadline\n';
    const rows = projectDecisions.map(d =>
      `${d.type},"${(d.description || '').replace(/"/g, '""')}",${d.owner || 'N/A'},${d.due_date || 'N/A'}`
    );
    const blob = new Blob([headers + rows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject?.name || 'export'}_Insights.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => window.print();

  // --- Project ---
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
      setNewProjectName('');
      setShowProjectModal(false);
    } catch (error) {
      alert(error.message);
    }
  };

  // --- Transcript ---
  const handleDeleteTranscript = async (transcriptId) => {
    if (!window.confirm('Are you sure you want to delete this transcript?')) return;
    try {
      const { error } = await supabase.from('transcripts').delete().eq('id', transcriptId);
      if (error) throw error;
      await fetchDashboardData();
    } catch (error) {
      alert('Error deleting: ' + error.message);
    }
  };

  // --- Upload ---
  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !selectedProjectId) return;
    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Session expired. Please login again.');
        return navigate('/login');
      }
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', selectedProjectId);
        const response = await fetch(`${API}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
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

  // --- Drag & Drop ---
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) handleFileSelect({ target: { files } });
  };

  // --- Logout ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // --- Chat ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmedInput = chatInput.trim();
    if (!trimmedInput || !selectedProjectId) return;

    setChatHistory(prev => [...prev, { role: 'user', content: trimmedInput }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired. Please login again.');

      const response = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ project_id: selectedProjectId, question: trimmedInput }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Chat failed');

      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        intent: data.intent,
      }]);
    } catch (error) {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `Something went wrong: ${error.message}`,
        sources: [],
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- Derived State ---
  const activeProject = projects.find(p => p.id === selectedProjectId);
  const projectTranscripts = transcripts.filter(t => t.project_id === selectedProjectId);
  const projectDecisions = decisions.filter(d =>
    projectTranscripts.some(t => t.id === d.transcript_id)
  );

  // --- Helpers ---
  const formatDate = (ds) => ds
    ? new Date(ds).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'Recent';
  const userDisplayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const userInitials = userDisplayName.substring(0, 2).toUpperCase();

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900 print:bg-white">

      {/* ── SIDEBAR ── */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-6 sticky top-0 h-screen print:hidden">
        <div
          className="flex items-center gap-2 mb-10 px-2 cursor-pointer"
          onClick={() => setSelectedProjectId(null)}
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
            <div className="w-4 h-4 bg-white rounded-sm rotate-45" />
          </div>
          <span className="font-bold text-lg tracking-tight">Recall</span>
        </div>

        <nav className="flex-1 space-y-1">
          <SidebarItem
            icon={LayoutDashboard}
            label="Dashboard"
            active={!selectedProjectId}
            onClick={() => setSelectedProjectId(null)}
          />
          <SidebarItem
            icon={FolderRoot}
            label="Projects"
            active={!!selectedProjectId}
            onClick={() => setSelectedProjectId(null)}
          />
          <SidebarItem
            icon={MessageSquare}
            label="AI Chat"
            active={showChat}
            onClick={() => {
              if (selectedProjectId) setShowChat(true);
              else alert('Please select a project first to start chatting!');
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
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">

        {/* ── TOP BAR ── */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span
              className={`cursor-pointer ${!selectedProjectId ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
              onClick={() => setSelectedProjectId(null)}
            >
              Dashboard
            </span>
            {activeProject && (
              <>
                <ChevronRight size={14} className="text-slate-300" />
                <span className="text-indigo-600 font-bold">{activeProject.name}</span>
              </>
            )}
          </div>
          <button
            onClick={() => setShowProjectModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
          >
            <Plus size={16} /> New Project
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl mx-auto w-full print:p-0">

          {/* ── DASHBOARD HOME ── */}
          {!selectedProjectId ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Projects"  value={loading ? '...' : projects.length}                                         icon={FolderRoot}    trend="Active"    />
                <StatCard label="Transcripts"     value={loading ? '...' : transcripts.length}                                      icon={FileText}      trend="Live"      />
                <StatCard label="Action Items"    value={loading ? '...' : decisions.filter(d => d.type === 'action_item').length}  icon={CheckCircle2}  trend="Pending"   />
                <StatCard label="AI Insights"     value={loading ? '...' : decisions.length}                                        icon={Lightbulb}     trend="Extracted" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <h3 className="font-bold text-slate-900">Your Projects</h3>
                  {projects.length === 0 && !loading && (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                      <FolderRoot size={32} className="text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 font-medium">No projects yet</p>
                      <p className="text-slate-400 text-sm mt-1">Click "New Project" to get started</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map(p => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProjectId(p.id)}
                        className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 transition-colors">
                            <FolderRoot size={20} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {transcripts.filter(t => t.project_id === p.id).length} Files
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{p.name}</h4>
                        <p className="text-xs text-slate-400 mt-1">Updated {formatDate(p.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="font-bold text-slate-900">Recent Action Items</h3>
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 divide-y divide-slate-50 shadow-sm">
                    {decisions.filter(d => d.type === 'action_item').slice(0, 5).length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-6 italic">No action items yet</p>
                    ) : (
                      decisions.filter(d => d.type === 'action_item').slice(0, 5).map(action => (
                        <div key={action.id} className="py-3 first:pt-0 last:pb-0">
                          <p className="text-xs font-semibold text-slate-800 line-clamp-2">{action.description}</p>
                          <p className="text-[10px] text-indigo-500 font-bold mt-1 uppercase">{action.owner || 'Unassigned'}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (

            /* ── PROJECT DETAIL VIEW ── */
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">

              {/* Project Header */}
              <div className="flex justify-between items-center print:hidden flex-wrap gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">{activeProject.name}</h2>
                  <p className="text-slate-500 text-sm mt-1">Accepts .TXT and .VTT transcript formats</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".txt,.vtt"
                    multiple
                    className="hidden"
                  />
                  <button
                    onClick={() => setShowDropZone(prev => !prev)}
                    disabled={isUploading}
                    className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all"
                  >
                    {isUploading ? <Loader2 className="animate-spin" size={18} /> : <FileUp size={18} />}
                    {isUploading ? 'Extracting...' : 'Upload Transcript'}
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                  >
                    <Download size={16} /> CSV
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                  >
                    <FileType size={16} /> PDF
                  </button>
                </div>
              </div>

              {/* Drop Zone */}
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
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                    isDragging ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50'
                  }`}>
                    {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <FileUp className="w-8 h-8" />}
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">
                      {isUploading ? 'AI is analyzing your meeting...' : 'Drop your transcript here'}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">or click to browse from your computer</p>
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

              {/* Decisions Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 font-bold text-sm bg-slate-50/50 flex items-center gap-2">
                  <Check size={16} className="text-emerald-500" /> Decisions (Final Agreements)
                </div>
                <div className="p-6 space-y-3">
                  {projectDecisions.filter(d => d.type === 'decision').length === 0 ? (
                    <p className="text-slate-400 text-center py-4 italic">No decisions extracted yet. Upload a transcript to get started.</p>
                  ) : (
                    projectDecisions.filter(d => d.type === 'decision').map(d => (
                      <div key={d.id} className="flex gap-3 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span className="font-medium">{d.description}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Items Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 font-bold text-sm bg-slate-50/50 text-orange-600">
                  Action Items (Tasks)
                </div>
                {projectDecisions.filter(d => d.type === 'action_item').length === 0 ? (
                  <p className="text-slate-400 text-center py-8 italic">No action items extracted yet.</p>
                ) : (
                  <table className="w-full text-left">
                    <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/30">
                      <tr>
                        <th className="px-6 py-4">Responsible</th>
                        <th className="px-6 py-4">Task</th>
                        <th className="px-6 py-4">Deadline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {projectDecisions.filter(d => d.type === 'action_item').map(d => (
                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                              {d.owner || 'Unassigned'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-800">{d.description}</td>
                          <td className="px-6 py-4 text-slate-500 font-mono italic">{d.due_date || 'TBD'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Transcripts List */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm print:hidden">
                <div className="px-6 py-4 border-b border-slate-100 font-bold text-sm bg-slate-50/50 flex items-center gap-2">
                  <FileText size={16} className="text-slate-500" /> Transcripts in this Project
                </div>
                <div className="p-6">
                  {projectTranscripts.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText size={32} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 italic">No transcripts uploaded yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projectTranscripts.map(t => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-4 border rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText size={18} className="text-slate-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate">{t.filename}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">
                                {t.word_count?.toLocaleString()} Words · {formatDate(t.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0 ml-3">
                            <button
                              onClick={() => setViewingTranscript(t)}
                              className="text-indigo-600 hover:text-indigo-800 font-bold text-xs whitespace-nowrap"
                            >
                              View
                            </button>
                            <button
                              onClick={() => {
                                setSentimentTranscriptId(t.id);
                                setShowSentiment(true);
                              }}
                              className="text-purple-600 hover:text-purple-800 font-bold text-xs whitespace-nowrap flex items-center gap-1"
                            >
                              <Sparkles size={12} /> Vibe
                            </button>
                            <button
                              onClick={() => handleDeleteTranscript(t.id)}
                              className="text-red-400 hover:text-red-600 font-bold text-xs whitespace-nowrap"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FLOATING CHAT BUTTON ── */}
        {selectedProjectId && !showChat && (
          <button
            onClick={() => setShowChat(true)}
            className="fixed bottom-8 right-8 bg-indigo-600 text-white p-4 rounded-2xl shadow-2xl hover:bg-indigo-700 transition-all z-40 flex items-center gap-2 group"
          >
            <MessageSquare size={24} />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold whitespace-nowrap">
              Ask AI
            </span>
          </button>
        )}

        {/* ── SLIDE-OVER CHAT PANEL ── */}
        <div className={`fixed top-0 right-0 h-screen w-[420px] bg-white border-l border-slate-200 shadow-2xl z-[150] transition-transform duration-300 transform ${showChat ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900">Project AI Chat</h3>
                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">RAG · Intent Routing · Hybrid Search</p>
              </div>
              <button onClick={() => setShowChat(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC]">
              {chatHistory.length === 0 && (
                <div className="text-center mt-10">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lightbulb size={32} />
                  </div>
                  <p className="text-sm font-bold text-slate-900">Ask anything about this project</p>
                  <p className="text-xs text-slate-400 mt-1 px-8 leading-relaxed">
                    "What were the budget concerns?" · "Summarize the meeting" · "Who owns the API task?"
                  </p>
                </div>
              )}

              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 rounded-tr-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                  }`}>
                    {msg.content}
                    {msg.intent && msg.role === 'assistant' && (
                      <div className="mt-2">
                        <span className="text-[9px] uppercase font-bold opacity-50 tracking-wider">
                          {msg.intent.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-tighter">Sources</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {msg.sources.slice(0, 4).map((s, i) => (
                            <span
                              key={i}
                              title={s.snippet}
                              className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] border border-slate-200"
                            >
                              Ref {i + 1}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <Loader2 className="animate-spin text-indigo-600" size={16} />
                    <span className="text-xs text-slate-400">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

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

        {/* ── MODALS ── */}

        {/* View Transcript Modal */}
        {viewingTranscript && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold">{viewingTranscript.filename}</h3>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">Full Transcript</p>
                </div>
                <button onClick={() => setViewingTranscript(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {viewingTranscript.content || 'No content found for this transcript.'}
                </pre>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setViewingTranscript(null)}
                  className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Project Modal */}
        {showProjectModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">New Project</h3>
                <button onClick={() => setShowProjectModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateProject} className="space-y-5">
                <input
                  autoFocus
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name..."
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  required
                />
                <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                  Create Project
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── SENTIMENT MODAL ── */}
        {showSentiment && sentimentTranscriptId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">

              {/* Modal Header */}
              <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-purple-500" />
                    <h3 className="text-xl font-bold text-slate-900">Sentiment Analysis</h3>
                  </div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">
                    {projectTranscripts.find(t => t.id === sentimentTranscriptId)?.filename || 'Transcript'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowSentiment(false);
                    setSentimentTranscriptId(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Sentiment Dashboard */}
              <div className="flex-1 overflow-y-auto p-8">
                <SentimentDashboard
                  transcriptId={sentimentTranscriptId}
                  token={token}
                />
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
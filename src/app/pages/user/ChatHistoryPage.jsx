import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import {
    MessageSquare, Send, Edit3, Check, X, Loader2, AlertCircle,
    Calendar, Search, ArrowLeft, BookOpen, Sparkles, User, HelpCircle, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import mascotImg from '/src/image/mascot.jpg';
import { API_BASE_URL } from '../../api.js';

export default function ChatHistoryPage() {
    const { user } = useApp();
    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [messages, setMessages] = useState([]);

    // Inputs and filters
    const [searchTerm, setSearchTerm] = useState('');
    const [query, setQuery] = useState('');
    const [editingSessionId, setEditingSessionId] = useState(null);
    const [editTitleValue, setEditTitleValue] = useState('');

    // Loading states
    const [isLoadingSessions, setIsLoadingSessions] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [quota, setQuota] = useState(null);

    // Citations display state
    const [activeCitationIdx, setActiveCitationIdx] = useState(null);

    const messagesEndRef = useRef(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isSending]);

    // Fetch quota usage
    const fetchQuota = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/chat/quota`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setQuota(result.data);
                }
            }
        } catch (error) {
            console.error('Error fetching chat quota:', error);
        }
    };

    // Load session list on mount
    useEffect(() => {
        const fetchSessions = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Session expired. Please login again.');
                setIsLoadingSessions(false);
                return;
            }

            try {
                setIsLoadingSessions(true);
                const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && Array.isArray(result.data)) {
                        setSessions(result.data);
                    }
                } else {
                    toast.error('Failed to load chat history sessions');
                }
            } catch (error) {
                console.error('Error fetching sessions:', error);
                toast.error('Error loading chat history');
            } finally {
                setIsLoadingSessions(false);
            }
        };

        if (user) {
            fetchSessions();
            fetchQuota();
        }
    }, [user]);

    // Select a conversation session
    const handleSelectSession = async (session) => {
        setActiveSession(session);
        setMessages([]);
        setIsLoadingMessages(true);
        setActiveCitationIdx(null);

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions/${session.id}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                    setMessages(result.data);
                }
            } else {
                toast.error('Failed to fetch messages for this session');
            }
        } catch (error) {
            console.error('Error loading session messages:', error);
            toast.error('Error loading message history');
        } finally {
            setIsLoadingMessages(false);
        }
    };

    // Rename a session
    const startEditing = (session, e) => {
        e.stopPropagation();
        setEditingSessionId(session.id);
        setEditTitleValue(session.title || 'Conversation');
    };

    const cancelEditing = (e) => {
        if (e) e.stopPropagation();
        setEditingSessionId(null);
        setEditTitleValue('');
    };

    const saveRename = async (sessionId, e) => {
        if (e) e.stopPropagation();
        const cleanTitle = editTitleValue.trim();
        if (!cleanTitle) {
            toast.error('Title cannot be empty');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions/${sessionId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title: cleanTitle })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    toast.success('Session renamed successfully');
                    // Update sessions list locally
                    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: cleanTitle } : s));
                    // Update active session details if selected
                    if (activeSession && activeSession.id === sessionId) {
                        setActiveSession(prev => ({ ...prev, title: cleanTitle }));
                    }
                } else {
                    toast.error(result.message || 'Failed to rename session');
                }
            } else {
                toast.error('Server returned an error when renaming');
            }
        } catch (error) {
            console.error('Error renaming:', error);
            toast.error('Error renaming session');
        } finally {
            setEditingSessionId(null);
            setEditTitleValue('');
        }
    };

    const handleDeleteSession = async (sessionId, e) => {
        if (e) e.stopPropagation();

        if (!window.confirm("Are you sure you want to delete this chat session?")) {
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    toast.success('Session deleted successfully');
                    setSessions(prev => prev.filter(s => s.id !== sessionId));
                    if (activeSession && activeSession.id === sessionId) {
                        setActiveSession(null);
                        setMessages([]);
                    }
                } else {
                    toast.error(result.message || 'Failed to delete session');
                }
            } else {
                toast.error('Failed to delete session');
            }
        } catch (error) {
            console.error('Error deleting session:', error);
            toast.error('Error deleting session');
        }
    };

    // Send a message within active session
    const handleSend = async (e) => {
        if (e) e.preventDefault();
        const cleanQuery = query.trim();
        if (cleanQuery.length < 3) {
            toast.error('Query must be at least 3 characters long');
            return;
        }

        if (!activeSession) return;

        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Session expired. Please login again.');
            return;
        }

        // Add user message locally
        const userMsg = {
            id: Date.now().toString(),
            sender: 'user',
            content: cleanQuery,
            createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMsg]);
        setQuery('');
        setIsSending(true);
        setActiveCitationIdx(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    documentId: null, // Scoped to active session
                    query: cleanQuery,
                    sessionId: activeSession.id
                })
            });

            if (!response.ok) {
                const errResult = await response.json().catch(() => ({}));
                throw new Error(errResult.message || `API error: status ${response.status}`);
            }

            const result = await response.json();
            if (result.success && result.data) {
                const aiData = result.data;
                const aiMsg = {
                    id: (Date.now() + 1).toString(),
                    sender: 'bot',
                    content: aiData.answer,
                    citations: aiData.citations || [],
                    createdAt: new Date().toISOString()
                };
                setMessages(prev => [...prev, aiMsg]);

                // Update quota info
                if (aiData.remainingRequests !== undefined) {
                    setQuota({
                        remaining: aiData.remainingRequests,
                        dailyLimit: aiData.dailyLimit || (quota?.dailyLimit || 10),
                        currentCount: (aiData.dailyLimit || 10) - aiData.remainingRequests
                    });
                } else {
                    fetchQuota();
                }
            } else {
                throw new Error(result.message || 'Failed to get a response from AI');
            }
        } catch (error) {
            console.error('AI Chat Error:', error);
            const errorMsg = {
                id: (Date.now() + 1).toString(),
                sender: 'error',
                content: error.message || 'Network error occurred. Please try again.',
                createdAt: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMsg]);
            toast.error(error.message || 'Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (query.trim().length >= 3 && !isSending) {
                handleSend();
            }
        }
    };

    // Filter sessions by search term
    const filteredSessions = sessions.filter(s =>
        (s.title || 'Conversation').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Format dates nicely
    const formatDate = (dateStr) => {
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return 'N/A';
            return d.toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateStr || 'N/A';
        }
    };

    return (
        <div className="container-fluid py-4 px-4 px-md-5 text-start" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>

            {/* Styles for typing animations and scrollbars */}
            <style>{`
                @keyframes history-pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.7; }
                }
                @keyframes bounce-item {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                .pulse-glow {
                    animation: history-pulse 2s infinite ease-in-out;
                }
                .bounce-dot {
                    animation: bounce-item 1.2s infinite ease-in-out;
                }
                .bounce-dot:nth-child(1) { animation-delay: 0s; }
                .bounce-dot:nth-child(2) { animation-delay: 0.2s; }
                .bounce-dot:nth-child(3) { animation-delay: 0.4s; }
                
                .h-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .h-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .h-scroll::-webkit-scrollbar-thumb {
                    background-color: rgba(253, 143, 82, 0.2);
                    border-radius: 3px;
                }
                .h-scroll::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(253, 143, 82, 0.4);
                }
            `}</style>

            {/* BACK BUTTON */}
            <div className="mb-4">
                <Link to="/user/home" className="d-inline-flex align-items-center gap-2 text-decoration-none text-muted" style={{ fontSize: '14px' }}>
                    <ArrowLeft className="h-4 w-4" /> <span className="fw-medium">Back to Homepage</span>
                </Link>
            </div>

            {/* DASHBOARD CARD CONTAINER */}
            <div className="mx-auto" style={{ maxWidth: '1200px' }}>
                <div className="d-flex align-items-center gap-3 mb-4">
                    <div
                        className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm"
                        style={{ width: '56px', height: '56px', fontSize: '22px', background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                    >
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <h2 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>AI CHAT HISTORY</h2>
                        <span className="text-muted" style={{ fontSize: '13px' }}>
                            View and continue your previous learning sessions with AI
                        </span>
                    </div>
                </div>

                <div
                    className="card shadow-sm border-0 overflow-hidden"
                    style={{
                        borderRadius: '1rem',
                        border: '1px solid rgba(253, 143, 82, 0.15)',
                        height: '650px'
                    }}
                >
                    <div className="row g-0 h-100">

                        {/* LEFT COLUMN: SESSIONS LIST */}
                        <div
                            className="col-12 col-md-4 border-end d-flex flex-column h-100 bg-white"
                            style={{ minWidth: '280px' }}
                        >
                            {/* Search bar */}
                            <div className="p-3 border-bottom">
                                <div className="position-relative">
                                    <Search className="position-absolute text-muted" size={16} style={{ left: '12px', top: '12px' }} />
                                    <input
                                        type="text"
                                        placeholder="Search conversations..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="form-control ps-5 py-2"
                                        style={{
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            border: '1px solid rgba(253, 143, 82, 0.2)',
                                            background: '#FFF9F5'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Sessions scroll view */}
                            <div className="flex-grow-1 overflow-auto h-scroll p-2">
                                {isLoadingSessions ? (
                                    <div className="d-flex flex-column align-items-center justify-content-center py-5 gap-2 text-muted">
                                        <Loader2 className="animate-spin text-primary" size={24} style={{ animation: 'spin 1s linear infinite' }} />
                                        <span style={{ fontSize: '13px' }}>Loading conversations...</span>
                                    </div>
                                ) : filteredSessions.length === 0 ? (
                                    <div className="text-center py-5 px-3 text-muted" style={{ fontSize: '13px' }}>
                                        No conversations found.
                                    </div>
                                ) : (
                                    filteredSessions.map((session) => {
                                        const isActive = activeSession && activeSession.id === session.id;
                                        const isEditing = editingSessionId === session.id;

                                        return (
                                            <div
                                                key={session.id}
                                                onClick={() => !isEditing && handleSelectSession(session)}
                                                className={`p-3 rounded mb-2 border transition-all d-flex align-items-center justify-content-between text-start ${isActive
                                                        ? 'bg-orange-50 border-orange-200 shadow-sm'
                                                        : 'border-light hover-bg-light cursor-pointer'
                                                    }`}
                                                style={{
                                                    cursor: isEditing ? 'default' : 'pointer',
                                                    borderColor: isActive ? 'rgba(253, 143, 82, 0.3)' : '#f8f9fa',
                                                    backgroundColor: isActive ? '#FFF5ED' : 'transparent',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div className="flex-grow-1 overflow-hidden me-2">
                                                    {isEditing ? (
                                                        <div className="d-flex align-items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                                            <input
                                                                type="text"
                                                                value={editTitleValue}
                                                                onChange={(e) => setEditTitleValue(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') saveRename(session.id);
                                                                    if (e.key === 'Escape') cancelEditing();
                                                                }}
                                                                className="form-control form-control-sm py-1 px-2"
                                                                style={{ fontSize: '12px', borderRadius: '4px' }}
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={(e) => saveRename(session.id, e)}
                                                                className="btn btn-success btn-sm p-1 d-flex align-items-center justify-content-center"
                                                                style={{ width: '24px', height: '24px' }}
                                                            >
                                                                <Check size={12} />
                                                            </button>
                                                            <button
                                                                onClick={cancelEditing}
                                                                className="btn btn-outline-danger btn-sm p-1 d-flex align-items-center justify-content-center"
                                                                style={{ width: '24px', height: '24px' }}
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <h6
                                                                className={`m-0 text-truncate fw-semibold ${isActive ? 'text-primary' : 'text-dark'}`}
                                                                style={{ fontSize: '13.5px', color: isActive ? '#FD8F52' : '#333' }}
                                                            >
                                                                {session.title || 'Conversation'}
                                                            </h6>
                                                            <div className="d-flex align-items-center gap-1.5 mt-1 text-muted" style={{ fontSize: '11px' }}>
                                                                <Calendar size={11} />
                                                                <span>{formatDate(session.createdAt || session.updatedAt)}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {!isEditing && (
                                                    <div className="d-flex align-items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            onClick={(e) => startEditing(session, e)}
                                                            className="btn btn-link p-1 text-muted hover-text-primary border-0"
                                                            title="Rename Session"
                                                            style={{ outline: 'none' }}
                                                        >
                                                            <Edit3 size={13} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteSession(session.id, e)}
                                                            className="btn btn-link p-1 text-muted hover-text-danger border-0"
                                                            title="Delete Session"
                                                            style={{ outline: 'none' }}
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: ACTIVE THREAD */}
                        <div className="col-12 col-md-8 d-flex flex-column h-100 bg-light-subtle">
                            {activeSession ? (
                                <>
                                    {/* Header Panel */}
                                    <div
                                        className="p-3 border-bottom d-flex align-items-center justify-content-between flex-shrink-0"
                                        style={{
                                            background: '#ffffff',
                                            borderBottom: '1px solid rgba(253, 143, 82, 0.15)'
                                        }}
                                    >
                                        <div className="d-flex align-items-center gap-3 text-start">
                                            <img
                                                src={mascotImg}
                                                alt="AI Mascot"
                                                className="rounded-circle border bg-white"
                                                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                            />
                                            <div>
                                                <h5 className="m-0 fw-bold text-dark" style={{ fontSize: '16px' }}>
                                                    {activeSession.title || 'Active Conversation'}
                                                </h5>
                                                <span className="text-muted" style={{ fontSize: '11px' }}>
                                                    Session ID: <code style={{ fontSize: '10px', color: '#FE676E' }}>{activeSession.id}</code>
                                                </span>
                                            </div>
                                        </div>

                                        {quota && (
                                            <div className="text-end">
                                                <span
                                                    className="badge px-3 py-1.5 fw-semibold"
                                                    style={{
                                                        borderRadius: '20px',
                                                        fontSize: '11px',
                                                        backgroundColor: quota.remaining === 0 ? '#FEE2E2' : '#FFF5ED',
                                                        color: quota.remaining === 0 ? '#EF4444' : '#FD8F52'
                                                    }}
                                                >
                                                    ⚡ Quota Remaining: {quota.remaining} / {quota.dailyLimit}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Messages Log area */}
                                    <div className="flex-grow-1 p-4 overflow-auto h-scroll d-flex flex-column gap-3 text-start">
                                        {isLoadingMessages ? (
                                            <div className="my-auto text-center text-muted d-flex flex-column align-items-center gap-2">
                                                <Loader2 className="animate-spin text-primary" size={32} style={{ animation: 'spin 1s linear infinite' }} />
                                                <span style={{ fontSize: '14px' }}>Loading conversation history...</span>
                                            </div>
                                        ) : messages.length === 0 ? (
                                            <div className="my-auto text-center text-muted py-5">
                                                <HelpCircle size={40} className="text-muted mb-2" />
                                                <h6 className="fw-semibold">No messages in this thread yet.</h6>
                                                <p className="mb-0 text-muted" style={{ fontSize: '12px' }}>
                                                    Ask a question to start.
                                                </p>
                                            </div>
                                        ) : (
                                            messages.map((msg, index) => {
                                                const isUser = msg.sender?.toLowerCase() === 'user';
                                                const isError = msg.sender?.toLowerCase() === 'error';

                                                return (
                                                    <div
                                                        key={msg.id || index}
                                                        className={`d-flex gap-3 align-items-start ${isUser ? 'justify-content-end' : 'justify-content-start'}`}
                                                    >
                                                        {!isUser && (
                                                            <img
                                                                src={mascotImg}
                                                                alt="AI Mascot"
                                                                className="rounded-circle border"
                                                                style={{ width: '32px', height: '32px', objectFit: 'cover', flexShrink: 0, marginTop: '4px' }}
                                                            />
                                                        )}
                                                        <div
                                                            className={`d-flex flex-column ${isUser ? 'align-items-end' : 'align-items-start'}`}
                                                            style={{ maxWidth: '75%' }}
                                                        >
                                                            <div
                                                                className={`py-3 px-4 rounded shadow-sm`}
                                                                style={{
                                                                    fontSize: '14px',
                                                                    lineHeight: '1.5',
                                                                    borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                                                                    background: isUser
                                                                        ? 'linear-gradient(135deg, #FD8F52 0%, #FE676E 100%)'
                                                                        : isError
                                                                            ? '#FFF0F2'
                                                                            : '#ffffff',
                                                                    color: isUser ? '#ffffff' : '#333333',
                                                                    border: isError ? '1px solid rgba(199, 56, 102, 0.2)' : '1px solid rgba(253, 143, 82, 0.08)'
                                                                }}
                                                            >
                                                                {isError && <AlertCircle size={15} className="text-danger me-1.5 d-inline-block align-middle" />}
                                                                <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>

                                                                {/* Citations block */}
                                                                {msg.citations && msg.citations.length > 0 && (
                                                                    <div className="mt-3 pt-2.5 border-top border-light-subtle" style={{ fontSize: '12px' }}>
                                                                        <div className="fw-bold mb-1.5 text-muted d-flex align-items-center gap-1">
                                                                            <BookOpen size={12} /> Source References:
                                                                        </div>
                                                                        <div className="d-flex flex-column gap-1.5 mt-1">
                                                                            {msg.citations.map((c, cIdx) => (
                                                                                <div key={cIdx} className="w-100">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setActiveCitationIdx(activeCitationIdx === `${index}-${cIdx}` ? null : `${index}-${cIdx}`)}
                                                                                        className="btn btn-light btn-sm text-start py-1 px-2 border.5 d-flex justify-content-between align-items-center w-100"
                                                                                        style={{ fontSize: '12px', borderRadius: '4px', background: '#F8F9FA' }}
                                                                                    >
                                                                                        <span className="text-truncate" style={{ maxWidth: '400px' }}>
                                                                                            📄 {c.fileName || 'Doc source'}
                                                                                        </span>
                                                                                        <span className="badge bg-secondary-subtle text-secondary ms-1 flex-shrink-0">
                                                                                            Page {c.pageNumber || 1}
                                                                                        </span>
                                                                                    </button>
                                                                                    {activeCitationIdx === `${index}-${cIdx}` && c.snippet && (
                                                                                        <div
                                                                                            className="p-2.5 mt-1.5 rounded bg-light border text-muted"
                                                                                            style={{ fontSize: '12px', fontStyle: 'italic', lineHeight: '1.4' }}
                                                                                        >
                                                                                            "{c.snippet}"
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-muted mt-1 px-2" style={{ fontSize: '10px' }}>
                                                                {formatDate(msg.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}

                                         {/* Typing state */}
                                         {isSending && (
                                             <div className="d-flex gap-3 align-items-start justify-content-start">
                                                 <img
                                                     src={mascotImg}
                                                     alt="AI Mascot"
                                                     className="rounded-circle border"
                                                     style={{ width: '32px', height: '32px', objectFit: 'cover', flexShrink: 0, marginTop: '4px' }}
                                                 />
                                                 <div className="d-flex flex-column align-items-start">
                                                     <div
                                                         className="py-2.5 px-3 bg-white rounded shadow-sm d-flex align-items-center gap-1.5"
                                                         style={{
                                                             borderRadius: '14px 14px 14px 2px',
                                                             border: '1px solid rgba(253, 143, 82, 0.08)'
                                                         }}
                                                     >
                                                         <span className="bounce-dot bg-secondary rounded-circle" style={{ width: '6px', height: '6px', opacity: 0.6 }}></span>
                                                         <span className="bounce-dot bg-secondary rounded-circle" style={{ width: '6px', height: '6px', opacity: 0.6 }}></span>
                                                         <span className="bounce-dot bg-secondary rounded-circle" style={{ width: '6px', height: '6px', opacity: 0.6 }}></span>
                                                     </div>
                                                     <span className="text-muted mt-1 px-1" style={{ fontSize: '10px', fontStyle: 'italic' }}>
                                                         AI is searching & formulating answer (10-15s)...
                                                     </span>
                                                 </div>
                                             </div>
                                         )}
                                         <div ref={messagesEndRef} />
                                     </div>
 
                                     {/* AI Quota Restriction Alert Banner */}
                                     {quota && quota.remaining === 0 && (
                                         <div className="alert alert-danger mx-3 my-2 d-flex align-items-center justify-content-between p-2.5 rounded-3 border-danger-subtle" style={{ fontSize: '13px' }}>
                                             <div className="d-flex align-items-center gap-2 text-danger">
                                                 <AlertCircle size={16} />
                                                 <span>You have reached your daily AI query limit. Upgrade your plan to continue!</span>
                                             </div>
                                             <Link to="/upgrade" className="btn btn-sm btn-danger fw-bold px-3 py-1 rounded-pill" style={{ fontSize: '11px' }}>
                                                 Upgrade Now
                                             </Link>
                                         </div>
                                     )}
 
                                     {/* Bottom Message Composer Input */}
                                     <form
                                         onSubmit={handleSend}
                                         className="p-3 border-top bg-white d-flex align-items-center gap-3 flex-shrink-0"
                                         style={{ borderTop: '1px solid rgba(253, 143, 82, 0.15)' }}
                                     >
                                         <div className="flex-grow-1 position-relative">
                                             <textarea
                                                 value={query}
                                                 onChange={(e) => setQuery(e.target.value)}
                                                 onKeyDown={handleKeyDown}
                                                 placeholder={quota && quota.remaining === 0 ? "You have reached your daily AI query limit. Please upgrade your plan." : "Type your question to search documents or query details (minimum 3 characters)..."}
                                                 disabled={isSending || (quota && quota.remaining === 0)}
                                                 className="form-control h-scroll"
                                                 rows={2}
                                                 style={{
                                                     resize: 'none',
                                                     borderRadius: '12px',
                                                     paddingRight: '45px',
                                                     fontSize: '14px',
                                                     border: '1px solid rgba(253, 143, 82, 0.2)',
                                                     outline: 'none',
                                                     maxHeight: '100px',
                                                     lineHeight: '1.4',
                                                     paddingTop: '10px'
                                                 }}
                                             />
                                            {query.trim().length > 0 && query.trim().length < 3 && (
                                                <span
                                                    className="position-absolute text-danger"
                                                    style={{ bottom: '-18px', left: '10px', fontSize: '10px', fontWeight: '500' }}
                                                >
                                                    Query needs at least {3 - query.trim().length} more characters
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={query.trim().length < 3 || isSending || (quota && quota.remaining === 0)}
                                            className="btn d-flex align-items-center justify-content-center p-0 text-white flex-shrink-0 shadow-sm"
                                            style={{
                                                width: '44px',
                                                height: '44px',
                                                borderRadius: '50%',
                                                background: query.trim().length < 3 || isSending || (quota && quota.remaining === 0)
                                                    ? '#e0e0e0'
                                                    : 'linear-gradient(135deg, #FD8F52 0%, #FE676E 100%)',
                                                cursor: query.trim().length < 3 || isSending || (quota && quota.remaining === 0)
                                                    ? 'not-allowed'
                                                    : 'pointer',
                                                transition: 'all 0.2s',
                                                border: 'none'
                                            }}
                                        >
                                            {isSending ? <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div className="m-auto text-center px-4 py-5 text-muted">
                                    <div
                                        className="mx-auto rounded-circle d-flex align-items-center justify-content-center mb-3 pulse-glow"
                                        style={{
                                            width: '80px',
                                            height: '80px',
                                            background: 'linear-gradient(135deg, rgba(253, 143, 82, 0.08) 0%, rgba(254, 103, 110, 0.08) 100%)',
                                            color: '#FD8F52'
                                        }}
                                    >
                                        <Sparkles size={36} />
                                    </div>
                                    <h5 className="fw-bold text-dark mb-2" style={{ fontSize: '16px' }}>Select a conversation thread</h5>
                                    <p className="mb-0 text-muted mx-auto" style={{ maxWidth: '400px', fontSize: '13px', lineHeight: '1.5' }}>
                                        Choose a chat history item from the left sidebar to view message logs, review AI suggestions, or continue asking about documents.
                                    </p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

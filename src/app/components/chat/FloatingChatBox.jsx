import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { MessageSquare, X, Send, RotateCcw, Loader2, AlertCircle, History, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import mascotImg from '/src/image/mascot.jpg';
const CitationItem = ({ citation, index, msgIndex, activeCitationIdx, setActiveCitationIdx, docTitleCache, setDocTitleCache }) => {
    const navigate = useNavigate();
    const [title, setTitle] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const rawFileName = citation.fileName || 'Doc source';
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = rawFileName.match(uuidRegex);
    const docId = match ? match[0] : null;

    useEffect(() => {
        if (!docId) {
            setTitle(rawFileName);
            return;
        }

        if (docTitleCache[docId]) {
            setTitle(docTitleCache[docId]);
            return;
        }

        const fetchTitle = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            setIsLoading(true);
            try {
                const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/${docId}/preview`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data && result.data.title) {
                        const fetchedTitle = result.data.title;
                        setTitle(fetchedTitle);
                        setDocTitleCache(prev => ({ ...prev, [docId]: fetchedTitle }));
                        return;
                    }
                }
            } catch (err) {
                console.error(`Error fetching title for document ${docId}:`, err);
            } finally {
                setIsLoading(false);
            }
            setTitle(rawFileName);
        };

        fetchTitle();
    }, [docId, docTitleCache, rawFileName, setDocTitleCache]);

    const displayTitle = isLoading ? 'Loading document title...' : (title || rawFileName);

    return (
        <div className="w-100 mt-1 text-start">
            <button
                type="button"
                onClick={() => {
                    if (docId) {
                        navigate(`/document/${docId}?page=${citation.pageNumber || 1}`);
                    } else {
                        setActiveCitationIdx(activeCitationIdx === `${msgIndex}-${index}` ? null : `${msgIndex}-${index}`);
                    }
                }}
                className="btn btn-light btn-sm text-start py-1 px-2 border d-flex justify-content-between align-items-center w-100"
                style={{ fontSize: '11px', borderRadius: '4px', background: '#F8F9FA' }}
            >
                <span className="text-truncate" style={{ maxWidth: '180px' }} title={displayTitle}>
                    📄 {displayTitle}
                </span>
                <span className="badge bg-secondary-subtle text-secondary ms-1 flex-shrink-0">
                    Page {citation.pageNumber || 1}
                </span>
            </button>
            {activeCitationIdx === `${msgIndex}-${index}` && citation.snippet && (
                <div
                    className="p-2 mt-1 rounded bg-light border text-muted"
                    style={{ fontSize: '11px', fontStyle: 'italic', lineHeight: '1.4' }}
                >
                    "{citation.snippet}"
                </div>
            )}
        </div>
    );
};

export const FloatingChatBox = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, selectedDocsForChat = [] } = useApp(); // Đảm bảo selectedDocsForChat luôn là mảng để tránh crash

    // 1. Path Filtering: Chỉ hiển thị tại trang danh sách cá nhân hoặc trang chi tiết tài liệu
    const isMyDocs = location.pathname === '/my-documents';
    const isDocDetail = location.pathname.startsWith('/document/') && !location.pathname.endsWith('/edit');

    // Trích xuất document ID nếu đang ở trang chi tiết
    const documentId = isDocDetail ? location.pathname.split('/')[2] : null;

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [query, setQuery] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [quota, setQuota] = useState(null);
    const [activeCitationIdx, setActiveCitationIdx] = useState(null);
    const [docTitleCache, setDocTitleCache] = useState({});

    const messagesEndRef = useRef(null);

    // Reset conversation session khi thay đổi đường dẫn trang tài liệu khác
    useEffect(() => {
        setMessages([]);
        setSessionId(null);
        setIsOpen(false);
    }, [location.pathname]);

    // Tự động cuộn xuống đáy hộp thoại khi có tin nhắn mới
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading, isOpen]);

    // Fetch thông tin giới hạn lượt dùng hàng ngày (Quota) từ Server
    const fetchQuota = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch('http://14.225.254.145:8080/api/v1/chat/quota', {
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

    useEffect(() => {
        if (isOpen) {
            fetchQuota();
        }
    }, [isOpen]);

    // Không render chatbot nếu chưa đăng nhập hoặc nằm ngoài các trang quy định
    if (!user || (!isMyDocs && !isDocDetail)) {
        return null;
    }

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    const handleNewChat = () => {
        setMessages([]);
        setSessionId(null);
        toast.success('Started a new conversation session');
    };

    const handleSend = async (e, customQuery = null) => {
        if (e) e.preventDefault();
        const activeQuery = customQuery !== null ? customQuery : query;
        const cleanQuery = activeQuery.trim();
        if (cleanQuery.length < 3) {
            toast.error('Query must be at least 3 characters long');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Session expired. Please login again.');
            return;
        }

        // Tạo object tin nhắn của user đưa vào state giao diện trước
        const userMsg = {
            id: Date.now().toString(),
            sender: 'user',
            content: cleanQuery,
            createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMsg]);
        setQuery('');
        setIsLoading(true);
        setActiveCitationIdx(null);

        // Chuẩn bị danh sách mảng ID tài liệu đang tích chọn để nạp ngữ cảnh cho AI
        const docIds = Array.isArray(selectedDocsForChat)
            ? selectedDocsForChat.map(d => d?.id || d?.document_id || d?.documentId).filter(Boolean)
            : [];

        try {
            // Đóng gói dữ liệu gửi lên endpoint chat thực tế của Backend
            const response = await fetch('http://14.225.254.145:8080/api/v1/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    documentId: documentId, // Nếu ở My Documents sẽ là null, trang chi tiết là UUID string
                    documentIds: docIds,    // Hỗ trợ nạp mảng danh sách tài liệu đa ngữ cảnh nếu Backend cần
                    query: cleanQuery,
                    sessionId: sessionId    // Trình nối chuỗi hội thoại liên tục (Context Session)
                })
            });

            if (!response.ok) {
                const errResult = await response.json().catch(() => ({}));
                throw new Error(errResult.message || `API error: status ${response.status}`);
            }

            const result = await response.json();
            if (result.success && result.data) {
                const aiData = result.data;

                // Lưu lại sessionId nhận về từ Backend cho các lượt chat kế tiếp
                if (aiData.sessionId) {
                    setSessionId(aiData.sessionId);
                }

                const aiMsg = {
                    id: (Date.now() + 1).toString(),
                    sender: 'bot',
                    content: aiData.answer || 'No response data',
                    citations: aiData.citations || [],
                    createdAt: new Date().toISOString()
                };

                setMessages(prev => [...prev, aiMsg]);

                // Cập nhật lại thanh quota hạn mức ngay lập tức dựa trên data trả về
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
            console.error('AI chat error:', error);
            const errorMsg = {
                id: (Date.now() + 1).toString(),
                sender: 'error',
                content: error.message || 'Network error occurred. Please try again later.',
                createdAt: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMsg]);
            toast.error(error.message || 'Failed to send message');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (query.trim().length >= 3 && !isLoading) {
                handleSend();
            }
        }
    };

    return (
        <>
            {/* FLOATING ACTION TRIGGER BUTTON */}
            {!isOpen && (
                <button
                    onClick={handleToggle}
                    className="btn d-flex align-items-center justify-content-center p-0 position-fixed shadow border-0"
                    style={{
                        bottom: '24px',
                        right: '24px',
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #FD8F52 0%, #FE676E 100%)',
                        color: '#fff',
                        zIndex: 1050,
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                    title="Ask AI Assistant"
                >
                    <img
                        src={mascotImg}
                        alt="AI Mascot"
                        className="rounded-circle border"
                        style={{ width: '48px', height: '48px', objectFit: 'cover', background: '#fff' }}
                    />
                    {quota && quota.remaining <= 2 && (
                        <span
                            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light"
                            style={{ fontSize: '10px' }}
                        >
                            {quota.remaining}
                        </span>
                    )}
                </button>
            )}

            {/* EXPANDED CHAT WINDOW BOX */}
            {isOpen && (
                <div
                    className="position-fixed shadow-lg border d-flex flex-column"
                    style={{
                        bottom: '24px',
                        right: '24px',
                        width: '380px',
                        height: '520px',
                        maxHeight: '80vh',
                        maxWidth: '90vw',
                        borderRadius: '16px',
                        background: '#ffffff',
                        zIndex: 1050,
                        overflow: 'hidden',
                        fontFamily: "'Outfit', 'Inter', sans-serif"
                    }}
                >
                    {/* CHAT HEADER */}
                    <div
                        className="p-3 text-white d-flex align-items-center justify-content-between flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #FD8F52 0%, #FE676E 100%)' }}
                    >
                        <div className="d-flex align-items-center gap-2">
                            <img
                                src={mascotImg}
                                alt="AI Mascot"
                                className="rounded-circle border bg-white"
                                style={{ width: '38px', height: '38px', objectFit: 'cover' }}
                            />
                            <div className="text-start">
                                <h6 className="m-0 fw-bold d-flex align-items-center gap-1.5" style={{ fontSize: '14px' }}>
                                    AI Study Assistant
                                    <span className="d-inline-block rounded-circle bg-success" style={{ width: '8px', height: '8px', animation: 'pulse 2s infinite' }} title="Online"></span>
                                </h6>
                                <span style={{ fontSize: '11px', opacity: 0.9 }}>
                                    {isDocDetail ? 'Document Content Q&A' : 'Search & Recommendations'}
                                </span>
                            </div>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            {messages.length > 0 && (
                                <button
                                    onClick={handleNewChat}
                                    className="btn btn-link text-white p-1"
                                    title="Start New Conversation"
                                    style={{ opacity: 0.8 }}
                                >
                                    <RotateCcw size={16} />
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/chat-history');
                                }}
                                className="btn btn-link text-white p-1"
                                title="View Chat History"
                                style={{ opacity: 0.8 }}
                            >
                                <History size={16} />
                            </button>
                            <button onClick={handleToggle} className="btn btn-link text-white p-1">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* QUOTA BAR */}
                    {quota && (
                        <div
                            className="px-3 py-1.5 text-center fw-semibold d-flex align-items-center justify-content-between border-bottom"
                            style={{
                                fontSize: '11px',
                                background: quota.remaining === 0 ? '#FFF0F2' : '#FFF5ED',
                                color: quota.remaining === 0 ? '#C73866' : '#717182'
                            }}
                        >
                            <span>Daily AI Usage:</span>
                            <span>{quota.remaining} / {quota.dailyLimit} requests remaining</span>
                        </div>
                    )}

                    {/* MESSAGES LIST CONTAINER */}
                    <div className="flex-grow-1 p-3 overflow-auto chat-scroll bg-light d-flex flex-column gap-3 text-start">
                        {messages.length === 0 ? (
                            <div className="my-auto text-center px-4 py-3 text-muted">
                                <div
                                    className="mx-auto rounded-circle d-flex align-items-center justify-content-center mb-3"
                                    style={{
                                        width: '64px',
                                        height: '64px',
                                        background: 'linear-gradient(135deg, rgba(253, 143, 82, 0.1) 0%, rgba(254, 103, 110, 0.1) 100%)',
                                        color: '#FD8F52'
                                    }}
                                >
                                    <MessageSquare size={28} />
                                </div>
                                <h6 className="fw-bold text-dark mb-1 suicide-prevention" style={{ fontSize: '14px' }}>
                                    {isDocDetail ? 'Ask anything about this document!' : 'Find files using AI!'}
                                </h6>
                                <p className="mb-0" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                                    {isDocDetail
                                        ? 'Ask for summaries, vocabulary explanations, major takeaways, or test questions based on the content.'
                                        : 'Type what you are looking for and chat contextually with your knowledge base.'
                                    }
                                </p>
                                {isDocDetail && (
                                    <div className="d-flex flex-column gap-2 mt-3 text-start align-items-center w-100">
                                        <button
                                            type="button"
                                            onClick={() => handleSend(null, "Summarize the main content of this document. Please reply in English.")}
                                            className="btn btn-sm btn-outline-primary rounded-pill w-100 py-1.5 px-3"
                                            style={{ fontSize: '12px', borderColor: 'rgba(253, 143, 82, 0.4)', color: '#FD8F52', transition: 'all 0.2s' }}
                                        >
                                            Summarize this document
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSend(null, "List the core knowledge points and key takeaways from this document. Please reply in English.")}
                                            className="btn btn-sm btn-outline-primary rounded-pill w-100 py-1.5 px-3"
                                            style={{ fontSize: '12px', borderColor: 'rgba(253, 143, 82, 0.4)', color: '#FD8F52', transition: 'all 0.2s' }}
                                        >
                                            Key Takeaways
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSend(null, "Generate 5 multiple-choice review questions with answers based on this document. Please reply in English.")}
                                            className="btn btn-sm btn-outline-primary rounded-pill w-100 py-1.5 px-3"
                                            style={{ fontSize: '12px', borderColor: 'rgba(253, 143, 82, 0.4)', color: '#FD8F52', transition: 'all 0.2s' }}
                                        >
                                            Generate review questions
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            messages.map((msg, index) => {
                                const isUser = msg.sender === 'user';
                                const isError = msg.sender === 'error';

                                return (
                                    <div
                                        key={msg.id}
                                        className={`d-flex gap-2 align-items-start ${isUser ? 'justify-content-end' : 'justify-content-start'}`}
                                    >
                                        {!isUser && (
                                            <img
                                                src={mascotImg}
                                                alt="AI Mascot"
                                                className="rounded-circle border"
                                                style={{ width: '34px', height: '34px', objectFit: 'cover', flexShrink: 0, marginTop: '4px' }}
                                            />
                                        )}
                                        <div
                                            className={`d-flex flex-column ${isUser ? 'align-items-end' : 'align-items-start'}`}
                                            style={{ maxWidth: '82%' }}
                                        >
                                            <div
                                                className={`py-2.5 px-3 rounded shadow-sm`}
                                                style={{
                                                    fontSize: '13px',
                                                    lineHeight: '1.5',
                                                    borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                                    background: isUser
                                                        ? 'linear-gradient(135deg, #FD8F52 0%, #FE676E 100%)'
                                                        : isError
                                                            ? '#FFF0F2'
                                                            : '#ffffff',
                                                    color: isUser ? '#ffffff' : '#333333',
                                                    border: isError ? '1px solid rgba(199, 56, 102, 0.2)' : 'none'
                                                }}
                                            >
                                                {isError && <AlertCircle size={14} className="text-danger me-1 d-inline-block align-middle" />}
                                                <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>

                                                {/* Render danh sách Trích dẫn Citations nguồn tài liệu từ AI */}
                                                {!isUser && msg.citations && msg.citations.length > 0 && (
                                                    <div className="mt-2.5 pt-2 border-top border-light-subtle" style={{ fontSize: '11px' }}>
                                                        <div className="fw-bold mb-1 text-muted d-flex align-items-center gap-1">
                                                            <BookOpen size={11} /> Source References:
                                                        </div>
                                                        <div className="d-flex flex-column gap-1 mt-1">
                                                            {msg.citations.map((c, cIdx) => (
                                                                <CitationItem
                                                                    key={cIdx}
                                                                    citation={c}
                                                                    index={cIdx}
                                                                    msgIndex={index}
                                                                    activeCitationIdx={activeCitationIdx}
                                                                    setActiveCitationIdx={setActiveCitationIdx}
                                                                    docTitleCache={docTitleCache}
                                                                    setDocTitleCache={setDocTitleCache}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-muted mt-1 px-1" style={{ fontSize: '9px' }}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        {/* HIỂN THỊ BA CHẤM ĐANG LÀM VIỆC (LOADING ANIMATION) */}
                        {isLoading && (
                            <div className="d-flex gap-2 align-items-start justify-content-start">
                                <img
                                    src={mascotImg}
                                    alt="AI Mascot"
                                    className="rounded-circle border"
                                    style={{ width: '34px', height: '34px', objectFit: 'cover', flexShrink: 0, marginTop: '4px' }}
                                />
                                <div className="d-flex flex-column align-items-start">
                                    <div
                                        className="py-2.5 px-3 bg-white rounded shadow-sm d-flex align-items-center gap-1.5"
                                        style={{ borderRadius: '14px 14px 14px 2px' }}
                                    >
                                        <span className="chat-dot bg-secondary rounded-circle" style={{ width: '6px', height: '6px', opacity: 0.6 }}></span>
                                        <span className="chat-dot bg-secondary rounded-circle" style={{ width: '6px', height: '6px', opacity: 0.6 }}></span>
                                        <span className="chat-dot bg-secondary rounded-circle" style={{ width: '6px', height: '6px', opacity: 0.6 }}></span>
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
                        <div className="alert alert-danger mx-3 my-2 d-flex align-items-center justify-content-between p-2 rounded-3 border-danger-subtle flex-shrink-0" style={{ fontSize: '11px' }}>
                            <div className="d-flex align-items-center gap-1.5 text-danger">
                                <AlertCircle size={14} />
                                <span>Daily query limit reached. Upgrade your plan!</span>
                            </div>
                            <button
                                type="button"
                                className="btn btn-xs btn-danger fw-bold px-2 py-0.5 rounded-pill"
                                style={{ fontSize: '10px' }}
                                onClick={() => { setIsOpen(false); navigate('/upgrade'); }}
                            >
                                Upgrade
                            </button>
                        </div>
                    )}

                    {/* INPUT FORM CONTAINER */}
                    <form
                        onSubmit={handleSend}
                        className="p-3 border-top bg-white d-flex align-items-center gap-2 flex-shrink-0"
                    >
                        <div className="flex-grow-1 position-relative">
                            <textarea
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={quota && quota.remaining === 0 ? "AI query limit reached..." : "Type a message (min 3 chars)..."}
                                disabled={isLoading || (quota && quota.remaining === 0)}
                                className="form-control chat-scroll"
                                rows={1}
                                style={{
                                    resize: 'none',
                                    borderRadius: '20px',
                                    paddingRight: '36px',
                                    fontSize: '13px',
                                    border: '1px solid rgba(253, 143, 82, 0.2)',
                                    outline: 'none',
                                    maxHeight: '80px',
                                    lineHeight: '1.4',
                                    paddingTop: '8px',
                                    paddingBottom: '8px'
                                }}
                            />
                            {query.trim().length > 0 && query.trim().length < 3 && (
                                <span
                                    className="position-absolute text-danger"
                                    style={{ bottom: '-15px', left: '10px', fontSize: '9px', fontWeight: '500' }}
                                >
                                    Need {3 - query.trim().length} more character(s)
                                </span>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={query.trim().length < 3 || isLoading || (quota && quota.remaining === 0)}
                            className="btn d-flex align-items-center justify-content-center p-0 text-white flex-shrink-0 shadow-sm"
                            style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                background: query.trim().length < 3 || isLoading || (quota && quota.remaining === 0)
                                    ? '#d6d6d6'
                                    : 'linear-gradient(135deg, #FD8F52 0%, #FE676E 100%)',
                                cursor: query.trim().length < 3 || isLoading || (quota && quota.remaining === 0)
                                    ? 'not-allowed'
                                    : 'pointer',
                                transition: 'all 0.2s',
                                border: 'none'
                            }}
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                        </button>
                    </form>
                </div>
            )}

            {/* CSS ANIMATION STYLES FOR DYNAMIC CHAT BOX */}
            <style>{`
                @keyframes bounce-item {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                .chat-dot {
                    animation: bounce-item 1.2s infinite ease-in-out;
                }
                .chat-dot:nth-child(1) { animation-delay: 0s; }
                .chat-dot:nth-child(2) { animation-delay: 0.2s; }
                .chat-dot:nth-child(3) { animation-delay: 0.4s; }

                .chat-scroll::-webkit-scrollbar {
                    width: 5px;
                }
                .chat-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .chat-scroll::-webkit-scrollbar-thumb {
                    background-color: rgba(253, 143, 82, 0.2);
                    border-radius: 4px;
                }
            `}</style>
        </>
    );
};
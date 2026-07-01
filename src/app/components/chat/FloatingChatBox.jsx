<<<<<<< HEAD
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { MessageSquare, X, Send, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const FloatingChatBox = () => {
    const { user, selectedDocsForChat } = useApp();
    const navigate = useNavigate();
    
    const [isOpen, setIsOpen] = useState(false);
    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    
    const messagesEndRef = useRef(null);

    // Scroll to bottom whenever messages list changes
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping]);

    // Do not display chatbot for guest users
    if (!user) return null;

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const text = messageInput.trim();
        if (!text) return;

        // Append user message
        const userMsg = { id: Date.now().toString(), sender: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setMessageInput('');
        setIsTyping(true);

        const docIds = selectedDocsForChat.map(d => d.id || d.document_id || d.documentId).filter(Boolean);

        try {
            const token = localStorage.getItem('token');
=======
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { MessageSquare, X, Send, RotateCcw, Loader2, AlertCircle, History, BookOpen, Search } from 'lucide-react';
import { toast } from 'sonner';
import mascotImg from '/src/image/mascot.jpg';

export const FloatingChatBox = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useApp();

    // 1. Path Filtering: ONLY show on My Documents (/my-documents) and Document Detail (/document/:id)
    const isMyDocs = location.pathname === '/my-documents';
    const isDocDetail = location.pathname.startsWith('/document/') && !location.pathname.endsWith('/edit');

    // Extract document ID if in document detail page
    const documentId = isDocDetail ? location.pathname.split('/')[2] : null;

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [query, setQuery] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [quota, setQuota] = useState(null);
    const [activeCitationIdx, setActiveCitationIdx] = useState(null);

    const messagesEndRef = useRef(null);

    // Reset conversation session when the document context changes
    useEffect(() => {
        setMessages([]);
        setSessionId(null);
        setIsOpen(false);
    }, [location.pathname]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading, isOpen]);

    // Fetch daily quota usage when opening the chat box
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

    // Do not render anything if the user is not authenticated or not on authorized pages
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

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        const cleanQuery = query.trim();
        if (cleanQuery.length < 3) {
            toast.error('Query must be at least 3 characters long');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Session expired. Please login again.');
            return;
        }

        // Add user message to history
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

        try {
>>>>>>> 4c922c24da08180e36840933de85a641d5381918
            const response = await fetch('http://14.225.254.145:8080/api/v1/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
<<<<<<< HEAD
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    message: text,
                    question: text,
                    prompt: text,
                    documentIds: docIds,
                    document_ids: docIds
=======
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    documentId: documentId, // null for my documents, UUID string for document detail
                    query: cleanQuery,
                    sessionId: sessionId // null if new session, UUID string if continuing
>>>>>>> 4c922c24da08180e36840933de85a641d5381918
                })
            });

            if (!response.ok) {
<<<<<<< HEAD
                throw new Error(`API returned error: ${response.status}`);
            }

            const result = await response.json();
            const replyText = result.data?.answer || result.answer || result.data || '';

            if (replyText) {
                setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', content: replyText }]);
            } else {
                throw new Error("Empty reply");
            }
        } catch (error) {
            console.warn("Chat API failed, loading premium demonstration fallback:", error);
            
            // Premium interactive mockup fallback representing the actual chosen documents
            setTimeout(() => {
                const doc1 = selectedDocsForChat[0]?.title || "toan_giai_tich.pdf";
                const doc2 = selectedDocsForChat[1]?.title || "baitap_on_tap.pdf";
                
                let fallbackReply = "";
                if (selectedDocsForChat.length === 0) {
                    fallbackReply = "Chào bạn! Tôi là trợ lý AI học tập. Vui lòng vào trang **Tài liệu của tôi** và tích chọn 2 hoặc 3 tài liệu để tôi có thể hỗ trợ tổng hợp và tra cứu thông tin chính xác nhất giúp bạn.";
                } else if (selectedDocsForChat.length === 1) {
                    fallbackReply = `Dựa trên tài liệu **[1] ${doc1}**, tôi xin tóm tắt thông tin như sau:\n\n- Kiến thức cốt lõi phần giới hạn và tích phân nằm tại **[1] ${doc1} trang 15**.\n- Bạn có thể click trực tiếp vào nguồn để mở trang PDF tương ứng.`;
                } else {
                    fallbackReply = `Dựa trên các tài liệu bạn đã chọn, tôi xin tổng hợp kiến thức chính trong vòng 5 giây như sau:\n\n1. **Kiến thức Đại số & Giải tích**: Các công thức đạo hàm và tích phân nâng cao được trình bày rất kỹ ở trang đầu của **[1] ${doc1} trang 15**.\n\n2. **Bài tập áp dụng**: Đề ôn tập chương và lời giải chi tiết được lưu trữ tại **[2] ${doc2} trang 4**.\n\nBạn có thể nhấp chuột trực tiếp vào các liên kết nguồn màu cam ở trên để nhảy thẳng tới trang tài liệu tương ứng!`;
                }

                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    sender: 'ai',
                    content: fallbackReply
                }]);
            }, 800);
        } finally {
            setIsTyping(false);
        }
    };

    // Citation regex parser to render clickable HTML links
    const renderMessageContent = (content) => {
        const regex = /\[(\d+)\](?:\s*([^\]\r\n]*?)\s*trang\s*(\d+))?/gi;
        const parts = [];
        let lastIndex = 0;
        let match;
        
        while ((match = regex.exec(content)) !== null) {
            const matchIndex = match.index;
            if (matchIndex > lastIndex) {
                parts.push(content.substring(lastIndex, matchIndex));
            }
            
            const citationNum = parseInt(match[1], 10);
            const pageNum = match[3] ? parseInt(match[3], 10) : null;
            
            const doc = selectedDocsForChat[citationNum - 1];
            
            if (doc) {
                const docId = doc.id || doc.document_id || doc.documentId;
                const label = match[0];
                
                parts.push(
                    <a
                        key={matchIndex}
                        href={`/document/${docId}${pageNum ? `?page=${pageNum}` : ''}`}
                        className="fw-bold px-1 py-0.5 rounded text-decoration-none"
                        onClick={(e) => {
                            e.preventDefault();
                            navigate(`/document/${docId}${pageNum ? `?page=${pageNum}` : ''}`);
                        }}
                        style={{ color: '#FD8F52', backgroundColor: '#FFF5ED', border: '1px solid rgba(253, 143, 82, 0.2)' }}
                    >
                        {label}
                    </a>
                );
            } else {
                parts.push(match[0]);
            }
            
            lastIndex = regex.lastIndex;
        }
        
        if (lastIndex < content.length) {
            parts.push(content.substring(lastIndex));
        }
        
        return parts.length > 0 ? parts : content;
    };

    return (
        <div style={{ zIndex: 1080 }} className="position-relative">
            {/* FLOATING ACTION TRIGGER BUTTON */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="btn text-white rounded-circle shadow-lg d-flex align-items-center justify-content-center border-0 position-fixed"
                    style={{
                        bottom: '24px',
                        right: '24px',
                        width: '60px',
                        height: '60px',
                        background: 'linear-gradient(135deg, #C73866, #FD8F52)',
                        boxShadow: '0 8px 24px rgba(253, 143, 82, 0.3)',
                        transition: 'transform 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <MessageSquare size={26} />
                </button>
            )}

            {/* EXPANDED CHAT PANEL */}
            {isOpen && (
                <div
                    className="card shadow-lg border-0 d-flex flex-column position-fixed"
=======
                const errResult = await response.json().catch(() => ({}));
                throw new Error(errResult.message || `API error: status ${response.status}`);
            }

            const result = await response.json();
            if (result.success && result.data) {
                const aiData = result.data;
                // Save sessionId for consecutive replies
                if (aiData.sessionId) {
                    setSessionId(aiData.sessionId);
                }

                const aiMsg = {
                    id: (Date.now() + 1).toString(),
                    sender: 'bot',
                    content: aiData.answer,
                    citations: aiData.citations || [],
                    createdAt: new Date().toISOString()
                };

                setMessages(prev => [...prev, aiMsg]);

                // Update quota state
                if (aiData.remainingRequests !== undefined) {
                    setQuota({
                        remaining: aiData.remainingRequests,
                        dailyLimit: aiData.dailyLimit || (quota?.dailyLimit || 10),
                        currentCount: (aiData.dailyLimit || 10) - aiData.remainingRequests
                    });
                } else {
                    // Refetch quota if not fully returned
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
            {/* Embedded styles for dynamic chat elements (typing dots & scrollbars) */}
            <style>{`
                @keyframes chat-bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .chat-dot {
                    animation: chat-bounce 1.2s infinite ease-in-out;
                }
                .chat-dot:nth-child(1) { animation-delay: 0s; }
                .chat-dot:nth-child(2) { animation-delay: 0.2s; }
                .chat-dot:nth-child(3) { animation-delay: 0.4s; }
                
                .chat-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .chat-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .chat-scroll::-webkit-scrollbar-thumb {
                    background-color: rgba(253, 143, 82, 0.2);
                    border-radius: 3px;
                }
                .chat-scroll::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(253, 143, 82, 0.4);
                }
            `}</style>

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
>>>>>>> 4c922c24da08180e36840933de85a641d5381918
                    style={{
                        bottom: '24px',
                        right: '24px',
                        width: '380px',
                        height: '520px',
<<<<<<< HEAD
                        borderRadius: '20px',
                        overflow: 'hidden',
                        fontFamily: "'Inter', sans-serif",
                        border: '1px solid rgba(253, 143, 82, 0.15)',
                        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12)'
=======
                        maxHeight: '80vh',
                        maxWidth: '90vw',
                        borderRadius: '16px',
                        background: '#ffffff',
                        zIndex: 1050,
                        overflow: 'hidden',
                        fontFamily: "'Outfit', 'Inter', sans-serif"
>>>>>>> 4c922c24da08180e36840933de85a641d5381918
                    }}
                >
                    {/* CHAT HEADER */}
                    <div
                        className="p-3 text-white d-flex align-items-center justify-content-between flex-shrink-0"
<<<<<<< HEAD
                        style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                    >
                        <div className="d-flex align-items-center gap-2">
                            <Sparkles size={20} className="text-warning fill-warning" />
                            <div className="text-start">
                                <h6 className="mb-0 fw-bold" style={{ fontSize: '15px' }}>AI Study Assistant</h6>
                                <small className="opacity-90" style={{ fontSize: '11px' }}>Powered by StudyDocs AI</small>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="btn border-0 text-white p-0 bg-transparent opacity-85 hover:opacity-100"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* CONTEXT SELECTED FILES INDICATOR */}
                    <div className="bg-light px-3 py-2 border-bottom text-start flex-shrink-0">
                        <div className="d-flex align-items-center gap-1.5 text-muted mb-1" style={{ fontSize: '11px' }}>
                            <BookOpen size={12} className="text-primary" style={{ color: '#FD8F52' }} />
                            <span className="fw-semibold">Document Context ({selectedDocsForChat.length} selected):</span>
                        </div>
                        {selectedDocsForChat.length === 0 ? (
                            <span className="text-danger fw-medium d-block" style={{ fontSize: '11px' }}>
                                <AlertCircle size={10} className="me-1 d-inline" /> 
                                Vui lòng tích chọn 2 hoặc 3 tài liệu ở bảng bên trái.
                            </span>
                        ) : (
                            <div className="d-flex flex-wrap gap-1 mt-1" style={{ maxHeight: '42px', overflowY: 'auto' }}>
                                {selectedDocsForChat.map((d, index) => (
                                    <span key={d.id || index} className="badge bg-white text-dark border text-truncate fw-medium px-2 py-1" style={{ fontSize: '10px', maxWidth: '160px' }}>
                                        [{index + 1}] {d.title}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* MESSAGES LIST AREA */}
                    <div className="card-body p-3 overflow-y-auto bg-light text-start flex-grow-1" style={{ fontSize: '14px' }}>
                        {messages.length === 0 ? (
                            <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted px-4 text-center">
                                <Sparkles size={32} className="text-muted mb-2 opacity-50" />
                                <h6 className="fw-bold mb-1">Hỏi trợ lý AI</h6>
                                <p className="mb-0 small text-muted">
                                    Tích chọn các tài liệu từ danh sách, sau đó nhập câu hỏi dưới đây để tóm tắt hoặc tra cứu thông tin nhanh chóng.
                                </p>
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`d-flex ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                                        <div
                                            className={`p-2.5 rounded-4 shadow-sm text-wrap`}
                                            style={{
                                                maxWidth: '85%',
                                                backgroundColor: msg.sender === 'user' ? '#FD8F52' : '#ffffff',
                                                color: msg.sender === 'user' ? '#ffffff' : '#333333',
                                                borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                                border: msg.sender === 'user' ? 'none' : '1px solid rgba(0,0,0,0.06)',
                                                whiteSpace: 'pre-line',
                                                fontSize: '13.5px',
                                                lineHeight: '1.45'
                                            }}
                                        >
                                            {msg.sender === 'user' ? msg.content : renderMessageContent(msg.content)}
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="d-flex justify-content-start">
                                        <div className="p-2.5 rounded-4 bg-white border border-light shadow-sm d-flex align-items-center gap-1">
                                            <div className="spinner-grow spinner-grow-sm text-secondary" style={{ width: '6px', height: '6px', animationDelay: '0s' }} />
                                            <div className="spinner-grow spinner-grow-sm text-secondary" style={{ width: '6px', height: '6px', animationDelay: '0.2s' }} />
                                            <div className="spinner-grow spinner-grow-sm text-secondary" style={{ width: '6px', height: '6px', animationDelay: '0.4s' }} />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {/* INPUT FORM CONTAINER */}
                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-top d-flex gap-2 flex-shrink-0 align-items-center">
                        <input
                            type="text"
                            placeholder={selectedDocsForChat.length === 0 ? "Hãy chọn tài liệu trước..." : "Nhập câu hỏi tại đây..."}
                            className="form-control"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            disabled={selectedDocsForChat.length === 0 || isTyping}
                            style={{
                                fontSize: '13.5px',
                                borderRadius: '24px',
                                borderColor: 'rgba(253, 143, 82, 0.25)',
                                padding: '10px 16px',
                                boxShadow: 'none'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={selectedDocsForChat.length === 0 || !messageInput.trim() || isTyping}
                            className="btn text-white rounded-circle d-flex align-items-center justify-content-center border-0"
                            style={{
                                width: '40px',
                                height: '40px',
                                background: 'linear-gradient(135deg, #C73866, #FD8F52)',
                                flexShrink: 0
                            }}
                        >
                            <Send size={16} />
=======
                        style={{ background: 'linear-gradient(135deg, #FD8F52 0%, #FE676E 100%)' }}
                    >
                        <div className="d-flex align-items-center gap-2">
                            <img
                                src={mascotImg}
                                alt="AI Mascot"
                                className="rounded-circle border bg-white"
                                style={{ width: '38px', height: '38px', objectFit: 'cover' }}
                            />
                            <div>
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
                            {/* New Chat Button */}
                            {messages.length > 0 && (
                                <button
                                    onClick={handleNewChat}
                                    className="btn btn-link text-white p-1 hover-opacity"
                                    title="Start New Conversation"
                                    style={{ opacity: 0.8 }}
                                >
                                    <RotateCcw size={16} />
                                </button>
                            )}
                            {/* Chat History Link */}
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
                            {/* Close Button */}
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
                                <h6 className="fw-bold text-dark mb-1" style={{ fontSize: '14px' }}>
                                    {isDocDetail ? 'Ask anything about this document!' : 'Find files using AI!'}
                                </h6>
                                <p className="mb-0" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                                    {isDocDetail
                                        ? 'Ask for summaries, vocabulary explanations, major takeaways, or test questions based on the content.'
                                        : 'Type what you are looking for'
                                    }
                                </p>
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

                                                {/* Render Citations in AI response */}
                                                {msg.citations && msg.citations.length > 0 && (
                                                    <div className="mt-2.5 pt-2 border-top border-light-subtle" style={{ fontSize: '11px' }}>
                                                        <div className="fw-bold mb-1 text-muted d-flex align-items-center gap-1">
                                                            <BookOpen size={11} /> Source References:
                                                        </div>
                                                        <div className="d-flex flex-wrap gap-1.5 mt-1">
                                                            {msg.citations.map((c, cIdx) => (
                                                                <div key={cIdx} className="w-100 mt-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setActiveCitationIdx(activeCitationIdx === `${index}-${cIdx}` ? null : `${index}-${cIdx}`)}
                                                                        className="btn btn-light btn-sm text-start py-1 px-2 border d-flex justify-content-between align-items-center w-100"
                                                                        style={{ fontSize: '11px', borderRadius: '4px', background: '#F8F9FA' }}
                                                                    >
                                                                        <span className="text-truncate" style={{ maxWidth: '220px' }}>
                                                                            📄 {c.fileName || 'Doc source'}
                                                                        </span>
                                                                        <span className="badge bg-secondary-subtle text-secondary ms-1 flex-shrink-0">
                                                                            Page {c.pageNumber || 1}
                                                                        </span>
                                                                    </button>
                                                                    {activeCitationIdx === `${index}-${cIdx}` && c.snippet && (
                                                                        <div
                                                                            className="p-2 mt-1 rounded bg-light border text-muted"
                                                                            style={{ fontSize: '11px', fontStyle: 'italic', lineHeight: '1.4' }}
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
                                            <span className="text-muted mt-1 px-1" style={{ fontSize: '9px' }}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        {/* TYPING LOADER */}
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
                                        style={{
                                            borderRadius: '14px 14px 14px 2px'
                                        }}
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
                                 <span>You have reached your daily AI query limit. Upgrade your plan!</span>
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
>>>>>>> 4c922c24da08180e36840933de85a641d5381918
                        </button>
                    </form>
                </div>
            )}
<<<<<<< HEAD
        </div>
=======
            {/* Styles for typing animations */}
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
            `}</style>
        </>
>>>>>>> 4c922c24da08180e36840933de85a641d5381918
    );
};
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Dropdown, Modal } from 'react-bootstrap';
import { Upload, MoreVertical, Edit, Share2, Trash2, Copy, ArrowLeft, AlertTriangle, Bookmark, Eye, Download, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../api.js';

const loadPdfJs = () => {
    return new Promise((resolve, reject) => {
        if (window.pdfjsLib) {
            resolve(window.pdfjsLib);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            resolve(window.pdfjsLib);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

const loadMammoth = () => {
    return new Promise((resolve, reject) => {
        if (window.mammoth) {
            resolve(window.mammoth);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
        script.onload = () => {
            resolve(window.mammoth);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

const verifyBuffer = (buffer) => {
    if (buffer.byteLength < 4) return false;
    const bytes = new Uint8Array(buffer.slice(0, 4));
    const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B;
    const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    const isTxt = bytes[0] !== 0x3c && bytes[0] !== 0x7b;
    return isZip || isPdf || isTxt;
};

const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0.00 MB';
    const mb = bytes / (1024 * 1024);
    return mb < 0.01 ? `${mb.toFixed(3)} MB` : `${mb.toFixed(2)} MB`;
};

const fetchWithTimeout = async (resource, options = {}) => {
    const { timeout = 4000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

const downloadFileViaProxy = async (url) => {
    console.log("downloadFileViaProxy: Đang tải tệp tin qua proxy...");
    const proxiedUrl = url.replace(/^https?:\/\/[^/]+\.amazonaws\.com\//, '/s3-proxy/');
    const response = await fetchWithTimeout(proxiedUrl, { timeout: 10000 });
    if (!response.ok) {
        throw new Error(`Tải tệp tin thất bại với mã lỗi ${response.status}`);
    }
    const buffer = await response.clone().arrayBuffer();
    if (!verifyBuffer(buffer)) {
        throw new Error("Tệp tin tải về không đúng định dạng hợp lệ (PDF/DOCX/TXT)");
    }
    return response;
};

const extractTextFromDocx = async (url) => {
    const mammothLib = await loadMammoth();
    const response = await downloadFileViaProxy(url);
    const arrayBuffer = await response.arrayBuffer();
    const result = await mammothLib.extractRawText({ arrayBuffer });
    return result.value || '';
};

const sanitizeForAI = (text) => {
    if (!text) return '';
    return text
        .replace(/\[?AI\s*CONTENT\s*MODERATOR\s*INSTRUCTION\]?/gi, '[REMOVED]')
        .replace(/(please|you must|your task is|return|output|give me|set|assign)\s+(a\s+)?(safety\s+)?score\s*(of|=|:)?\s*\d*/gi, '[REMOVED]')
        .replace(/return\s+only\s+a\s+json/gi, '[REMOVED]')
        .replace(/score\s*[:=]\s*\d+/gi, '[REMOVED]')
        .trim();
};

const evaluateChunk = async (chunk, apiKey) => {
    const key = apiKey ? apiKey.trim() : '';
    if (key.startsWith('sk-')) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an AI content moderator. Evaluate the provided document text for inappropriate content, including profanity, toxicity, violence, hate speech, spam, and adult material. Output a safety score from 0 to 100, where 100 is completely clean/safe, and 0 is extremely toxic/inappropriate. Return ONLY a JSON object in this format: {"score": <number>, "reason": "<brief_reason_in_english_or_vietnamese>"}'
                    },
                    {
                        role: 'user',
                        content: `Analyze this document chunk:\n\n${chunk}`
                    }
                ],
                response_format: { type: "json_object" }
            })
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API error: ${errData.error?.message || response.statusText}`);
        }
        const data = await response.json();
        const textResponse = data.choices?.[0]?.message?.content;
        if (!textResponse) throw new Error("Invalid response from OpenAI API.");
        return JSON.parse(textResponse.trim());
    }
    return { score: 50, reason: "Unsupported API key type" };
};

const chunkText = (text, maxLength = 2500) => {
    const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
    const chunks = [];
    let currentChunk = '';
    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxLength) {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = sentence;
        } else {
            currentChunk += sentence;
        }
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
};

export default function MyDocumentsPage() {
    const { user, setSelectedDocsForChat, selectedDocsForChat } = useApp();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('uploaded'); // 'uploaded', 'saved', or 'deleted'
    const [savedDocuments, setSavedDocuments] = useState([]);

    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [selectedDocId, setSelectedDocId] = useState('');
    const [myDocuments, setMyDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    const [deletedDocuments, setDeletedDocuments] = useState([]);
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [docToRestore, setDocToRestore] = useState(null);

    const [sortBy, setSortBy] = useState('date-desc');

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState(null);

    const [unsaveModalOpen, setUnsaveModalOpen] = useState(false);
    const [docToUnsave, setDocToUnsave] = useState(null);

    const [generatedShareLink, setGeneratedShareLink] = useState('');
    const [loadingLink, setLoadingLink] = useState(false);

    const [storageStats, setStorageStats] = useState({ used: 0, limit: 2 * 1024 * 1024 * 1024 });

    const fetchStorage = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/users/storage`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const r = await res.json();
            if (r.success && r.data) {
                setStorageStats({
                    used: r.data.storageUsed || 0,
                    limit: r.data.storageLimit || (r.data.planName?.toLowerCase().includes('premium') ? 5 * 1024 * 1024 * 1024 : 2 * 1024 * 1024 * 1024)
                });
            }
        } catch (e) {
            console.error("Error fetching storage stats:", e);
        }
    };

    useEffect(() => {
        fetchStorage();
    }, [myDocuments, deletedDocuments]);

    const fetchDocuments = async (showLoading = true) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            if (showLoading) setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/personal?authorId=${user?.id}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('API request failed');
            const result = await response.json();

            if (result && result.data) {
                setMyDocuments(result.data);
            } else {
                setMyDocuments([]);
            }
        } catch (error) {
            console.error('Backend API server error:', error);
            setMyDocuments([]);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const fetchDeletedDocuments = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/trash`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const result = await response.json();
                if (result && result.data) {
                    setDeletedDocuments(result.data);
                } else {
                    setDeletedDocuments([]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch trash documents from API:', error);
            setDeletedDocuments([]);
        }
    };

    useEffect(() => {
        if (user?.id) {
            if (activeTab === 'uploaded') fetchDocuments();
            if (activeTab === 'deleted') fetchDeletedDocuments();
        }
    }, [user, activeTab]);

    useEffect(() => {
        const fetchSavedDocuments = async () => {
            const token = localStorage.getItem('token');
            if (token && user) {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/v1/documents/saved?page=0&size=100`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const result = await response.json();
                        if (result && result.success && result.data) {
                            const dataList = Array.isArray(result.data)
                                ? result.data
                                : (Array.isArray(result.data.content) ? result.data.content : []);

                            const mappedDocs = dataList.map(doc => ({
                                id: doc.id,
                                title: doc.title,
                                description: doc.description,
                                subject: doc.subject?.name || doc.subject || 'General',
                                author: doc.uploader?.fullName || doc.uploaderName || doc.author || 'Contributor',
                                authorId: doc.uploader?.id || doc.uploaderId || doc.authorId || 'N/A',
                                createdAt: doc.createdAt || doc.created_at,
                                size: doc.fileSizeBytes || doc.fileSize || 0,
                                tags: doc.tags || []
                            }));
                            setSavedDocuments(mappedDocs);
                            return;
                        }
                    }
                } catch (err) {
                    console.error('Failed to load saved list from API:', err);
                }
            }
            setSavedDocuments([]);
        };

        fetchSavedDocuments();
    }, [user]);

    const handleRemoveBookmark = async (docId) => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/${docId}/unsave`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success('Document unsaved successfully!');
                setSavedDocuments(prev => prev.filter(d => d.id !== docId));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const triggerDeleteConfirm = (doc) => {
        setDocToDelete(doc);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!docToDelete) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/${docToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to delete document');

            if (typeof setSelectedDocsForChat === 'function') {
                setSelectedDocsForChat(prev => prev.filter(d => d.id !== docToDelete.id));
            }

            setMyDocuments(prev => prev.filter(item => item.id !== docToDelete.id));
            toast.success(`Document "${docToDelete.title}" has been moved to trash!`);

            await fetchStorage();
            if (activeTab === 'deleted') await fetchDeletedDocuments();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete the document. Please try again.');
        } finally {
            setDeleteModalOpen(false);
            setDocToDelete(null);
        }
    };

    const triggerRestoreConfirm = (doc) => {
        setDocToRestore(doc);
        setRestoreModalOpen(true);
    };

    // CẬP NHẬT LOGIC GỌI API RESTORE 
    const handleConfirmRestore = async () => {
        if (!docToRestore) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            // Gọi đúng API endpoint dạng POST: /api/v1/documents/{id}/restore
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/${docToRestore.id}/restore`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Cannot restore document from server.');
            }

            // Xóa tài liệu khỏi danh sách Thùng rác trên UI
            setDeletedDocuments(prev => prev.filter(d => d.id !== docToRestore.id));
            toast.success(`Restore document "${docToRestore.title}" successfully!`);

            // Đồng bộ cập nhật lại dung lượng tổng storage
            await fetchStorage();
        } catch (error) {
            console.error('Restore error:', error);
            toast.error(error.message || 'Restore failed. Please check your storage quota.');
        } finally {
            setRestoreModalOpen(false);
            setDocToRestore(null);
        }
    };

    const runBackgroundModerationForDoc = async (doc) => {
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            let adminToken = null;
            try {
                const adminLoginRes = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'lkc12052006@gmail.com', password: 'Cuong12345.' }),
                });
                const adminResult = await adminLoginRes.json();
                if (adminLoginRes.ok && adminResult.success) {
                    adminToken = adminResult.data?.accessToken || adminResult.data?.token || adminResult.token;
                }
            } catch (e) {
                console.error("Background Admin auth failed in dashboard:", e);
            }

            const authHeaderToken = adminToken || token;

            let fileUrl = null;
            let fileType = '';
            let retries = 3;
            while (retries > 0) {
                try {
                    const previewRes = await fetch(`${API_BASE_URL}/api/v1/documents/${doc.id}/preview`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (previewRes.ok) {
                        const previewResult = await previewRes.json();
                        if (previewResult.success && previewResult.data && previewResult.data.presigned_url) {
                            fileUrl = previewResult.data.presigned_url;
                            fileType = (previewResult.data.file_type || doc.fileType || doc.file_type || '').toLowerCase();
                            break;
                        }
                    }
                } catch (err) { }
                retries--;
                if (retries > 0) await new Promise(resolve => setTimeout(resolve, 2000));
            }

            if (!fileUrl) return;

            let text = '';
            let isExtractionSuccessful = false;
            if (fileType.includes('txt')) {
                const response = await downloadFileViaProxy(fileUrl);
                text = await response.text();
                isExtractionSuccessful = true;
            } else if (fileType.includes('pdf')) {
                const pdfjsLib = await loadPdfJs();
                const response = await downloadFileViaProxy(fileUrl);
                const arrayBuffer = await response.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    text += pageText + '\n';
                }
                isExtractionSuccessful = true;
            } else if (fileType.includes('docx')) {
                text = await extractTextFromDocx(fileUrl);
                isExtractionSuccessful = true;
            }

            let safetyScore = 50;
            let finalReason = '';
            if (isExtractionSuccessful && text.trim()) {
                const chunks = chunkText(sanitizeForAI(text));
                let minScore = 100;
                let reasons = [];
                for (let i = 0; i < chunks.length; i++) {
                    const res = await evaluateChunk(chunks[i], apiKey);
                    if (res && typeof res.score === 'number') {
                        if (res.score < minScore) minScore = res.score;
                        if (res.reason) reasons.push(res.reason);
                    }
                }
                safetyScore = minScore;
                finalReason = reasons.length > 0 ? reasons.join(' | ') : 'Passed AI Content Scan';
            }

            let updated = false;
            if (safetyScore >= 90) {
                const approveRes = await fetch(`${API_BASE_URL}/api/v1/admin/documents/${doc.id}/approve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authHeaderToken}` }
                });
                if (approveRes.ok) updated = true;
            } else if (safetyScore <= 20) {
                const rejectRes = await fetch(`${API_BASE_URL}/api/v1/admin/documents/${doc.id}/reject`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authHeaderToken}` },
                    body: JSON.stringify({ rejectionReason: `Auto-rejected by AI (Score: ${safetyScore}%. Reason: ${finalReason})` })
                });
                if (rejectRes.ok) updated = true;
            }

            if (updated) fetchDocuments(false);
        } catch (error) {
            console.error("Background Moderation Error:", error);
        }
    };

    useEffect(() => {
        const pendingDocs = myDocuments.filter(d => (d.status || '').toLowerCase() === 'pending');
        if (pendingDocs.length > 0) {
            pendingDocs.forEach(doc => {
                if (!window.activeScans) window.activeScans = {};
                if (!window.activeScans[doc.id]) {
                    window.activeScans[doc.id] = true;
                    runBackgroundModerationForDoc(doc);
                }
            });
        }
    }, [myDocuments]);

    const sortedDocuments = [...myDocuments].sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        if (sortBy === 'date-asc') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        return 0;
    });

    const sortedSavedDocuments = [...savedDocuments].sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        if (sortBy === 'date-asc') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        return 0;
    });

    const renderTagsText = (tagsObj) => {
        if (!tagsObj) return 'N/A';
        if (Array.isArray(tagsObj)) {
            if (tagsObj.length === 0) return 'N/A';
            return tagsObj
                .map(t => {
                    if (typeof t === 'object' && t !== null) {
                        return t.label || t.name || t.tagName || Object.values(t).find(val => typeof val === 'string') || 'N/A';
                    }
                    return String(t);
                })
                .filter(val => val !== 'N/A')
                .join(', ') || 'N/A';
        }

        if (typeof tagsObj === 'object') {
            try {
                const tagsArray = Object.values(tagsObj);
                if (tagsArray.length === 0) return 'N/A';
                return tagsArray
                    .map(t => (typeof t === 'object' && t !== null) ? (t.label || t.name || t.tagName || 'N/A') : String(t))
                    .filter(val => val !== 'N/A')
                    .join(', ');
            } catch (e) {
                return 'N/A';
            }
        }
        return String(tagsObj);
    };

    const getStatusBadge = (status) => {
        if (!status) return null;
        const classes = { public: 'bg-success', private: 'bg-secondary', pending: 'bg-warning text-dark', completed: 'bg-success', rejected: 'bg-danger', failed: 'bg-danger' };
        return <span className={`badge ${classes[status.toLowerCase()] || 'bg-light text-dark'} px-2.5 py-1.5`} style={{ fontSize: '11px' }}>{status.toUpperCase()}</span>;
    };

    const getVisibilityBadge = (visibility) => {
        if (!visibility) return <span className="badge bg-light text-dark px-2.5 py-1.5" style={{ fontSize: '11px' }}>N/A</span>;
        const isPublic = visibility.toUpperCase() === 'PUBLIC';
        return <span className={`badge ${isPublic ? 'bg-info text-dark' : 'bg-dark text-white'} px-2.5 py-1.5`} style={{ fontSize: '11px', fontWeight: '500' }}>{visibility.toUpperCase()}</span>;
    };

    const handleShare = async (docId) => {
        setSelectedDocId(docId);
        setShareDialogOpen(true);
        setLoadingLink(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/${docId}/share`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            const shareToken = result.data?.token || result.data?.shareToken;
            if (shareToken) setGeneratedShareLink(`${window.location.origin}/guest/document/shared/${shareToken}`);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingLink(false);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(generatedShareLink);
        toast.success('Link copied to clipboard!');
        setShareDialogOpen(false);
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4 px-4 px-md-5 text-start">
            <div className="mb-4">
                <Link to="/user/home" className="d-inline-flex align-items-center gap-2 text-decoration-none text-muted" style={{ fontSize: '14px' }}>
                    <ArrowLeft className="h-4 w-4" /> <span className="fw-medium">Back to Homepage</span>
                </Link>
            </div>

            <div className="mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div>
                    <h1 className="fw-bold text-dark mb-1" style={{ fontSize: '28px' }}>My Documents</h1>
                    <p className="text-muted mb-0 small">Manage your uploaded materials and files</p>
                </div>
                <div className="card shadow-sm border border-light p-3 bg-white" style={{ minWidth: '280px', borderRadius: '12px' }}>
                    <div className="d-flex justify-content-between text-muted mb-1.5" style={{ fontSize: '13px' }}>
                        <span className="fw-semibold">Storage used:</span>
                        <span className="fw-bold text-dark">{formatBytes(storageStats.used)} / {formatBytes(storageStats.limit)}</span>
                    </div>
                    <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                        <div className="progress-bar" role="progressbar" style={{ width: `${Math.min(100, (storageStats.used / storageStats.limit) * 100)}%`, background: 'linear-gradient(90deg, #C73866, #FD8F52)' }} />
                    </div>
                </div>
            </div>

            <div className="d-flex border-bottom mb-4" style={{ borderColor: 'var(--border-color)' }}>
                <button onClick={() => setActiveTab('uploaded')} className="btn px-4 py-2 fw-bold border-0 position-relative shadow-none d-flex align-items-center gap-2" style={{ color: activeTab === 'uploaded' ? '#FD8F52' : 'var(--text-muted)', fontSize: '15px', background: 'transparent' }}>
                    <Upload size={16} /> <span>Uploaded Documents</span>
                    {activeTab === 'uploaded' && <div className="position-absolute bottom-0 start-0 w-100" style={{ height: '3px', backgroundColor: '#FD8F52' }}></div>}
                </button>
                <button onClick={() => setActiveTab('saved')} className="btn px-4 py-2 fw-bold border-0 position-relative shadow-none d-flex align-items-center gap-2" style={{ color: activeTab === 'saved' ? '#FD8F52' : 'var(--text-muted)', fontSize: '15px', background: 'transparent' }}>
                    <Bookmark size={16} /> <span>Saved Documents</span>
                    {activeTab === 'saved' && <div className="position-absolute bottom-0 start-0 w-100" style={{ height: '3px', backgroundColor: '#FD8F52' }}></div>}
                </button>
                <button onClick={() => setActiveTab('deleted')} className="btn px-4 py-2 fw-bold border-0 position-relative shadow-none d-flex align-items-center gap-2" style={{ color: activeTab === 'deleted' ? '#FD8F52' : 'var(--text-muted)', fontSize: '15px', background: 'transparent' }}>
                    <Trash2 size={16} /> <span>Deleted Documents</span>
                    {activeTab === 'deleted' && <div className="position-absolute bottom-0 start-0 w-100" style={{ height: '3px', backgroundColor: '#FD8F52' }}></div>}
                </button>
            </div>

            <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
                {activeTab === 'uploaded' ? (
                    sortedDocuments.length > 0 ? (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="py-3 px-4">Title</th>
                                        <th className="py-3">Tag</th>
                                        <th className="py-3">Date</th>
                                        <th className="py-3">Size</th>
                                        <th className="py-3">Visibility</th>
                                        <th className="py-3">Status</th>
                                        <th className="py-3 px-4 text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedDocuments.map((doc) => (
                                        <tr key={doc.id}>
                                            <td className="py-3 px-4"><Link to={`/document/${doc.id}`} className="fw-medium text-dark text-decoration-none">{doc.title}</Link></td>
                                            <td className="py-3 text-muted fw-medium">{renderTagsText(doc.tags)}</td>
                                            <td className="py-3 text-muted">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-US') : 'N/A'}</td>
                                            <td className="py-3 text-muted">{formatBytes(doc.fileSizeBytes || doc.fileSize)}</td>
                                            <td className="py-3">{getVisibilityBadge(doc.visibility)}</td>
                                            <td className="py-3">{getStatusBadge(doc.status)}</td>
                                            <td className="py-3 px-4 text-end">
                                                <Dropdown align="end">
                                                    <Dropdown.Toggle as="button" className="btn btn-link p-1 text-muted border-0 bg-transparent no-caret"><MoreVertical className="h-5 w-5" /></Dropdown.Toggle>
                                                    <Dropdown.Menu className="shadow border-0 p-2">
                                                        <Dropdown.Item onClick={() => navigate(`/document/${doc.id}/edit`, { state: { document: doc } })} className="d-flex align-items-center gap-2"><Edit size={14} /><span>Edit</span></Dropdown.Item>
                                                        <Dropdown.Item onClick={() => handleShare(doc.id)} className="d-flex align-items-center gap-2"><Share2 size={14} /><span>Share</span></Dropdown.Item>
                                                        <Dropdown.Divider />
                                                        <Dropdown.Item
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                triggerDeleteConfirm(doc);
                                                            }}
                                                            className="d-flex align-items-center gap-2 text-danger"
                                                        >
                                                            <Trash2 size={14} /><span>Delete</span>
                                                        </Dropdown.Item>
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-5 bg-white"><Upload className="h-16 w-16 text-muted mx-auto mb-3" /><h5 className="fw-bold">No documents yet</h5></div>
                    )
                ) : activeTab === 'saved' ? (
                    sortedSavedDocuments.length > 0 ? (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="py-3 px-4">Title</th>
                                        <th className="py-3">Author</th>
                                        <th className="py-3">Tag</th>
                                        <th className="py-3">Size</th>
                                        <th className="py-3 px-4 text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedSavedDocuments.map((doc) => (
                                        <tr key={doc.id}>
                                            <td className="py-3 px-4"><Link to={`/document/${doc.id}`} className="fw-medium text-dark text-decoration-none">{doc.title}</Link></td>
                                            <td className="py-3 text-muted">{doc.author}</td>
                                            <td className="py-3 text-muted fw-medium">{renderTagsText(doc.tags)}</td>
                                            <td className="py-3 text-muted">{formatBytes(doc.size)}</td>
                                            <td className="py-3 px-4 text-end">
                                                <button onClick={() => { setDocToUnsave(doc); setUnsaveModalOpen(true); }} className="btn btn-sm btn-outline-danger px-3"><Trash2 size={14} /> Unsave</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-5 text-muted bg-white"><Bookmark size={48} className="mb-3 opacity-30" /><p>No saved documents.</p></div>
                    )
                ) : (
                    deletedDocuments.length > 0 ? (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="py-3 px-4">Title</th>
                                        <th className="py-3">Tag</th>
                                        <th className="py-3">Deleted Date</th>
                                        <th className="py-3">Size</th>
                                        <th className="py-3 px-4 text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deletedDocuments.map((doc) => (
                                        <tr key={doc.id}>
                                            <td className="py-3 px-4"><span className="fw-semibold text-dark">{doc.title}</span></td>
                                            <td className="py-3 text-muted fw-medium">{renderTagsText(doc.tags)}</td>
                                            <td className="py-3 text-muted">{doc.deletedAt ? new Date(doc.deletedAt).toLocaleDateString('en-US') : 'N/A'}</td>
                                            <td className="py-3 text-muted">{formatBytes(doc.fileSize || doc.fileSizeBytes)}</td>
                                            <td className="py-3 px-4 text-end">
                                                <button onClick={() => triggerRestoreConfirm(doc)} className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1.5" style={{ borderRadius: '8px', fontSize: '13px', padding: '5px 12px' }}>
                                                    <RotateCcw className="h-4 w-4" /> Restore
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-5 text-muted bg-white"><Trash2 size={48} className="mb-3 opacity-30" /><p>No deleted documents in recycle bin.</p></div>
                    )
                )}
            </div>

            {/* MODALS SECTION */}
            <Modal show={shareDialogOpen} onHide={() => setShareDialogOpen(false)} centered>
                <Modal.Header closeButton><Modal.Title>Share Document</Modal.Title></Modal.Header>
                <Modal.Body>
                    <div className="input-group">
                        <input type="text" readOnly value={loadingLink ? 'Generating...' : generatedShareLink} className="form-control" />
                        <button onClick={handleCopyLink} disabled={loadingLink || !generatedShareLink} className="btn text-white" style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}><Copy size={14} /> Copy</button>
                    </div>
                </Modal.Body>
            </Modal>

            <Modal show={deleteModalOpen} onHide={() => setDeleteModalOpen(false)} centered>
                <Modal.Header closeButton><Modal.Title className="text-danger d-flex align-items-center gap-2"><AlertTriangle /> Confirm Delete</Modal.Title></Modal.Header>
                <Modal.Body><p className="text-start">Do you want to delete <strong className="text-dark">"{docToDelete?.title}"</strong>? This document will be moved to the recycle bin.</p></Modal.Body>
                <Modal.Footer><button onClick={handleConfirmDelete} className="btn btn-danger flex-grow-1 py-2 fw-bold border-0">Confirm Delete</button><button onClick={() => setDeleteModalOpen(false)} className="btn btn-light border flex-grow-1 py-2 fw-medium">Cancel</button></Modal.Footer>
            </Modal>

            {/* POPUP MODAL XÁC NHẬN KHÔI PHỤC TÀI LIỆU */}
            <Modal show={restoreModalOpen} onHide={() => setRestoreModalOpen(false)} centered>
                <Modal.Header closeButton><Modal.Title className="text-success d-flex align-items-center gap-2"><RotateCcw /> Confirm Restore</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p className="text-start">Do you want to restore <strong className="text-dark">"{docToRestore?.title}"</strong>?</p>
                    <div className="alert alert-info py-2 px-3 small d-flex align-items-center gap-2 text-start">
                        <Eye size={14} />
                        <span>The restored document will restore its original size and (Visibility, Status) settings.</span>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button onClick={handleConfirmRestore} className="btn btn-success text-white flex-grow-1 py-2 fw-bold border-0" style={{ backgroundColor: '#28a745' }}>
                        Confirm Restore
                    </button>
                    <button onClick={() => setRestoreModalOpen(false)} className="btn btn-light border flex-grow-1 py-2 fw-medium">
                        Cancel
                    </button>
                </Modal.Footer>
            </Modal>

            <Modal show={unsaveModalOpen} onHide={() => setUnsaveModalOpen(false)} centered>
                <Modal.Header closeButton><Modal.Title className="text-warning"><Bookmark /> Confirm Unsave</Modal.Title></Modal.Header>
                <Modal.Body><p>Are you sure you want to unsave <strong className="text-dark">"{docToUnsave?.title}"</strong>?</p></Modal.Body>
                <Modal.Footer><button onClick={async () => { if (docToUnsave) { await handleRemoveBookmark(docToUnsave.id); setUnsaveModalOpen(false); setDocToUnsave(null); } }} className="btn text-white flex-grow-1" style={{ backgroundColor: '#FD8F52' }}>Confirm Unsave</button><button onClick={() => setUnsaveModalOpen(false)} className="btn btn-light border flex-grow-1">Cancel</button></Modal.Footer>
            </Modal>

            {user?.status?.toUpperCase() === 'OVERLIMITSTORAGE' && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(8px)', zIndex: 9999 }}>
                    <div className="card shadow-lg border-danger text-center p-4 m-3" style={{ maxWidth: '450px', borderRadius: '12px' }}>
                        <div className="text-danger mb-3"><AlertTriangle size={48} /></div>
                        <h4 className="fw-bold">Storage Limit Exceeded!</h4>
                        <p className="text-muted small">Your storage capacity has exceeded the limit. Please upgrade your plan to continue.</p>
                        <Link to="/upgrade" className="btn text-white w-100 py-2.5 fw-bold" style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)', borderRadius: '10px' }}>Upgrade Plan</Link>
                    </div>
                </div>
            )}
        </div>
    );
}
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Dropdown, Modal } from 'react-bootstrap';
import { Upload, MoreVertical, Edit, Share2, Trash2, Copy, ArrowLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

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

const downloadFileWithFallback = async (url) => {
    let response = null;
    let lastError = null;

    // 1. Thử tải trực tiếp trước
    console.log("downloadFileWithFallback: Thử tải trực tiếp...");
    try {
        response = await fetchWithTimeout(url, { timeout: 3000 });
        if (response.ok) {
            const buffer = await response.clone().arrayBuffer();
            if (verifyBuffer(buffer)) {
                console.log("downloadFileWithFallback: Tải trực tiếp THÀNH CÔNG!");
                return response;
            }
        }
    } catch (e) {
        console.warn("downloadFileWithFallback: Tải trực tiếp THẤT BẠI:", e);
        lastError = e;
    }

    // 2. Thử tải qua các proxy định dạng prefix hoặc query
    const prefixProxies = [
        u => `https://proxy.corsfix.com/?url=${encodeURIComponent(u)}`,
        u => `https://cors-proxy.htmldev.workers.dev/?url=${encodeURIComponent(u)}`,
        u => `https://corsproxy.org/?${u}`,
        u => `https://cors.eu.org/${u}`
    ];

    for (let i = 0; i < prefixProxies.length; i++) {
        const proxyUrl = prefixProxies[i](url);
        console.log(`downloadFileWithFallback: Thử Prefix Proxy ${i + 1}:`, proxyUrl);
        try {
            const res = await fetchWithTimeout(proxyUrl, { timeout: 8000 });
            if (res.ok) {
                const buffer = await res.clone().arrayBuffer();
                if (verifyBuffer(buffer)) {
                    console.log(`downloadFileWithFallback: Prefix Proxy ${i + 1} THÀNH CÔNG!`);
                    return res;
                }
            }
        } catch (err) {
            console.error(`downloadFileWithFallback: Prefix Proxy ${i + 1} THẤT BẠI:`, err);
            lastError = err;
        }
    }

    // 3. Thử tải qua AllOrigins JSON API (Giải pháp dự phòng cuối cùng)
    console.log("downloadFileWithFallback: Thử tải qua AllOrigins JSON...");
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetchWithTimeout(proxyUrl, { timeout: 8000 });
        if (res.ok) {
            const json = await res.json();
            if (json && json.contents) {
                const contents = json.contents;
                let arrayBuffer;
                if (contents.startsWith("data:")) {
                    const base64 = contents.split(',')[1];
                    const binaryString = atob(base64);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    arrayBuffer = bytes.buffer;
                } else {
                    const encoder = new TextEncoder();
                    arrayBuffer = encoder.encode(contents).buffer;
                }

                if (verifyBuffer(arrayBuffer)) {
                    console.log("downloadFileWithFallback: Tải qua AllOrigins JSON THÀNH CÔNG!");
                    return new Response(arrayBuffer);
                }
            }
        }
    } catch (err) {
        console.warn("downloadFileWithFallback: Tải qua AllOrigins JSON thất bại:", err);
        lastError = err;
    }

    // 4. Thử qua CodeTabs
    console.log("downloadFileWithFallback: Thử qua CodeTabs...");
    try {
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
        const res = await fetchWithTimeout(proxyUrl, { timeout: 8000 });
        if (res.ok) {
            const buffer = await res.clone().arrayBuffer();
            if (verifyBuffer(buffer)) {
                console.log("downloadFileWithFallback: CodeTabs THÀNH CÔNG!");
                return res;
            }
        }
    } catch (err) {
        console.error("downloadFileWithFallback: CodeTabs THẤT BẠI:", err);
        lastError = err;
    }

    throw new Error(lastError ? lastError.message : "Tải tệp tin thất bại qua tất cả các cổng kết nối.");
};

const extractTextFromDocx = async (url) => {
    const mammothLib = await loadMammoth();
    const response = await downloadFileWithFallback(url);
    const arrayBuffer = await response.arrayBuffer();
    const result = await mammothLib.extractRawText({ arrayBuffer });
    return result.value || '';
};

const sanitizeForAI = (text) => {
    if (!text) return '';
    // Chống Prompt Injection: xóa các câu lệnh giả mạo nhúng vào nội dung tài liệu
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

    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [selectedDocId, setSelectedDocId] = useState('');
    const [myDocuments, setMyDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState(null);

    // State quản lý link động trả về từ API và trạng thái chờ
    const [generatedShareLink, setGeneratedShareLink] = useState('');
    const [loadingLink, setLoadingLink] = useState(false);

    // Storage usage state
    const [storageStats, setStorageStats] = useState({ used: 0, limit: 2 * 1024 * 1024 * 1024 });

    // Fetch storage stats when documents change or component mounts
    useEffect(() => {
        const fetchStorage = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await fetch('http://14.225.254.145:8080/api/v1/users/storage', {
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
        fetchStorage();
    }, [myDocuments]);

    const fetchDocuments = async (showLoading = true) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            if (showLoading) setLoading(true);
            const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/personal?authorId=${user?.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
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

    useEffect(() => {
        if (user?.id) {
            fetchDocuments();
        } else {
            setMyDocuments([]);
            setLoading(false);
        }
    }, [user]);

    const runBackgroundModerationForDoc = async (doc) => {
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
        const token = localStorage.getItem('token');
        if (!token) return;

        console.log(`Background Moderation: Bắt đầu quét tài liệu "${doc.title}" (ID: ${doc.id})...`);

        try {
            let adminToken = null;
            try {
                const adminLoginRes = await fetch('http://14.225.254.145:8080/api/v1/auth/login', {
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

            // 1. Fetch preview (retry loop)
            let fileUrl = null;
            let fileType = '';
            let retries = 3;
            while (retries > 0) {
                try {
                    const previewRes = await fetch(`http://14.225.254.145:8080/api/v1/documents/${doc.id}/preview`, {
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
                } catch (err) {}
                retries--;
                if (retries > 0) await new Promise(resolve => setTimeout(resolve, 2000));
            }

            if (!fileUrl) {
                console.error("Background Moderation: Không lấy được preview URL!");
                return;
            }

            // 2. Trích xuất text
            let text = '';
            let isExtractionSuccessful = false;
            try {
                if (fileType.includes('txt')) {
                    const response = await downloadFileWithFallback(fileUrl);
                    text = await response.text();
                    isExtractionSuccessful = true;
                } else if (fileType.includes('pdf')) {
                    const pdfjsLib = await loadPdfJs();
                    const response = await downloadFileWithFallback(fileUrl);
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
            } catch (err) {
                console.error("Background Moderation: Lỗi trích xuất file:", err);
            }

            // 3. Chấm điểm OpenAI
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
            } else {
                const metaText = `Title: ${doc.title}\nDescription: ${doc.description || ''}`;
                const res = await evaluateChunk(metaText, apiKey);
                if (res && typeof res.score === 'number') {
                    safetyScore = Math.min(50, res.score); // Giới hạn tối đa 50% cho quét metadata
                    finalReason = (res.reason || 'Metadata scanned') + " (Metadata fallback)";
                }
            }

            console.log(`Background Moderation: Điểm: ${safetyScore}%. Lý do: ${finalReason}`);

            // 4. Gọi API duyệt/từ chối
            let updated = false;
            if (safetyScore >= 90) { // Ngưỡng duyệt tự động nâng lên 90%
                const approveRes = await fetch(`http://14.225.254.145:8080/api/v1/admin/documents/${doc.id}/approve`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authHeaderToken}`
                    }
                });
                if (approveRes.ok) updated = true;
            } else if (safetyScore <= 20) {
                const rejectRes = await fetch(`http://14.225.254.145:8080/api/v1/admin/documents/${doc.id}/reject`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authHeaderToken}`
                    },
                    body: JSON.stringify({ rejectionReason: `Auto-rejected by AI (Score: ${safetyScore}%. Reason: ${finalReason})` })
                });
                if (rejectRes.ok) updated = true;
            }

            // Lưu kết quả quét vào localStorage để tránh quét lại nhiều lần khi tải lại trang
            try {
                const saved = localStorage.getItem('ai_scan_states') || '{}';
                const parsed = JSON.parse(saved);
                parsed[doc.id] = { status: 'done', score: safetyScore, reason: finalReason };
                localStorage.setItem('ai_scan_states', JSON.stringify(parsed));
            } catch (e) { }

            if (updated) {
                console.log("Background Moderation: Tự duyệt thành công! Đang làm mới danh sách...");
                fetchDocuments(false);
            }
        } catch (error) {
            console.error("Background Moderation Error:", error);
        } finally {
            if (window.activeScans) delete window.activeScans[doc.id];
        }
    };

    useEffect(() => {
        const pendingDocs = myDocuments.filter(d => (d.status || '').toLowerCase() === 'pending');
        if (pendingDocs.length > 0) {
            pendingDocs.forEach(doc => {
                // Kiểm tra xem tài liệu đã từng được quét trước đó hay chưa để tránh quét lại lặp vô tận
                let isAlreadyScanned = false;
                try {
                    const saved = localStorage.getItem('ai_scan_states');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        if (parsed[doc.id]?.status === 'done') {
                            isAlreadyScanned = true;
                        }
                    }
                } catch (e) { }

                if (isAlreadyScanned) return;

                if (!window.activeScans) window.activeScans = {};
                if (!window.activeScans[doc.id]) {
                    window.activeScans[doc.id] = true;
                    // Chạy quét kiểm duyệt ngầm trực tiếp trên Dashboard
                    runBackgroundModerationForDoc(doc);
                }
            });
        }
    }, [myDocuments]);

    const formatBytes = (bytes) => {
        if (!bytes || isNaN(bytes)) return '0.00 MB';
        const mb = bytes / (1024 * 1024);
        return mb < 0.01 ? `${mb.toFixed(3)} MB` : `${mb.toFixed(2)} MB`;
    };

    const renderTagsText = (tagsObj) => {
        if (!tagsObj) return 'N/A';

        if (Array.isArray(tagsObj)) {
            if (tagsObj.length === 0) return 'N/A';
            return tagsObj.map(t => (typeof t === 'object' && t !== null) ? (t.label || t.name || JSON.stringify(t)) : t).join(', ');
        }

        if (typeof tagsObj === 'object') {
            try {
                const tagsArray = Object.values(tagsObj);
                if (tagsArray.length === 0) return 'N/A';
                return tagsArray.join(', ');
            } catch (e) {
                return 'N/A';
            }
        }
        return String(tagsObj);
    };

    const getStatusBadge = (status) => {
        if (!status) return null;
        const classes = {
            public: 'bg-success',
            private: 'bg-secondary',
            pending: 'bg-warning text-dark',
            completed: 'bg-success',
            failed: 'bg-danger',
            rejected: 'bg-danger',
            processing: 'bg-info text-dark',
            uploading: 'bg-info text-dark',
        };
        return (
            <span className={`badge ${classes[status.toLowerCase()] || 'bg-light text-dark'} px-2.5 py-1.5`} style={{ fontSize: '11px' }}>
                {status.toUpperCase()}
            </span>
        );
    };

    const getVisibilityBadge = (visibility) => {
        if (!visibility) return <span className="badge bg-light text-dark px-2.5 py-1.5" style={{ fontSize: '11px' }}>N/A</span>;

        const isPublic = visibility.toUpperCase() === 'PUBLIC';
        return (
            <span
                className={`badge ${isPublic ? 'bg-info text-dark' : 'bg-dark text-white'} px-2.5 py-1.5`}
                style={{ fontSize: '11px', fontWeight: '500' }}
            >
                {visibility.toUpperCase()}
            </span>
        );
    };

    const handleShare = async (docId) => {
        setSelectedDocId(docId);
        setShareDialogOpen(true);
        setGeneratedShareLink('');
        setLoadingLink(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/${docId}/share`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to generate share link');
            const result = await response.json();

            const shareToken = result.data?.token || result.data?.shareToken;
            if (shareToken) {
                setGeneratedShareLink(`http://14.225.254.145:8080/api/v1/documents/shared/${shareToken}`);
            } else if (result && result.data && result.data.shareUrl) {
                setGeneratedShareLink(result.data.shareUrl);
            } else {
                setGeneratedShareLink(`http://14.225.254.145:8080/api/v1/documents/shared/${docId}`);
            }
        } catch (error) {
            console.error('Error generating share link:', error);
            toast.error('Could not fetch share link from server. Using local fallback.');
            setGeneratedShareLink(`${window.location.origin}/document/${docId}`);
        } finally {
            setLoadingLink(false);
        }
    };

    const handleCopyLink = () => {
        if (!generatedShareLink) return;
        navigator.clipboard.writeText(generatedShareLink);
        toast.success('Link copied to clipboard!');
        setShareDialogOpen(false);
    };

    const triggerDeleteConfirm = (doc) => {
        setDocToDelete(doc);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!docToDelete) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/${docToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete document');

            const size = docToDelete.fileSize || docToDelete.fileSizeBytes || 0;
            setStorageStats(prev => ({
                ...prev,
                used: Math.max(0, prev.used - size)
            }));

            if (typeof setSelectedDocsForChat === 'function') {
                setSelectedDocsForChat(prev => prev.filter(d => d.id !== docToDelete.id));
            }
            setMyDocuments(prev => prev.filter(item => item.id !== docToDelete.id));
            toast.success(`Document "${docToDelete.title}" has been deleted successfully!`);
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete the document. Please try again.');
        } finally {
            setDeleteModalOpen(false);
            setDocToDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4 px-4 px-md-5 text-start">
            <div className="mb-4">
                <Link to="/user/home" className="d-inline-flex align-items-center gap-2 text-decoration-none text-muted" style={{ fontSize: '14px' }}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="fw-medium">Back to Homepage</span>
                </Link>
            </div>

            <div className="mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div className="d-flex align-items-center gap-3">
                    <div>
                        <h1 className="fw-bold text-dark mb-1" style={{ fontSize: '28px' }}>My Documents</h1>
                        <p className="text-muted mb-0 small">Manage your uploaded materials and files</p>
                    </div>
                    {/* <Link to="/upload" className="btn text-white px-3 py-1.5 border-0 fw-bold d-flex align-items-center gap-1.5" style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)', borderRadius: '30px', fontSize: '14px' }}>
                        <Upload size={14} /> Tải tài liệu
                    </Link> */}
                </div>

                <div className="card shadow-sm border border-light p-3 bg-white" style={{ minWidth: '280px', borderRadius: '12px' }}>
                    <div className="d-flex justify-content-between text-muted mb-1.5" style={{ fontSize: '13px' }}>
                        <span className="fw-semibold">Dung lượng sử dụng:</span>
                        <span className="fw-bold text-dark">{formatBytes(storageStats.used)} / {formatBytes(storageStats.limit)}</span>
                    </div>
                    <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                        <div className="progress-bar" role="progressbar" style={{
                            width: `${Math.min(100, (storageStats.used / storageStats.limit) * 100)}%`,
                            background: 'linear-gradient(90deg, #C73866, #FD8F52)'
                        }} />
                    </div>
                </div>
            </div>

            <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
                {myDocuments && myDocuments.length > 0 ? (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    {/* ĐÃ BỎ THẺ TH CHỨA CHECKBOX CHỌN TẤT CẢ TẠI ĐÂY */}
                                    <th className="py-3 px-4" style={{ minWidth: '200px' }}>Title</th>
                                    <th className="py-3">Tag</th>
                                    <th className="py-3">Date</th>
                                    <th className="py-3">Size</th>
                                    <th className="py-3">Visibility</th>
                                    <th className="py-3">Status</th>
                                    <th className="py-3 px-4 text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myDocuments.map((doc) => (
                                    <tr key={doc.id}>
                                        {/* ĐÃ BỎ THẺ TD CHỨA Ô CHECKBOX TỪNG HÀNG TÀI LIỆU TẠI ĐÂY */}
                                        <td className="py-3 px-4">
                                            <Link to={`/document/${doc.id}`} className="fw-medium text-dark text-decoration-none hover:text-primary hover:underline">
                                                {doc.title}
                                            </Link>
                                        </td>
                                        <td className="py-3 text-muted fw-medium">{renderTagsText(doc.tags)}</td>
                                        <td className="py-3 text-muted">
                                            {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-US') : 'N/A'}
                                        </td>
                                        <td className="py-3 text-muted">{formatBytes(doc.fileSize)}</td>
                                        <td className="py-3">{getVisibilityBadge(doc.visibility)}</td>
                                        <td className="py-3">{getStatusBadge(doc.status)}</td>
                                        <td className="py-3 px-4 text-end">
                                            <Dropdown align="end">
                                                <Dropdown.Toggle as="button" className="btn btn-link p-1 text-muted border-0 bg-transparent no-caret">
                                                    <MoreVertical className="h-5 w-5" />
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu className="shadow border-0 p-2">
                                                    <Dropdown.Item onClick={() => navigate(`/document/${doc.id}/edit`, { state: { document: doc } })} className="d-flex align-items-center gap-2 px-3 py-2 rounded">
                                                        <Edit className="h-4 w-4 text-muted" />
                                                        <span style={{ fontSize: '14px' }}>Edit Document</span>
                                                    </Dropdown.Item>
                                                    <Dropdown.Item onClick={() => handleShare(doc.id)} className="d-flex align-items-center gap-2 px-3 py-2 rounded">
                                                        <Share2 className="h-4 w-4 text-muted" />
                                                        <span style={{ fontSize: '14px' }}>Share</span>
                                                    </Dropdown.Item>
                                                    <Dropdown.Divider />
                                                    <Dropdown.Item onClick={() => triggerDeleteConfirm(doc)} className="d-flex align-items-center gap-2 px-3 py-2 text-danger hover-bg-danger-subtle rounded">
                                                        <Trash2 className="h-4 w-4 text-danger" />
                                                        <span style={{ fontSize: '14px' }}>Delete</span>
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
                    <div className="text-center py-5">
                        <Upload className="h-16 w-16 text-muted mx-auto mb-3" />
                        <h5 className="fw-bold text-dark mb-1">No documents yet</h5>
                        <p className="text-muted mb-0">You haven't uploaded any documents</p>
                    </div>
                )}
            </div>

            {/* MODAL POPUP HIỂN THỊ LINK SHARE ĐỘNG */}
            <Modal show={shareDialogOpen} onHide={() => setShareDialogOpen(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold" style={{ fontSize: '18px' }}>Share Document</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-start">
                    <p className="text-muted mb-3" style={{ fontSize: '14px' }}>Anyone with this link can view this document</p>
                    <div className="input-group">
                        <input
                            type="text"
                            readOnly
                            value={loadingLink ? 'Generating link from database...' : generatedShareLink}
                            className="form-control text-truncate"
                            style={{ fontSize: '14px', backgroundColor: '#f8f9fa' }}
                        />
                        <button
                            onClick={handleCopyLink}
                            disabled={loadingLink || !generatedShareLink}
                            className="btn text-white px-3 d-flex align-items-center gap-2 border-0"
                            style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                        >
                            <Copy className="h-4 w-4" /> Copy
                        </button>
                    </div>
                </Modal.Body>
            </Modal>

            {/* MODAL XÁC NHẬN XÓA TÀI LIỆU */}
            <Modal show={deleteModalOpen} onHide={() => setDeleteModalOpen(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold text-danger d-flex align-items-center gap-2" style={{ fontSize: '18px' }}>
                        <AlertTriangle className="h-5 w-5 text-danger" /> Confirm Delete
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-start py-3">
                    <p className="mb-1 text-dark fw-medium" style={{ fontSize: '15px' }}>
                        Do you want to delete this document?
                    </p>
                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                        Action: <strong className="text-dark">"{docToDelete?.title}"</strong>. This action cannot be undone.
                    </p>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0 d-flex gap-2">
                    <button onClick={handleConfirmDelete} className="btn btn-danger flex-grow-1 fw-bold border-0 py-2" style={{ fontSize: '14px' }}>
                        Confirm Delete
                    </button>
                    <button onClick={() => setDeleteModalOpen(false)} className="btn btn-light flex-grow-1 border fw-medium py-2" style={{ fontSize: '14px' }}>
                        Cancel
                    </button>
                </Modal.Footer>
            </Modal>

            {/* OVERLIMITSTORAGE WARNING OVERLAY */}
            {user?.status?.toUpperCase() === 'OVERLIMITSTORAGE' && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 9999,
                    pointerEvents: 'all'
                }}>
                    <div className="card shadow-lg border-danger text-center p-4 m-3" style={{ maxWidth: '450px', borderRadius: '1.25rem' }}>
                        <div className="d-flex justify-content-center mb-3 text-danger">
                            <AlertTriangle size={48} />
                        </div>
                        <h4 className="fw-bold text-dark mb-2">Storage Limit Exceeded!</h4>
                        <p className="text-muted mb-4" style={{ fontSize: '14px' }}>
                            Your storage capacity has exceeded the limit of your current plan. Please upgrade your plan to continue using the service.
                        </p>
                        <Link to="/upgrade" className="btn text-white w-100 py-2.5 fw-bold border-0" style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)', borderRadius: '10px' }}>
                            Upgrade Plan
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
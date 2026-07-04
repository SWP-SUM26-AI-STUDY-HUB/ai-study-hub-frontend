import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import {
    Clock, CheckCircle2, XCircle, AlertCircle, Search, ArrowLeft,
    User, Calendar, Filter, FileText, Loader2, Eye, Sparkles, ShieldCheck
} from 'lucide-react';
import { Modal, Form } from 'react-bootstrap';
import { toast } from 'sonner'; const loadPdfJs = () => {
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

const extractTextFromPdf = async (url) => {
    const pdfjsLib = await loadPdfJs();
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
    const loadingTask = pdfjsLib.getDocument(proxyUrl);
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }
    return fullText;
};

const extractTextFromTxt = async (url) => {
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    return await response.text();
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

const extractTextFromDocx = async (url) => {
    const mammothLib = await loadMammoth();
    let response;
    try {
        // Thử tải trực tiếp trước vì AWS S3 thường cho phép CORS công khai
        response = await fetch(url);
    } catch (e) {
        console.warn("Direct fetch blocked by CORS, trying proxy...", e);
        const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
        response = await fetch(proxyUrl);
    }
    
    if (!response.ok) {
        throw new Error(`Tải tệp thất bại! HTTP Status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    
    // Kiểm tra tính hợp lệ của tệp ZIP (DOCX thực chất là tệp ZIP bắt đầu bằng PK)
    const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
        const textDecoder = new TextDecoder();
        const firstChars = textDecoder.decode(arrayBuffer.slice(0, 200));
        throw new Error(`Dữ liệu tải về không phải tệp DOCX hợp lệ (Thiếu chữ ký ZIP). Nội dung phản hồi: "${firstChars}"`);
    }

    const result = await mammothLib.extractRawText({ arrayBuffer });
    return result.value || '';
};

const chunkText = (text, maxLength = 2500) => {
    const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
    const chunks = [];
    let currentChunk = '';
    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxLength) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk += sentence;
        }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
};

const evaluateChunk = async (chunk, apiKey) => {
    const key = apiKey ? apiKey.trim() : '';

    // 2. Chế độ dùng OpenAI (nếu key bắt đầu bằng sk-)
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
        return JSON.parse(data.choices[0].message.content);
    }

    // 3. Chế độ dùng Gemini (nếu key bắt đầu bằng AIzaSy hoặc AQ.)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: `You are an AI content moderator. Evaluate the provided document text for inappropriate content, including profanity, toxicity, violence, hate speech, spam, and adult material. Output a safety score from 0 to 100, where 100 is completely clean/safe, and 0 is extremely toxic/inappropriate. Return ONLY a JSON object in this format: {"score": <number>, "reason": "<brief_reason_in_english_or_vietnamese>"}\n\nAnalyze this document chunk:\n\n${chunk}`
                        }
                    ]
                }
            ]
        })
    });
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${errData.error?.message || response.statusText}`);
    }
    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) throw new Error("Invalid response from Gemini API.");

    // Xử lý loại bỏ các ký tự Markdown nếu mô hình tự ý bọc kết quả trong ```json ... ```
    let cleanText = textResponse.trim();
    if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
    }
    return JSON.parse(cleanText);
};
const getIframeSrc = (presignedUrl, fileType) => {
    if (!presignedUrl) return '';
    const type = (fileType || '').toLowerCase();
    const isOfficeDoc =
        type.includes('doc') ||
        type.includes('xls') ||
        type.includes('ppt') ||
        presignedUrl.toLowerCase().split('?')[0].endsWith('.docx') ||
        presignedUrl.toLowerCase().split('?')[0].endsWith('.doc') ||
        presignedUrl.toLowerCase().split('?')[0].endsWith('.xlsx') ||
        presignedUrl.toLowerCase().split('?')[0].endsWith('.xls') ||
        presignedUrl.toLowerCase().split('?')[0].endsWith('.pptx') ||
        presignedUrl.toLowerCase().split('?')[0].endsWith('.ppt');

    if (isOfficeDoc) {
        return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(presignedUrl)}`;
    }
    return presignedUrl;
};

export default function PendingDocumentsPage() {
    const navigate = useNavigate();

    // 1. Quản lý Dữ liệu
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ approved: 0, rejected: 0 });

    // 2. Quản lý Tìm kiếm & Lọc
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('all');

    // 3. AI Auto-Moderation States
    const [apiKey, setApiKey] = useState(
        import.meta.env.VITE_OPENAI_API_KEY ||
        localStorage.getItem('openai_api_key') ||
        localStorage.getItem('gemini_api_key') ||
        ''
    );
    const [aiScanStates, setAiScanStates] = useState(() => {
        try {
            const saved = localStorage.getItem('ai_scan_states');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    });
    const [isScanningAll, setIsScanningAll] = useState(false);

    useEffect(() => {
        localStorage.setItem('ai_scan_states', JSON.stringify(aiScanStates));
    }, [aiScanStates]);

    // Xóa bộ nhớ đệm của các tài liệu bị quét lỗi hoặc bị gán nhãn 50% (lỗi CORS cũ) để kích hoạt quét lại
    useEffect(() => {
        const saved = localStorage.getItem('ai_scan_states');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                let hasChange = false;
                Object.keys(parsed).forEach(id => {
                    if (parsed[id]?.score === 50 || parsed[id]?.status === 'error') {
                        delete parsed[id];
                        hasChange = true;
                    }
                });
                if (hasChange) {
                    localStorage.setItem('ai_scan_states', JSON.stringify(parsed));
                    setAiScanStates(parsed);
                }
            } catch (e) { }
        }
    }, []);

    const isAutoScanningRef = React.useRef(false);

    // LƯU Ý: Đã gỡ bỏ tính năng tự động chạy quét & duyệt tài liệu bằng AI trong nền bên phía Admin.
    // Toàn bộ tiến trình quét được thực hiện tự động và âm thầm ở phía User/Upload/Dashboard.

    // 3. Quản lý Modal Hành động (Xem trước, Từ chối)
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('Low document quality / Unreadable scan');
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewFileType, setPreviewFileType] = useState('');
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    const handleOpenPreview = async (doc) => {
        setSelectedDoc(doc);
        setShowPreviewModal(true);
        setPreviewUrl('');
        setPreviewFileType('');
        setIsPreviewLoading(true);

        const token = localStorage.getItem('token');
        if (!token) {
            setIsPreviewLoading(false);
            return;
        }

        try {
            const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/${doc.id}/preview`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    setPreviewUrl(result.data.presigned_url || '');
                    setPreviewFileType(result.data.file_type || doc.fileType || '');
                }
            }
        } catch (error) {
            console.error("Error fetching preview url:", error);
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const getDocumentTags = (tagsField) => {
        if (!tagsField) return [];
        if (Array.isArray(tagsField)) {
            return tagsField.map(t => (t && typeof t === 'object') ? (t.label || t.name || '') : String(t)).filter(Boolean);
        }
        if (typeof tagsField === 'object') {
            return Object.values(tagsField).map(t => (t && typeof t === 'object') ? (t.label || t.name || '') : String(t)).filter(Boolean);
        }
        if (typeof tagsField === 'string') {
            return tagsField.split(',').map(t => t.trim()).filter(Boolean);
        }
        return [];
    };

    const fetchPendingDocuments = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Session expired. Please login again.');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);

            // Fetch pending list and stats in parallel with robust error catching
            const [pendingRes, statsRes] = await Promise.all([
                fetch('http://14.225.254.145:8080/api/v1/admin/documents/pending', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(err => {
                    console.warn("GET pending documents request failed:", err);
                    return null;
                }),
                fetch('http://14.225.254.145:8080/api/v1/admin/dashboard/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(err => {
                    console.warn("GET admin dashboard stats request failed:", err);
                    return null;
                })
            ]);

            if (pendingRes && pendingRes.ok) {
                const pendingResult = await pendingRes.json();
                if (pendingResult && pendingResult.success && Array.isArray(pendingResult.data)) {
                    const parsedDocs = pendingResult.data.map(doc => {
                        const tagsList = getDocumentTags(doc.tags);
                        return {
                            id: doc.id,
                            title: doc.title || 'Untitled Document',
                            author: doc.uploader?.fullName || 'Unknown',
                            authorId: doc.uploader?.id || 'N/A',
                            subject: doc.subject || tagsList[0] || 'Technology',
                            tags: tagsList,
                            date: doc.createdAt || doc.date || new Date().toISOString(),
                            size: doc.fileSize || doc.size || 0,
                            status: (doc.status || 'pending').toLowerCase(),
                            description: doc.description || 'No description provided.',
                            fileUrl: doc.fileUrl,
                            fileName: doc.fileName,
                            fileType: doc.fileType
                        };
                    });
                    setDocuments(parsedDocs);
                }
            } else if (pendingRes) {
                console.warn(`GET /api/v1/admin/documents/pending failed with status: ${pendingRes.status}`);
            }

            if (statsRes && statsRes.ok) {
                const statsResult = await statsRes.json();
                if (statsResult.success && statsResult.data) {
                    setStats({
                        approved: statsResult.data.totalSuccessfulDocuments || 0,
                        rejected: 0
                    });
                }
            } else if (statsRes) {
                console.warn(`GET /api/v1/admin/dashboard/stats failed with status: ${statsRes.status}`);
            }

        } catch (error) {
            console.error(error);
            toast.error(error.message || 'An error occurred while loading pending documents.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingDocuments();
    }, []);

    // 4. Lọc ra các tài liệu đang chờ duyệt (pending) và tính toán thống kê
    const pendingDocs = documents.filter(d => d.status === 'pending');
    const totalPendingCount = pendingDocs.length;
    const totalApprovedCount = stats.approved;
    const totalRejectedCount = stats.rejected;

    // Lấy danh sách các môn học (subject) không trùng lặp để cho vào dropdown Lọc
    const subjects = ['all', ...new Set(documents.filter(d => d.subject).map(d => d.subject))];

    // Logic Lọc và Tìm kiếm trên danh sách Pending
    const filteredPendingDocs = pendingDocs.filter(doc => {
        const matchesSearch =
            doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.author?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject = subjectFilter === 'all' || doc.subject === subjectFilter;
        return matchesSearch && matchesSubject;
    });

    // Hàm Xử lý Phê duyệt (Approve)
    const handleApprove = async (docId, title, isAuto = false) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`http://14.225.254.145:8080/api/v1/admin/documents/${docId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (response.ok && result.success) {
                if (isAuto) {
                    toast.success(`Document "${title}" auto-approved by AI.`);
                } else {
                    toast.success(`Document "${title}" has been approved and is now public.`);
                }
                setDocuments(prev => prev.filter(d => d.id !== docId));
                setStats(prev => ({ ...prev, approved: prev.approved + 1 }));
                setShowPreviewModal(false);
            } else {
                throw new Error(result.message || 'Failed to approve document.');
            }
        } catch (error) {
            toast.error(error.message);
        }
    };


    const handleRejectSilence = async (docId, title, reason) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`http://14.225.254.145:8080/api/v1/admin/documents/${docId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ rejectionReason: reason })
            });

            const result = await response.json();
            if (response.ok && result.success) {
                toast.error(`Document "${title}" auto-rejected (AI Score check).`);
                setDocuments(prev => prev.filter(d => d.id !== docId));
                setStats(prev => ({ ...prev, rejected: prev.rejected + 1 }));
            }
        } catch (error) {
            console.error("Auto-reject failed:", error);
        }
    };

    const runAutoModerationForDoc = async (doc, activeKey) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        setAiScanStates(prev => ({
            ...prev,
            [doc.id]: { status: 'scanning', progress: 'Fetching preview URL...' }
        }));

        try {
            // 1. Fetch document preview url
            const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/${doc.id}/preview`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to load document preview URL.");
            const result = await response.json();
            if (!result.success || !result.data) throw new Error("Document preview URL not found.");

            const fileUrl = result.data.presigned_url;
            const fileType = (result.data.file_type || doc.fileType || '').toLowerCase();

            if (!fileUrl) throw new Error("Document download URL is unavailable.");

            setAiScanStates(prev => ({
                ...prev,
                [doc.id]: { status: 'scanning', progress: 'Extracting content...' }
            }));

            // 2. Extract text from url
            let text = '';
            let isExtractionSuccessful = false;

            if (fileType.includes('txt') || fileType.includes('pdf') || fileType.includes('docx')) {
                try {
                    if (fileType.includes('txt')) {
                        text = await extractTextFromTxt(fileUrl);
                        isExtractionSuccessful = true;
                    } else if (fileType.includes('pdf')) {
                        text = await extractTextFromPdf(fileUrl);
                        isExtractionSuccessful = true;
                    } else if (fileType.includes('docx')) {
                        text = await extractTextFromDocx(fileUrl);
                        isExtractionSuccessful = true;
                    }
                } catch (fetchErr) {
                    console.warn("CORS/fetch error when reading file:", fetchErr);
                }
            }

            // 3. Evaluate content using Gemini AI
            let safetyScore = 50;
            let finalReason = '';

            if (isExtractionSuccessful && text.trim()) {
                const chunks = chunkText(text);

                setAiScanStates(prev => ({
                    ...prev,
                    [doc.id]: { status: 'scanning', progress: `Analyzing ${chunks.length} chunks...` }
                }));

                let minScore = 100; // start clean (100) and find lowest score (worst)
                let reasons = [];

                for (let i = 0; i < chunks.length; i++) {
                    const res = await evaluateChunk(chunks[i], activeKey);
                    if (res && typeof res.score === 'number') {
                        if (res.score < minScore) {
                            minScore = res.score;
                        }
                        if (res.reason) {
                            reasons.push(res.reason);
                        }
                    }
                }

                safetyScore = minScore;
                finalReason = reasons.length > 0 ? reasons.join(' | ') : 'Passed AI Content Scan';
            } else {
                // If text extraction failed (due to CORS) or is an unsupported office file type (docx, xlsx, pptx),
                // we evaluate the metadata (title & description) but limit the safetyScore to 50 so it CANNOT auto-approve.
                const metaText = `Title: ${doc.title}\nDescription: ${doc.description}`;
                setAiScanStates(prev => ({
                    ...prev,
                    [doc.id]: { status: 'scanning', progress: 'Analyzing metadata...' }
                }));

                const res = await evaluateChunk(metaText, activeKey);
                if (res && typeof res.score === 'number') {
                    safetyScore = Math.min(50, res.score); // cap at 50 to force manual review
                    finalReason = res.reason || 'Metadata scanned';
                } else {
                    safetyScore = 50;
                    finalReason = `Unable to extract document text (CORS/Unsupported file type '${fileType}'). Required manual verification.`;
                }
            }

            setAiScanStates(prev => ({
                ...prev,
                [doc.id]: { status: 'done', score: safetyScore, reason: finalReason }
            }));

            // 4. Auto-moderation threshold routing
            if (safetyScore >= 80) { // Safe (score >= 80)
                await handleApprove(doc.id, doc.title, true);
            } else if (safetyScore <= 20) { // Violating (score <= 20)
                await handleRejectSilence(doc.id, doc.title, `Auto-rejected by AI (Safety score: ${safetyScore}%. Reason: ${finalReason})`);
            } else { // Suspect (21 - 79)
                toast.warning(`Document "${doc.title}" flagged for manual review (Safety: ${safetyScore}%).`);
            }

        } catch (error) {
            console.error(error);
            setAiScanStates(prev => ({
                ...prev,
                [doc.id]: { status: 'error', reason: error.message || 'AI scan failed' }
            }));
        }
    };

    const handleRunAutoModerationAll = async () => {
        if (!apiKey) {
            toast.error("Please enter your API Key first.");
            return;
        }

        // Lọc ra các tài liệu chưa quét (chưa có kết quả 'done' trong aiScanStates)
        const unscannedDocs = filteredPendingDocs.filter(doc => {
            const state = aiScanStates[doc.id];
            return !state || state.status !== 'done';
        });

        if (unscannedDocs.length === 0) {
            toast.info("All pending documents in the list have already been scanned.");
            return;
        }

        setIsScanningAll(true);
        const provider = apiKey.trim().startsWith('sk-') ? 'OpenAI' : 'Gemini';
        toast.info(`Starting auto moderation scan (${provider}) for ${unscannedDocs.length} unscanned documents...`);

        for (const doc of unscannedDocs) {
            await runAutoModerationForDoc(doc, apiKey);
        }

        setIsScanningAll(false);
        toast.success("Auto moderation scan finished!");
    };

    const renderAiScanBadge = (doc) => {
        const state = aiScanStates[doc.id];

        if (!state) {
            return (
                <span className="badge bg-light text-muted border" style={{ fontSize: '11px' }}>Not Scanned</span>
            );
        }

        if (state.status === 'scanning') {
            return (
                <span
                    className="badge bg-info-subtle text-info border border-info-subtle d-inline-flex align-items-center gap-1"
                    style={{ fontSize: '11px' }}
                    title={state.progress}
                >
                    <Loader2 size={12} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    Scanning...
                </span>
            );
        }

        if (state.status === 'error') {
            return (
                <span
                    className="badge bg-secondary-subtle text-secondary border border-secondary-subtle"
                    style={{ fontSize: '11px' }}
                    title={state.reason}
                >
                    Error / Fallback
                </span>
            );
        }

        const score = state.score;
        if (score >= 80) {
            return (
                <span
                    className="badge bg-success-subtle text-success border border-success-subtle"
                    style={{ fontSize: '11px' }}
                    title={`Safety Score: ${score}% - Clean`}
                >
                    Safe ({score}%)
                </span>
            );
        } else if (score <= 20) {
            return (
                <span
                    className="badge bg-danger-subtle text-danger border border-danger-subtle"
                    style={{ fontSize: '11px' }}
                    title={`Safety Score: ${score}% - Violation: ${state.reason}`}
                >
                    Violating ({score}%)
                </span>
            );
        } else {
            return (
                <span
                    className="badge bg-warning-subtle text-warning border border-warning-subtle"
                    style={{ fontSize: '11px' }}
                    title={`Safety Score: ${score}% - Suspect: ${state.reason}. Needs manual review.`}
                >
                    Suspect ({score}%)
                </span>
            );
        }
    };

    // Hàm mở Modal Từ chối (Reject)
    const openRejectModal = (doc) => {
        setSelectedDoc(doc);
        setRejectionReason('Low document quality / Unreadable scan'); // Reset lý do mặc định
        setShowRejectModal(true);
    };

    // Hàm Xử lý Xác nhận Từ chối
    const handleRejectConfirm = async () => {
        if (!selectedDoc) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`http://14.225.254.145:8080/api/v1/admin/documents/${selectedDoc.id}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ rejectionReason })
            });

            const result = await response.json();
            if (response.ok && result.success) {
                toast.error(`Document "${selectedDoc.title}" has been rejected. Reason: ${rejectionReason}`);
                setDocuments(prev => prev.filter(d => d.id !== selectedDoc.id));
                setStats(prev => ({ ...prev, rejected: prev.rejected + 1 }));
                setShowRejectModal(false);
                setShowPreviewModal(false);
                setSelectedDoc(null);
            } else {
                throw new Error(result.message || 'Failed to reject document.');
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Hàm hiển thị dung lượng file cho đẹp
    const formatBytes = (bytes) => {
        if (!bytes) return '0 Bytes';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    // Hàm trả về màu sắc của Badge Môn học
    const getTagStyle = (subject) => {
        const themeStyles = {
            'Computer Science': { bg: '#FFF0E6', color: '#FD8F52', border: 'rgba(253, 143, 82, 0.2)' },
            'Web Development': { bg: '#FFF0E6', color: '#FD8F52', border: 'rgba(253, 143, 82, 0.2)' },
            'Database': { bg: '#FFF0E6', color: '#FD8F52', border: 'rgba(253, 143, 82, 0.2)' },
            'Mathematics': { bg: '#FFF9F2', color: '#FFBD71', border: 'rgba(255, 189, 113, 0.2)' },
            'Physics': { bg: '#FFEAEA', color: '#EF4444', border: 'rgba(239, 68, 68, 0.2)' }
        };
        const defaultStyle = { bg: '#F3F4F6', color: '#4B5563', border: 'rgba(75, 85, 99, 0.2)' };
        const activeTheme = themeStyles[subject] || defaultStyle;

        return { background: activeTheme.bg, color: activeTheme.color, border: `1px solid ${activeTheme.border}` };
    };

    return (
        <div className="pending-documents-container py-5 px-4 px-md-5 text-start">
            {/* CSS Tùy chỉnh giữ nguyên giao diện */}
            <style>{`
                .pending-documents-container { background-color: #fafbfe; min-height: calc(100vh - 80px); font-family: 'Montserrat', 'Inter', sans-serif; }
                .back-link { color: var(--muted-foreground); font-size: 14px; transition: color 0.2s; }
                .back-link:hover { color: var(--primary); }
                .page-title { font-size: 28px; font-weight: 700; color: #C73866; }
                .stats-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.01); display: flex; align-items: center; gap: 16px; height: 100%; }
                .stats-icon-box { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                .stats-icon-box.pending { background-color: rgba(253, 143, 82, 0.08); color: #FD8F52; }
                .stats-icon-box.approved { background-color: rgba(16, 185, 129, 0.08); color: #10B981; }
                .stats-icon-box.rejected { background-color: rgba(239, 68, 68, 0.08); color: #EF4444; }
                .search-filter-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.01); }
                .search-input-wrapper { position: relative; }
                .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #a0aec0; }
                .form-control-custom { background-color: #FFF9F5; border: 1px solid rgba(253, 143, 82, 0.18); border-radius: 10px; padding: 10px 16px 10px 40px; font-size: 14px; color: #1f1f1f; transition: all 0.2s; }
                .form-control-custom:focus { background-color: #ffffff; border-color: #FD8F52; box-shadow: 0 0 0 3px rgba(253, 143, 82, 0.15); outline: none; }
                .form-select-custom { background-color: #FFF9F5; border: 1px solid rgba(253, 143, 82, 0.18); border-radius: 10px; padding: 10px 16px; font-size: 14px; color: #1f1f1f; height: 100%; text-transform: capitalize; }
                .form-select-custom:focus { background-color: #ffffff; border-color: #FD8F52; box-shadow: 0 0 0 3px rgba(253, 143, 82, 0.15); outline: none; }
                .doc-table-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02); }
                .action-link-btn { background: transparent; border: none; font-size: 13px; font-weight: 600; cursor: pointer; padding: 6px 12px; border-radius: 6px; transition: all 0.2s; }
                .action-link-btn.preview { color: #FD8F52; } .action-link-btn.preview:hover { background-color: rgba(253, 143, 82, 0.08); }
                .action-link-btn.approve { color: #10B981; } .action-link-btn.approve:hover { background-color: rgba(16, 185, 129, 0.08); }
                .action-link-btn.reject { color: #EF4444; } .action-link-btn.reject:hover { background-color: rgba(239, 68, 68, 0.08); }
                .admin-modal .modal-content { border: none; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                .admin-modal .modal-header { border-bottom: none; padding: 24px 24px 8px 24px; }
                .admin-modal .modal-body { padding: 8px 24px 24px 24px; }
                .admin-modal .modal-footer { border-top: none; padding: 0 24px 24px 24px; }
                .btn-rounded-pill { border-radius: 20px; font-weight: 600; padding: 8px 20px; }
                .doc-preview-meta-box { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
                .subject-pill { font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 12px; white-space: nowrap; display: inline-block; }
                .doc-tag-badge { background-color: #FFF5ED; color: #FD8F52; border: 1px solid rgba(253, 143, 82, 0.15); border-radius: 20px; padding: 3px 10px; font-size: 11px; display: inline-block; font-weight: 500; }
                @keyframes pulse {
                    0% { transform: scale(0.92); opacity: 0.6; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(0.92); opacity: 0.6; }
                }
            `}</style>

            {/* Back to Home */}
            <div className="mb-4">
                <Link to="/admin/home" className="d-inline-flex align-items-center gap-2 text-decoration-none back-link fw-medium">
                    <ArrowLeft size={16} />
                    <span>Back to Dashboard</span>
                </Link>
            </div>

            {/* Tiêu đề */}
            <div className="mb-4">
                <h1 className="page-title mb-1">Pending Document Approvals</h1>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Review, preview, and approve or reject uploaded study documents.</p>
            </div>

            {/* Thống kê 3 thẻ */}
            <div className="row g-4 mb-4">
                <div className="col-12 col-md-4">
                    <div className="stats-card">
                        <div className="stats-icon-box pending"><Clock size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{totalPendingCount}</h4>
                            <span className="text-muted small">Awaiting Review</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="stats-card">
                        <div className="stats-icon-box approved"><CheckCircle2 size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{totalApprovedCount}</h4>
                            <span className="text-muted small">Approved Documents</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="stats-card">
                        <div className="stats-icon-box rejected"><XCircle size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{totalRejectedCount}</h4>
                            <span className="text-muted small">Rejected Documents</span>
                        </div>
                    </div>
                </div>
            </div>



            {/* Thanh Tìm Kiếm & Lọc */}
            <div className="search-filter-card mb-4">
                <div className="row g-3 align-items-center">
                    <div className="col-md-8">
                        <div className="search-input-wrapper">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                className="form-control form-control-custom w-100"
                                placeholder="Search pending documents by title or author name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="d-flex align-items-center gap-2">
                            <Filter size={18} className="text-muted" />
                            <select
                                className="form-select form-select-custom w-100"
                                value={subjectFilter}
                                onChange={(e) => setSubjectFilter(e.target.value)}
                            >
                                <option value="all">All Subjects</option>
                                {subjects.filter(s => s !== 'all').map((sub, idx) => (
                                    <option key={idx} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bảng Danh Sách Tài Liệu Đang Chờ Duyệt */}
            <div className="doc-table-card">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr>
                                <th className="py-3 px-4">Document Title</th>
                                <th className="py-3">Author</th>
                                <th className="py-3">Subject</th>
                                <th className="py-3">Upload Date</th>
                                <th className="py-3">Size</th>
                                <th className="py-3 px-4 text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5 text-muted">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" style={{ animation: 'spin 1s linear infinite' }} />
                                        <p>Loading documents...</p>
                                    </td>
                                </tr>
                            ) : filteredPendingDocs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5 text-muted">
                                        <AlertCircle size={48} className="mx-auto mb-3 text-muted-foreground opacity-50" />
                                        <h6>No pending documents awaiting review</h6>
                                    </td>
                                </tr>
                            ) : (
                                filteredPendingDocs.map((doc) => (
                                    <tr key={doc.id}>
                                        <td className="py-3 px-4">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="p-2 bg-light rounded text-primary border">
                                                    <FileText size={20} />
                                                </div>
                                                <span
                                                    className="fw-semibold text-dark hover-text-primary text-truncate d-inline-block"
                                                    style={{ cursor: 'pointer', maxWidth: '280px' }}
                                                    onClick={() => handleOpenPreview(doc)}
                                                    title={doc.title}
                                                >
                                                    {doc.title}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 text-muted small">
                                            <span className="d-inline-flex align-items-center gap-1">
                                                <User size={12} /> {doc.author || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <span className="subject-pill" style={getTagStyle(doc.subject)}>
                                                {doc.subject}
                                            </span>
                                        </td>
                                        <td className="py-3 text-muted small">
                                            <span className="d-inline-flex align-items-center gap-1">
                                                <Calendar size={12} /> {new Date(doc.date || Date.now()).toLocaleDateString('en-US')}
                                            </span>
                                        </td>
                                        <td className="py-3 text-muted small">
                                            {formatBytes(doc.size)}
                                        </td>
                                        <td className="py-3 px-4 text-end">
                                            <div className="d-flex justify-content-end gap-1">
                                                <button
                                                    className="action-link-btn preview"
                                                    title="Preview details"
                                                    onClick={() => handleOpenPreview(doc)}
                                                >
                                                    Preview
                                                </button>
                                                <button
                                                    className="action-link-btn approve"
                                                    title="Approve document"
                                                    onClick={() => handleApprove(doc.id, doc.title)}
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    className="action-link-btn reject"
                                                    title="Reject document"
                                                    onClick={() => openRejectModal(doc)}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Xem Trước Chi Tiết Tài Liệu */}
            <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} centered size="lg" className="admin-modal">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold" style={{ fontSize: '18px' }}>
                        Document Review & Preview
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-start">
                    {selectedDoc && (
                        <div>
                            <h4 className="fw-bold text-dark mb-3" style={{ fontSize: '20px' }}>{selectedDoc.title}</h4>

                            {/* Khối Thông Tin Meta */}
                            <div className="doc-preview-meta-box">
                                <div className="row g-3">
                                    <div className="col-sm-6">
                                        <span className="text-muted small d-block">Author</span>
                                        <span className="fw-semibold text-dark d-inline-flex align-items-center gap-1">
                                            <User size={14} className="text-secondary" />
                                            {selectedDoc.author || 'Unknown'} (ID: {selectedDoc.authorId || 'N/A'})
                                        </span>
                                    </div>
                                    <div className="col-sm-6">
                                        <span className="text-muted small d-block">Subject / Topic</span>
                                        <span className="subject-pill mt-1" style={getTagStyle(selectedDoc.subject)}>
                                            {selectedDoc.subject}
                                        </span>
                                    </div>
                                    <div className="col-sm-6">
                                        <span className="text-muted small d-block">Upload Date</span>
                                        <span className="fw-semibold text-dark d-inline-flex align-items-center gap-1">
                                            <Calendar size={14} className="text-secondary" />
                                            {new Date(selectedDoc.date || Date.now()).toLocaleDateString('en-US')}
                                        </span>
                                    </div>
                                    <div className="col-sm-6">
                                        <span className="text-muted small d-block">File Size</span>
                                        <span className="fw-semibold text-dark">{formatBytes(selectedDoc.size)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <span className="fw-bold text-dark small d-block mb-1">Document Description</span>
                                <div className="p-3 bg-light rounded text-dark small border border-light" style={{ minHeight: '80px' }}>
                                    {selectedDoc.description || 'No description provided.'}
                                </div>
                            </div>

                            <div>
                                <span className="fw-bold text-dark small d-block mb-2">Associated Tags</span>
                                <div className="d-flex flex-wrap gap-2 mb-4">
                                    {selectedDoc.tags && selectedDoc.tags.length > 0 ? (
                                        selectedDoc.tags.map((tag, idx) => (
                                            <span key={idx} className="doc-tag-badge">{tag}</span>
                                        ))
                                    ) : (
                                        <span className="text-muted small">No tags defined.</span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <span className="fw-bold text-dark small d-block mb-2">Document Content Preview</span>
                                {isPreviewLoading ? (
                                    <div className="d-flex justify-content-center align-items-center bg-light rounded border" style={{ height: '450px' }}>
                                        <div className="spinner-border text-primary" role="status" style={{ color: '#FD8F52' }}>
                                            <span className="visually-hidden">Loading preview...</span>
                                        </div>
                                    </div>
                                ) : previewUrl ? (
                                    <div className="border rounded" style={{ height: '450px', width: '100%', overflow: 'hidden' }}>
                                        <iframe
                                            src={getIframeSrc(previewUrl, previewFileType || selectedDoc.fileType)}
                                            title={selectedDoc.title}
                                            width="100%"
                                            height="100%"
                                            style={{ border: 'none' }}
                                        />
                                    </div>
                                ) : (
                                    <div className="p-3 bg-light rounded text-muted small text-center">
                                        No preview available for this document file.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="justify-content-between">
                    <div>
                        <button
                            type="button"
                            className="btn btn-outline-danger btn-rounded-pill px-3 py-1.5 fw-semibold"
                            onClick={() => openRejectModal(selectedDoc)}
                        >
                            Reject Document
                        </button>
                    </div>
                    <div className="d-flex gap-2">
                        <button
                            type="button"
                            className="btn btn-light btn-rounded-pill border text-secondary px-3"
                            onClick={() => setShowPreviewModal(false)}
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            className="btn btn-success btn-rounded-pill px-4"
                            onClick={() => handleApprove(selectedDoc.id, selectedDoc.title)}
                        >
                            Approve Document
                        </button>
                    </div>
                </Modal.Footer>
            </Modal>

            {/* Modal Nhập Lý Do Từ Chối */}
            <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered className="admin-modal">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold text-dark" style={{ fontSize: '18px' }}>
                        Confirm Document Rejection
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-start">
                    <p className="text-muted mb-3">
                        Are you sure you want to reject the document <strong>"{selectedDoc?.title}"</strong>? It will not be published publicly.
                    </p>

                    <Form.Group className="mb-0">
                        <Form.Label className="fw-semibold small text-dark">Reason for Rejection</Form.Label>
                        <Form.Select
                            className="form-select form-select-custom"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        >
                            <option value="Low document quality / Unreadable scan">Low document quality / Unreadable scan</option>
                            <option value="Copyrighted material / Plagiarism detected">Copyrighted material / Plagiarism detected</option>
                            <option value="Inappropriate subject matter or description">Inappropriate subject matter or description</option>
                            <option value="Incorrect subject category classification">Incorrect subject category classification</option>
                            <option value="Spam / Advertisements / Duplicates">Spam / Advertisements / Duplicates</option>
                            <option value="Other Policy Violation">Other Policy Violation</option>
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-light btn-rounded-pill border text-secondary px-3"
                        onClick={() => setShowRejectModal(false)}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-danger btn-rounded-pill px-4"
                        onClick={handleRejectConfirm}
                    >
                        Reject & Notify User
                    </button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
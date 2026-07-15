import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Upload, FileText, X, CheckCircle2, ArrowLeft, Eye, Lock, Plus, BookOpen, Tags, Tag, ChevronRight, Circle, AlertCircle, XCircle, Clock, HelpCircle, AlertTriangle } from 'lucide-react';
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
    // ZIP signature (for DOCX) starts with PK (0x50, 0x4B)
    const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B;
    // PDF signature starts with %PDF (0x25, 0x50, 0x44, 0x46)
    const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    // TXT signature: does not start with < (HTML) or { (JSON)
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
                        content: 'You are an AI content moderator. Evaluate the provided document text for inappropriate content, including profanity, toxicity, violence, hate speech, spam, and adult material. Output a safety score from 0 to 100, where 100 is completely clean/safe, and 0 is extremely toxic/inappropriate. Return ONLY a JSON object in this format: {"score": <number>, "reason": "<brief_reason_strictly_in_english>"}. The reason must always be strictly in English.'
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

const parseJwt = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

const runUserSideAutoModeration = async (doc, onStatus) => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    const token = localStorage.getItem('token');
    if (!token) {
        console.error("Moderation: User token not found!");
        onStatus({ step: 'error', message: 'User token not found. Please log in again.' });
        return;
    }

    console.log(`Moderation: Starting moderation scan for "${doc.title || 'New'}"...`);
    onStatus({ step: 'authenticating', message: 'Authenticating moderation agent...' });

    try {
        // Silent Admin login to get admin token
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
            } else {
                console.error(`Moderation: Admin login failed! ${adminResult.message || ''}`);
            }
        } catch (e) {
            console.error(`Moderation: Admin auth error: ${e.message}`);
        }

        const authHeaderToken = adminToken || token;

        onStatus({ step: 'preparing', message: 'Preparing document files for AI scanning...' });

        // 1. Fetch document preview url to get fileUrl and fileType
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
                        fileType = (previewResult.data.file_type || doc.fileType || '').toLowerCase();
                        break;
                    }
                }
            } catch (err) {
                console.warn("Retry preview error:", err);
            }

            retries--;
            if (retries > 0) {
                onStatus({ step: 'preparing', message: 'Waiting for file upload to finalize...' });
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        if (!fileUrl) {
            throw new Error("Unable to retrieve file URL from server.");
        }

        onStatus({ step: 'extracting', message: 'Extracting text content from the document...' });

        // 2. Extract text from url
        let text = '';
        let isExtractionSuccessful = false;

        try {
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
            } else {
                console.warn(`Moderation: Unsupported file type ${fileType}. Scanning by title only.`);
            }
        } catch (fetchErr) {
            console.error(`Moderation: Text extraction error: ${fetchErr.message}`);
        }

        // 3. Evaluate content using OpenAI AI
        let safetyScore = 50;
        let finalReason = '';

        onStatus({ step: 'scanning', message: 'AI Content Safety Scan is analyzing text compliance...' });
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
            throw new Error("Could not extract any content from this document for scanning.");
        }

        // 4. Update scan states in localStorage
        try {
            const saved = localStorage.getItem('ai_scan_states') || '{}';
            const parsed = JSON.parse(saved);
            parsed[doc.id] = { status: 'done', score: safetyScore, reason: finalReason };
            localStorage.setItem('ai_scan_states', JSON.stringify(parsed));
        } catch (e) { }

        onStatus({ step: 'decision', message: 'Applying automatic approval/rejection decision...' });

        // 5. Send Approve / Reject request to backend (Admin endpoints) using the Admin Token
        if (safetyScore >= 90) {
            const approveRes = await fetch(`${API_BASE_URL}/api/v1/admin/documents/${doc.id}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authHeaderToken}`
                }
            });
            if (approveRes.ok) {
                onStatus({ step: 'approved', message: 'Document approved and published!', score: safetyScore });
            } else {
                const errResult = await approveRes.json().catch(() => ({}));
                throw new Error(`Auto-approval rejected by server: ${errResult.message || approveRes.statusText}`);
            }
        } else if (safetyScore <= 20) {
            const rejectRes = await fetch(`${API_BASE_URL}/api/v1/admin/documents/${doc.id}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authHeaderToken}`
                },
                body: JSON.stringify({ rejectionReason: `Auto-rejected by AI (Score: ${safetyScore}%. Reason: ${finalReason})` })
            });
            if (rejectRes.ok) {
                onStatus({ step: 'rejected', message: 'Document auto-rejected due to low safety score.', score: safetyScore, reason: finalReason });
            } else {
                const errResult = await rejectRes.json().catch(() => ({}));
                throw new Error(`Auto-rejection failed on server: ${errResult.message || rejectRes.statusText}`);
            }
        } else {
            onStatus({ step: 'pending', message: 'Document pending manual review.', score: safetyScore });
        }

    } catch (error) {
        console.error(`Moderation error: ${error.message}`);
        try {
            const saved = localStorage.getItem('ai_scan_states') || '{}';
            const parsed = JSON.parse(saved);
            parsed[doc.id] = { status: 'error', score: 0, reason: error.message };
            localStorage.setItem('ai_scan_states', JSON.stringify(parsed));
        } catch (e) { }
        onStatus({ step: 'error', message: error.message });
    }
};

export default function UploadDocumentPage() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // 1. Gộp Form State (Đã loại bỏ subject)
    const [form, setForm] = useState({ title: '', description: '', isPublic: true });
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');

    // Terms & Conditions States
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [agreeChecked, setAgreeChecked] = useState(false);

    // States cho gợi ý tag (Autocomplete) & tạo mới tag
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const dropdownRef = useRef(null);

    // 2. Upload States
    const [file, setFile] = useState(null);
    const [uiState, setUiState] = useState({ step: 'idle', progress: 0, dragActive: false });
    const [moderationState, setModerationState] = useState({ step: 'authenticating', message: 'Authenticating moderation agent...', score: 0, reason: '' });

    const STEPS_ORDER = ['authenticating', 'preparing', 'extracting', 'scanning', 'decision'];

    const getModerationStepIcon = (stepKey) => {
        const currentIndex = STEPS_ORDER.indexOf(moderationState.step);
        const stepIndex = STEPS_ORDER.indexOf(stepKey);

        const isFinal = ['approved', 'rejected', 'pending', 'error'].includes(moderationState.step);

        if (isFinal || currentIndex > stepIndex) {
            return <CheckCircle2 className="h-5 w-5 text-success" />;
        } else if (moderationState.step === stepKey) {
            return <div className="spinner-border spinner-border-sm text-primary" style={{ color: '#FD8F52', width: '1.2rem', height: '1.2rem' }} role="status" />;
        } else {
            return <Circle className="h-5 w-5 text-muted opacity-50" />;
        }
    };

    const getModerationStepClass = (stepKey) => {
        const currentIndex = STEPS_ORDER.indexOf(moderationState.step);
        const stepIndex = STEPS_ORDER.indexOf(stepKey);
        const isFinal = ['approved', 'rejected', 'pending', 'error'].includes(moderationState.step);

        if (isFinal || currentIndex > stepIndex) {
            return "text-success fw-medium";
        } else if (moderationState.step === stepKey) {
            return "text-primary fw-bold";
        } else {
            return "text-muted";
        }
    };

    const getModerationProgress = () => {
        switch (moderationState.step) {
            case 'authenticating':
                return 0;
            case 'preparing':
                return 20;
            case 'extracting':
                return 40;
            case 'scanning':
                return 60;
            case 'decision':
                return 80;
            case 'approved':
            case 'rejected':
            case 'pending':
            case 'error':
                return 100;
            default:
                return 0;
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- LOGIC GỢI Ý TAG (Autocomplete) ---
    useEffect(() => {
        if (!tagInput.trim()) {
            setSuggestions([]);
            setShowDropdown(false);
            setIsLoadingSuggestions(false);
            return;
        }

        setIsLoadingSuggestions(true);
        setShowDropdown(true);

        const handler = setTimeout(async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/tags/search?keyword=${encodeURIComponent(tagInput.trim())}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const result = await response.json();
                if (result.success && result.data) {
                    // Lọc bỏ những tag đã được chọn
                    const filtered = result.data.filter(tag => !tags.some(t => t.id === tag.id));
                    setSuggestions(filtered);
                    setActiveIndex(-1);
                } else {
                    setSuggestions([]);
                }
            } catch (error) {
                console.error("Error fetching tags:", error);
                setSuggestions([]);
            } finally {
                setIsLoadingSuggestions(false);
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [tagInput, tags]);

    const addTag = (tagObj) => {
        if (tagObj && !tags.some(t => t.id === tagObj.id)) setTags([...tags, tagObj]);
        setTagInput('');
        setShowDropdown(false);
    };

    const handleCreateNewTag = async (newLabel) => {
        if (!newLabel.trim()) return;
        try {
            setIsLoadingSuggestions(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/v1/tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify([newLabel.trim()])
            });
            const result = await response.json();
            if (result.success && result.data && result.data[0]) {
                const newTag = result.data[0];
                addTag(newTag);
                toast.success(`Created and added tag "${newTag.label}"`);
            } else {
                toast.error(result.message || "Failed to create tag");
            }
        } catch (error) {
            console.error("Error creating tag:", error);
            toast.error("Failed to create tag due to connection error");
        } finally {
            setIsLoadingSuggestions(false);
            setTagInput('');
            setShowDropdown(false);
        }
    };

    const handleKeyDown = (e) => {
        const totalItems = suggestions.length + (tagInput.trim() ? 1 : 0);
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => Math.min(prev + 1, totalItems - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0) {
                if (activeIndex < suggestions.length) {
                    addTag(suggestions[activeIndex]);
                } else {
                    handleCreateNewTag(tagInput);
                }
            }
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    };

    const formatBytes = (b) => b === 0 ? '0 Bytes' : `${parseFloat((b / Math.pow(1024, Math.floor(Math.log(b) / Math.log(1024)))).toFixed(2))} ${['Bytes', 'KB', 'MB', 'GB'][Math.floor(Math.log(b) / Math.log(1024))]}`;

    const handleFile = (selectedFile) => {
        if (!selectedFile) return;
        const ext = selectedFile.name.split('.').pop().toLowerCase();
        if (!['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext))
            return toast.error("Unsupported file format!");
        if (selectedFile.size > 50 * 1024 * 1024)
            return toast.error("File exceeds 50MB limit!");

        setFile(selectedFile);

        if (!form.title) setForm({ ...form, title: selectedFile.name.replace(/\.[^/.]+$/, "") });
    };

    const handleDrag = (e) => {
        e.preventDefault(); e.stopPropagation();
        setUiState(prev => ({ ...prev, dragActive: e.type === "dragenter" || e.type === "dragover" }));
    };

    const handleDrop = (e) => {
        handleDrag(e);
        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    };

    // --- LOGIC UPLOAD CẬP NHẬT ĐÚNG CẤU TRÚC FORM-DATA ---
    const handleUploadSubmit = (e) => {
        e.preventDefault();
        if (!file || !form.title.trim()) return toast.error("Please select a file and enter a title.");
        setAgreeChecked(false);
        setShowTermsModal(true);
    };

    const confirmUpload = async () => {
        setShowTermsModal(false);
        setUiState({ ...uiState, step: 'uploading', progress: 0 });
        const interval = setInterval(() => setUiState(p => ({ ...p, progress: Math.min(p.progress + 15, 90) })), 400);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', form.title);
            formData.append('description', form.description);
            formData.append('visibility', form.isPublic ? 'public' : 'private');
            formData.append('tags', tags.map(t => t.id).join(','));

            const response = await fetch(`${API_BASE_URL}/api/v1/documents/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });

            clearInterval(interval);
            const result = await response.json();

            if (response.ok && result.success) {
                setUiState({ step: 'uploading', progress: 100, dragActive: false });

                const uploadedDoc = result.data;
                let docId = null;
                if (uploadedDoc) {
                    if (typeof uploadedDoc === 'string') {
                        docId = uploadedDoc;
                    } else if (uploadedDoc.id) {
                        docId = uploadedDoc.id;
                    } else if (uploadedDoc.documentId) {
                        docId = uploadedDoc.documentId;
                    } else if (uploadedDoc.document_id) {
                        docId = uploadedDoc.document_id;
                    }
                }

                // Chạy duyệt tự động ngay lập tức và hiển thị màn hình loading duyệt tự động
                if (docId) {
                    const docObj = {
                        id: docId,
                        title: form.title,
                        description: form.description,
                        fileType: file.name.split('.').pop()
                    };
                    setUiState({ step: 'moderating', progress: 100, dragActive: false });
                    setModerationState({ step: 'authenticating', message: 'Authenticating moderation agent...', score: 0, reason: '' });

                    setTimeout(() => {
                        runUserSideAutoModeration(docObj, (status) => {
                            setModerationState(status);
                            if (status.step === 'approved') {
                                toast.success("Document approved and published!");
                            } else if (status.step === 'rejected') {
                                toast.error("Document rejected by AI safety filter.");
                            } else if (status.step === 'pending') {
                                toast.warning("Document uploaded. Pending admin review.");
                            } else if (status.step === 'error') {
                                toast.error(`Moderation error: ${status.message}`);
                            }
                        });
                    }, 1000);
                } else {
                    setUiState({ step: 'success', progress: 100, dragActive: false });
                    toast.success("Uploaded successfully!");
                }
            } else {
                console.error("Upload failed details:", result);
                const errMsg = result.message || JSON.stringify(result) || "Upload failed";
                throw new Error(errMsg);
            }
        } catch (error) {
            clearInterval(interval);
            setUiState({ step: 'idle', progress: 0, dragActive: false });
            toast.error(error.message || "Upload error. Please try again.");
        }
    };

    return (
        <div className="container-fluid py-4 px-4 px-md-5 text-start upload-page-container">
            <style>{`
                .upload-page-container { background-color: var(--bg-global, #fafbfe); min-height: calc(100vh - 80px); font-family: 'Inter', system-ui, sans-serif; }
                .back-link { color: var(--text-muted, var(--muted-foreground)); font-size: 14px; transition: color 0.2s; }
                .back-link:hover { color: #FD8F52; }
                .upload-card { background: var(--bg-card-container, #ffffff); border: 1px solid var(--border-color, rgba(253, 143, 82, 0.15)); border-radius: 20px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05); transition: 0.3s; }
                .dropzone-container { border: 2px dashed var(--border-color, rgba(253, 143, 82, 0.3)); background-color: var(--bg-global, #FFF9F5); border-radius: 16px; padding: 40px 20px; text-align: center; cursor: pointer; min-height: 250px; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: 0.2s; }
                .dropzone-container.drag-active { border-color: #FD8F52; background-color: var(--bg-card-container, #FFEAD9); transform: scale(0.99); }
                .icon-upload-wrapper { width: 72px; height: 72px; background: linear-gradient(135deg, rgba(253, 143, 82, 0.15), rgba(255, 189, 113, 0.1)); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; color: #FD8F52; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
                .form-control-custom { background-color: var(--bg-global, #FFF9F5); color: var(--text-main, #000000); border: 1px solid var(--border-color, rgba(253, 143, 82, 0.2)); border-radius: 10px; padding: 12px 16px; font-size: 14px; transition: 0.2s; }
                .form-control-custom:focus { outline: none; border-color: #FD8F52; box-shadow: 0 0 0 3px rgba(253, 143, 82, 0.15); background-color: var(--bg-global, #fff); color: var(--text-main, #000000); }
                .tag-badge { background-color: var(--bg-global, #FFF5ED); color: #FD8F52; border: 1px solid var(--border-color, rgba(253, 143, 82, 0.25)); border-radius: 20px; padding: 6px 14px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; font-weight: 500; animation: tagFadeIn 0.2s ease-out; transition: all 0.2s; }
                .btn-close-tag { border: none; background: transparent; color: #FD8F52; cursor: pointer; padding: 0; display: flex; }
                .gradient-btn { background: linear-gradient(135deg, #C73866, #FD8F52); color: white; border: none; border-radius: 30px; padding: 12px 28px; font-weight: 600; transition: 0.2s; }
                .progress-bar-container { width: 100%; height: 8px; background-color: var(--bg-global, #eef1f6); border-radius: 4px; overflow: hidden; margin-top: 15px; }
                .progress-bar-fill { height: 100%; background: linear-gradient(90deg, #C73866, #FD8F52); transition: width 0.3s ease-out; }
                .tag-suggestions-list { position: absolute; width: 100%; background: var(--bg-card-container, #ffffff); border: 1px solid var(--border-color, rgba(253, 143, 82, 0.2)); border-radius: 12px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15); margin-top: 6px; padding: 6px 0; list-style: none; z-index: 1000; max-height: 200px; overflow-y: auto; }
                .tag-suggestion-item { padding: 10px 16px; font-size: 14px; color: var(--text-main, #4a5568); cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease; }
                .tag-suggestion-item.active, .tag-suggestion-item:hover { background-color: var(--bg-global, #FFF5ED); color: #FD8F52; }
                .tag-suggestion-empty, .tag-suggestion-loading { padding: 12px 16px; font-size: 13px; color: var(--text-muted, #a0aec0); text-align: center; }
                
                /* Terms Modal Styles */
                .terms-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(15, 23, 42, 0.45);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    animation: fadeIn 0.3s ease-out forwards;
                    padding: 16px;
                }
                .terms-modal-content {
                    background: var(--bg-card-container, #ffffff);
                    border: 1px solid var(--border-color, rgba(253, 143, 82, 0.2));
                    border-radius: 24px;
                    width: 100%;
                    max-width: 600px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    max-height: 90vh;
                }
                .terms-modal-header {
                    padding: 24px 24px 16px;
                    border-bottom: 1px solid rgba(253, 143, 82, 0.1);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .terms-modal-body {
                    padding: 24px;
                    overflow-y: auto;
                    font-size: 14px;
                    line-height: 1.6;
                    color: var(--text-main, #334155);
                }
                .terms-modal-footer {
                    padding: 16px 24px 24px;
                    border-top: 1px solid rgba(253, 143, 82, 0.1);
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    background-color: var(--bg-global, #fafbfe);
                }
                .terms-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .terms-item {
                    margin-bottom: 20px;
                    padding-bottom: 16px;
                    border-bottom: 1px dashed rgba(0, 0, 0, 0.05);
                }
                .terms-item:last-child {
                    margin-bottom: 0;
                    padding-bottom: 0;
                    border-bottom: none;
                }
                .terms-item-title {
                    font-weight: 700;
                    color: #0f172a;
                    margin-bottom: 6px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .terms-checkbox-label {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    cursor: pointer;
                    font-weight: 500;
                    color: #475569;
                    user-select: none;
                    background-color: var(--bg-global, #FFF9F5);
                    border: 1px solid var(--border-color, rgba(253, 143, 82, 0.15));
                    border-radius: 12px;
                    padding: 14px 16px;
                    transition: 0.2s;
                }
                .terms-checkbox-label:hover {
                    border-color: #FD8F52;
                    background-color: #FFF5ED;
                }
                .terms-checkbox-input {
                    margin-top: 4px;
                    width: 18px;
                    height: 18px;
                    accent-color: #FD8F52;
                    cursor: pointer;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <div className="mb-4">
                <Link to="/user/home" className="d-inline-flex align-items-center gap-2 text-decoration-none back-link fw-medium">
                    <ArrowLeft size={16} /> <span>Back to Homepage</span>
                </Link>
            </div>

            <div className="mb-4 d-flex align-items-center gap-3">
                <div className="p-2 rounded-3 bg-white shadow-sm border border-light" style={{ color: '#FD8F52' }}>
                    <BookOpen size={28} />
                </div>
                <div>
                    <h1 className="fw-bold text-dark mb-1" style={{ fontSize: '26px' }}>Upload Study Document</h1>
                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Share your study materials, lecture notes, or textbooks.</p>
                </div>
            </div>

            {uiState.step === 'success' ? (
                <div className="row justify-content-center">
                    <div className="col-lg-6 card upload-card p-5 text-center shadow-sm">
                        <div className="d-flex justify-content-center mb-4">
                            <div className="rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: '84px', height: '84px', background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)' }}>
                                <CheckCircle2 size={44} />
                            </div>
                        </div>
                        <h2 className="fw-bold text-dark mb-2">Upload Completed!</h2>
                        <p className="text-muted mb-4">Your document <strong>"{form.title}"</strong> has been successfully uploaded.</p>

                        <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center mt-3">
                            <button onClick={() => navigate('/my-documents')} className="btn gradient-btn px-4">Go to My Documents</button>
                            <button onClick={() => { setFile(null); setUiState({ step: 'idle', progress: 0, dragActive: false }); setForm({ title: '', description: '', isPublic: true }); setTags([]); }} className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold">Upload Another</button>
                        </div>
                    </div>
                </div>
            ) : uiState.step === 'moderating' ? (
                <div className="row justify-content-center">
                    <div className="col-lg-7 card upload-card p-5 text-center shadow-sm" style={{ minHeight: '400px' }}>
                        {['approved', 'rejected', 'pending', 'error'].includes(moderationState.step) ? (
                            moderationState.step === 'approved' ? (
                                <div>
                                    <div className="d-flex justify-content-center mb-4">
                                        <div className="rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: '84px', height: '84px', background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)' }}>
                                            <CheckCircle2 size={44} />
                                        </div>
                                    </div>
                                    <h2 className="fw-bold text-dark mb-2">Auto-Approved & Published!</h2>
                                    <p className="text-muted px-md-5 mb-4" style={{ fontSize: '15px' }}>
                                        Your document <strong>"{form.title}"</strong> has been successfully verified, approved, and published!
                                    </p>
                                    <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center mt-4">
                                        <button onClick={() => navigate('/my-documents')} className="btn gradient-btn px-4">Go to My Documents</button>
                                        <button onClick={() => { setFile(null); setUiState({ step: 'idle', progress: 0, dragActive: false }); setForm({ title: '', description: '', isPublic: true }); setTags([]); }} className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold">Upload Another</button>
                                    </div>
                                </div>
                            ) : moderationState.step === 'rejected' ? (
                                <div>
                                    <div className="d-flex justify-content-center mb-4">
                                        <div className="rounded-circle d-flex align-items-center justify-content-center text-white bg-danger" style={{ width: '84px', height: '84px', boxShadow: '0 8px 24px rgba(220, 38, 38, 0.3)' }}>
                                            <XCircle size={44} />
                                        </div>
                                    </div>
                                    <h2 className="fw-bold text-danger mb-2">Document Rejected by AI</h2>
                                    <p className="text-muted px-md-5 mb-2" style={{ fontSize: '15px' }}>
                                        Your document <strong>"{form.title}"</strong> did not pass the automatic content safety moderation scan.
                                    </p>
                                    <p className="text-muted px-md-5 mb-4 small bg-light p-3 rounded-3 text-start">
                                        <strong>Reason:</strong> {moderationState.reason || 'Failed content safety policy.'}
                                    </p>
                                    <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center mt-4">
                                        <button onClick={() => navigate('/my-documents')} className="btn gradient-btn px-4">Go to My Documents</button>
                                        <button onClick={() => { setFile(null); setUiState({ step: 'idle', progress: 0, dragActive: false }); setForm({ title: '', description: '', isPublic: true }); setTags([]); }} className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold">Upload Another</button>
                                    </div>
                                </div>
                            ) : moderationState.step === 'pending' ? (
                                <div>
                                    <div className="d-flex justify-content-center mb-4">
                                        <div className="rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: '84px', height: '84px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)' }}>
                                            <Clock size={44} />
                                        </div>
                                    </div>
                                    <h2 className="fw-bold text-dark mb-2">Uploaded & Pending Review</h2>
                                    <p className="text-muted px-md-5 mb-4" style={{ fontSize: '15px' }}>
                                        Your document <strong>"{form.title}"</strong> has been uploaded successfully. It is currently pending review by an admin.
                                    </p>
                                    <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center mt-4">
                                        <button onClick={() => navigate('/my-documents')} className="btn gradient-btn px-4">Go to My Documents</button>
                                        <button onClick={() => { setFile(null); setUiState({ step: 'idle', progress: 0, dragActive: false }); setForm({ title: '', description: '', isPublic: true }); setTags([]); }} className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold">Upload Another</button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="d-flex justify-content-center mb-4">
                                        <div className="rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: '84px', height: '84px', background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3)' }}>
                                            <AlertCircle size={44} />
                                        </div>
                                    </div>
                                    <h2 className="fw-bold text-danger mb-2">Moderation Scan Error</h2>
                                    <p className="text-muted px-md-5 mb-4" style={{ fontSize: '15px' }}>
                                        An error occurred during AI moderation scan: <strong className="text-danger">{moderationState.message}</strong>. Your document has been uploaded but is pending standard moderation.
                                    </p>
                                    <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center mt-4">
                                        <button onClick={() => navigate('/my-documents')} className="btn gradient-btn px-4">Go to My Documents</button>
                                        <button onClick={() => { setFile(null); setUiState({ step: 'idle', progress: 0, dragActive: false }); setForm({ title: '', description: '', isPublic: true }); setTags([]); }} className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold">Upload Another</button>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div>
                                <div className="spinner-border text-warning mx-auto mb-4" style={{ width: '4rem', height: '4rem', color: '#FD8F52' }} role="status" />
                                <h3 className="fw-bold text-dark mb-2">AI Content Moderation Scan</h3>
                                <div className="px-md-4 mt-3">
                                    <p className="text-muted mb-2" style={{ fontSize: '15px' }}>
                                        AI is scanning document content for safety compliance. Please wait... ({getModerationProgress()}%)
                                    </p>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar-fill" style={{ width: `${getModerationProgress()}%`, transition: 'width 0.4s ease-out' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : uiState.step === 'uploading' ? (
                <div className="row justify-content-center">
                    <div className="col-lg-6 card upload-card p-5 text-center shadow-sm">
                        <div className="spinner-border text-primary mx-auto mb-4" style={{ width: '4rem', height: '4rem' }} role="status" />
                        <h3 className="fw-bold text-dark mb-2">Uploading Document</h3>
                        <div className="px-md-4">
                            <p className="text-muted mb-2">Uploading file to server ({uiState.progress}%)</p>
                            <div className="progress-bar-container"><div className="progress-bar-fill" style={{ width: `${uiState.progress}%` }}></div></div>
                        </div>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleUploadSubmit}>
                    <div className="row g-4">
                        <div className="col-lg-5">
                            <div className="card upload-card p-4 h-100 d-flex flex-column">
                                <h5 className="fw-bold text-dark mb-3">1. Select Study File</h5>
                                <input type="file" ref={fileInputRef} onChange={(e) => handleFile(e.target.files[0])} className="d-none" accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx" />

                                {!file ? (
                                    <div className={`dropzone-container flex-grow-1 ${uiState.dragActive ? 'drag-active' : ''}`} onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current.click()}>
                                        <div className="icon-upload-wrapper"><Upload size={32} /></div>
                                        <h6 className="fw-bold text-dark mb-1">Drag & drop document here</h6>
                                        <p className="text-muted mb-3 small">or click to browse your local files</p>
                                        <div className="border-top pt-3 w-100 mt-2"><span className="d-block text-muted small">Max file size: 50MB</span></div>
                                    </div>
                                ) : (
                                    <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center p-4 border rounded-3 text-center position-relative bg-light">
                                        <button type="button" onClick={() => setFile(null)} className="btn position-absolute top-0 end-0 m-2 text-muted border-0 bg-transparent"><X size={20} /></button>
                                        <div className="p-3 bg-white rounded-circle shadow-sm text-primary mb-3"><FileText size={40} /></div>
                                        <h6 className="fw-bold text-dark mb-1">{file.name}</h6>
                                        <span className="badge bg-secondary mb-3">{formatBytes(file.size)}</span>
                                        <button type="button" onClick={() => fileInputRef.current.click()} className="btn btn-sm btn-outline-primary rounded-pill px-3">Change File</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-lg-7">
                            <div className="card upload-card p-4">
                                <h5 className="fw-bold text-dark mb-4">2. Document Information</h5>

                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold" style={{ fontSize: '14px' }}>Document Title <span className="text-danger">*</span></label>
                                    <input type="text" className="form-control form-control-custom" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="Enter title..." />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold" style={{ fontSize: '14px' }}>Access</label>
                                    <div className="d-flex gap-2">
                                        <button type="button" className={`btn btn-sm flex-fill py-2 text-start d-flex align-items-center gap-2 border ${form.isPublic ? 'btn-light border-primary' : 'btn-light'}`} onClick={() => setForm({ ...form, isPublic: true })} style={{ border: form.isPublic ? '1px solid #FD8F52' : '1px solid rgba(0,0,0,0.1)' }}>
                                            <Eye size={16} className={form.isPublic ? 'text-primary' : 'text-muted'} /> <span className="fw-bold" style={{ fontSize: '12px' }}>Public</span>
                                        </button>
                                        <button type="button" className={`btn btn-sm flex-fill py-2 text-start d-flex align-items-center gap-2 border ${!form.isPublic ? 'btn-light border-primary' : 'btn-light'}`} onClick={() => setForm({ ...form, isPublic: false })} style={{ border: !form.isPublic ? '1px solid #FD8F52' : '1px solid rgba(0,0,0,0.1)' }}>
                                            <Lock size={16} className={!form.isPublic ? 'text-primary' : 'text-muted'} /> <span className="fw-bold" style={{ fontSize: '12px' }}>Private</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold" style={{ fontSize: '14px' }}>Description</label>
                                    <textarea className="form-control form-control-custom" rows="2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief summary..."></textarea>
                                </div>

                                <div className="mb-4 position-relative" ref={dropdownRef}>
                                    <label className="form-label text-dark fw-bold d-flex align-items-center gap-1" style={{ fontSize: '14px' }}><Tags size={16} /><span>Tags</span></label>
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            className="form-control form-control-custom"
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            onFocus={() => {
                                                if (tagInput.trim()) setShowDropdown(true);
                                            }}
                                            placeholder="Type to search or create tags..."
                                        />
                                        {isLoadingSuggestions && (
                                            <div className="position-absolute end-0 top-50 translate-middle-y pe-3">
                                                <div className="spinner-border spinner-border-sm text-primary" style={{ width: '1rem', height: '1rem', color: '#FD8F52' }} role="status" />
                                            </div>
                                        )}
                                    </div>
                                    {showDropdown && (
                                        <ul className="tag-suggestions-list">
                                            {suggestions.map((tag, i) => (
                                                <li
                                                    key={tag.id}
                                                    className={`tag-suggestion-item ${i === activeIndex ? 'active' : ''}`}
                                                    onClick={() => addTag(tag)}
                                                >
                                                    <Tag size={14} className="opacity-75" />
                                                    <span>{tag.label}</span>
                                                </li>
                                            ))}
                                            {tagInput.trim() && !suggestions.some(s => s.label.toLowerCase() === tagInput.trim().toLowerCase()) && (
                                                <li
                                                    className={`tag-suggestion-item text-primary fw-medium ${activeIndex === suggestions.length ? 'active' : ''}`}
                                                    onClick={() => handleCreateNewTag(tagInput)}
                                                    style={{ borderTop: '1px solid rgba(253, 143, 82, 0.1)' }}
                                                >
                                                    <Plus size={14} />
                                                    <span>Create tag: "{tagInput.trim()}"</span>
                                                </li>
                                            )}
                                            {suggestions.length === 0 && !tagInput.trim() && (
                                                <li className="tag-suggestion-empty">Type to search tags...</li>
                                            )}
                                        </ul>
                                    )}
                                    <div className="d-flex flex-wrap gap-2 pt-2">
                                        {tags.map(tag => (
                                            <span key={tag.id} className="tag-badge">{tag.label} <button type="button" onClick={() => setTags(tags.filter(t => t.id !== tag.id))} className="btn-close-tag"><X size={12} /></button></span>
                                        ))}
                                    </div>
                                </div>

                                <div className="d-flex align-items-center justify-content-between border-top pt-3 mt-4">
                                    <span className="text-muted small">Make sure all details are correct.</span>
                                    <button type="submit" disabled={!file} className="btn gradient-btn px-4 d-flex align-items-center gap-2"><span>Upload Document</span> <ChevronRight size={18} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            )}

            {/* Terms and Disclaimer Modal */}
            {showTermsModal && (
                <div className="terms-modal-overlay" onClick={() => setShowTermsModal(false)}>
                    <div className="terms-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="terms-modal-header bg-light">
                            <div className="p-2 rounded bg-white shadow-sm border border-light" style={{ color: '#C73866' }}>
                                <ShieldCheck size={24} />
                            </div>
                            <div className="text-start">
                                <h5 className="fw-bold text-dark mb-0">Document Upload Terms & Agreement</h5>
                                <p className="text-muted mb-0 small">Please read and confirm the terms before uploading.</p>
                            </div>
                            <button type="button" onClick={() => setShowTermsModal(false)} className="btn btn-link ms-auto text-muted p-0 border-0"><X size={20} /></button>
                        </div>
                        <div className="terms-modal-body text-start">
                            <ul className="terms-list">
                                {form.isPublic ? (
                                    <li className="terms-item">
                                        <div className="terms-item-title text-danger">
                                            <AlertTriangle size={16} /> Document Usage Rights (Public)
                                        </div>
                                        <p className="text-muted mb-0">
                                            When you share a document as <strong>Public</strong>, it will be visible to all users on the platform. You agree that any member can view, download, study, and use this document freely <strong>without copyright restrictions</strong> or licensing fees.
                                        </p>
                                    </li>
                                ) : (
                                    <li className="terms-item">
                                        <div className="terms-item-title text-success">
                                            <ShieldCheck size={16} /> Content Security (Private)
                                        </div>
                                        <p className="text-muted mb-0">
                                            For documents uploaded in <strong>Private</strong> mode, the system guarantees absolute security and storage for your account only. No other users will have access to view or download this file.
                                        </p>
                                    </li>
                                )}
                                <li className="terms-item">
                                    <div className="terms-item-title text-dark">
                                        <ShieldCheck size={16} className="text-primary" /> Content Responsibility
                                    </div>
                                    <p className="text-muted mb-0">
                                        You confirm that this document is created by you or you have the full legal right to share it. You assume full legal responsibility in case of copyright disputes or content violating laws.
                                    </p>
                                </li>
                                <li className="terms-item">
                                    <div className="terms-item-title text-dark">
                                        <ShieldCheck size={16} className="text-info" /> Content Moderation (AI Auto-Moderation)
                                    </div>
                                    <p className="text-muted mb-0">
                                        Your document will be automatically scanned by our AI content moderator to ensure compliance with community standards (no malware, violence, or sensitive/inappropriate content).
                                    </p>
                                </li>
                            </ul>

                            <div className="mt-4">
                                <label className="terms-checkbox-label w-100">
                                    <input
                                        type="checkbox"
                                        className="terms-checkbox-input"
                                        checked={agreeChecked}
                                        onChange={(e) => setAgreeChecked(e.target.checked)}
                                    />
                                    <span style={{ fontSize: '13px' }}>I have read and agree to all terms regarding security, privacy, and free copyright usage for public documents as stated above.</span>
                                </label>
                            </div>
                        </div>
                        <div className="terms-modal-footer">
                            <button type="button" onClick={() => setShowTermsModal(false)} className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold">Cancel</button>
                            <button
                                type="button"
                                onClick={confirmUpload}
                                disabled={!agreeChecked}
                                className="btn gradient-btn px-4 py-2"
                                style={{ opacity: agreeChecked ? 1 : 0.65 }}
                            >
                                Confirm & Upload
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

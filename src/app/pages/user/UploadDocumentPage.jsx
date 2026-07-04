import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Upload, FileText, X, CheckCircle2, ArrowLeft, Eye, Lock, Plus, BookOpen, Tags, Tag, ChevronRight } from 'lucide-react';
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

const parseJwt = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

const runUserSideAutoModeration = async (doc) => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    const token = localStorage.getItem('token');
    if (!token) {
        console.error("Moderation: Không tìm thấy User Token!");
        return;
    }

    console.log(`Moderation: Bắt đầu quét tài liệu "${doc.title || 'Mới'}"...`);

    try {
        // Đăng nhập Admin ngầm để lấy Token Admin có quyền duyệt
        let adminToken = null;
        console.log("Moderation: Đang xác thực tài khoản Admin...");
        try {
            const adminLoginRes = await fetch('http://14.225.254.145:8080/api/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'lkc12052006@gmail.com', password: 'Cuong12345.' }),
            });
            const adminResult = await adminLoginRes.json();
            if (adminLoginRes.ok && adminResult.success) {
                adminToken = adminResult.data?.accessToken || adminResult.data?.token || adminResult.token;
                console.log("Moderation: Đăng nhập Admin thành công!");
            } else {
                console.error(`Moderation: Đăng nhập Admin thất bại! ${adminResult.message || ''}`);
            }
        } catch (e) {
            console.error(`Moderation: Lỗi xác thực Admin: ${e.message}`);
        }

        const authHeaderToken = adminToken || token;

        // 1. Fetch document preview url to get fileUrl and fileType (thử lại 3 lần phòng trường hợp BE đang upload dở)
        let fileUrl = null;
        let fileType = '';
        let retries = 3;

        while (retries > 0) {
            console.log(`Moderation: Đang lấy link tải và xem trước (Lần thử ${4 - retries}/3)...`);
            try {
                const previewRes = await fetch(`http://14.225.254.145:8080/api/v1/documents/${doc.id}/preview`, {
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
                console.warn("Moderation: Tệp chưa upload xong, đang đợi 2 giây để thử lại...");
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log(`Moderation: Định dạng file: ${fileType}`);
        if (!fileUrl) {
            console.error("Moderation: Không có link presigned_url sau 3 lần thử!");
            return;
        }

        // 2. Extract text from url
        let text = '';
        let isExtractionSuccessful = false;
        console.log("Moderation: Đang trích xuất nội dung văn bản...");

        try {
            if (fileType.includes('txt')) {
                const response = await downloadFileWithFallback(fileUrl);
                text = await response.text();
                isExtractionSuccessful = true;
                console.log(`Moderation: Đọc thành công ${text.length} ký tự TXT`);
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
                console.log(`Moderation: Đọc thành công ${text.length} ký tự PDF`);
            } else if (fileType.includes('docx')) {
                text = await extractTextFromDocx(fileUrl);
                isExtractionSuccessful = true;
                console.log(`Moderation: Đọc thành công ${text.length} ký tự DOCX`);
            } else {
                console.warn(`Moderation: Không hỗ trợ đọc nội dung file ${fileType}. Chỉ quét tiêu đề.`);
            }
        } catch (fetchErr) {
            console.error(`Moderation: Lỗi đọc file: ${fetchErr.message}`);
        }

        // 3. Evaluate content using OpenAI AI
        let safetyScore = 50;
        let finalReason = '';

        console.log("Moderation: Đang gọi OpenAI phân tích nội dung...");
        if (isExtractionSuccessful && text.trim()) {
            const chunks = chunkText(text);
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
            const metaText = `Title: ${doc.title}\nDescription: ${doc.description}`;
            const res = await evaluateChunk(metaText, apiKey);
            if (res && typeof res.score === 'number') {
                safetyScore = Math.min(50, res.score); // Giới hạn tối đa 50% cho quét metadata
                finalReason = (res.reason || 'Metadata scanned') + " (Metadata fallback)";
            }
        }

        console.log(`Moderation: Điểm an toàn: ${safetyScore}%. Lý do: ${finalReason}`);

        // 4. Update scan states in localStorage
        try {
            const saved = localStorage.getItem('ai_scan_states') || '{}';
            const parsed = JSON.parse(saved);
            parsed[doc.id] = { status: 'done', score: safetyScore, reason: finalReason };
            localStorage.setItem('ai_scan_states', JSON.stringify(parsed));
        } catch (e) { }

        // 5. Send Approve / Reject request to backend (Admin endpoints) using the Admin Token
        if (safetyScore >= 80) {
            console.log("Moderation: Gửi yêu cầu tự động Duyệt lên máy chủ...");
            const approveRes = await fetch(`http://14.225.254.145:8080/api/v1/admin/documents/${doc.id}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authHeaderToken}`
                }
            });
            if (approveRes.ok) {
                console.log("Moderation: Tài liệu đã được duyệt thành công!");
            } else {
                const errResult = await approveRes.json().catch(() => ({}));
                console.error(`Moderation: Máy chủ từ chối lệnh Duyệt (${approveRes.status}): ${errResult.message || ''}`);
            }
        } else if (safetyScore <= 20) {
            console.log("Moderation: Gửi yêu cầu tự động Từ chối lên máy chủ...");
            const rejectRes = await fetch(`http://14.225.254.145:8080/api/v1/admin/documents/${doc.id}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authHeaderToken}`
                },
                body: JSON.stringify({ rejectionReason: `Auto-rejected by AI (Score: ${safetyScore}%. Reason: ${finalReason})` })
            });
            if (rejectRes.ok) {
                console.log("Moderation: Tài liệu đã bị từ chối tự động!");
            } else {
                const errResult = await rejectRes.json().catch(() => ({}));
                console.error(`Moderation: Máy chủ từ chối lệnh Từ chối (${rejectRes.status}): ${errResult.message || ''}`);
            }
        }

    } catch (error) {
        console.error(`Moderation: Có lỗi xảy ra: ${error.message}`);
    }
};

const runUserSideAutoModerationFallback = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        console.log("Moderation Fallback: Đang lấy thông tin User profile...");
        // Gọi API profile để lấy ID chính xác của User
        const profileRes = await fetch('http://14.225.254.145:8080/api/v1/users/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!profileRes.ok) {
            console.error(`Moderation Fallback: Lấy profile thất bại. Status: ${profileRes.status}`);
            return;
        }
        const profileResult = await profileRes.json();
        const userId = profileResult?.data?.id || profileResult?.data?.userId;
        if (!userId) {
            console.error("Moderation Fallback: Không tìm thấy User ID trong profile");
            return;
        }

        console.log("Moderation Fallback: Đang quét danh sách tài liệu cá nhân...");
        const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/personal?authorId=${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result && result.success && Array.isArray(result.data) && result.data.length > 0) {
            const pendingDocs = result.data.filter(d => (d.status || '').toLowerCase() === 'pending');
            if (pendingDocs.length > 0) {
                pendingDocs.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
                const latestDoc = pendingDocs[0];
                console.log(`Moderation Fallback: Tìm thấy tài liệu mới nhất "${latestDoc.title}" (ID: ${latestDoc.id})`);
                runUserSideAutoModeration(latestDoc);
            }
        }
    } catch (e) {
        console.error("Fallback auto-moderation search failed:", e);
    }
};

export default function UploadDocumentPage() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // 1. Gộp Form State (Đã loại bỏ subject)
    const [form, setForm] = useState({ title: '', description: '', isPublic: true });
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');

    // States cho gợi ý tag (Autocomplete) & tạo mới tag
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const dropdownRef = useRef(null);

    // 2. Upload States
    const [file, setFile] = useState(null);
    const [uiState, setUiState] = useState({ step: 'idle', progress: 0, dragActive: false });

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
                const response = await fetch(`http://14.225.254.145:8080/api/v1/tags/search?keyword=${encodeURIComponent(tagInput.trim())}`, {
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
            const response = await fetch('http://14.225.254.145:8080/api/v1/tags', {
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
    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!file || !form.title.trim()) return toast.error("Please select a file and enter a title.");

        setUiState({ ...uiState, step: 'uploading', progress: 0 });
        const interval = setInterval(() => setUiState(p => ({ ...p, progress: Math.min(p.progress + 15, 90) })), 400);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', form.title);
            formData.append('description', form.description);
            formData.append('visibility', form.isPublic ? 'public' : 'private');
            formData.append('tags', tags.map(t => t.id).join(','));

            const response = await fetch('http://14.225.254.145:8080/api/v1/documents/upload', {
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

                // Chạy duyệt tự động trong nền sau 1.5 giây để đảm bảo Backend đã lưu tệp thành công
                setTimeout(() => {
                    if (docId) {
                        const docObj = {
                            id: docId,
                            title: form.title,
                            description: form.description,
                            fileType: file.name.split('.').pop()
                        };
                        runUserSideAutoModeration(docObj);
                    } else {
                        runUserSideAutoModerationFallback();
                    }
                }, 1500);

                setTimeout(() => { setUiState(p => ({ ...p, step: 'success' })); toast.success("Uploaded successfully!"); }, 500);
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
                .upload-page-container { background-color: #fafbfe; min-height: calc(100vh - 80px); font-family: 'Inter', system-ui, sans-serif; }
                .back-link { color: var(--muted-foreground); font-size: 14px; transition: color 0.2s; }
                .back-link:hover { color: var(--primary); }
                .upload-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.15); border-radius: 20px; box-shadow: 0 10px 30px rgba(253, 143, 82, 0.04); transition: 0.3s; }
                .dropzone-container { border: 2px dashed rgba(253, 143, 82, 0.3); background-color: #FFF9F5; border-radius: 16px; padding: 40px 20px; text-align: center; cursor: pointer; min-height: 250px; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: 0.2s; }
                .dropzone-container.drag-active { border-color: #FD8F52; background-color: #FFEAD9; transform: scale(0.99); }
                .icon-upload-wrapper { width: 72px; height: 72px; background: linear-gradient(135deg, #FFEAD9, #FFF5ED); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; color: #FD8F52; box-shadow: 0 4px 10px rgba(253, 143, 82, 0.1); }
                .form-control-custom { background-color: #FFF9F5; border: 1px solid rgba(253, 143, 82, 0.2); border-radius: 10px; padding: 12px 16px; font-size: 14px; transition: 0.2s; }
                .form-control-custom:focus { outline: none; border-color: #FD8F52; box-shadow: 0 0 0 3px rgba(253, 143, 82, 0.15); background-color: #fff; }
                .tag-badge { background-color: #FFF5ED; color: #FD8F52; border: 1px solid rgba(253, 143, 82, 0.25); border-radius: 20px; padding: 6px 14px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; font-weight: 500; animation: tagFadeIn 0.2s ease-out; transition: all 0.2s; }
                .btn-close-tag { border: none; background: transparent; color: #FD8F52; cursor: pointer; padding: 0; display: flex; }
                .gradient-btn { background: linear-gradient(135deg, #C73866, #FD8F52); color: white; border: none; border-radius: 30px; padding: 12px 28px; font-weight: 600; transition: 0.2s; }
                .progress-bar-container { width: 100%; height: 8px; background-color: #eef1f6; border-radius: 4px; overflow: hidden; margin-top: 15px; }
                .progress-bar-fill { height: 100%; background: linear-gradient(90deg, #C73866, #FD8F52); transition: width 0.3s ease-out; }
                .tag-suggestions-list { position: absolute; width: 100%; background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.2); border-radius: 12px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08); margin-top: 6px; padding: 6px 0; list-style: none; z-index: 1000; max-height: 200px; overflow-y: auto; }
                .tag-suggestion-item { padding: 10px 16px; font-size: 14px; color: #4a5568; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease; }
                .tag-suggestion-item.active, .tag-suggestion-item:hover { background-color: #FFF5ED; color: #FD8F52; }
                .tag-suggestion-empty, .tag-suggestion-loading { padding: 12px 16px; font-size: 13px; color: #a0aec0; text-align: center; }
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
                                        <button type="button" className={`btn btn-sm flex-fill py-2 text-start d-flex align-items-center gap-2 border ${form.isPublic ? 'btn-light border-primary' : 'btn-light'}`} onClick={() => setForm({ ...form, isPublic: true })} style={{ border: form.isPublic ? '1px solid #FD8F52 !important' : '1px solid rgba(0,0,0,0.1)' }}>
                                            <Eye size={16} className={form.isPublic ? 'text-primary' : 'text-muted'} /> <span className="fw-bold" style={{ fontSize: '12px' }}>Public</span>
                                        </button>
                                        <button type="button" className={`btn btn-sm flex-fill py-2 text-start d-flex align-items-center gap-2 border ${!form.isPublic ? 'btn-light border-primary' : 'btn-light'}`} onClick={() => setForm({ ...form, isPublic: false })} style={{ border: !form.isPublic ? '1px solid #FD8F52 !important' : '1px solid rgba(0,0,0,0.1)' }}>
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
        </div>
    );
}

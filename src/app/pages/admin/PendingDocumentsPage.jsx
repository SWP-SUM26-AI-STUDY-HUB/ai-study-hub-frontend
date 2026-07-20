import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import {
    Clock, CheckCircle2, XCircle, AlertCircle, Search, ArrowLeft,
    User, Calendar, Filter, FileText, Loader2
} from 'lucide-react';
import { Modal, Form } from 'react-bootstrap';
import { API_BASE_URL } from '../../api.js';
import { toast } from 'sonner';

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

const isMarkdownFile = (fileType, presignedUrl, title) => {
    const type = (fileType || '').toLowerCase();
    const urlClean = (presignedUrl || '').toLowerCase().split('?')[0];
    const titleClean = (title || '').toLowerCase();

    return (
        type.includes('md') ||
        type.includes('markdown') ||
        urlClean.endsWith('.md') ||
        urlClean.endsWith('.markdown') ||
        titleClean.endsWith('.md') ||
        titleClean.endsWith('.markdown')
    );
};

const isTextOrMarkdownFile = (fileType, presignedUrl, title) => {
    const type = (fileType || '').toLowerCase();
    const urlClean = (presignedUrl || '').toLowerCase().split('?')[0];
    const titleClean = (title || '').toLowerCase();

    return (
        isMarkdownFile(fileType, presignedUrl, title) ||
        type.includes('txt') ||
        type.includes('text') ||
        urlClean.endsWith('.txt') ||
        titleClean.endsWith('.txt')
    );
};

const decodeUtf8Text = (buffer) => {
    try {
        const decoder = new TextDecoder('utf-8', { fatal: false });
        let text = decoder.decode(buffer);
        if (text.charCodeAt(0) === 0xFEFF) {
            text = text.slice(1);
        }
        return text;
    } catch (e) {
        const fallback = new TextDecoder('windows-1258', { fatal: false });
        return fallback.decode(buffer);
    }
};

function parseInlineMarkdown(text) {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*|__.*?__|`.*?`|\*.*?\*|_.*?_)/g);
    return parts.map((part, i) => {
        if (!part) return null;
        if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
            return <strong key={i} style={{ fontWeight: '600', color: '#2d3748' }}>{part.slice(2, -2)}</strong>;
        }
        if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
            return <em key={i}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} style={{ backgroundColor: 'rgba(253, 143, 82, 0.1)', color: '#C73866', padding: '0.15rem 0.35rem', borderRadius: '0.25rem', fontSize: '13px', fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
        }
        return part;
    });
}

function renderFormattedContent(text, isMarkdown = false) {
    if (!text) return null;

    if (!isMarkdown) {
        return (
            <div style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: "'Outfit', 'Inter', system-ui, -apple-system, sans-serif",
                fontSize: '15px',
                lineHeight: '1.8',
                color: '#2d3748'
            }}>
                {text}
            </div>
        );
    }

    const lines = text.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeBuffer = [];

    lines.forEach((line, index) => {
        if (line.trim().startsWith('```')) {
            if (inCodeBlock) {
                elements.push(
                    <pre key={`code-${index}`} style={{
                        backgroundColor: '#1e293b',
                        color: '#f8fafc',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        overflowX: 'auto',
                        fontSize: '13.5px',
                        fontFamily: 'monospace',
                        margin: '1rem 0'
                    }}>
                        <code>{codeBuffer.join('\n')}</code>
                    </pre>
                );
                codeBuffer = [];
                inCodeBlock = false;
            } else {
                inCodeBlock = true;
            }
            return;
        }

        if (inCodeBlock) {
            codeBuffer.push(line);
            return;
        }

        const trimmed = line.trim();

        if (trimmed.startsWith('# ')) {
            elements.push(<h1 key={index} className="fw-bold mb-3 mt-4" style={{ color: '#1a202c', fontSize: '1.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem' }}>{parseInlineMarkdown(trimmed.slice(2))}</h1>);
        } else if (trimmed.startsWith('## ')) {
            elements.push(<h2 key={index} className="fw-bold mb-2 mt-3" style={{ color: '#1a202c', fontSize: '1.4rem' }}>{parseInlineMarkdown(trimmed.slice(3))}</h2>);
        } else if (trimmed.startsWith('### ')) {
            elements.push(<h3 key={index} className="fw-semibold mb-2 mt-3" style={{ color: '#1a202c', fontSize: '1.2rem' }}>{parseInlineMarkdown(trimmed.slice(4))}</h3>);
        } else if (trimmed.startsWith('#### ')) {
            elements.push(<h4 key={index} className="fw-semibold mb-2 mt-2" style={{ color: '#1a202c', fontSize: '1.05rem' }}>{parseInlineMarkdown(trimmed.slice(5))}</h4>);
        } else if (trimmed.startsWith('> ')) {
            elements.push(
                <blockquote key={index} style={{
                    borderLeft: '4px solid #FD8F52',
                    paddingLeft: '1rem',
                    margin: '0.75rem 0',
                    color: '#64748b',
                    fontStyle: 'italic'
                }}>
                    {parseInlineMarkdown(trimmed.slice(2))}
                </blockquote>
            );
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            elements.push(
                <li key={index} style={{ marginLeft: '1.5rem', marginBottom: '0.25rem', color: '#2d3748' }}>
                    {parseInlineMarkdown(trimmed.slice(2))}
                </li>
            );
        } else if (/^\d+\.\s/.test(trimmed)) {
            const content = trimmed.replace(/^\d+\.\s/, '');
            elements.push(
                <li key={index} style={{ marginLeft: '1.5rem', listStyleType: 'decimal', marginBottom: '0.25rem', color: '#2d3748' }}>
                    {parseInlineMarkdown(content)}
                </li>
            );
        } else if (trimmed === '---' || trimmed === '***') {
            elements.push(<hr key={index} style={{ margin: '1.5rem 0', borderColor: '#e2e8f0' }} />);
        } else if (trimmed === '') {
            elements.push(<div key={index} style={{ height: '0.5rem' }} />);
        } else {
            elements.push(
                <p key={index} className="mb-2" style={{ lineHeight: '1.7', color: '#2d3748', fontSize: '14.5px' }}>
                    {parseInlineMarkdown(line)}
                </p>
            );
        }
    });

    return (
        <div style={{ fontFamily: "'Outfit', 'Inter', system-ui, -apple-system, sans-serif" }}>
            {elements}
        </div>
    );
}

export default function PendingDocumentsPage() {
    const navigate = useNavigate();

    // 1. Quản lý Dữ liệu
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ approved: 0, rejected: 0 });

    // 2. Quản lý Tìm kiếm & Lọc
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('all');



    // 3. Quản lý Modal Hành động (Xem trước, Từ chối)
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('Low document quality / Unreadable scan');
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewFileType, setPreviewFileType] = useState('');
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [textContent, setTextContent] = useState('');
    const [isLoadingText, setIsLoadingText] = useState(false);

    useEffect(() => {
        const isTextDoc = isTextOrMarkdownFile(previewFileType || selectedDoc?.fileType, previewUrl, selectedDoc?.title);
        if (previewUrl && isTextDoc) {
            setIsLoadingText(true);
            fetch(previewUrl)
                .then(res => {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.arrayBuffer();
                })
                .then(buffer => {
                    const text = decodeUtf8Text(buffer);
                    setTextContent(text);
                    setIsLoadingText(false);
                })
                .catch(() => {
                    const proxyUrl = previewUrl.replace(/https:\/\/[^/]+\.amazonaws\.com/, '/s3-proxy');
                    fetch(proxyUrl)
                        .then(r => {
                            if (!r.ok) throw new Error('Proxy HTTP ' + r.status);
                            return r.arrayBuffer();
                        })
                        .then(buf => {
                            const t = decodeUtf8Text(buf);
                            setTextContent(t);
                        })
                        .catch(() => setTextContent('Failed to load text content.'))
                        .finally(() => setIsLoadingText(false));
                });
        } else {
            setTextContent('');
        }
    }, [previewUrl, previewFileType, selectedDoc]);

    const handleOpenPreview = async (doc) => {
        setSelectedDoc(doc);
        setShowPreviewModal(true);
        setPreviewUrl('');
        setPreviewFileType('');
        setTextContent('');
        setIsPreviewLoading(true);

        const token = localStorage.getItem('token');
        if (!token) {
            setIsPreviewLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/${doc.id}/preview`, {
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

            // =========================================================================
            // HÀM TẢI DANH SÁCH TÀI LIỆU CHỜ DUYỆT (GET /api/v1/admin/documents/pending)
            // - Hoạt động: Gửi request GET tới endpoint dành riêng cho Admin để lấy các tài liệu có trạng thái PENDING.
            // - Mục đích: Hiển thị danh sách tài liệu tải lên công khai đang chờ kiểm duyệt thủ công hoặc quét tự động.
            // =========================================================================
            const [pendingRes, statsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/admin/documents/pending`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(err => {
                    console.warn("GET pending documents request failed:", err);
                    return null;
                }),
                fetch(`${API_BASE_URL}/api/v1/admin/dashboard/stats`, {
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
                            title: doc.title || '',
                            author: doc.uploader?.fullName || doc.uploader?.name || '',
                            authorId: doc.uploader?.id || '',
                            subject: doc.subject || tagsList[0] || '',
                            tags: tagsList,
                            date: doc.createdAt || doc.date || '',
                            size: doc.fileSizeBytes || doc.fileSize || doc.file_size_bytes || doc.size || 0,
                            status: (doc.status || '').toLowerCase(),
                            description: doc.description || '',
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
    const handleApprove = async (docId, title) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/admin/documents/${docId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (response.ok && result.success) {
                toast.success(`Document "${title}" has been approved and is now public.`);
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

    // =========================================================================
    // XỬ LÝ HIỂN THỊ POPUP LÝ DO TỪ CHỐI TÀI LIỆU (Rejection Reason Popup Flow)
    // - Hoạt động:
    //   1. Khi admin bấm "Từ chối" (Reject) trên giao diện hoặc Modal xem thử tài liệu,
    //      hàm `openRejectModal` được gọi để nạp tài liệu hiện tại vào `selectedDoc`,
    //      thiết lập lý do từ chối mặc định ('Low document quality / Unreadable scan') và bật `showRejectModal` thành `true`.
    //   2. Một popup (Modal) mở ra hiển thị các lý do gợi ý hoặc cho phép admin tự nhập lý do tùy biến (`rejectionReason`).
    //   3. Khi admin bấm nút Xác nhận Từ chối, hệ thống gọi hàm `handleRejectConfirm` để gửi request POST 
    //      kèm theo JSON body `{ rejectionReason }` tới API từ chối (`POST /api/v1/admin/documents/{id}/reject`).
    //   4. Sau khi server xử lý thành công, tài liệu bị lọc bỏ khỏi danh sách hiển thị và popup được đóng lại.
    // =========================================================================
    const openRejectModal = (doc) => {
        setSelectedDoc(doc);
        setRejectionReason('Low document quality / Unreadable scan'); // Reset lý do mặc định
        setShowRejectModal(true);
    };

    // Hàm Xử lý Xác nhận Từ chối
    const handleRejectConfirm = async () => {
        // Kiểm tra xem có tài liệu đang chọn từ chối hay không
        if (!selectedDoc) return;
        // Lấy token xác thực của Admin từ LocalStorage
        const token = localStorage.getItem('token');
        // Nếu không có token đăng nhập thì dừng hàm
        if (!token) return;

        try {
            // Gửi yêu cầu HTTP POST để từ chối tài liệu
            const response = await fetch(`${API_BASE_URL}/api/v1/admin/documents/${selectedDoc.id}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                // Đính kèm lý do từ chối vào JSON body
                body: JSON.stringify({ rejectionReason })
            });

            // Chuyển đổi dữ liệu server trả về sang JSON
            const result = await response.json();
            // Nếu HTTP status trả về thành công (200 OK) và thuộc tính success là true
            if (response.ok && result.success) {
                // Hiển thị thông báo Toast đỏ báo tài liệu đã bị từ chối
                toast.error(`Document "${selectedDoc.title}" has been rejected. Reason: ${rejectionReason}`);
                // Loại bỏ tài liệu khỏi danh sách hiển thị
                setDocuments(prev => prev.filter(d => d.id !== selectedDoc.id));
                // Tăng bộ đếm tài liệu bị từ chối lên 1 đơn vị
                setStats(prev => ({ ...prev, rejected: prev.rejected + 1 }));
                // Đóng Modal nhập lý do từ chối
                setShowRejectModal(false);
                // Đóng Modal xem thử tài liệu của Admin
                setShowPreviewModal(false);
                // Reset tài liệu đang chọn về null
                setSelectedDoc(null);
            } else {
                throw new Error(result.message || 'Failed to reject document.');
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        if (i < 0 || !isFinite(i)) return '0 Bytes';
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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
        // =========================================================================
        // GIAO DIỆN QUẢN LÝ TÀI LIỆU CHỜ DUYỆT (PENDING DOCUMENTS DASHBOARD)
        // - Hoạt động:
        //   1. THỐNG KÊ DUYỆT TÀI LIỆU: Hiển thị 3 chỉ số chính: Số tài liệu đang chờ duyệt (Pending),
        //      đã duyệt thành công (Approved), và bị từ chối (Rejected).
        //   2. THANH CẤU HÌNH QUÉT AI (AI SCAN CONFIGURATION): Cho phép admin thiết lập API Key (OpenAI hoặc Gemini)
        //      để chạy thử nghiệm (preview) cơ chế kiểm duyệt tự động đối với tài liệu đang chờ duyệt ngay tại Client.
        //   3. BẢNG DANH SÁCH TÀI LIỆU PENDING: Hiển thị thông tin chi tiết tài liệu (tiêu đề, dung lượng, môn học, tác giả),
        //      ngày tạo, kết quả quét an toàn AI, cùng các nút hành động (Xem chi tiết, Phê duyệt nhanh, Từ chối).
        // =========================================================================
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

                /* Dark Mode Overrides */
                [data-theme='dark'] .pending-documents-container { background-color: var(--bg-global); }
                [data-theme='dark'] .stats-card { background: var(--bg-card-container); border-color: var(--border-color); }
                [data-theme='dark'] .search-filter-card { background: var(--bg-card-container); border-color: var(--border-color); }
                [data-theme='dark'] .form-control-custom { background-color: #11141a !important; border-color: rgba(253, 143, 82, 0.3) !important; color: var(--text-main) !important; }
                [data-theme='dark'] .form-control-custom:focus { background-color: #0b0d12 !important; border-color: #FD8F52 !important; color: var(--text-main) !important; }
                [data-theme='dark'] .form-select-custom { background-color: #11141a !important; border-color: rgba(253, 143, 82, 0.3) !important; color: var(--text-main) !important; }
                [data-theme='dark'] .form-select-custom:focus { background-color: #0b0d12 !important; border-color: #FD8F52 !important; color: var(--text-main) !important; }
                [data-theme='dark'] .doc-table-card { background: var(--bg-card-container); border-color: var(--border-color); }
                [data-theme='dark'] .doc-preview-meta-box { background-color: var(--bg-global); border-color: var(--border-color); }
                [data-theme='dark'] .doc-tag-badge { background-color: rgba(253, 143, 82, 0.15); border-color: rgba(253, 143, 82, 0.3); color: #FD8F52; }
                [data-theme='dark'] .admin-modal .modal-content { background-color: var(--bg-card-container); border: 1px solid var(--border-color); }

                /* Dark Theme Subject Pills */
                [data-theme='dark'] .subject-computer-science,
                [data-theme='dark'] .subject-web-development,
                [data-theme='dark'] .subject-database {
                  background: rgba(253, 143, 82, 0.15) !important;
                  color: #FD8F52 !important;
                  border-color: rgba(253, 143, 82, 0.3) !important;
                }
                [data-theme='dark'] .subject-mathematics {
                  background: rgba(255, 189, 113, 0.15) !important;
                  color: #FFBD71 !important;
                  border-color: rgba(255, 189, 113, 0.3) !important;
                }
                [data-theme='dark'] .subject-physics {
                  background: rgba(239, 68, 68, 0.15) !important;
                  color: #EF4444 !important;
                  border-color: rgba(239, 68, 68, 0.3) !important;
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
                                            <span className={`subject-pill ${doc.subject ? 'subject-' + doc.subject.toLowerCase().replace(/\s+/g, '-') : ''}`} style={getTagStyle(doc.subject)}>
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
                                        <span className={`subject-pill mt-1 ${selectedDoc.subject ? 'subject-' + selectedDoc.subject.toLowerCase().replace(/\s+/g, '-') : ''}`} style={getTagStyle(selectedDoc.subject)}>
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
                                    isTextOrMarkdownFile(previewFileType || selectedDoc?.fileType, previewUrl, selectedDoc?.title) ? (
                                        <div className="p-4 bg-white rounded border" style={{ height: '450px', overflowY: 'auto' }}>
                                            {isLoadingText ? (
                                                <div className="d-flex justify-content-center align-items-center h-100">
                                                    <div className="spinner-border text-primary" role="status" style={{ color: '#FD8F52' }}>
                                                        <span className="visually-hidden">Loading text...</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                renderFormattedContent(
                                                    textContent,
                                                    isMarkdownFile(previewFileType || selectedDoc?.fileType, previewUrl, selectedDoc?.title)
                                                )
                                            )}
                                        </div>
                                    ) : (
                                        <div className="border rounded" style={{ height: '450px', width: '100%', overflow: 'hidden' }}>
                                            <iframe
                                                src={getIframeSrc(previewUrl, previewFileType || selectedDoc?.fileType)}
                                                title={selectedDoc?.title || 'Document Preview'}
                                                width="100%"
                                                height="100%"
                                                style={{ border: 'none' }}
                                            />
                                        </div>
                                    )
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
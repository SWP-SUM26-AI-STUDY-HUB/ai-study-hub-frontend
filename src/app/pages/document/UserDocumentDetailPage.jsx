import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft, Download, Calendar, User, Star, Send, Flag, AlertTriangle, Share2, Copy, Bookmark, EyeOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import { Modal, Form } from 'react-bootstrap';
import { FloatingChatBox } from '../../components/chat/FloatingChatBox';
import { API_BASE_URL } from '../../api.js';

const getIframeSrc = (presignedUrl, fileType, pageNum) => {
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

    let finalUrl = presignedUrl;
    if (pageNum) {
        finalUrl = `${presignedUrl}#page=${pageNum}`;
    }

    if (isOfficeDoc) {
        return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(finalUrl)}`;
    }
    return finalUrl;
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

const getDocumentTags = (tagsField, isOwner = false, isAdmin = false) => {
    if (!tagsField) return [];

    const shouldIncludeTag = (tagObj) => {
        if (!tagObj || typeof tagObj !== 'object') return true;
        if (tagObj.visibility && tagObj.visibility.toUpperCase() === 'PRIVATE') {
            return isOwner || isAdmin;
        }
        return true;
    };

    if (Array.isArray(tagsField)) {
        return tagsField
            .filter(shouldIncludeTag)
            .map(t => (t && typeof t === 'object') ? (t.label || t.name || '') : String(t))
            .filter(Boolean);
    }
    if (typeof tagsField === 'object') {
        return Object.values(tagsField)
            .filter(shouldIncludeTag)
            .map(t => (t && typeof t === 'object') ? (t.label || t.name || '') : String(t))
            .filter(Boolean);
    }
    if (typeof tagsField === 'string') {
        return tagsField.split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
};

// Helper to decode array buffer into UTF-8 text explicitly (fixes Vietnamese Mojibake/font errors)
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

// Helper to render formatted Markdown and Text content nicely
function parseInlineMarkdown(text) {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*|__.*?__|`.*?`|\*.*?\*|_.*?_)/g);
    return parts.map((part, i) => {
        if (!part) return null;
        if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
            return <strong key={i} style={{ fontWeight: '600', color: 'var(--text-main)' }}>{part.slice(2, -2)}</strong>;
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
                color: 'var(--text-main, #2d3748)'
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
            elements.push(<h1 key={index} className="fw-bold mb-3 mt-4" style={{ color: 'var(--text-main)', fontSize: '1.75rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '0.4rem' }}>{parseInlineMarkdown(trimmed.slice(2))}</h1>);
        } else if (trimmed.startsWith('## ')) {
            elements.push(<h2 key={index} className="fw-bold mb-2 mt-3" style={{ color: 'var(--text-main)', fontSize: '1.4rem' }}>{parseInlineMarkdown(trimmed.slice(3))}</h2>);
        } else if (trimmed.startsWith('### ')) {
            elements.push(<h3 key={index} className="fw-semibold mb-2 mt-3" style={{ color: 'var(--text-main)', fontSize: '1.2rem' }}>{parseInlineMarkdown(trimmed.slice(4))}</h3>);
        } else if (trimmed.startsWith('#### ')) {
            elements.push(<h4 key={index} className="fw-semibold mb-2 mt-2" style={{ color: 'var(--text-main)', fontSize: '1.05rem' }}>{parseInlineMarkdown(trimmed.slice(5))}</h4>);
        } else if (trimmed.startsWith('> ')) {
            elements.push(
                <blockquote key={index} style={{
                    borderLeft: '4px solid #FD8F52',
                    paddingLeft: '1rem',
                    margin: '0.75rem 0',
                    color: 'var(--text-muted, #64748b)',
                    fontStyle: 'italic'
                }}>
                    {parseInlineMarkdown(trimmed.slice(2))}
                </blockquote>
            );
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            elements.push(
                <li key={index} style={{ marginLeft: '1.5rem', marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                    {parseInlineMarkdown(trimmed.slice(2))}
                </li>
            );
        } else if (/^\d+\.\s/.test(trimmed)) {
            const content = trimmed.replace(/^\d+\.\s/, '');
            elements.push(
                <li key={index} style={{ marginLeft: '1.5rem', listStyleType: 'decimal', marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                    {parseInlineMarkdown(content)}
                </li>
            );
        } else if (trimmed === '---' || trimmed === '***') {
            elements.push(<hr key={index} style={{ margin: '1.5rem 0', borderColor: 'var(--border-color, #e2e8f0)' }} />);
        } else if (trimmed === '') {
            elements.push(<div key={index} style={{ height: '0.5rem' }} />);
        } else {
            elements.push(
                <p key={index} className="mb-2" style={{ lineHeight: '1.7', color: 'var(--text-main)', fontSize: '14.5px' }}>
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

export default function UserDocumentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useApp();
    const preLoadedDoc = location?.state?.document;

    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [comments, setComments] = useState([]);

    const [document, setDocument] = useState(preLoadedDoc || null);
    const [preview, setPreview] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [textContent, setTextContent] = useState('');
    const [isLoadingText, setIsLoadingText] = useState(false);

    // Bookmark States
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [bookmarkCount, setBookmarkCount] = useState(0);
    const [unsaveModalOpen, setUnsaveModalOpen] = useState(false);

    // Quản lý trạng thái hiển thị Modal/Popup
    const [showReportModal, setShowReportModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [generatedShareLink, setGeneratedShareLink] = useState('');

    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [reportReason, setReportReason] = useState('Textbook copyright');
    const [reportDetail, setReportDetail] = useState('');

    const dynamicAverageRating = comments.length > 0
        ? (comments.reduce((acc, curr) => acc + (curr.rating || 0), 0) / comments.length).toFixed(1)
        : '0.0';

    const handleAuthorClick = () => {
        if (document && document.authorId && document.authorId !== 'N/A') {
            navigate(`/public-author-documents/${document.authorId}`, {
                state: {
                    authorName: document.author,
                    authorAvatar: document.authorAvatar
                }
            });
        } else {
            toast.error("Author information not found for this document!");
        }
    };

    const handleToggleBookmark = () => {
        if (!document) return;

        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Please login to save documents.');
            return;
        }

        if (isBookmarked) {
            setUnsaveModalOpen(true);
        } else {
            executeBookmarkToggle();
        }
    };

    const executeBookmarkToggle = async () => {
        if (!document) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            let response;
            if (isBookmarked) {
                response = await fetch(`${API_BASE_URL}/api/v1/documents/${id}/unsave`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } else {
                response = await fetch(`${API_BASE_URL}/api/v1/documents/${id}/save`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }

            if (response.ok) {
                if (isBookmarked) {
                    setIsBookmarked(false);
                    setBookmarkCount(prev => Math.max(0, prev - 1));
                    toast.success('Document unsaved!');
                } else {
                    setIsBookmarked(true);
                    setBookmarkCount(prev => prev + 1);
                    toast.success('Document saved successfully!');
                }
            } else {
                const errData = await response.json().catch(() => ({}));
                toast.error(`Action failed: ${errData.message || response.statusText}`);
            }
        } catch (err) {
            console.error('Bookmark toggle API error:', err);
            toast.error('Failed to update bookmark status on server.');
        }
    };

    useEffect(() => {
        const fetchDocumentData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Session expired. Please login again.');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                // Fetch document details first to extract uploader info
                let detailData = null;
                try {
                    // =========================================================================
                    // HÀM FETCH CHI TIẾT TÀI LIỆU (GET /api/v1/documents/{id})
                    // - Hoạt động: Gửi yêu cầu HTTP GET kèm theo mã JWT Token trên header 'Authorization'.
                    // - Mục đích: Lấy dữ liệu metadata gốc của tài liệu như thông tin người tải lên (uploader),
                    //   danh sách tags, trạng thái hiển thị (PUBLIC/PRIVATE), ngày tạo, lượt xem, mô tả...
                    //   để chuẩn bị phân quyền hiển thị và hiển thị giao diện chi tiết tài liệu.
                    // =========================================================================
                    const detailsRes = await fetch(`${API_BASE_URL}/api/v1/documents/${id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (detailsRes.ok) {
                        const detailsResult = await detailsRes.json();
                        if (detailsResult.success && detailsResult.data) {
                            detailData = detailsResult.data;
                        }
                    } else {
                        throw new Error(`Failed to load document: Status ${detailsRes.status}`);
                    }
                } catch (err) {
                    console.warn('Failed to fetch standard document details:', err);
                    throw err;
                }

                // Fetch preview next
                const previewRes = await fetch(`${API_BASE_URL}/api/v1/documents/${id}/preview`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (previewRes.ok) {
                    const previewResult = await previewRes.json();
                    if (previewResult.success && previewResult.data) {
                        const pData = previewResult.data;

                        setPreview(pData);

                        const authorId = detailData?.uploader?.id || pData.uploader_id || pData.uploaderId || pData.uploader?.id || pData.authorId || pData.userId || 'N/A';
                        const visibility = detailData?.visibility || pData.visibility || 'PUBLIC';
                        const isPrivate = visibility.toUpperCase() === 'PRIVATE';
                        const isOwner = user?.id && authorId !== 'N/A' && String(user.id) === String(authorId);
                        const isAdmin = user?.role?.toLowerCase() === 'admin';

                        if (isPrivate && !isOwner && !isAdmin) {
                            throw new Error('This document is private and cannot be viewed.');
                        }

                        const documentTagsList = getDocumentTags(detailData?.tags || pData.tags, isOwner, isAdmin);
                        const docObj = {
                            id: id,
                            title: detailData?.title || pData.title || '',
                            description: detailData?.description || pData.description || '',
                            subject: detailData?.subject?.name || detailData?.subject || pData.subject?.name || pData.subject || (documentTagsList[0] || ''),
                            tags: documentTagsList,
                            author: detailData?.uploader?.fullName || detailData?.uploader?.name || pData.uploader_name || pData.uploader?.fullName || pData.uploader?.name || '',
                            authorId: authorId,
                            authorAvatar: detailData?.uploader?.avatarUrl || pData.uploader?.avatarUrl || null,
                            createdAt: detailData?.createdAt || pData.created_at || '',
                            size: detailData?.fileSizeBytes ?? detailData?.fileSize ?? pData.file_size_bytes ?? pData.fileSizeBytes ?? 0,
                            visibility: visibility
                        };
                        setDocument(docObj);

                        // Check bookmark status via API
                        const checkBookmarkStatus = async () => {
                            try {
                                const savedRes = await fetch(`${API_BASE_URL}/api/v1/documents/saved?page=0&size=100`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                if (savedRes.ok) {
                                    const savedData = await savedRes.json();
                                    const savedList = Array.isArray(savedData.data)
                                        ? savedData.data
                                        : (savedData.data && Array.isArray(savedData.data.content) ? savedData.data.content : []);
                                    const exists = savedList.some(item => item && item.id === id);
                                    setIsBookmarked(exists);
                                    setBookmarkCount(exists ? Math.max(1, backendCount) : backendCount);
                                }
                            } catch (err) {
                                console.error('Failed to load bookmark status from server:', err);
                            }
                        };
                        const backendCount = pData.favoritesCount || pData.saveCount || 0;
                        setIsBookmarked(false);
                        setBookmarkCount(backendCount);
                        checkBookmarkStatus();
                    }
                } else {
                    throw new Error(`Failed to load document preview: Status ${previewRes.status}`);
                }
            } catch (err) {
                console.error('Fetch document preview url error:', err);
                setError(err.message || 'Failed to load document');
            }

            try {
                // =========================================================================
                // HÀM LẤY DANH SÁCH REVIEW/COMMENT (GET /api/v1/documents/{id}/reviews?page=0&size=10)
                // - Hoạt động: Gọi API reviews với tham số phân trang để tải 10 bình luận đầu tiên.
                // - Mục đích: Lấy danh sách đánh giá của các người dùng khác (số sao, nội dung bình luận,
                //   tên và avatar người bình luận) rồi ánh xạ (map) sang cấu trúc dữ liệu của React state `comments`
                //   nhằm hiển thị trên tab Đánh giá và bình luận ở giao diện chi tiết.
                // =========================================================================
                const reviewsRes = await fetch(`${API_BASE_URL}/api/v1/documents/${id}/reviews?page=0&size=10`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (reviewsRes.ok) {
                    const reviewsResult = await reviewsRes.json();
                    if (reviewsResult.success && Array.isArray(reviewsResult.data)) {
                        setComments(reviewsResult.data.map((r, index) => {
                            const isCurrentUser = r.reviewerName === user?.fullName || r.reviewerName === user?.name;
                            const reviewerAvatar = r.reviewerAvatarUrl || r.reviewerAvatar || r.avatarUrl || r.avatar || (isCurrentUser ? user?.avatarUrl : null);
                            return {
                                id: r.reviewId || r.id || `review-${index}`,
                                user: r.reviewerName || 'User',
                                avatar: (r.reviewerName || 'U').substring(0, 2).toUpperCase(),
                                avatarUrl: reviewerAvatar,
                                content: r.comment || '',
                                rating: r.rating || 0,
                                date: r.createdAt || new Date().toISOString()
                            };
                        }));
                    }
                }
            } catch (err) {
                console.error('Fetch document reviews list error:', err);
            }

            setIsLoading(false);
        };

        if (id) {
            fetchDocumentData();
        }
    }, [id]);

    useEffect(() => {
        const url = preview?.presigned_url;
        const isMd = isTextOrMarkdownFile(preview?.file_type || preview?.fileType, url, document?.title);
        if (url && isMd) {
            setIsLoadingText(true);
            fetch(url)
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
                    const proxyUrl = url.replace(/https:\/\/[^/]+\.amazonaws\.com/, '/s3-proxy');
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
    }, [preview?.presigned_url, document?.title]);

    // ĐÃ SỬA CHUẨN XÁC: Trỏ link share động về router Frontend của Khách xem tài liệu
    const handleShareLink = async () => {
        const token = localStorage.getItem('token');
        try {
            setIsSharing(true);
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/${id}/share`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Share API failure');
            const result = await response.json();

            // Lấy chuẩn trường token nằm trong data object
            const shareToken = result.data?.token;

            if (shareToken) {
                // Ghép nối trỏ thẳng về domain Frontend hiện tại (localhost hoặc domain deploy) vào trang guest shared
                const fullShareLink = `${window.location.origin}/guest/document/shared/${shareToken}`;
                setGeneratedShareLink(fullShareLink);
                setShowShareModal(true);
            } else {
                toast.error('Could not get secure share token from server.');
            }
        } catch (error) {
            console.error('Share execution error:', error);
            toast.error('Failed to generate share link.');
        } finally {
            setIsSharing(false);
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(generatedShareLink);
            toast.success('Link copied to clipboard successfully!');
        } catch (err) {
            toast.error('Failed to copy link.');
        }
    };

    const handleDownload = async () => {
        const token = localStorage.getItem('token');
        try {
            toast.loading('Fetching secure download link from server...');
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/${id}/download`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            toast.dismiss();

            if (!response.ok) throw new Error('Download API error');
            const result = await response.json();

            const realDownloadUrl = result.data?.presigned_url;

            if (realDownloadUrl) {
                toast.success('Downloading started! Save file directly to machine.');

                const link = window.document.createElement('a');
                link.href = realDownloadUrl;
                link.setAttribute('download', document?.title || 'document.docx');
                link.target = '_self';
                window.document.body.appendChild(link);
                link.click();
                window.document.body.removeChild(link);
            } else {
                toast.error('Download field (presigned_url) is missing or blank inside server object.');
            }
        } catch (error) {
            console.error('Download error:', error);
            toast.dismiss();
            toast.error('Could not execute download.');
        }
    };

    const handleSubmitComment = async (e) => {
        // Chặn hành vi submit mặc định để tránh làm tải lại trang
        e.preventDefault();
        // Kiểm tra xem bình luận có trống hoặc người dùng chưa chọn số sao đánh giá hay không
        if (!comment.trim() || rating === 0) {
            // Hiển thị Toast thông báo lỗi bắt buộc nhập nội dung và đánh giá sao
            toast.error('Please enter a comment and a rating!');
            // Thoát hàm
            return;
        }

        // Lấy token xác thực của người dùng đang đăng nhập hệ thống
        const token = localStorage.getItem('token');
        try {
            // Đặt trạng thái đang tải đánh giá lên true để khóa nút gửi
            setIsSubmittingReview(true);
            // Gửi request POST tới máy chủ đăng ký review/đánh giá
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/${id}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                // Đóng gói số sao (rating) và nội dung bình luận (comment) thành JSON body
                body: JSON.stringify({ rating, comment })
            });

            // Nếu phản hồi từ HTTP gặp mã lỗi (không phải 2xx)
            if (!response.ok) throw new Error('Failed to submit review');
            // Đọc dữ liệu JSON nhận được từ máy chủ
            const result = await response.json();

            // Khởi tạo một đối tượng bình luận mới để chèn trực tiếp vào UI Client
            const newComment = {
                // Sử dụng mã ID bình luận trả về từ server, hoặc sinh ngẫu nhiên theo mốc thời gian nếu server không trả về
                id: result.data?.reviewId || Date.now().toString(),
                // Lấy tên người đánh giá từ server, hoặc mặc định là 'You'
                user: result.data?.reviewerName || 'You',
                // Tách 2 ký tự đầu của tên làm avatar hiển thị thay thế
                avatar: (result.data?.reviewerName || 'Y').substring(0, 2).toUpperCase(),
                // Nội dung bình luận vừa viết
                content: comment,
                // Số sao vừa đánh giá
                rating,
                // Thiết lập mốc thời gian hiện tại
                date: new Date().toISOString()
            };

            // Thêm bình luận mới này vào vị trí đầu tiên của mảng danh sách bình luận (comments state)
            setComments([newComment, ...comments]);
            // Làm sạch ô văn bản nhập bình luận
            setComment('');
            // Reset số sao về 0
            setRating(0);
            // Hiển thị Toast thông báo gửi đánh giá thành công
            toast.success('Review submitted successfully!');
        } catch (err) {
            // Hiển thị Toast cảnh báo lỗi nếu gặp lỗi mạng hoặc API từ chối
            toast.error('Failed to save review.');
        } finally {
            // Khôi phục trạng thái nút gửi bình thường
            setIsSubmittingReview(false);
        }
    };

    const handleReportSubmit = async (e) => {
        // Chặn hành vi mặc định của form submit để tránh tải lại trang
        e.preventDefault();
        // Lấy token xác thực của người dùng hiện tại từ LocalStorage
        const token = localStorage.getItem('token');
        try {
            // Đặt trạng thái đang gửi báo cáo lên true để hiển thị vòng xoay loading
            setIsSubmittingReport(true);
            // Gửi yêu cầu HTTP POST tới API báo cáo tài liệu vi phạm
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/${id}/reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                // Đóng gói lý do báo cáo kết hợp chi tiết văn bản người dùng nhập vào thành chuỗi JSON body
                body: JSON.stringify({ reason: `${reportReason}${reportDetail ? ' - Details: ' + reportDetail : ''}` })
            });

            // Nếu server trả về status không thành công (không phải 2xx)
            if (!response.ok) throw new Error('Failed to report');
            // Hiển thị Toast thông báo gửi báo cáo thành công lên Admin
            toast.success('Thank you. Your report has been submitted to the administrator for review.');
            // Đóng Modal popup báo cáo vi phạm trên màn hình
            setShowReportModal(false);
            // Làm sạch nội dung chi tiết báo cáo vừa nhập
            setReportDetail('');
        } catch (err) {
            // Hiển thị thông báo Toast đỏ cảnh báo lỗi khi gửi thất bại
            toast.error('Failed to submit report.');
        } finally {
            // Đặt trạng thái đang gửi báo cáo về false để khôi phục nút bấm bình thường
            setIsSubmittingReport(false);
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

    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <div className="spinner-border text-primary" role="status" style={{ color: '#FD8F52' }}>
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (error || !document) {
        return (
            <div className="container-fluid d-flex flex-column align-items-center justify-content-center py-5 px-3" style={{ minHeight: '80vh' }}>
                <div className="card shadow-lg border-0 p-5 text-center bg-white" style={{ maxWidth: '500px', borderRadius: '1.5rem', border: '1px solid rgba(253, 143, 82, 0.15)' }}>
                    <div className="d-flex justify-content-center mb-4">
                        <div className="d-inline-flex align-items-center justify-content-center rounded-circle"
                            style={{
                                width: '80px',
                                height: '80px',
                                background: 'linear-gradient(135deg, rgba(199, 56, 102, 0.1), rgba(253, 143, 82, 0.1))',
                                boxShadow: '0 8px 24px rgba(253, 143, 82, 0.15)'
                            }}>
                            <EyeOff className="h-10 w-10" style={{ color: '#C73866' }} />
                        </div>
                    </div>

                    <h3 className="fw-bold text-dark mb-4" style={{ fontSize: '24px' }}>Document Unavailable</h3>

                    <p className="text-muted mb-4" style={{ fontSize: '14.5px', lineHeight: '1.6' }}>
                        This document has been deleted or set to private and cannot be viewed.
                    </p>

                    <button
                        onClick={() => navigate('/')}
                        className="btn text-white w-100 py-2.5 fw-bold border-0"
                        style={{
                            background: 'linear-gradient(135deg, #C73866, #FD8F52)',
                            borderRadius: '12px',
                            boxShadow: '0 4px 15px rgba(253, 143, 82, 0.3)',
                            fontSize: '14.5px',
                            transition: 'all 0.2s'
                        }}
                    >
                        Back to Homepage
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-4 text-start">
            <button onClick={() => navigate(-1)} className="btn btn-link text-decoration-none text-muted mb-4 d-flex align-items-center gap-2 p-0">
                <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div className="row g-4">
                <div className="col-12 d-flex flex-column gap-4">
                    {document && (
                        <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                            <div className="card-body p-4">
                                <div className="d-flex flex-column flex-md-row align-items-start justify-content-between gap-3 mb-3">
                                    <div className="flex-grow-1">
                                        <div className="d-flex align-items-center gap-3 flex-wrap mb-2">
                                            <h2 className="fw-bold text-dark mb-0">{document.title}</h2>

                                            {/* Bookmark Button */}
                                            <button
                                                onClick={handleToggleBookmark}
                                                className="btn d-flex align-items-center gap-2 border-0 bg-transparent p-0 shadow-none"
                                                style={{ cursor: 'pointer' }}
                                                title={isBookmarked ? 'Unsave document' : 'Save document'}
                                            >
                                                <div className="rounded-circle d-flex align-items-center justify-content-center"
                                                    style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        backgroundColor: 'rgba(0, 0, 0, 0.08)',
                                                        color: isBookmarked ? '#facc15' : '#888',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <Bookmark className="h-5 w-5" style={{ fill: isBookmarked ? '#facc15' : 'none', color: isBookmarked ? '#facc15' : '#888' }} />
                                                </div>
                                                <span className="fw-bold" style={{ color: 'var(--text-main)', fontSize: '15px' }}>{bookmarkCount}</span>
                                            </button>
                                        </div>
                                        <div className="d-flex flex-wrap align-items-center gap-3 text-muted" style={{ fontSize: '14px' }}>
                                            <div className="d-flex align-items-center gap-1">
                                                <User className="h-4 w-4" />
                                                <span
                                                    onClick={handleAuthorClick}
                                                    className="fw-semibold text-primary"
                                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                >
                                                    {document.author}
                                                </span>
                                            </div>
                                            <span>•</span>
                                            <div className="d-flex align-items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                <span>{new Date(document.createdAt).toLocaleDateString('en-US')}</span>
                                            </div>
                                            <span>•</span>
                                            <div className="d-flex align-items-center gap-1">
                                                <Star className="h-4 w-4 fill-warning text-warning" style={{ color: '#FFBD71' }} />
                                                <span>{dynamicAverageRating} ({comments.length} reviews)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 d-flex flex-wrap gap-2 align-items-center justify-content-md-end">
                                        {Array.isArray(document.tags) && document.tags.map((t) => {
                                            const val = typeof t === 'object' ? (t.name || t.label || '') : String(t);
                                            if (!val) return null;
                                            return (
                                                <span 
                                                    key={val} 
                                                    onClick={() => navigate(`/tag/${encodeURIComponent(val)}`)}
                                                    className="badge text-white px-3 py-2 border-0" 
                                                    style={{ 
                                                        background: 'linear-gradient(135deg, #FD8F52, #FFBD71)', 
                                                        fontSize: '13px', 
                                                        borderRadius: '20px',
                                                        cursor: 'pointer' 
                                                    }}
                                                >
                                                    {val}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <h5 className="fw-bold text-dark mb-2">Description:</h5>
                                    <p className="text-muted leading-relaxed" style={{ fontSize: '15px' }}>{document.description || 'No description available.'}</p>
                                </div>

                                <div className="card border-2 mb-4" style={{ borderColor: 'rgba(253, 143, 82, 0.2)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                                    <div className="card-body p-4 bg-white">
                                        <h5 className="fw-bold text-dark mb-3">Document Content</h5>
                                        {preview?.presigned_url ? (
                                            isTextOrMarkdownFile(preview.file_type || preview.fileType, preview.presigned_url, document?.title) ? (
                                                <div style={{ height: '650px', width: '100%', overflowY: 'auto', padding: '1.5rem', backgroundColor: 'var(--bg-card-container, #ffffff)', border: '1px solid var(--border-color, rgba(0,0,0,0.1))', borderRadius: '0.5rem' }}>
                                                    {isLoadingText ? (
                                                        <div className="d-flex justify-content-center align-items-center h-100">
                                                            <div className="spinner-border text-primary" role="status" style={{ color: '#FD8F52' }}>
                                                                <span className="visually-hidden">Loading text...</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        renderFormattedContent(
                                                            textContent,
                                                            isMarkdownFile(preview.file_type || preview.fileType, preview.presigned_url, document?.title)
                                                        )
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ height: '650px', width: '100%' }}>
                                                    <iframe
                                                        src={getIframeSrc(preview.presigned_url, preview.file_type || 'pdf', new URLSearchParams(location.search).get('page') || (location.hash ? location.hash.replace('#page=', '') : null))}
                                                        title={document.title}
                                                        width="100%"
                                                        height="100%"
                                                        style={{ border: 'none' }}
                                                    />
                                                </div>
                                            )
                                        ) : (
                                            <div className="text-center py-5 text-muted">Preview not ready or failed to fetch file.</div>
                                        )}
                                    </div>
                                </div>

                                <div className="d-flex flex-column gap-2 mt-4">
                                    <div className="d-flex flex-row gap-2 w-100">
                                        <button
                                            onClick={handleShareLink}
                                            disabled={isSharing}
                                            className="btn btn-outline-primary py-2.5 fw-bold flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                                            style={{ borderColor: '#FD8F52', color: '#FD8F52' }}
                                        >
                                            <Share2 className="h-4 w-4" />
                                            {isSharing ? 'Generating...' : 'Share Document Link'}
                                        </button>

                                        <button
                                            onClick={() => setShowReportModal(true)}
                                            className="btn btn-outline-danger py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2"
                                            style={{ minWidth: '150px' }}
                                        >
                                            <Flag className="h-4 w-4" /> Report
                                        </button>
                                    </div>

                                    <div className="d-flex flex-row gap-2 w-100 mt-1">
                                        <button
                                            onClick={handleToggleBookmark}
                                            className="btn btn-outline-warning py-2.5 fw-bold flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                                            style={{ borderColor: '#FD8F52', color: '#FD8F52' }}
                                        >
                                            <Bookmark className="h-4 w-4" style={{ fill: isBookmarked ? '#FD8F52' : 'none' }} />
                                            {isBookmarked ? 'Unsave Document' : 'Save Document'}
                                        </button>

                                        <button
                                            onClick={handleDownload}
                                            className="btn text-white py-2.5 fw-bold border-0 d-flex align-items-center justify-content-center gap-2 flex-grow-1"
                                            style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                                        >
                                            <Download className="h-4 w-4" />
                                            Download Document ({formatBytes(document?.size ?? document?.fileSizeBytes ?? document?.file_size_bytes ?? document?.fileSize)})
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Review Section */}
                    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                        <div className="card-header border-0 py-3" style={{ background: 'linear-gradient(to right, rgba(253, 143, 82, 0.1), rgba(255, 189, 113, 0.1))', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}>
                            <h5 className="mb-0 fw-bold text-dark">Reviews & Comments</h5>
                        </div>
                        <div className="card-body p-4">
                            <form onSubmit={handleSubmitComment} className="mb-5">
                                <div className="mb-3">
                                    <label className="form-label fw-bold text-dark mb-2">Your rating:</label>
                                    <div className="d-flex gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="btn p-0 border-0 bg-transparent">
                                                <Star className="h-8 w-8" style={{ fill: star <= (hoverRating || rating) ? '#FFBD71' : 'none', color: star <= (hoverRating || rating) ? '#FFBD71' : '#ccc' }} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-bold text-dark mb-2">Comment:</label>
                                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your thoughts..." rows={4} className="form-control" style={{ borderColor: 'rgba(253, 143, 82, 0.3)' }} />
                                </div>
                                <button type="submit" disabled={isSubmittingReview} className="btn text-white px-4 py-2 border-0 fw-bold d-flex align-items-center gap-2" style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}>
                                    <Send className="h-4 w-4" /> Submit Review
                                </button>
                            </form>

                            <div className="border-top pt-4">
                                <h5 className="fw-bold text-dark mb-4">{comments.length} reviews</h5>
                                <div className="d-flex flex-column gap-3">
                                    {comments.map((c) => (
                                        <div key={c.id} className="border rounded-3 p-3" style={{ borderColor: 'rgba(253, 143, 82, 0.2)', background: 'linear-gradient(135deg, rgba(255, 189, 113, 0.03), rgba(255, 220, 162, 0.03))' }}>
                                            <div className="d-flex align-items-start gap-3">
                                                <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0 overflow-hidden" style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #C73866, #FD8F52)', fontSize: '14px' }}>
                                                    {c.avatarUrl ? (
                                                        <img src={c.avatarUrl.startsWith('http') ? c.avatarUrl : `https://s3.amazonaws.com/ai-study-hub-thiennho/${c.avatarUrl}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        c.avatar
                                                    )}
                                                </div>
                                                <div className="flex-grow-1">
                                                    <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between mb-2">
                                                        <h6 className="mb-0 fw-bold text-dark">{c.user}</h6>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="d-flex">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <Star key={star} className="h-4 w-4" style={{ fill: star <= c.rating ? '#FFBD71' : 'none', color: star <= c.rating ? '#FFBD71' : '#ccc' }} />
                                                                ))}
                                                            </div>
                                                            <span className="text-muted" style={{ fontSize: '12px' }}>{new Date(c.date).toLocaleDateString('en-US')}</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>{c.content}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* POPUP Modal Share */}
            <Modal show={showShareModal} onHide={() => setShowShareModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: '18px' }}>
                        <Share2 className="h-5 w-5 text-primary" /> Share Document
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="text-muted small mb-2">Anyone with this link can view this document:</p>
                    <div className="d-flex gap-2">
                        <input
                            type="text"
                            readOnly
                            value={generatedShareLink}
                            className="form-control bg-light text-muted"
                            style={{ fontSize: '13.5px', borderColor: 'rgba(253, 143, 82, 0.3)' }}
                        />
                        <button
                            type="button"
                            onClick={copyToClipboard}
                            className="btn text-white px-3 border-0 d-flex align-items-center justify-content-center"
                            style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                        >
                            <Copy className="h-4 w-4" /> <span className="ms-1 small fw-bold">Copy</span>
                        </button>
                    </div>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <button type="button" className="btn btn-light border w-100 fw-semibold" onClick={() => setShowShareModal(false)}>Close</button>
                </Modal.Footer>
            </Modal>

            {/* Modal Report */}
            <Modal show={showReportModal} onHide={() => setShowReportModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: '18px' }}>
                        <AlertTriangle className="h-5 w-5 text-danger" /> Report Document
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleReportSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-dark mb-2">Reason for report</Form.Label>
                            <Form.Select className="form-select" value={reportReason} onChange={(e) => setReportReason(e.target.value)} style={{ borderColor: 'rgba(253, 143, 82, 0.3)' }}>
                                <option value="Textbook copyright">Textbook copyright</option>
                                <option value="Poor quality / Unreadable document">Poor quality / Unreadable document</option>
                                <option value="Inappropriate content">Inappropriate content</option>
                                <option value="Other">Other</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-dark mb-2">Detailed content</Form.Label>
                            <Form.Control as="textarea" rows={3} placeholder="Enter detailed content..." value={reportDetail} onChange={(e) => setReportDetail(e.target.value)} style={{ borderColor: 'rgba(253, 143, 82, 0.3)' }} required />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0 d-flex gap-2">
                        <button type="button" className="btn btn-light flex-grow-1 border fw-semibold" onClick={() => setShowReportModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-danger flex-grow-1 fw-bold border-0" disabled={isSubmittingReport}>Submit Report</button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* MODAL XÁC NHẬN BỎ LƯU TÀI LIỆU */}
            <Modal show={unsaveModalOpen} onHide={() => setUnsaveModalOpen(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold text-warning d-flex align-items-center gap-2" style={{ fontSize: '18px' }}>
                        <Bookmark className="h-5 w-5 text-warning" /> Confirm Unsave
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-start py-3">
                    <p className="mb-1 text-dark fw-medium" style={{ fontSize: '15px' }}>
                        Are you sure you want to unsave this document?
                    </p>
                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                        Document: <strong className="text-dark">"{document?.title}"</strong>. It will be removed from your saved list.
                    </p>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0 d-flex gap-2">
                    <button
                        onClick={async () => {
                            await executeBookmarkToggle();
                            setUnsaveModalOpen(false);
                        }}
                        className="btn text-white flex-grow-1 fw-bold border-0 py-2"
                        style={{ fontSize: '14px', backgroundColor: '#FD8F52' }}
                    >
                        Confirm Unsave
                    </button>
                    <button onClick={() => setUnsaveModalOpen(false)} className="btn btn-light flex-grow-1 border fw-medium py-2" style={{ fontSize: '14px' }}>
                        Cancel
                    </button>
                </Modal.Footer>
            </Modal>

            <FloatingChatBox />
        </div>
    );
}
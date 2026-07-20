import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { Modal } from 'react-bootstrap';
import { useApp } from '../../context/AppContext';
import {
    ArrowLeft,
    Download,
    FileText,
    Lock,
    Eye,
    Calendar,
    User,
    EyeOff
} from 'lucide-react';
import { API_BASE_URL } from '../../api.js';

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

export default function GuestDocumentDetailPage() {
    const { id, token } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const preLoadedDoc = location?.state?.document;
    const { user } = useApp();
    const [showLoginDialog, setShowLoginDialog] = useState(false);
    const [document, setDocument] = useState(preLoadedDoc || null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [textContent, setTextContent] = useState('');
    const [isLoadingText, setIsLoadingText] = useState(false);

    useEffect(() => {
        if (user && id) {
            navigate(`/document/${id}`, { replace: true });
        }
    }, [user, id, navigate]);

    useEffect(() => {
        const fetchPreview = async () => {
            try {
                setDocument(preLoadedDoc || null);
                setIsLoading(true);
                setError(null);

                // =========================================================================
                // HÀM LẤY BẢN XEM TRƯỚC VÀ KIỂM TRA ĐỘ CÔNG KHAI CỦA TÀI LIỆU DÀNH CHO GUEST
                // - Hoạt động: 
                //   1. Nếu người dùng truy cập bằng link chia sẻ (có param `token`), gọi API `GET /api/v1/documents/shared/{token}`.
                //   2. Nếu truy cập trực tiếp bằng ID tài liệu, gọi API `GET /api/v1/documents/{id}/preview` để tải 30% nội dung đầu tiên.
                //   3. Sau khi có kết quả, tiến hành gọi thử lại API preview không cần Token để kiểm tra xem tài liệu này 
                //      có thực sự công khai hay không. Nếu bị từ chối (trả về lỗi), chứng tỏ tài liệu đã bị xóa hoặc chuyển sang chế độ riêng tư (PRIVATE),
                //      hệ thống lập tức báo lỗi chặn không cho khách xem.
                // =========================================================================
                let response;
                if (token) {
                    response = await fetch(`${API_BASE_URL}/api/v1/documents/shared/${token}`);
                } else {
                    response = await fetch(`${API_BASE_URL}/api/v1/documents/${id}/preview`);
                }

                if (!response.ok) {
                    throw new Error('Document preview not found (500 Server Error)');
                }
                const result = await response.json();
                if (result.success && result.data) {
                    if (token) {
                        const docId = result.data.id;
                        if (user && docId) {
                            navigate(`/document/${docId}`, { replace: true });
                            return;
                        }

                        // Kiểm tra xem tài liệu có thực sự công khai không bằng cách gọi API preview không cần Token
                        // Nếu tài liệu là PRIVATE, API này sẽ trả về mã lỗi 401/403 và bị chặn
                        const checkPublicRes = await fetch(`${API_BASE_URL}/api/v1/documents/${docId}/preview`);
                        if (!checkPublicRes.ok) {
                            throw new Error('This document has been deleted or set to private and cannot be viewed.');
                        }
                        setDocument({
                            ...preLoadedDoc,
                            id: docId,
                            title: result.data.title,
                            description: result.data.description,
                            summary: result.data.summary,
                            file_type: result.data.fileType,
                            file_size_bytes: result.data.filesizeBytes,
                            author: result.data.uploaderName || result.data.uploader_name || result.data.author || '',
                            tags: result.data.tags || [],
                            presigned_url: result.data.previewUrl,
                            created_at: result.data.created_at,
                            subject: result.data.subject || result.data.subjectName || '',
                            views: 0
                        });
                    } else {
                        setDocument({
                            ...preLoadedDoc,
                            ...result.data,
                            author: result.data.uploader_name || result.data.author || preLoadedDoc?.author
                        });
                    }
                } else {
                    throw new Error(result.message || 'Failed to load preview');
                }
            } catch (err) {
                console.error(err);
                if (preLoadedDoc) {
                    setDocument(preLoadedDoc);
                    setError(null);
                } else {
                    setError(err.message);
                    setDocument(null);
                }
            } finally {
                setIsLoading(false);
            }
        };

        if (id || token) {
            fetchPreview();
        }
    }, [id, token]);

    useEffect(() => {
        const url = document?.presigned_url;
        const isTextDoc = isTextOrMarkdownFile(document?.file_type || document?.fileType, url, document?.title);
        if (url && isTextDoc) {
            setIsLoadingText(true);
            const truncate30Percent = (fullText) => {
                if (!fullText) return '';
                const lines = fullText.split('\n');
                if (lines.length <= 5) return fullText;
                const limit = Math.max(3, Math.ceil(lines.length * 0.3));
                return lines.slice(0, limit).join('\n') + '\n\n--- \n*🔒 Preview limited to 30% of content. Please log in to read the full document.*';
            };

            fetch(url)
                .then(res => {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.arrayBuffer();
                })
                .then(buffer => {
                    const text = decodeUtf8Text(buffer);
                    setTextContent(truncate30Percent(text));
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
                            setTextContent(truncate30Percent(t));
                        })
                        .catch(() => setTextContent('Failed to load text content.'))
                        .finally(() => setIsLoadingText(false));
                });
        } else {
            setTextContent('');
        }
    }, [document?.presigned_url, document?.title]);



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

    if (error && !document) {
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

    const documentTags = getDocumentTags(document.tags);

    return (
        <div className="container py-4 text-start">
            <button
                onClick={() => navigate('/')}
                className="btn btn-link text-decoration-none text-muted mb-4 d-flex align-items-center gap-2 p-0"
            >
                <ArrowLeft className="h-4 w-4" />
                Back
            </button>

            <div className="row g-4">
                {/* Main Content */}
                <div className="col-12">
                    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                        <div className="card-body p-4">
                            <div className="d-flex flex-column flex-md-row align-items-start justify-content-between gap-3 mb-3">
                                <div className="flex-grow-1">
                                    <h2 className="fw-bold text-dark mb-2">{document.title}</h2>
                                    <div className="d-flex flex-wrap align-items-center gap-3 text-muted" style={{ fontSize: '14px' }}>
                                        <div className="d-flex align-items-center gap-1">
                                            <User className="h-4 w-4" />
                                            <span>{document.author || ''}</span>
                                        </div>
                                        <span>•</span>
                                        <div className="d-flex align-items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            <span>{new Date(document.created_at || document.date || new Date()).toLocaleDateString('en-US')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex flex-wrap gap-2 align-self-start justify-content-md-end">
                                    {documentTags.length > 0 ? (
                                        documentTags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="badge text-white px-3 py-2 border-0"
                                                style={{ background: 'linear-gradient(135deg, #FD8F52, #FFBD71)', fontSize: '13px', borderRadius: '20px' }}
                                            >
                                                {tag}
                                            </span>
                                        ))
                                    ) : (
                                        <span
                                            className="badge text-white px-3 py-2 border-0"
                                            style={{ background: 'linear-gradient(135deg, #FD8F52, #FFBD71)', fontSize: '13px', borderRadius: '20px' }}
                                        >
                                            {document.subject || 'Study Document'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="mb-4">
                                <h5 className="fw-bold text-dark mb-2">Description:</h5>
                                <p className="text-muted leading-relaxed" style={{ fontSize: '15px' }}>{document.description}</p>
                            </div>

                            {/* Document Preview */}
                            <div className="position-relative mb-4">
                                <div className="card border-2 position-relative" style={{ borderColor: 'rgba(253, 143, 82, 0.2)', borderRadius: '0.75rem', overflow: 'hidden', height: '650px' }}>
                                    {document.presigned_url ? (
                                        isTextOrMarkdownFile(document.file_type || document.fileType, document.presigned_url, document.title) ? (
                                            <div className="p-4 bg-white h-100" style={{ overflowY: 'auto' }}>
                                                {isLoadingText ? (
                                                    <div className="d-flex justify-content-center align-items-center h-100">
                                                        <div className="spinner-border text-primary" role="status" style={{ color: '#FD8F52' }}>
                                                            <span className="visually-hidden">Loading text...</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    renderFormattedContent(
                                                        textContent,
                                                        isMarkdownFile(document.file_type || document.fileType, document.presigned_url, document.title)
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            <iframe
                                                key={document?.presigned_url || 'guest-preview-frame'}
                                                src={getIframeSrc(document.presigned_url, document.file_type || document.fileType)}
                                                title={document.title}
                                                width="100%"
                                                height="100%"
                                                style={{ border: 'none' }}
                                            />
                                        )
                                    ) : (
                                        <div className="card-body p-4 bg-white h-100" style={{ overflowY: 'auto' }}>
                                            <div className="d-flex align-items-center gap-2 mb-3 border-bottom pb-2">
                                                <FileText className="h-5 w-5 text-muted" />
                                                <span className="fw-semibold text-dark">{document.title || 'Document Content Preview'}</span>
                                            </div>
                                            <div className="text-muted leading-relaxed" style={{ fontSize: '14.5px' }}>
                                                <p className="fw-bold mb-2">1. Overview of {document.title?.replace(/\.[^/.]+$/, "") || 'this document'}</p>
                                                <p className="mb-3">
                                                    {document.description || `This document provides comprehensive notes and study materials regarding ${document.subject || 'this subject'}. It is designed to help students grasp the core concepts, theories, and practical applications efficiently.`}
                                                </p>
                                                <p className="fw-bold mb-2">2. Key Concepts & Core Syllabus</p>
                                                <p className="mb-3">
                                                    The study material covers fundamental definitions, detailed explanations, and structured lessons.
                                                    It includes step-by-step guides, important formulas, and review questions at the end of each section.
                                                </p>
                                                <div>
                                                    <p className="fw-bold mb-2">3. Detailed Analysis & Exercises</p>
                                                    <p className="mb-3">
                                                        This section contains advanced case studies, mathematical derivations, and sample answers for examinations.
                                                        Students are recommended to solve these exercises independently before referencing the solutions.
                                                    </p>
                                                    <p className="fw-bold mb-2">4. Practical Applications and Summary</p>
                                                    <p className="mb-3">
                                                        Real-world examples demonstrate how these theoretical concepts apply to industry scenarios.
                                                        A quick cheat sheet summary is provided to assist with fast revision before tests.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="d-flex flex-column gap-2">
                                <button
                                    onClick={() => navigate('/auth/login')}
                                    className="btn text-white w-100 py-2.5 fw-bold border-0 d-flex align-items-center justify-content-center gap-2"
                                    style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                                >
                                    <Lock className="h-4 w-4" />
                                    Login to Read & Chat with AI
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Login Dialog */}
            <Modal show={showLoginDialog} onHide={() => setShowLoginDialog(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold" style={{ fontSize: '18px' }}>Login Required</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-muted" style={{ fontSize: '15px' }}>
                    You need to log in to download or print this document.
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0 d-flex gap-2">
                    <button
                        onClick={() => {
                            setShowLoginDialog(false);
                            navigate('/auth/login');
                        }}
                        className="btn text-white flex-grow-1 border-0"
                        style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => {
                            setShowLoginDialog(false);
                            navigate('/auth/register');
                        }}
                        className="btn btn-outline-warning flex-grow-1"
                        style={{ borderColor: '#FD8F52', color: '#FD8F52' }}
                    >
                        Register
                    </button>
                </Modal.Footer>
            </Modal>

        </div>
    );
}

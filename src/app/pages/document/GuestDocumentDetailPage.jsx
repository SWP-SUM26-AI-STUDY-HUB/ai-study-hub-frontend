import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { mockDocuments } from '../../data/mockData';
import { Modal } from 'react-bootstrap';
import { useApp } from '../../context/AppContext';
import {
    ArrowLeft,
    Download,
    FileText,
    Lock,
    Eye,
    Calendar,
    User
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

export default function GuestDocumentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const preLoadedDoc = location?.state?.document;
    const { user } = useApp();
    const [showLoginDialog, setShowLoginDialog] = useState(false);
    const [document, setDocument] = useState(preLoadedDoc || null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user) {
            navigate(`/document/${id}`, { replace: true });
        }
    }, [user, id, navigate]);

    useEffect(() => {
        const fetchPreview = async () => {
            try {
                setDocument(preLoadedDoc || null);
                setIsLoading(true);
                setError(null);
                const response = await fetch(`${API_BASE_URL}/api/v1/documents/${id}/preview`);
                if (!response.ok) {
                    throw new Error('Document preview not found (500 Server Error)');
                }
                const result = await response.json();
                if (result.success && result.data) {
                    setDocument({
                        ...preLoadedDoc,
                        ...result.data,
                        author: result.data.uploader_name || result.data.author || preLoadedDoc?.author
                    });
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
                }

                // Fallback to mock documents only if it matches a mock ID
                const mockDoc = mockDocuments.find((doc) => doc.id === id);
                if (mockDoc) {
                    setDocument({
                        title: mockDoc.title,
                        description: mockDoc.description,
                        document_id: mockDoc.id,
                        file_type: 'pdf',
                        file_size_bytes: mockDoc.size,
                        presigned_url: '', // Empty for mock fallback
                        created_at: mockDoc.date,
                        author: mockDoc.author,
                        views: mockDoc.views,
                        subject: mockDoc.subject,
                        tags: mockDoc.tags,
                    });
                    setError(null);
                } else {
                    setDocument(null);
                }
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchPreview();
        }
    }, [id]);

    // Mock related documents: same subject first, then fall back to others to keep sidebar full
    const relatedDocuments = [
        ...mockDocuments.filter((doc) => doc.id !== id && doc.subject === document?.subject && doc.status === 'public'),
        ...mockDocuments.filter((doc) => doc.id !== id && doc.subject !== document?.subject && doc.status === 'public')
    ].slice(0, 6);

    const formatBytes = (bytes) => {
        if (!bytes) return '0.00 MB';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
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
            <div className="text-center py-5">
                <FileText className="h-16 w-16 text-muted mx-auto mb-3" />
                <h3 className="text-dark mb-3">Document not found</h3>
                <p className="text-muted mb-4">{error}</p>
                <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)', border: 'none' }} onClick={() => navigate('/')}>Back to Homepage</button>
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
                <div className="col-12 col-lg-8">
                    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                        <div className="card-body p-4">
                            <div className="d-flex flex-column flex-md-row align-items-start justify-content-between gap-3 mb-3">
                                <div className="flex-grow-1">
                                    <h2 className="fw-bold text-dark mb-2">{document.title}</h2>
                                    <div className="d-flex flex-wrap align-items-center gap-3 text-muted" style={{ fontSize: '14px' }}>
                                        <div className="d-flex align-items-center gap-1">
                                            <User className="h-4 w-4" />
                                            <span>{document.author || 'Community Contributor'}</span>
                                        </div>
                                        <span>•</span>
                                        <div className="d-flex align-items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            <span>{new Date(document.created_at || document.date || new Date()).toLocaleDateString('en-US')}</span>
                                        </div>
                                        <span>•</span>
                                        <div className="d-flex align-items-center gap-1">
                                            <Eye className="h-4 w-4" />
                                            <span>{document.views || 0} views</span>
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

                            {/* Document Preview - 30% visible */}
                            <div className="position-relative mb-4">
                                <div className="card border-2" style={{ borderColor: 'rgba(253, 143, 82, 0.2)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                                    {document.presigned_url ? (
                                        <div className="position-relative" style={{ height: '350px', overflow: 'hidden' }}>
                                            <iframe
                                                key={document?.presigned_url || 'guest-preview-frame'}
                                                src={getIframeSrc(document.presigned_url, document.file_type)}
                                                title={document.title}
                                                width="100%"
                                                height="100%"
                                                style={{ border: 'none' }}
                                            />
                                            {/* Blurred Gradient Overlay */}
                                            <div
                                                className="position-absolute bottom-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                                                style={{
                                                    background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.95) 60%, rgba(255,255,255,0.7) 100%)',
                                                    pointerEvents: 'none'
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="card-body p-4 bg-white">
                                            <h5 className="fw-bold mb-3">Document Content</h5>
                                            <p className="text-muted leading-relaxed" style={{ fontSize: '14px' }}>
                                                This is a preview of the document. You are viewing the first 30% of the content.
                                                The document includes fundamental and advanced knowledge of {document.subject || 'this subject'}, compiled
                                                carefully by leading experts in the field.
                                            </p>
                                            <p className="text-muted leading-relaxed" style={{ fontSize: '14px' }}>
                                                The content is structured into sections with practical examples, exercises,
                                                and detailed answers, suitable for students and self-directed learners.
                                            </p>
                                        </div>
                                    )}

                                    {/* 70% blurred content with lock overlay */}
                                    <div className="position-relative" style={{ minHeight: '280px' }}>
                                        {!document.presigned_url && (
                                            <div className="p-4 select-none blur" style={{ filter: 'blur(4px)', opacity: 0.5 }}>
                                                <p className="text-muted leading-relaxed" style={{ fontSize: '14px' }}>
                                                    This section contains detailed concepts, key formulas, and exercises...
                                                </p>
                                                <p className="text-muted leading-relaxed" style={{ fontSize: '14px' }}>
                                                    Illustrated examples are designed to help students grasp knowledge easily...
                                                </p>
                                            </div>
                                        )}

                                        {/* Lock Overlay */}
                                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.9) 70%, rgba(255,255,255,0) 100%)' }}>
                                            <div className="text-center p-4 bg-white shadow rounded-4 border-2 border-warning" style={{ maxWidth: '400px', borderColor: '#FD8F52 !important', zIndex: 10 }}>
                                                <Lock className="h-12 w-12 mb-3 mx-auto" style={{ color: '#C73866' }} />
                                                <h4 className="fw-bold text-dark mb-2">Login to read more</h4>
                                                <p className="text-muted mb-4" style={{ fontSize: '13px' }}>
                                                    You are viewing <strong>30% of the content</strong>.
                                                    <br />
                                                    Log in to access <strong>100% of the document</strong>!
                                                </p>
                                                <div className="d-flex gap-2">
                                                    <button
                                                        onClick={() => navigate('/auth/login')}
                                                        className="btn text-white flex-grow-1 border-0"
                                                        style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)', fontSize: '14px' }}
                                                    >
                                                        Login
                                                    </button>
                                                    <button
                                                        onClick={() => navigate('/auth/register')}
                                                        className="btn btn-outline-warning flex-grow-1"
                                                        style={{ borderColor: '#FD8F52', color: '#FD8F52', fontSize: '14px' }}
                                                    >
                                                        Register
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
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
                                <button
                                    onClick={() => setShowLoginDialog(true)}
                                    className="btn btn-outline-warning w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2"
                                    style={{ borderColor: '#FD8F52', color: '#FD8F52' }}
                                >
                                    <Download className="h-4 w-4" />
                                    Download Document ({formatBytes(document.file_size_bytes || document.size)})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar - Related Documents */}
                <div className="col-12 col-lg-4">
                    <div className="card shadow-sm border-0 sticky-top" style={{ top: '90px', borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                        <div className="card-header border-0 py-3" style={{ background: 'linear-gradient(to right, rgba(253, 143, 82, 0.1), rgba(255, 189, 113, 0.1))', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}>
                            <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: '16px' }}>Related Documents</h5>
                        </div>
                        <div className="card-body p-3">
                            <div className="d-flex flex-column gap-2">
                                {relatedDocuments.map((doc) => (
                                    <button
                                        key={doc.id}
                                        onClick={() => navigate(`/guest/document/${doc.id}`)}
                                        className="btn btn-outline-light text-start p-3 border rounded-3 w-100"
                                        style={{
                                            borderColor: 'rgba(253, 143, 82, 0.15)',
                                            backgroundColor: 'transparent',
                                            color: 'inherit',
                                            transition: 'border-color 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#FD8F52';
                                            e.currentTarget.style.backgroundColor = 'rgba(255, 189, 113, 0.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(253, 143, 82, 0.15)';
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <div className="d-flex align-items-start gap-2">
                                            <FileText className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#C73866' }} />
                                            <div className="flex-grow-1 min-w-0">
                                                <h6 className="mb-1 fw-semibold text-dark text-truncate-2" style={{ fontSize: '14px', lineHeight: '1.4' }}>
                                                    {doc.title}
                                                </h6>
                                                <small className="text-muted d-block">{doc.views} views</small>
                                            </div>
                                        </div>
                                    </button>
                                ))}
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

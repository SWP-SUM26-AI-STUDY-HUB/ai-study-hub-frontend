import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { FileText, Search, Download, Eye, ArrowLeft, Star } from 'lucide-react';
import { API_BASE_URL } from '../../api.js';

const removeVietnameseTones = (str) => {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
};

export default function SearchDocumentPage() {
    const navigate = useNavigate();
    const { user } = useApp();
    const [searchParams, setSearchParams] = useSearchParams();

    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const urlQuery = searchParams.get('q') || '';
        if (urlQuery !== searchQuery) {
            setSearchQuery(urlQuery);
        }
    }, [searchParams]);

    useEffect(() => {
        const targetQuery = searchQuery.trim();

        if (!targetQuery) {
            setDocuments([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        const delayDebounceFn = setTimeout(async () => {
            try {
                const cleanQuery = removeVietnameseTones(targetQuery);

                const response = await fetch(`${API_BASE_URL}/api/v1/documents/search?keyword=${encodeURIComponent(cleanQuery)}`, {
                    method: 'GET'
                });

                if (!response.ok) {
                    console.warn(`Backend API search error code: ${response.status}`);
                    setDocuments([]);
                    return;
                }

                const result = await response.json();

                if (result && Array.isArray(result.data)) {
                    setDocuments(result.data);
                } else if (result && Array.isArray(result)) {
                    setDocuments(result);
                } else {
                    setDocuments([]);
                }
            } catch (error) {
                console.error('Error fetching search results from server:', error);
                setDocuments([]);
            } finally {
                setLoading(false);
            }
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const formatBytes = (bytes) => {
        if (!bytes || isNaN(bytes)) return '0.00 MB';
        const mb = bytes / (1024 * 1024);
        return mb < 0.01 ? `${mb.toFixed(3)} MB` : `${mb.toFixed(2)} MB`;
    };

    return (
        <div className="container py-4 text-start">
            <Link
                to={user ? "/user/home" : "/"}
                className="d-inline-flex align-items-center gap-2 text-decoration-none text-muted mb-4"
                style={{ fontSize: '14px' }}
            >
                <ArrowLeft className="h-4 w-4" />
                <span className="fw-medium">Back to Homepage</span>
            </Link>

            <div className="mb-4">
                <h1 className="fw-bold text-dark mb-1" style={{ fontSize: '28px' }}>Search Documents</h1>
                <p className="text-muted">Find study materials from the community by title, tag or description</p>
            </div>

            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                <div className="card-body p-4">
                    <div className="position-relative w-100">
                        <span className="position-absolute top-50 start-0 translate-middle-y ps-3">
                            <Search className="h-4 w-4 text-muted" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search by title, tags, description or keyword..."
                            className="form-control form-control-lg ps-5"
                            style={{ fontSize: '15px', borderRadius: '10px' }}
                            value={searchQuery}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSearchQuery(val);
                                setSearchParams({ q: val }, { replace: true });
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="mb-3">
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                    {loading ? 'Searching...' : `Found ${documents.length} document${documents.length !== 1 ? 's' : ''}`}
                </p>
            </div>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading search results...</span>
                    </div>
                </div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {documents.map((doc) => {
                        // SỬA TẠI ĐÂY: Đọc chính xác trường doc.subject.name từ API thực tế thay vì dùng tags mảng
                        const documentCategoryName = doc.subject?.name || doc.category?.name || 'No Subject';

                        return (
                            <div
                                key={doc.id}
                                className="card shadow-sm border-0 cursor-pointer"
                                style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.15)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                                onClick={() => {
                                    const mappedDoc = {
                                        id: doc.id,
                                        title: doc.title,
                                        description: doc.description || '',
                                        file_type: doc.fileType || doc.file_type || 'pdf',
                                        file_size_bytes: doc.fileSize || doc.file_size_bytes || doc.size || 0,
                                        author: doc.uploader?.fullName || doc.uploader_name || doc.author || 'Community Contributor',
                                        created_at: doc.createdAt || doc.created_at || doc.date || new Date().toISOString(),
                                        views: doc.views || doc.viewCount || 0,
                                        subject: doc.subject?.name || doc.category?.name || (doc.tags?.[0] ? (doc.tags[0].name || doc.tags[0].label || doc.tags[0]) : '') || 'Study Document',
                                        tags: doc.tags || []
                                    };
                                    navigate(user ? `/document/${doc.id}` : `/guest/document/${doc.id}`, { state: { document: mappedDoc } });
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(0, 0, 0, 0.08)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div className="card-body p-4 text-start">
                                    <div className="d-flex align-items-start justify-content-between gap-3 mb-2">
                                        <div className="flex-grow-1">
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <FileText className="h-5 w-5 text-primary" style={{ color: '#C73866' }} />
                                                <h5 className="mb-0 fw-bold text-dark">{doc.title}</h5>
                                            </div>
                                            <p className="text-muted mb-3" style={{ fontSize: '14px' }}>
                                                {doc.description || 'No description available for this document.'}
                                            </p>
                                        </div>

                                        {/* HIỂN THỊ TAG MÔN HỌC CHUẨN TỪ OBJECT SUBJECT CỦA API LÊN GÓC PHẢI */}
                                        <div className="flex-shrink-0">
                                            <span
                                                className="badge px-3 py-2 rounded-pill text-white"
                                                style={{ background: 'linear-gradient(135deg, #FD8F52, #FFBD71)', fontSize: '12px', fontWeight: '500' }}
                                            >
                                                {documentCategoryName}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Giữ lại render mảng tag phụ (nếu sau này hệ thống mở rộng thêm tags) */}
                                    <div className="d-flex flex-wrap gap-2 mb-3">
                                        {doc.tags && (Array.isArray(doc.tags) ? doc.tags : [doc.tags]).map((tag, idx) => {
                                            const tagName = typeof tag === 'object' ? (tag.name || tag.label) : tag;
                                            return tagName ? (
                                                <span key={idx} className="badge bg-light text-dark border px-2 py-1 rounded-pill" style={{ fontSize: '11px' }}>
                                                    {tagName}
                                                </span>
                                            ) : null;
                                        })}
                                    </div>

                                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 text-muted" style={{ fontSize: '13px' }}>
                                        <div className="d-flex align-items-center gap-3">
                                            <span>By {doc.uploader?.fullName || doc.uploaderName || 'Community Contributor'}</span>
                                            <span>•</span>
                                            <span>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-US') : 'N/A'}</span>
                                            <span>•</span>
                                            <span>{formatBytes(doc.fileSize)}</span>
                                        </div>
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="d-flex align-items-center gap-1">
                                                <Star className="h-4 w-4 text-warning fill-warning" style={{ color: '#FFBD71', fill: '#FFBD71' }} />
                                                <span className="fw-medium text-dark">{doc.rating ? doc.rating.toFixed(1) : '0.0'}</span>
                                            </div>
                                            <div className="d-flex align-items-center gap-1">
                                                <Eye className="h-4 w-4" />
                                                <span>{doc.views || 0}</span>
                                            </div>
                                            <div className="d-flex align-items-center gap-1">
                                                <Download className="h-4 w-4" />
                                                <span>{doc.downloads || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && documents.length === 0 && (
                <div className="text-center py-5">
                    <Search className="h-16 w-16 text-muted mx-auto mb-3" />
                    <h5 className="fw-bold text-dark mb-1">No documents found</h5>
                    <p className="text-muted mb-4" style={{ fontSize: '14px' }}>
                        Try adjusting your search terms or keywords.
                    </p>
                    <button
                        className="btn btn-outline-secondary px-4"
                        onClick={() => {
                            setSearchQuery('');
                            setSearchParams({});
                        }}
                    >
                        Clear Search
                    </button>
                </div>
            )}
        </div>
    );
}
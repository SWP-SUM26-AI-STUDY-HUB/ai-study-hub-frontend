import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { FileText, Download, ArrowLeft, Star, Tag } from 'lucide-react';
import { API_BASE_URL } from '../../api.js';

const removeVietnameseTones = (str) => {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
};

const highlightText = (text, keyword) => {
    if (!text) return '';
    if (!keyword || !keyword.trim()) return <span>{text}</span>;

    const cleanText = removeVietnameseTones(text).toLowerCase();
    const cleanKeyword = removeVietnameseTones(keyword).toLowerCase();

    if (!cleanText.includes(cleanKeyword)) {
        return <span>{text}</span>;
    }

    const keywordLen = cleanKeyword.length;
    const parts = [];
    let lastIdx = 0;
    let idx = cleanText.indexOf(cleanKeyword);

    while (idx !== -1) {
        if (idx > lastIdx) {
            parts.push(text.substring(lastIdx, idx));
        }
        const matchStr = text.substring(idx, idx + keywordLen);
        parts.push(
            <mark key={idx} style={{ backgroundColor: '#FFEAD9', color: '#C73866', padding: '1px 3px', borderRadius: '4px', fontWeight: 'bold' }}>
                {matchStr}
            </mark>
        );
        lastIdx = idx + keywordLen;
        idx = cleanText.indexOf(cleanKeyword, lastIdx);
    }

    if (lastIdx < text.length) {
        parts.push(text.substring(lastIdx));
    }

    return <span>{parts}</span>;
};

const fetchAverageRatings = async (docs, token) => {
    if (!Array.isArray(docs) || docs.length === 0) return docs;

    const needsFetch = docs.some(doc => doc.averageRating === undefined);
    if (!needsFetch) return docs;

    return Promise.all(docs.map(async (doc) => {
        if (doc.averageRating !== undefined) return doc;
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/${doc.id}/reviews`, {
                method: 'GET',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const result = await response.json();
                if (result && Array.isArray(result.data) && result.data.length > 0) {
                    const averageRating = (result.data[0].averageRating !== undefined && result.data[0].averageRating !== null)
                        ? result.data[0].averageRating
                        : (result.data.reduce((sum, r) => sum + (r.rating || 0), 0) / result.data.length);
                    return {
                        ...doc,
                        averageRating,
                        reviewCount: result.data.length
                    };
                }
            }
        } catch (error) {
            console.error(`Error fetching reviews for document ${doc.id}:`, error);
        }
        return {
            ...doc,
            averageRating: 0,
            reviewCount: 0
        };
    }));
};

const getDocumentTags = (tagsField) => {
    if (!tagsField) return [];
    if (Array.isArray(tagsField)) {
        return tagsField.map(t => (t && typeof t === 'object') ? (t.label || t.name || t.tagName || '') : String(t)).filter(Boolean);
    }
    if (typeof tagsField === 'object') {
        return Object.values(tagsField).map(t => (t && typeof t === 'object') ? (t.label || t.name || t.tagName || '') : String(t)).filter(Boolean);
    }
    if (typeof tagsField === 'string') {
        return tagsField.split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
};

export default function TagDocumentsPage() {
    const { tagName } = useParams();
    const navigate = useNavigate();
    const { user } = useApp();

    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTagDocuments = async () => {
            if (!tagName) return;
            try {
                setLoading(true);
                const cleanQuery = removeVietnameseTones(tagName);
                
                const response = await fetch(`${API_BASE_URL}/api/v1/documents/search?keyword=${encodeURIComponent(cleanQuery)}`, {
                    method: 'GET'
                });

                if (!response.ok) {
                    setDocuments([]);
                    return;
                }

                const result = await response.json();
                let docsList = [];
                if (result && Array.isArray(result.data)) {
                    docsList = result.data;
                } else if (result && Array.isArray(result)) {
                    docsList = result;
                }

                const token = localStorage.getItem('token');
                const docsWithRatings = await fetchAverageRatings(docsList, token);
                
                // Client-side filter: only keep documents that actually have the clicked tag in their tags mapping
                const filterQuery = removeVietnameseTones(tagName).trim().toLowerCase();
                const filteredDocs = docsWithRatings.filter(doc => {
                    const docTags = getDocumentTags(doc.tags || doc.tagNames || doc.subject);
                    return docTags.some(tag => removeVietnameseTones(tag).trim().toLowerCase() === filterQuery);
                });
                
                setDocuments(filteredDocs);
            } catch (error) {
                console.error('Error fetching documents for tag:', error);
                setDocuments([]);
            } finally {
                setLoading(false);
            }
        };

        fetchTagDocuments();
    }, [tagName]);

    const formatBytes = (bytes) => {
        if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        if (i < 0 || !isFinite(i)) return '0 Bytes';
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    const sortedDocuments = [...documents].sort((a, b) => {
        const countA = a.downloadCount ?? a.downloads ?? 0;
        const countB = b.downloadCount ?? b.downloads ?? 0;
        return countB - countA;
    });

    return (
        <div className="container py-5 text-start">
            <Link
                to={user ? "/user/home" : "/"}
                className="d-inline-flex align-items-center gap-2 text-decoration-none text-muted mb-4"
                style={{ fontSize: '14px' }}
            >
                <ArrowLeft className="h-4 w-4" />
                <span className="fw-medium">Back to Homepage</span>
            </Link>

            <div className="mb-4 d-flex align-items-center gap-3">
                <div className="d-flex align-items-center justify-content-center text-white rounded-circle shadow-sm" style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}>
                    <Tag size={22} />
                </div>
                <div>
                    <h1 className="fw-bold text-dark mb-1" style={{ fontSize: '28px' }}>Topic: {tagName}</h1>
                    <p className="text-muted mb-0">Browse all documents matching tag topic</p>
                </div>
            </div>

            <div className="mb-4">
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                    {loading ? 'Loading documents...' : `Found ${documents.length} document${documents.length !== 1 ? 's' : ''}`}
                </p>
            </div>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status" style={{ color: '#FD8F52' }}>
                        <span className="visually-hidden">Loading documents...</span>
                    </div>
                </div>
            ) : sortedDocuments.length === 0 ? (
                <div className="text-center py-5 border rounded-3 bg-light text-muted">
                    No documents found matching the topic "{tagName}".
                </div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {sortedDocuments.map((doc) => {
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
                                        author: doc.uploader?.fullName || doc.uploader?.name || doc.uploader_name || doc.author || '',
                                        created_at: doc.createdAt || doc.created_at || doc.date || '',
                                        views: doc.views || doc.viewCount || 0,
                                        subject: doc.subject?.name || doc.subject || doc.category?.name || (doc.tags?.[0] ? (doc.tags[0].name || doc.tags[0].label || doc.tags[0]) : '') || '',
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
                                            {(() => {
                                                const tagsList = getDocumentTags(doc.tags || doc.tagNames || doc.subject);
                                                if (!tagsList.length) return null;
                                                return (
                                                    <div className="d-flex flex-wrap gap-1.5 mb-3">
                                                        {tagsList.map((tag, idx) => (
                                                            <span 
                                                                key={idx} 
                                                                className="badge text-white px-2.5 py-1 border-0 rounded-pill" 
                                                                style={{ background: 'linear-gradient(135deg, #FD8F52, #FFBD71)', fontSize: '11px', fontWeight: '500' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate(`/tag/${encodeURIComponent(tag)}`);
                                                                }}
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 text-muted" style={{ fontSize: '13px' }}>
                                        <div className="d-flex align-items-center gap-3">
                                            <span>By {doc.uploader?.fullName || doc.uploader?.name || doc.uploaderName || doc.uploader_name || ''}</span>
                                            <span>•</span>
                                            <span>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-US') : 'N/A'}</span>
                                            <span>•</span>
                                            <span>{formatBytes(doc.fileSizeBytes ?? doc.fileSize ?? doc.size ?? doc.file_size_bytes)}</span>
                                        </div>
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="d-flex align-items-center gap-1">
                                                <Star className="h-4 w-4 text-warning fill-warning" style={{ color: '#FFBD71', fill: '#FFBD71' }} />
                                                <span className="fw-medium text-dark">{Number(doc.averageRating ?? doc.rating ?? 0).toFixed(1)}</span>
                                            </div>
                                            <div className="d-flex align-items-center gap-1">
                                                <Download className="h-4 w-4" />
                                                <span>{doc.downloadCount ?? doc.downloads ?? 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { mockDocuments } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { FileText, Search, Filter, Download, Eye, ArrowLeft, Star } from 'lucide-react';

export default function SearchDocumentPage() {
    const navigate = useNavigate();
    const { user } = useApp();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [subjectFilter, setSubjectFilter] = useState(searchParams.get('subject') || 'all');
    const [sortBy, setSortBy] = useState('rating');

    useEffect(() => {
        const q = searchParams.get('q') || '';
        const subject = searchParams.get('subject') || 'all';
        setSearchQuery((prev) => (prev !== q ? q : prev));
        setSubjectFilter((prev) => (prev !== subject ? subject : prev));
    }, [searchParams]);

    const publicDocuments = mockDocuments.filter((doc) => doc.status === 'public');

    const filteredDocuments = publicDocuments.filter((doc) => {
        // Search only based on the name (title) of the document
        const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesSubject = subjectFilter === 'all' || doc.subject === subjectFilter;

        return matchesSearch && matchesSubject;
    });

    const sortedDocuments = [...filteredDocuments].sort((a, b) => {
        switch (sortBy) {
            case 'rating':
                return (b.rating || 0) - (a.rating || 0);
            case 'date':
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            case 'downloads':
                return b.downloads - a.downloads;
            case 'views':
                return b.views - a.views;
            default:
                return 0;
        }
    });

    const subjects = Array.from(new Set(publicDocuments.map((doc) => doc.subject)));

    const formatBytes = (bytes) => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    return (
        <div className="container py-4 text-start">
            {/* NÚT QUAY VỀ TRANG CHỦ USER */}
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
                <p className="text-muted">Find study materials from the community</p>
            </div>

            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                <div className="card-body p-4">
                    <div className="row g-3">
                        {/* Search query input */}
                        <div className="col-12 col-md flex-grow-1 position-relative">
                            <span className="position-absolute top-50 start-0 translate-middle-y ps-3">
                                <Search className="h-4 w-4 text-muted" />
                            </span>
                            <input
                                type="text"
                                placeholder="Search by title..."
                                className="form-control ps-5"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setSearchParams({ q: e.target.value, subject: subjectFilter }, { replace: true });
                                }}
                            />
                        </div>

                        {/* Subject filter */}
                        <div className="col-12 col-md-auto d-flex align-items-center gap-2" style={{ minWidth: '200px' }}>
                            <Filter className="h-4 w-4 text-muted flex-shrink-0" />
                            <select
                                className="form-select"
                                value={subjectFilter}
                                onChange={(e) => {
                                    setSubjectFilter(e.target.value);
                                    setSearchParams({ q: searchQuery, subject: e.target.value }, { replace: true });
                                }}
                            >
                                <option value="all">All Subjects</option>
                                {subjects.map((subject) => (
                                    <option key={subject} value={subject}>
                                        {subject}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Sort filter */}
                        <div className="col-12 col-md-auto" style={{ minWidth: '200px' }}>
                            <select
                                className="form-select"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="rating">Rating</option>
                                <option value="date">Date</option>
                                <option value="downloads">Downloads</option>
                                <option value="views">Views</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-3">
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                    Found {sortedDocuments.length} document{sortedDocuments.length !== 1 ? 's' : ''}
                </p>
            </div>

            <div className="d-flex flex-column gap-3">
                {sortedDocuments.map((doc) => (
                    <div
                        key={doc.id}
                        className="card shadow-sm border-0 cursor-pointer"
                        style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.15)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                        onClick={() => navigate(user ? `/document/${doc.id}` : `/guest/document/${doc.id}`)}
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
                            <div className="d-flex items-start justify-content-between gap-3 mb-2">
                                <div className="flex-grow-1">
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <FileText className="h-5 w-5 text-primary" style={{ color: '#C73866' }} />
                                        <h5 className="mb-0 fw-bold text-dark">{doc.title}</h5>
                                    </div>
                                    <p className="text-muted mb-3" style={{ fontSize: '14px' }}>{doc.description}</p>
                                </div>
                                <span className="badge text-warning-emphasis bg-warning-subtle px-3 py-2 rounded-pill" style={{ fontSize: '12px' }}>
                                    {doc.subject}
                                </span>
                            </div>

                            <div className="d-flex flex-wrap gap-2 mb-3">
                                {doc.tags.map((tag) => (
                                    <span key={tag} className="badge bg-light text-dark border px-2 py-1 rounded-pill" style={{ fontSize: '11px' }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 text-muted" style={{ fontSize: '13px' }}>
                                <div className="d-flex align-items-center gap-3">
                                    <span>By {doc.author}</span>
                                    <span>•</span>
                                    <span>{new Date(doc.date).toLocaleDateString('en-US')}</span>
                                    <span>•</span>
                                    <span>{formatBytes(doc.size)}</span>
                                </div>
                                <div className="d-flex align-items-center gap-3">
                                    <div className="d-flex align-items-center gap-1">
                                        <Star className="h-4 w-4 text-warning fill-warning" style={{ color: '#FFBD71', fill: '#FFBD71' }} />
                                        <span className="fw-medium text-dark">{doc.rating ? doc.rating.toFixed(1) : '0.0'}</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-1">
                                        <Eye className="h-4 w-4" />
                                        <span>{doc.views}</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-1">
                                        <Download className="h-4 w-4" />
                                        <span>{doc.downloads}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {sortedDocuments.length === 0 && (
                <div className="text-center py-5">
                    <Search className="h-16 w-16 text-muted mx-auto mb-3" />
                    <h5 className="fw-bold text-dark mb-1">No documents found</h5>
                    <p className="text-muted mb-4" style={{ fontSize: '14px' }}>
                        Try adjusting your search terms or filters
                    </p>
                    <button
                        className="btn btn-outline-secondary px-4"
                        onClick={() => {
                            setSearchQuery('');
                            setSubjectFilter('all');
                            setSearchParams({});
                        }}
                    >
                        Clear Filters
                    </button>
                </div>
            )}
        </div>
    );
}

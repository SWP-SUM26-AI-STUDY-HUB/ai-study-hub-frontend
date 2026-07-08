import { useState, useEffect } from 'react';
import { useNavigate } from "react-router";
import { FileText, Star, Download, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../../api.js';

export default function HomePage() {
    const navigate = useNavigate();

    // States cho Section 2: Trending Documents
    const [trendingDocs, setTrendingDocs] = useState([]);
    const [loadingTrending, setLoadingTrending] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [size] = useState(5);

    // States cho Section 1: Recommended Documents
    const [recommendedDocs, setRecommendedDocs] = useState([]);
    const [loadingRecs, setLoadingRecs] = useState(true);

    // Đọc trạng thái xem user có bấm nút Skip khảo sát trước đó không
    const isSurveySkipped = localStorage.getItem('skippedSurvey') === 'true';

    // EFFECT 1: ĐỌC API RECOMMENDATIONS (SECTION 1)
    useEffect(() => {
        if (isSurveySkipped) {
            setLoadingRecs(false);
            return;
        }

        const fetchRecommendedDocuments = async () => {
            try {
                setLoadingRecs(true);
                const token = localStorage.getItem('token');

                const response = await fetch(`${API_BASE_URL}/api/v1/documents/recommendations`, {
                    method: 'GET',
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : '',
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) throw new Error(`Recommendations API failure: ${response.status}`);
                const result = await response.json();

                if (result && result.success && Array.isArray(result.data)) {
                    setRecommendedDocs(result.data);
                } else if (result && result.data && Array.isArray(result.data.content)) {
                    setRecommendedDocs(result.data.content);
                } else {
                    setRecommendedDocs([]);
                }
            } catch (error) {
                console.error('Error loading recommended documents:', error);
                setRecommendedDocs([]);
            } finally {
                setLoadingRecs(false);
            }
        };

        fetchRecommendedDocuments();
    }, [isSurveySkipped]);

    // EFFECT 2: ĐỌC API TRENDING (SECTION 2)
    useEffect(() => {
        const fetchTrendingDocuments = async () => {
            try {
                setLoadingTrending(true);
                const token = localStorage.getItem('token');

                const response = await fetch(`${API_BASE_URL}/api/v1/documents/trending?page=${page}&size=${size}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : '',
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) throw new Error(`Trending API failure: ${response.status}`);
                const result = await response.json();

                if (result && result.data && Array.isArray(result.data.content)) {
                    setTrendingDocs(result.data.content);
                    setTotalPages(result.data.totalPages || 1);
                } else if (result && result.data && Array.isArray(result.data)) {
                    setTrendingDocs(result.data);
                    setTotalPages(1);
                } else if (result && Array.isArray(result.data)) {
                    setTrendingDocs(result.data);
                    setTotalPages(1);
                } else {
                    setTrendingDocs([]);
                    setTotalPages(1);
                }
            } catch (error) {
                console.error('Error loading trending documents:', error);
                setTrendingDocs([]);
                setTotalPages(1);
            } finally {
                setLoadingTrending(false);
            }
        };

        fetchTrendingDocuments();
    }, [page]);

    const formatBytes = (bytes) => {
        if (!bytes || isNaN(bytes)) return '0.00 MB';
        const mb = bytes / (1024 * 1024);
        return mb < 0.01 ? `${mb.toFixed(3)} MB` : `${mb.toFixed(2)} MB`;
    };

    // Hàm render giao diện chung cho từng item card tài liệu
    const renderDocumentCard = (doc) => {
        const fileExt = doc.title?.split('.').pop().toUpperCase() || 'PDF';

        return (
            <div
                key={doc.id}
                className="card shadow-sm border-0 cursor-pointer animate-fade-in"
                style={{
                    borderRadius: '1rem',
                    backgroundColor: 'var(--bg-card-container)',
                    border: '1px solid var(--border-color)',
                    transition: 'transform 0.15s, box-shadow 0.15s, background-color 0.3s, border-color 0.3s'
                }}
                onClick={() => navigate(`/document/${doc.id}`)}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(0, 0, 0, 0.06)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                <div className="card-body p-4 text-start d-flex gap-3 align-items-start">
                    {/* Visual Preview Thumbnail Cover */}
                    <div className="doc-thumbnail" style={{ backgroundColor: 'var(--bg-global)', border: '1px solid var(--border-color)' }}>
                        <span className="doc-thumbnail-banner">{fileExt}</span>
                        <div className="doc-thumbnail-title">{doc.title}</div>
                    </div>

                    <div className="flex-grow-1">
                        <div className="d-flex align-items-start justify-content-between gap-3 mb-2">
                            <div className="flex-grow-1">
                                <div className="d-flex align-items-center gap-2 mb-1">
                                    <FileText className="h-5 w-5 text-primary" style={{ color: '#C73866' }} />
                                    {/* FIX: Sử dụng màu chữ chính từ CSS Variable */}
                                    <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-main)' }}>{doc.title}</h5>
                                </div>
                                {/* FIX: Sử dụng màu chữ phụ sáng rõ từ CSS Variable */}
                                <p className="mb-2 text-truncate-2" style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
                                    {doc.description || 'No description available for this document.'}
                                </p>
                            </div>

                            {/* Gom các thẻ tag sang góc bên phải giống hệt hình ảnh image_acb5a8.png */}
                            <div className="flex-shrink-0 d-flex flex-wrap gap-1.5 justify-content-end" style={{ maxWidth: '240px' }}>
                                {doc.tags && (Array.isArray(doc.tags) ? doc.tags : Object.values(doc.tags)).length > 0 ? (
                                    (Array.isArray(doc.tags) ? doc.tags : Object.values(doc.tags)).map((tag, idx) => {
                                        const tagName = typeof tag === 'object' ? (tag.label || tag.name) : tag;
                                        return tagName ? (
                                            <span
                                                key={idx}
                                                className="badge px-3 py-2 rounded-pill text-white"
                                                style={{ background: 'var(--bg-tag)', fontSize: '12px', fontWeight: '500', transition: 'background 0.3s ease' }}
                                            >
                                                {tagName}
                                            </span>
                                        ) : null;
                                    })
                                ) : (
                                    <span
                                        className="badge px-3 py-2 rounded-pill text-white"
                                        style={{ background: 'var(--bg-tag)', fontSize: '12px', fontWeight: '500', transition: 'background 0.3s ease' }}
                                    >
                                        General
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Thống kê chi tiết - FIX: Áp dụng màu biến động */}
                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mt-3" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            <div className="d-flex align-items-center gap-3">
                                <span>By {doc.uploader?.fullName || 'Community Contributor'}</span>
                                <span>•</span>
                                <span>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-US') : 'N/A'}</span>
                                <span>•</span>
                                <span>{formatBytes(doc.fileSizeBytes || doc.fileSize)}</span>
                            </div>
                            <div className="d-flex align-items-center gap-3">
                                <div className="d-flex align-items-center gap-1">
                                    <Star className="h-4 w-4 text-warning fill-warning" style={{ color: '#FFBD71', fill: '#FFBD71' }} />
                                    <span className="fw-medium" style={{ color: 'var(--text-main)' }}>
                                        {((doc.averageRating !== undefined && doc.averageRating !== null) ? doc.averageRating : (doc.rating !== undefined && doc.rating !== null) ? doc.rating : 0).toFixed(1)}
                                    </span>
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                    <Download className="h-4 w-4" />
                                    <span>{doc.downloads || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="container py-4 text-center">
            {/* Global Styles cho Thumbnail */}
            <style>{`
                .doc-thumbnail {
                    width: 90px;
                    height: 120px;
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    padding: 8px;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.04);
                    flex-shrink: 0;
                }
                .doc-thumbnail-banner {
                    background: #FD8F52;
                    color: white;
                    font-size: 8px;
                    font-weight: bold;
                    padding: 1px 4px;
                    border-radius: 3px;
                    align-self: flex-start;
                }
                .doc-thumbnail-title {
                    font-size: 8px;
                    font-weight: 700;
                    color: #C73866;
                    text-align: left;
                    line-height: 1.2;
                    display: -webkit-box;
                    -webkit-line-clamp: 4;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
            `}</style>

            {/* SECTION 1: RECOMMENDED FOR YOU */}
            {!isSurveySkipped && (
                <div className="card shadow-sm border-0 mb-5" style={{ borderRadius: '1rem', backgroundColor: 'var(--bg-card-container)', border: '1px solid var(--border-color)' }}>
                    <div className="card-body p-4 text-start">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <div className="rounded" style={{ width: '4px', height: '24px', background: 'linear-gradient(to bottom, #C73866, #FD8F52)' }}></div>
                            <Sparkles className="h-5 w-5" style={{ color: '#C73866' }} />
                            <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-main)', letterSpacing: '-0.3px' }}>RECOMMENDED FOR YOU</h5>
                        </div>

                        {loadingRecs ? (
                            <div className="text-center py-5">
                                <div className="spinner-border" role="status" style={{ color: '#C73866' }}>
                                    <span className="visually-hidden">Loading recommendations...</span>
                                </div>
                            </div>
                        ) : recommendedDocs.length === 0 ? (
                            <div className="text-center text-muted py-5 rounded-3" style={{ border: '1px dashed var(--border-color)', backgroundColor: 'var(--bg-global)' }}>
                                Select your favorite interests in profile settings to activate AI custom recommendations!
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {recommendedDocs.map((doc) => renderDocumentCard(doc))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SECTION 2: TRENDING DOCUMENTS */}
            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '1rem', backgroundColor: 'var(--bg-card-container)', border: '1px solid var(--border-color)' }}>
                <div className="card-body p-4 text-start">
                    <div className="d-flex align-items-center gap-2 mb-4">
                        <div className="rounded" style={{ width: '4px', height: '24px', background: 'linear-gradient(to bottom, #FD8F52, #FFBD71)' }}></div>
                        <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-main)' }}>TRENDING STUDY DOCUMENTS</h5>
                    </div>

                    {loadingTrending ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading trending documents...</span>
                            </div>
                        </div>
                    ) : trendingDocs.length === 0 ? (
                        <div className="text-center text-muted py-4" style={{ color: 'var(--text-muted)' }}>No trending documents available at the moment.</div>
                    ) : (
                        <div>
                            <div className="d-flex flex-column gap-3">
                                {trendingDocs.map((doc) => renderDocumentCard(doc))}
                            </div>

                            {/* Pagination controls for homepage */}
                            {totalPages > 1 && (
                                <div className="d-flex justify-content-center align-items-center gap-2 mt-4">
                                    <button
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                        className="btn btn-sm btn-outline-primary px-3 py-1.5 rounded-pill"
                                        style={{ borderColor: '#FD8F52', color: '#FD8F52' }}
                                    >
                                        Prev
                                    </button>
                                    {[...Array(totalPages).keys()].map((pageNum) => (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`btn btn-sm px-3 py-1.5 rounded-pill ${page === pageNum ? 'btn-primary' : 'btn-outline-primary'}`}
                                            style={{
                                                background: page === pageNum ? 'linear-gradient(135deg, #C73866, #FD8F52)' : 'transparent',
                                                borderColor: '#FD8F52',
                                                color: page === pageNum ? '#fff' : '#FD8F52',
                                                fontWeight: '600'
                                            }}
                                        >
                                            {pageNum + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                        disabled={page === totalPages - 1}
                                        className="btn btn-sm btn-outline-primary px-3 py-1.5 rounded-pill"
                                        style={{ borderColor: '#FD8F52', color: '#FD8F52' }}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
}
import { useState, useEffect } from 'react';
import { useNavigate } from "react-router";
import { FileText, Star, Download, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../../api.js';

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

export default function HomePage() {
    const navigate = useNavigate();

    // States cho Section 2: Trending Documents
    const [allFilteredDocs, setAllFilteredDocs] = useState([]);
    const [trendingDocs, setTrendingDocs] = useState([]);
    const [loadingTrending, setLoadingTrending] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [size] = useState(5);

    // States cho Section 1: Recommended Documents
    const [recommendedDocs, setRecommendedDocs] = useState([]);
    const [loadingRecs, setLoadingRecs] = useState(true);

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

                let docsList = [];
                if (result && result.success && Array.isArray(result.data)) {
                    docsList = result.data;
                } else if (result && result.data && Array.isArray(result.data.content)) {
                    docsList = result.data.content;
                }

                const docsWithRatings = await fetchAverageRatings(docsList, token);
                setRecommendedDocs(docsWithRatings);
            } catch (error) {
                console.error('Error loading recommended documents:', error);
                setRecommendedDocs([]);
            } finally {
                setLoadingRecs(false);
            }
        };

        fetchRecommendedDocuments();
    }, [isSurveySkipped]);

    // EFFECT 2: ĐỌC API TRENDING VÀ LỌC DATA > 0.0
    useEffect(() => {
        const fetchTrendingDocuments = async () => {
            try {
                setLoadingTrending(true);
                const token = localStorage.getItem('token');

                const response = await fetch(`${API_BASE_URL}/api/v1/documents/trending?page=0&size=100`, {
                    method: 'GET',
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : '',
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) throw new Error(`Trending API failure: ${response.status}`);
                const result = await response.json();

                let rawDocs = [];
                if (result && result.data && Array.isArray(result.data.content)) {
                    rawDocs = result.data.content;
                } else if (result && Array.isArray(result.data)) {
                    rawDocs = result.data;
                }

                // CHỈ lấy những tài liệu có điểm rating thực sự > 0.0 ở Trending
                const filtered = rawDocs.filter(item => {
                    const core = item.document ? item.document : item;
                    const rate = item.rating ?? item.averageRating ?? core.rating ?? core.averageRating ?? 0;
                    return Number(rate) > 0;
                });

                setAllFilteredDocs(filtered);
                setTotalPages(Math.ceil(filtered.length / size) || 1);
                setPage(0);

            } catch (error) {
                console.error('Error loading trending documents:', error);
                setAllFilteredDocs([]);
                setTotalPages(1);
            } finally {
                setLoadingTrending(false);
            }
        };

        fetchTrendingDocuments();
    }, [size]);

    // EFFECT 3: CẮT MẢNG PHÂN TRANG (5 ITEMS / PAGE) CHO TRENDING
    useEffect(() => {
        const startIndex = page * size;
        const endIndex = startIndex + size;
        setTrendingDocs(allFilteredDocs.slice(startIndex, endIndex));
    }, [page, allFilteredDocs, size]);

    const formatBytes = (bytes) => {
        if (!bytes || isNaN(bytes)) return '0.00 MB';
        const mb = bytes / (1024 * 1024);
        return mb < 0.01 ? `${mb.toFixed(3)} MB` : `${mb.toFixed(2)} MB`;
    };

    // ==========================================
    // 📦 ĐỌC LẦN 1: DÀNH RIÊNG CHO RECOMMENDED (ĐÃ FIX PHẲNG ĐÚNG ĐƯỜNG DẪN)
    // ==========================================
    const renderRecommendedCard = (item) => {
        const fileExt = item.title?.split('.').pop().toUpperCase() || 'PDF';

        // Đọc trực tiếp tầng phẳng của API Gợi ý
        const recRating = item.rating ?? item.averageRating ?? 0;
        const recDownloads = item.downloadCount ?? item.downloads ?? item.download_count ?? 0;

        return (
            <div key={item.id} className="card shadow-sm border-0 cursor-pointer mb-3" style={{ borderRadius: '1rem', backgroundColor: 'var(--bg-card-container)', border: '1px solid var(--border-color)' }} onClick={() => navigate(`/document/${item.id}`)}>
                <div className="card-body p-4 text-start d-flex gap-3 align-items-start">
                    <div className="doc-thumbnail" style={{ backgroundColor: 'var(--bg-global)', border: '1px solid var(--border-color)' }}>
                        <span className="doc-thumbnail-banner">{fileExt}</span>
                        <div className="doc-thumbnail-title">{item.title}</div>
                    </div>
                    <div className="flex-grow-1">
                        <div className="d-flex align-items-start justify-content-between gap-3 mb-2">
                            <div>
                                <div className="d-flex align-items-center gap-2 mb-1">
                                    <FileText className="h-5 w-5 text-primary" style={{ color: '#C73866' }} />
                                    <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-main)' }}>{item.title}</h5>
                                </div>
                                <p className="mb-2 text-truncate-2" style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>{item.description || 'No description available for this document.'}</p>
                            </div>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-3" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            <div>By {item.uploader?.fullName || 'Community Contributor'} • {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US') : 'N/A'} • {formatBytes(item.fileSizeBytes || item.fileSize)}</div>
                            <div className="d-flex align-items-center gap-3">
                                <div className="d-flex align-items-center gap-1">
                                    <Star className="h-4 w-4 text-warning fill-warning" style={{ color: '#FFBD71', fill: '#FFBD71' }} />
                                    <span className="fw-medium" style={{ color: 'var(--text-main)' }}>{Number(recRating).toFixed(1)}</span>
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                    <Download className="h-4 w-4" />
                                    <span>{recDownloads}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ==========================================
    // 📦 ĐỌC LẦN 2: DÀNH RIÊNG CHO TRENDING 
    // ==========================================
    const renderTrendingCard = (item) => {
        const fileExt = item.title?.split('.').pop().toUpperCase() || 'PDF';

        const trendRating = item.rating ?? item.averageRating ?? 0;
        const trendDownloads = item.downloadCount ?? item.downloads ?? item.download_count ?? 0;

        return (
            <div key={item.id} className="card shadow-sm border-0 cursor-pointer mb-3" style={{ borderRadius: '1rem', backgroundColor: 'var(--bg-card-container)', border: '1px solid var(--border-color)' }} onClick={() => navigate(`/document/${item.id}`)}>
                <div className="card-body p-4 text-start d-flex gap-3 align-items-start">
                    <div className="doc-thumbnail" style={{ backgroundColor: 'var(--bg-global)', border: '1px solid var(--border-color)' }}>
                        <span className="doc-thumbnail-banner">{fileExt}</span>
                        <div className="doc-thumbnail-title">{item.title}</div>
                    </div>
                    <div className="flex-grow-1">
                        <div className="d-flex align-items-start justify-content-between gap-3 mb-2">
                            <div>
                                <div className="d-flex align-items-center gap-2 mb-1">
                                    <FileText className="h-5 w-5 text-primary" style={{ color: '#C73866' }} />
                                    <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-main)' }}>{item.title}</h5>
                                </div>
                                <p className="mb-2 text-truncate-2" style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>{item.description || 'No description available for this document.'}</p>
                            </div>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-3" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            <div>By {item.uploader?.fullName || 'Community Contributor'} • {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US') : 'N/A'} • {formatBytes(item.fileSizeBytes || item.fileSize)}</div>
                            <div className="d-flex align-items-center gap-3">
                                <div className="d-flex align-items-center gap-1">
                                    <Star className="h-4 w-4 text-warning fill-warning" style={{ color: '#FFBD71', fill: '#FFBD71' }} />
                                    <span className="fw-medium" style={{ color: 'var(--text-main)' }}>{Number(trendRating).toFixed(1)}</span>
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                    <Download className="h-4 w-4" />
                                    <span>{trendDownloads}</span>
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
            <style>{`
                .doc-thumbnail { width: 90px; height: 120px; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between; padding: 8px; position: relative; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.04); flex-shrink: 0; }
                .doc-thumbnail-banner { background: #FD8F52; color: white; font-size: 8px; font-weight: bold; padding: 1px 4px; border-radius: 3px; align-self: flex-start; }
                .doc-thumbnail-title { font-size: 8px; font-weight: 700; color: #C73866; text-align: left; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
            `}</style>

            {/* SECTION 1: RECOMMENDED FOR YOU */}
            {!isSurveySkipped && (
                <div className="card shadow-sm border-0 mb-5" style={{ borderRadius: '1rem', backgroundColor: 'var(--bg-card-container)', border: '1px solid var(--border-color)' }}>
                    <div className="card-body p-4 text-start">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <div className="rounded" style={{ width: '4px', height: '24px', background: 'linear-gradient(to bottom, #C73866, #FD8F52)' }}></div>
                            <Sparkles className="h-5 w-5" style={{ color: '#C73866' }} />
                            <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-main)' }}>RECOMMENDED FOR YOU</h5>
                        </div>

                        {loadingRecs ? (
                            <div className="text-center py-5"><div className="spinner-border" style={{ color: '#C73866' }}></div></div>
                        ) : recommendedDocs.length === 0 ? (
                            <div className="text-center text-muted py-5">Select your favorite interests in profile settings to activate AI custom recommendations!</div>
                        ) : (
                            <div>{recommendedDocs.map((doc) => renderRecommendedCard(doc))}</div>
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
                        <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
                    ) : trendingDocs.length === 0 ? (
                        <div className="text-center text-muted py-4">No trending documents available at the moment.</div>
                    ) : (
                        <div>
                            <div>{trendingDocs.map((doc) => renderTrendingCard(doc))}</div>

                            {/* Cụm nút phân trang động chuẩn số lượng phần tử thực tế */}
                            {totalPages > 1 && (
                                <div className="d-flex justify-content-center align-items-center gap-2 mt-4">
                                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn btn-sm btn-outline-primary px-3 py-1.5 rounded-pill" style={{ borderColor: '#FD8F52', color: '#FD8F52' }}>Prev</button>
                                    {[...Array(totalPages).keys()].map((pageNum) => (
                                        <button key={pageNum} onClick={() => setPage(pageNum)} className={`btn btn-sm px-3 py-1.5 rounded-pill ${page === pageNum ? 'btn-primary' : 'btn-outline-primary'}`} style={{ background: page === pageNum ? 'linear-gradient(135deg, #C73866, #FD8F52)' : 'transparent', borderColor: '#FD8F52', color: page === pageNum ? '#fff' : '#FD8F52', fontWeight: '600' }}>{pageNum + 1}</button>
                                    ))}
                                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="btn btn-sm btn-outline-primary px-3 py-1.5 rounded-pill" style={{ borderColor: '#FD8F52', color: '#FD8F52' }}>Next</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
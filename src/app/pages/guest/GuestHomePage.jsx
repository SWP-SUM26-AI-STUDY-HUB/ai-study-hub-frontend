import { useState, useEffect } from 'react';
import { useNavigate } from "react-router";
import { FileText, Star, Download } from 'lucide-react';
import { API_BASE_URL } from '../../api.js';

export default function GuestHomePage() {
  const navigate = useNavigate();
  const [trendingDocs, setTrendingDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [size] = useState(5); // Show 5 items per page for clearer pagination demo

  // GỌI API TRENDING DOCUMENTS DÀNH CHO GUEST (KHÔNG CẦN BEARER TOKEN)
  useEffect(() => {
    const fetchTrendingDocuments = async () => {
      try {
        setLoading(true);

        // 1. Thử gọi API trending chính thức
        let response = await fetch(`${API_BASE_URL}/api/v1/documents/trending?page=${page}&size=${size}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        let isFallback = false;
        // 2. Nếu API trending trả về 401 (chưa đăng nhập) hoặc lỗi khác, dùng API search công khai làm fallback cứu cánh
        if (response.status === 401 || !response.ok) {
          console.warn('Trending API returned 401 or error. Falling back to public search endpoint.');
          response = await fetch(`${API_BASE_URL}/api/v1/documents/search?keyword=.&page=${page}&size=${size}`, {
            method: 'GET'
          });
          isFallback = true;
        }

        if (!response.ok) throw new Error('API request failed');
        const result = await response.json();

        if (isFallback) {
          // Xử lý dữ liệu trả về từ API Search công khai, sắp xếp theo rating giảm dần để giả lập "Trending"
          if (result && Array.isArray(result.data)) {
            const sorted = [...result.data].sort((a, b) => {
              const ratingA = a.averageRating || a.rating || 0;
              const ratingB = b.averageRating || b.rating || 0;
              return ratingB - ratingA;
            });
            setTotalPages(Math.ceil(sorted.length / size) || 1);
            setTrendingDocs(sorted.slice(page * size, (page + 1) * size));
          } else if (result && result.data && Array.isArray(result.data.content)) {
            const sorted = [...result.data.content].sort((a, b) => {
              const ratingA = a.averageRating || a.rating || 0;
              const ratingB = b.averageRating || b.rating || 0;
              return ratingB - ratingA;
            });
            setTrendingDocs(sorted);
            setTotalPages(result.data.totalPages || 1);
          } else {
            setTrendingDocs([]);
            setTotalPages(1);
          }
        } else {
          // Xử lý dữ liệu từ API trending chính thức
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
        }
      } catch (error) {
        console.error('Error loading documents for guest:', error);
        setTrendingDocs([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingDocuments();
  }, [page]);

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0.00 MB';
    const mb = bytes / (1024 * 1024);
    return mb < 0.01 ? `${mb.toFixed(3)} MB` : `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="container py-4 text-center">
      {/* SECTION: TRENDING STUDY DOCUMENTS (ĐÃ BỎ CATEGORIES) */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
        <div className="card-body p-4 text-start">
          <style>{`
            .doc-thumbnail {
                width: 90px;
                height: 120px;
                background: linear-gradient(135deg, #FFEAD9 0%, #FFE3D1 100%);
                border: 1px solid rgba(253, 143, 82, 0.2);
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
          <div className="d-flex align-items-center gap-2 mb-4">
            <div className="rounded" style={{ width: '4px', height: '24px', background: 'linear-gradient(to bottom, #FD8F52, #FFBD71)' }}></div>
            <h5 className="mb-0 fw-bold text-dark">TRENDING STUDY DOCUMENTS</h5>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading trending documents...</span>
              </div>
            </div>
          ) : trendingDocs.length === 0 ? (
            <div className="text-center text-muted py-4">No trending documents available at the moment.</div>
          ) : (
            <div>
              <div className="d-flex flex-column gap-3">
                {trendingDocs.map((doc) => {
                  // Bóc tách thẻ tag môn học chuẩn xác dựa theo dữ liệu API mới
                  const subjectName = doc.subject?.name || doc.category?.name || doc.tags?.[0] || doc.tags?.[0]?.label || 'General';
                  const fileExt = doc.title?.split('.').pop().toUpperCase() || 'PDF';

                  return (
                    <div
                      key={doc.id}
                      className="card shadow-sm border-0 cursor-pointer"
                      style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.12)', transition: 'transform 0.15s, box-shadow 0.15s' }}
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
                        navigate(`/guest/document/${doc.id}`, { state: { document: mappedDoc } });
                      }} // Chuyển hướng sang trang detail của Guest
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
                        <div className="doc-thumbnail">
                          <span className="doc-thumbnail-banner">{fileExt}</span>
                          <div className="doc-thumbnail-title">{doc.title}</div>
                        </div>

                        <div className="flex-grow-1">
                          <div className="d-flex align-items-start justify-content-between gap-3 mb-2">
                            <div className="flex-grow-1">
                              <div className="d-flex align-items-center gap-2 mb-1">
                                <FileText className="h-5 w-5 text-primary" style={{ color: '#C73866' }} />
                                <h5 className="mb-0 fw-bold text-dark">{doc.title}</h5>
                              </div>
                              <p className="text-muted mb-2 text-truncate-2" style={{ fontSize: '13.5px' }}>
                                {doc.description || 'No description available for this trending document.'}
                              </p>
                            </div>

                            {/* Tag môn học góc phải */}
                            <div className="flex-shrink-0">
                              <span
                                className="badge px-3 py-2 rounded-pill text-white"
                                style={{ background: 'linear-gradient(135deg, #FD8F52, #FFBD71)', fontSize: '12px', fontWeight: '500' }}
                              >
                                {subjectName}
                              </span>
                            </div>
                          </div>

                          {/* Render tags on the card */}
                          <div className="d-flex flex-wrap gap-1.5 mb-3">
                            {doc.tags && (Array.isArray(doc.tags) ? doc.tags : [doc.tags]).map((tag, idx) => {
                              const tagName = typeof tag === 'object' ? (tag.name || tag.label) : tag;
                              return tagName ? (
                                <span key={idx} className="badge bg-light text-dark border px-2.5 py-1 rounded-pill" style={{ fontSize: '10px', fontWeight: '500' }}>
                                  {tagName}
                                </span>
                              ) : null;
                            })}
                          </div>

                          {/* Footer thống kê thông số file tài liệu */}
                          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 text-muted" style={{ fontSize: '13px' }}>
                            <div className="d-flex align-items-center gap-3">
                              <span>By {doc.uploader?.fullName || doc.uploaderName || 'Community Contributor'}</span>
                              <span>•</span>
                              <span>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-US') : 'N/A'}</span>
                              <span>•</span>
                              <span>{formatBytes(doc.fileSizeBytes || doc.size)}</span>
                            </div>
                            <div className="d-flex align-items-center gap-3">
                              {/* Điểm số đánh giá trung bình từ trường averageRating */}
                              <div className="d-flex align-items-center gap-1">
                                <Star className="h-4 w-4 text-warning fill-warning" style={{ color: '#FFBD71', fill: '#FFBD71' }} />
                                <span className="fw-medium text-dark">
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
                })}
              </div>

              {/* Pagination controls for guest homepage */}
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
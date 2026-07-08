import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router';
import { ArrowLeft, User, Calendar, Star, FileText, Download, Eye, Bookmark, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../api.js';
import { Dropdown } from 'react-bootstrap';
import { useApp } from '../../context/AppContext';

const MOCK_DOCUMENTS = [
    {
        id: "mock-doc-1",
        title: "Tài liệu môn Software Requirement Engineering.pdf",
        description: "Tài liệu tóm tắt các yêu cầu phần mềm trong kỳ thi môn SRE.",
        subject: { name: "SRE" },
        createdAt: "2026-06-20T10:00:00Z",
        fileSize: 4.5 * 1024 * 1024,
        fileSizeBytes: 4.5 * 1024 * 1024,
        averageRating: 4.8,
        visibility: "PUBLIC",
        status: "PUBLIC"
    },
    {
        id: "mock-doc-2",
        title: "Exercise 7_React Components Part 2.docx",
        description: "Bài tập về thiết kế Component trong ReactJS.",
        subject: { name: "FER201" },
        createdAt: "2026-06-18T14:30:00Z",
        fileSize: 0.43 * 1024 * 1024,
        fileSizeBytes: 0.43 * 1024 * 1024,
        averageRating: 4.2,
        visibility: "PUBLIC",
        status: "PUBLIC"
    },
    {
        id: "mock-doc-3",
        title: "Đề thi thử toán rời rạc kì Spring 2026.pdf",
        description: "Bộ đề ôn tập toán rời rạc cho sinh viên ngành SE.",
        subject: { name: "MAD" },
        createdAt: "2026-05-12T08:15:00Z",
        fileSize: 12.8 * 1024 * 1024,
        fileSizeBytes: 12.8 * 1024 * 1024,
        averageRating: 4.5,
        visibility: "PUBLIC",
        status: "PUBLIC"
    }
];

export default function PublicAuthDocumentPage() {
    const { id } = useParams(); // authorId
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useApp();
    const passedAuthorName = location?.state?.authorName;

    const [authorName, setAuthorName] = useState(passedAuthorName || 'Tác giả');
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('date-desc');
    const [savedDocIds, setSavedDocIds] = useState([]);

    const token = localStorage.getItem('token');

    // Fetch and check local saved documents to render bookmark states correctly
    const loadSavedStatus = () => {
        const currentUserId = user?.id || 'guest';
        const saved = JSON.parse(localStorage.getItem(`saved_documents_${currentUserId}`)) || [];
        setSavedDocIds(saved.map(item => item && item.id));
    };

    useEffect(() => {
        loadSavedStatus();
    }, [user]);

    useEffect(() => {
        const fetchAuthorDocuments = async () => {
            if (!id) return;
            try {
                setLoading(true);
                // Call public API endpoint to get all documents by authorId
                const response = await fetch(`${API_BASE_URL}/api/v1/documents/personal?authorId=${id}`, {
                    method: 'GET',
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });

                let loadedDocs = [];
                if (response.ok) {
                    const result = await response.json();
                    if (result && result.data && Array.isArray(result.data)) {
                        loadedDocs = result.data.filter(doc => 
                            doc.visibility?.toUpperCase() === 'PUBLIC' || 
                            doc.status?.toUpperCase() === 'PUBLIC'
                        );
                    }
                }

                if (loadedDocs.length > 0) {
                    setDocuments(loadedDocs);
                    const firstDoc = loadedDocs[0];
                    const name = firstDoc.uploader?.fullName || firstDoc.uploaderName || firstDoc.author;
                    if (name) setAuthorName(name);
                } else {
                    console.warn("API returned 0 public documents. Using mock fallback data.");
                    setDocuments(MOCK_DOCUMENTS);
                }
            } catch (error) {
                console.error('Error fetching author documents, falling back to mock:', error);
                setDocuments(MOCK_DOCUMENTS);
            } finally {
                setLoading(false);
            }
        };

        fetchAuthorDocuments();
    }, [id, token]);

    // Handle toggling bookmark from the list
    const handleToggleBookmark = (doc) => {
        if (!doc) return;

        const currentUserId = user?.id || 'guest';
        const storageKey = `saved_documents_${currentUserId}`;
        const savedDocs = JSON.parse(localStorage.getItem(storageKey)) || [];
        const isBookmarked = savedDocIds.includes(doc.id);

        if (isBookmarked) {
            const updatedDocs = savedDocs.filter(item => item && item.id !== doc.id);
            localStorage.setItem(storageKey, JSON.stringify(updatedDocs));
            toast.success('Đã hủy lưu tài liệu!');
        } else {
            const docToSave = {
                id: doc.id,
                title: doc.title,
                description: doc.description,
                subject: doc.subject?.name || doc.subject || 'General',
                author: authorName,
                authorId: id,
                createdAt: doc.createdAt,
                size: doc.fileSize || doc.fileSizeBytes || 0,
                tags: doc.tags || []
            };
            const updatedDocs = [...savedDocs, docToSave];
            localStorage.setItem(storageKey, JSON.stringify(updatedDocs));
            toast.success('Đã lưu tài liệu thành công!');
        }
        loadSavedStatus();
    };

    const handleDownload = async (docId, title) => {
        if (!token) {
            toast.error("Please login to download documents");
            return;
        }
        try {
            toast.loading("Preparing download...");
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/${docId}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.dismiss();

            if (!response.ok) throw new Error('Download failed');
            
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = title;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
            toast.success("Download started!");
        } catch (error) {
            toast.dismiss();
            console.error("Download error:", error);
            toast.error("Failed to download document");
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes || isNaN(bytes)) return '0.00 MB';
        const mb = bytes / (1024 * 1024);
        return mb < 0.01 ? `${mb.toFixed(3)} MB` : `${mb.toFixed(2)} MB`;
    };

    // Sort documents list
    const sortedDocuments = [...documents].sort((a, b) => {
        if (sortBy === 'date-desc') {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
        if (sortBy === 'date-asc') {
            return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        }
        if (sortBy === 'title-asc') {
            return (a.title || '').localeCompare(b.title || '');
        }
        return 0;
    });

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <div className="spinner-border text-primary" role="status" style={{ color: '#FD8F52' }}>
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-4 text-start">
            {/* Back button */}
            <div className="mb-4">
                <Link to="/user/home" className="d-inline-flex align-items-center gap-2 text-decoration-none text-muted" style={{ fontSize: '14px' }}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="fw-medium">Quay lại trang chủ</span>
                </Link>
            </div>

            {/* Author Profile Card Info */}
            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                <div className="card-body p-4 d-flex align-items-center gap-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                         style={{ 
                             width: '64px', 
                             height: '64px', 
                             background: 'linear-gradient(135deg, #C73866, #FD8F52)', 
                             fontSize: '22px' 
                         }}>
                        {authorName.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="fw-bold mb-1 text-dark" style={{ fontSize: '24px' }}>Tài liệu của {authorName}</h2>
                        <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: '14px' }}>
                            <FileText size={16} />
                            <span>Đang chia sẻ {documents.length} tài liệu công khai</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Documents List Container */}
            <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
                {sortedDocuments.length > 0 ? (
                    <>
                        <div className="p-3 bg-white border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <span className="fw-semibold text-muted" style={{ fontSize: '14px' }}>
                                Danh sách tài liệu ({sortedDocuments.length})
                            </span>
                            <div className="d-flex align-items-center gap-2">
                                <span className="text-muted small fw-medium" style={{ fontSize: '13px' }}>Sắp xếp theo:</span>
                                <select 
                                    className="form-select form-select-sm"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    style={{ 
                                        width: '180px', 
                                        borderRadius: '10px', 
                                        borderColor: 'rgba(253, 143, 82, 0.2)',
                                        backgroundColor: '#FFF9F5',
                                        fontSize: '13px',
                                        color: '#1f1f1f',
                                        padding: '6px 12px',
                                        cursor: 'pointer',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="date-desc">Mới nhất</option>
                                    <option value="date-asc">Cũ nhất</option>
                                    <option value="title-asc">Tiêu đề (A - Z)</option>
                                </select>
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="py-3 px-4" style={{ minWidth: '220px' }}>Tên tài liệu</th>
                                        <th className="py-3">Môn học</th>
                                        <th className="py-3">Ngày chia sẻ</th>
                                        <th className="py-3">Dung lượng</th>
                                        <th className="py-3">Đánh giá</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedDocuments.map((doc) => {
                                        const tagsText = doc.subject?.name || doc.subject || 'General';
                                        return (
                                            <tr key={doc.id}>
                                                <td className="py-3 px-4">
                                                    <Link to={`/document/${doc.id}`} className="fw-medium text-dark text-decoration-none hover:text-primary hover:underline">
                                                        {doc.title}
                                                    </Link>
                                                </td>
                                                <td className="py-3 text-muted fw-semibold">
                                                    {tagsText}
                                                </td>
                                                <td className="py-3 text-muted">
                                                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                                                </td>
                                                <td className="py-3 text-muted">
                                                    {formatBytes(doc.fileSize || doc.fileSizeBytes)}
                                                </td>
                                                <td className="py-3">
                                                    <div className="d-flex align-items-center gap-1">
                                                        <Star size={14} className="fill-warning text-warning" style={{ color: '#FFBD71', fill: '#FFBD71' }} />
                                                        <span className="text-muted" style={{ fontSize: '13px' }}>
                                                            {((doc.averageRating !== undefined && doc.averageRating !== null) ? doc.averageRating : 0).toFixed(1)}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-5 bg-white text-muted">
                        <FileText size={48} className="mb-3 opacity-30 text-dark" />
                        <p className="mb-0" style={{ fontSize: '15px' }}>Tác giả chưa chia sẻ tài liệu công khai nào.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

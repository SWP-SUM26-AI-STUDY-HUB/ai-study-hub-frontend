import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router';
import { ArrowLeft, User, Calendar, Star, FileText, Download, Eye, Bookmark, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../api.js';
import { Dropdown, Modal } from 'react-bootstrap';
import { useApp } from '../../context/AppContext';

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

export default function PublicAuthDocumentPage() {
    const { id } = useParams(); // authorId
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useApp();
    const passedAuthorName = location?.state?.authorName;
    const passedAuthorAvatar = location?.state?.authorAvatar;

    const [authorName, setAuthorName] = useState(passedAuthorName || 'Author');
    const [authorAvatar, setAuthorAvatar] = useState(passedAuthorAvatar || null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('date-desc');
    const [savedDocIds, setSavedDocIds] = useState([]);
    const [unsaveModalOpen, setUnsaveModalOpen] = useState(false);
    const [docToUnsave, setDocToUnsave] = useState(null);

    const token = localStorage.getItem('token');

    // Fetch and check saved documents via API to render bookmark states correctly
    const loadSavedStatus = async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/saved?page=0&size=100`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const result = await response.json();
                const dataList = Array.isArray(result.data) 
                    ? result.data 
                    : (result.data && Array.isArray(result.data.content) ? result.data.content : []);
                setSavedDocIds(dataList.map(item => item && item.id));
            }
        } catch (err) {
            console.error('Failed to load saved status from server:', err);
        }
    };

    useEffect(() => {
        loadSavedStatus();
    }, [user, token]);

    useEffect(() => {
        const fetchAuthorDocuments = async () => {
            if (!id) return;
            try {
                setLoading(true);
                
                const response = await fetch(`${API_BASE_URL}/api/v1/documents/user/${id}`, {
                    method: 'GET',
                    headers: {} // Omit token to bypass backend JDBC exception (missing saved_documents table)
                });
                if (!response.ok) {
                    throw new Error(`User documents endpoint failed with status ${response.status}`);
                }

                let loadedDocs = [];
                if (response.ok) {
                    const result = await response.json();
                    const rawData = result?.data;
                    const itemsList = Array.isArray(rawData)
                        ? rawData
                        : (rawData && Array.isArray(rawData.content) ? rawData.content : []);
                    
                    loadedDocs = itemsList.filter(doc => 
                        doc.visibility?.toUpperCase() === 'PUBLIC' || 
                        doc.status?.toUpperCase() === 'PUBLIC'
                    );
                }

                if (loadedDocs.length > 0) {
                    const docsWithRatings = await fetchAverageRatings(loadedDocs, token);
                    setDocuments(docsWithRatings);
                    const firstDoc = docsWithRatings[0];
                    const name = firstDoc.uploader?.fullName || firstDoc.uploaderName || firstDoc.author;
                    if (name) setAuthorName(name);
                    
                    const avatar = firstDoc.uploader?.avatarUrl;
                    if (avatar) setAuthorAvatar(avatar);
                } else {
                    setDocuments([]);
                }
            } catch (error) {
                console.error('Error fetching author documents:', error);
                setDocuments([]);
                toast.error('Failed to load author documents from server.');
            } finally {
                setLoading(false);
            }
        };

        fetchAuthorDocuments();
    }, [id, token]);

    // Handle toggling bookmark from the list
    const handleToggleBookmark = (doc) => {
        if (!doc) return;

        if (!token) {
            toast.error('Please login to save documents.');
            return;
        }

        const isBookmarked = savedDocIds.includes(doc.id);

        if (isBookmarked) {
            setDocToUnsave(doc);
            setUnsaveModalOpen(true);
        } else {
            executeBookmarkToggle(doc);
        }
    };

    const executeBookmarkToggle = async (doc) => {
        if (!doc) return;
        const isBookmarked = savedDocIds.includes(doc.id);

        try {
            let response;
            if (isBookmarked) {
                response = await fetch(`${API_BASE_URL}/api/v1/documents/${doc.id}/unsave`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } else {
                response = await fetch(`${API_BASE_URL}/api/v1/documents/${doc.id}/save`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }

            if (response.ok) {
                if (isBookmarked) {
                    toast.success('Document unsaved!');
                } else {
                    toast.success('Document saved successfully!');
                }
                loadSavedStatus();
            } else {
                const errData = await response.json().catch(() => ({}));
                toast.error(`Action failed: ${errData.message || response.statusText}`);
            }
        } catch (err) {
            console.error('Bookmark toggle API error:', err);
            toast.error('Failed to update bookmark status on server.');
        }
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
        if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        if (i < 0 || !isFinite(i)) return '0 Bytes';
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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
                    <span className="fw-medium">Back to Homepage</span>
                </Link>
            </div>

            {/* Author Profile Card Info */}
            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                <div className="card-body p-4 d-flex align-items-center gap-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm overflow-hidden"
                         style={{ 
                             width: '64px', 
                             height: '64px', 
                             background: 'linear-gradient(135deg, #C73866, #FD8F52)', 
                             fontSize: '22px' 
                          }}>
                        {authorAvatar ? (
                            <img src={authorAvatar.startsWith('http') ? authorAvatar : `https://s3.amazonaws.com/ai-study-hub-thiennho/${authorAvatar}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            authorName.substring(0, 1).toUpperCase()
                        )}
                    </div>
                    <div>
                        <h2 className="fw-bold mb-1 text-dark" style={{ fontSize: '24px' }}>{authorName}'s Documents</h2>
                        <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: '14px' }}>
                            <FileText size={16} />
                            <span>Sharing {documents.length} public documents</span>
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
                                Documents List ({sortedDocuments.length})
                            </span>
                            <div className="d-flex align-items-center gap-2">
                                <span className="text-muted small fw-medium" style={{ fontSize: '13px' }}>Sort by:</span>
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
                                    <option value="date-desc">Latest</option>
                                    <option value="date-asc">Oldest</option>
                                    <option value="title-asc">Title (A - Z)</option>
                                </select>
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="py-3 px-4" style={{ minWidth: '220px' }}>Document Title</th>
                                        <th className="py-3">Tags</th>
                                        <th className="py-3">Share Date</th>
                                        <th className="py-3">Size</th>
                                        <th className="py-3">Rating</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedDocuments.map((doc) => {
                                        const tagsArray = doc.tags || doc.tagNames || (doc.subject ? [doc.subject] : []);
                                        const tagsList = (Array.isArray(tagsArray) ? tagsArray : [tagsArray]).map(tag => typeof tag === 'object' ? (tag.label || tag.name) : String(tag)).filter(Boolean);
                                        return (
                                            <tr key={doc.id}>
                                                <td className="py-3 px-4">
                                                    <Link to={`/document/${doc.id}`} className="fw-medium text-dark text-decoration-none hover:text-primary hover:underline">
                                                        {doc.title}
                                                    </Link>
                                                </td>
                                                <td className="py-3 text-muted fw-semibold">
                                                    <div className="d-flex flex-wrap gap-1">
                                                        {tagsList.map((tag, idx) => (
                                                            <span key={idx} className="badge text-white px-2.5 py-1 border-0 rounded-pill" style={{ background: 'linear-gradient(135deg, #FD8F52, #FFBD71)', fontSize: '11px', fontWeight: '500' }}>
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="py-3 text-muted">
                                                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-US') : 'N/A'}
                                                </td>
                                                <td className="py-3 text-muted">
                                                    {formatBytes(doc.fileSizeBytes ?? doc.fileSize ?? doc.size ?? doc.file_size_bytes)}
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
                        <p className="mb-0" style={{ fontSize: '15px' }}>The author has not shared any public documents yet.</p>
                    </div>
                )}
            </div>
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
                        Document: <strong className="text-dark">"{docToUnsave?.title}"</strong>. It will be removed from your saved list.
                    </p>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0 d-flex gap-2">
                    <button 
                        onClick={async () => {
                            if (docToUnsave) {
                                await executeBookmarkToggle(docToUnsave);
                                setUnsaveModalOpen(false);
                                setDocToUnsave(null);
                            }
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
        </div>
    );
}

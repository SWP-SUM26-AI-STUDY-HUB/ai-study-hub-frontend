import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router';
import { ArrowLeft, User, Calendar, Star, FileText, Download, Eye, Bookmark, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../api.js';
import { Dropdown } from 'react-bootstrap';
import { useApp } from '../../context/AppContext';

export default function PublicAuthDocumentPage() {
    const { id } = useParams(); // authorId
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useApp();
    const passedAuthorName = location?.state?.authorName;

    const [authorName, setAuthorName] = useState(passedAuthorName || 'Author');
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
                
                let response;
                try {
                    response = await fetch(`${API_BASE_URL}/api/v1/documents/user/${id}`, {
                        method: 'GET',
                        headers: {} // Omit token to bypass backend JDBC exception (missing saved_documents table)
                    });
                    if (!response.ok) {
                        throw new Error(`User documents endpoint failed with status ${response.status}`);
                    }
                } catch (apiErr) {
                    console.warn("User documents endpoint failed, checking fallback:", apiErr);
                    if (user && user.id === id) {
                        response = await fetch(`${API_BASE_URL}/api/v1/documents/personal`, {
                            method: 'GET',
                            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                        });
                    } else {
                        throw apiErr;
                    }
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
                    setDocuments(loadedDocs);
                    const firstDoc = loadedDocs[0];
                    const name = firstDoc.uploader?.fullName || firstDoc.uploaderName || firstDoc.author;
                    if (name) setAuthorName(name);
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
    const handleToggleBookmark = async (doc) => {
        if (!doc) return;

        const currentUserId = user?.id || 'guest';
        const storageKey = `saved_documents_${currentUserId}`;
        const savedDocs = JSON.parse(localStorage.getItem(storageKey)) || [];
        const isBookmarked = savedDocIds.includes(doc.id);

        const executeLocalSave = () => {
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
            toast.success('Document saved successfully!');
            loadSavedStatus();
        };

        const executeLocalUnsave = () => {
            const updatedDocs = savedDocs.filter(item => item && item.id !== doc.id);
            localStorage.setItem(storageKey, JSON.stringify(updatedDocs));
            toast.success('Document unsaved!');
            loadSavedStatus();
        };

        if (token) {
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
                        executeLocalUnsave();
                    } else {
                        executeLocalSave();
                    }
                    return;
                } else {
                    console.warn(`Save/Unsave API returned status ${response.status}. Falling back to offline local storage.`);
                }
            } catch (err) {
                console.warn('Save/Unsave API call failed, falling back to local storage:', err);
            }
        }

        if (isBookmarked) {
            executeLocalUnsave();
        } else {
            executeLocalSave();
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
                    <span className="fw-medium">Back to Homepage</span>
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
                                Danh sách tài liệu ({sortedDocuments.length})
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
                                        const tagsArray = doc.tags ? (Array.isArray(doc.tags) ? doc.tags : Object.values(doc.tags)) : [];
                                        const tagsList = tagsArray.map(tag => typeof tag === 'object' ? (tag.label || tag.name) : tag).filter(Boolean);
                                        const tagsText = tagsList.length > 0 ? tagsList.join(', ') : (doc.subject?.name || doc.subject || 'General');
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
                                                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-US') : 'N/A'}
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
                        <p className="mb-0" style={{ fontSize: '15px' }}>The author has not shared any public documents yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

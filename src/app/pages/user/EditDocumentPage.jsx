import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft, X, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function EditDocumentPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const preLoadedDoc = location?.state?.document;

    const [title, setTitle] = useState(preLoadedDoc?.title || '');
    const [description, setDescription] = useState(preLoadedDoc?.description || '');
    const [selectedTags, setSelectedTags] = useState([]);
    const [isOpenDropdown, setIsOpenDropdown] = useState(false);

    const [isPublic, setIsPublic] = useState(
        preLoadedDoc?.visibility === 'PUBLIC' || preLoadedDoc?.status === 'PUBLIC' || preLoadedDoc?.status === 'PENDING'
    );

    const [isFetching, setIsFetching] = useState(false);
    const [fullDocumentData, setFullDocumentData] = useState(preLoadedDoc || null);

    // State lưu danh sách tags lấy động từ API GET /api/v1/tags
    const [systemTags, setSystemTags] = useState([]);

    // 1. Fetch danh sách tất cả các tag từ hệ thống khi load trang
    useEffect(() => {
        const fetchSystemTags = async () => {
            const token = localStorage.getItem('token');
            try {
                const response = await fetch('http://14.225.254.145:8080/api/v1/tags', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const result = await response.json();
                // Giả định response trả về mảng nằm trong result.data hoặc result
                if (result && Array.isArray(result.data)) {
                    setSystemTags(result.data);
                } else if (Array.isArray(result)) {
                    setSystemTags(result);
                }
            } catch (error) {
                console.error('Error fetching system tags:', error);
            }
        };

        fetchSystemTags();
    }, []);

    // Hàm phân rã Object Map { "1": "Data Science" } từ API Document thành mảng Object cho Frontend hiển thị Chip
    const parseInitialTags = (docObj) => {
        if (!docObj) return [];
        const initialTags = [];
        const detectedIds = new Set();

        if (docObj.tags && typeof docObj.tags === 'object' && !Array.isArray(docObj.tags)) {
            try {
                Object.entries(docObj.tags).forEach(([key, value]) => {
                    const tagId = Number(key);
                    if (!isNaN(tagId) && !detectedIds.has(tagId)) {
                        detectedIds.add(tagId);
                        initialTags.push({ id: tagId, label: String(value) });
                    }
                });
            } catch (e) {
                console.error("Error parsing tags object map", e);
            }
        }
        return initialTags;
    };

    useEffect(() => {
        if (preLoadedDoc) {
            setSelectedTags(parseInitialTags(preLoadedDoc));
        }
    }, [preLoadedDoc]);

    // 2. Fetch chi tiết tài liệu
    useEffect(() => {
        const fetchDocumentDetail = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                setIsFetching(true);
                const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/${id}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    console.warn('Server API detail returned 500 error, using router state fallback.');
                    return;
                }

                const result = await response.json();
                if (result && result.data) {
                    const doc = result.data;
                    setFullDocumentData(doc);
                    setTitle(doc.title || '');
                    setDescription(doc.description || '');
                    setSelectedTags(parseInitialTags(doc));
                    setIsPublic(doc.visibility === 'PUBLIC' || doc.status === 'PUBLIC' || doc.status === 'PENDING');
                }
            } catch (error) {
                console.error('API Error:', error);
            } finally {
                setIsFetching(false);
            }
        };

        if (id) {
            fetchDocumentDetail();
        }
    }, [id]);

    const handleToggleTag = (tagItem) => {
        if (!tagItem || !tagItem.id) return;
        setSelectedTags(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            const isExisted = safePrev.some(t => t && t.id === tagItem.id);
            if (isExisted) {
                return safePrev.filter(t => t && t.id !== tagItem.id);
            } else {
                // Đồng bộ cấu trúc tag lưu trữ trong state
                return [...safePrev, { id: tagItem.id, label: tagItem.label || tagItem.name }];
            }
        });
    };

    useEffect(() => {
        const handleOutsideClick = () => setIsOpenDropdown(false);
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Session expired. Please login again.');
                return;
            }

            // Trích xuất mảng các số nguyên ID thuần túy gửi lên API PUT
            let intTagsPayload = [];
            if (Array.isArray(selectedTags) && selectedTags.length > 0) {
                intTagsPayload = selectedTags.map(tag => Number(tag.id));
            } else {
                intTagsPayload = [];
            }

            const updatePayload = {
                title: title,
                description: description,
                visibility: isPublic ? 'PUBLIC' : 'PRIVATE',
                tags: intTagsPayload // Truyền mảng Int [1, 2] đúng định dạng Swagger yêu cầu
            };

            const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatePayload)
            });

            if (!response.ok) throw new Error('Failed to update document data');

            toast.success('Document updated successfully!');
            navigate('/my-documents');
        } catch (error) {
            console.error('Error updating document:', error);
            toast.error('Failed to save changes. Please try again.');
        }
    };

    return (
        <div className="container-fluid py-4 px-4 px-md-5 text-start">
            <div className="mb-3">
                <button className="btn btn-link text-decoration-none text-muted p-0 d-flex align-items-center gap-2" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to My Document
                </button>
            </div>

            <div className="mx-auto w-100" style={{ maxWidth: '800px' }}>
                <div className="mb-4 d-flex justify-content-between align-items-center">
                    <div>
                        <h1 className="fw-bold text-dark mb-1" style={{ fontSize: '28px' }}>Edit Document</h1>
                        <p className="text-muted mb-0">Update information about your document</p>
                    </div>
                </div>

                <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                    <div className="card-body p-4">
                        <h4 className="card-title fw-bold text-dark mb-4">Document Information</h4>

                        <form onSubmit={handleSubmit} className="d-flex flex-column gap-4">
                            <div className="row g-3">
                                <div className="col-12 text-start">
                                    <label htmlFor="title" className="form-label fw-semibold text-dark">
                                        Title <span className="text-danger">*</span>
                                    </label>
                                    <input id="title" type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required />
                                </div>

                                <div className="col-12 text-start">
                                    <label className="form-label fw-semibold text-dark mb-2">
                                        Tags (Select Multiple) <span className="text-danger">*</span>
                                    </label>

                                    <div
                                        className="position-relative w-100"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsOpenDropdown(!isOpenDropdown);
                                        }}
                                    >
                                        <div className="form-control d-flex flex-wrap gap-2 align-items-center min-vh-10" style={{ cursor: 'pointer', minHeight: '45px' }}>
                                            {(!Array.isArray(selectedTags) || selectedTags.length === 0) && (
                                                <span className="text-muted" style={{ fontSize: '14px' }}>Click to select tags...</span>
                                            )}
                                            {Array.isArray(selectedTags) && selectedTags.filter(Boolean).map(tag => (
                                                <span
                                                    key={tag.id}
                                                    className="badge d-flex align-items-center gap-1.5 text-dark border bg-light fw-semibold px-2 py-1.5"
                                                    style={{ fontSize: '13px', borderRadius: '6px' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedTags(prev => Array.isArray(prev) ? prev.filter(t => t && t.id !== tag.id) : []);
                                                    }}
                                                >
                                                    {tag.label || tag.name}
                                                    <X className="h-3.5 w-3.5 text-muted hover:text-danger" style={{ cursor: 'pointer' }} />
                                                </span>
                                            ))}
                                        </div>

                                        {isOpenDropdown && (
                                            <div className="card position-absolute w-100 shadow mt-1 border-0 p-1" style={{ zIndex: 1050, borderRadius: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                                                {systemTags.length === 0 ? (
                                                    <div className="text-center text-muted p-2" style={{ fontSize: '13px' }}>Loading tags...</div>
                                                ) : (
                                                    systemTags.map(tagItem => {
                                                        const isChecked = Array.isArray(selectedTags) && selectedTags.some(t => t && t.id === tagItem.id);
                                                        return (
                                                            <div
                                                                key={tagItem.id}
                                                                className={`d-flex align-items-center justify-content-between px-3 py-2 rounded-2 ${isChecked ? 'bg-light fw-bold text-primary' : 'text-dark'}`}
                                                                style={{ cursor: 'pointer', fontSize: '14px' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleToggleTag(tagItem);
                                                                }}
                                                            >
                                                                {/* Hỗ trợ linh hoạt cả trường .name hoặc .label tùy cấu trúc API BE */}
                                                                {tagItem.name || tagItem.label}
                                                                {isChecked && <Check className="h-4 w-4 text-primary" />}
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <small className="text-muted mt-1 d-block">Click on the container to open list, click on tags to select/unselect.</small>
                                </div>

                                <div className="col-12 text-start">
                                    <label htmlFor="description" className="form-label fw-semibold text-dark">Description</label>
                                    <textarea id="description" className="form-control" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                                </div>
                            </div>

                            <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded-3">
                                <div className="text-start flex-grow-1">
                                    <label htmlFor="public-toggle" className="fw-bold text-dark mb-1" style={{ cursor: 'pointer', fontSize: '15px' }}>
                                        Make this document public
                                    </label>
                                    <p className="text-muted mb-0" style={{ fontSize: '13px' }}>
                                        Public documents will be reviewed by admins before appearing in search
                                    </p>
                                </div>
                                <div className="form-check form-switch fs-5">
                                    <input id="public-toggle" className="form-check-input" type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} style={{ cursor: 'pointer', outline: 'none', boxShadow: 'none' }} />
                                </div>
                            </div>

                            <div className="d-flex gap-3">
                                <button type="submit" disabled={isFetching} className="btn text-white px-4 py-2 border-0 fw-bold flex-grow-1" style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}>
                                    Save Changes
                                </button>
                                <button type="button" className="btn btn-outline-secondary px-4 py-2" onClick={() => navigate('/my-documents')}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
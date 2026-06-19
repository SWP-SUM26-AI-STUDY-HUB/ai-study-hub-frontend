import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function EditDocumentPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Đón dữ liệu Router State truyền trực tiếp từ trang danh sách tài liệu cá nhân
    const preLoadedDoc = location.state?.document;

    const [title, setTitle] = useState(preLoadedDoc?.title || '');
    const [description, setDescription] = useState(preLoadedDoc?.description || '');

    // Hàm bóc chuỗi text hiển thị nhãn ngôn ngữ tự nhiên lên Form cho người dùng đọc
    const getInitialTagsString = (docObj) => {
        if (!docObj) return '';
        const combined = [];
        if (docObj.subjectName) combined.push(docObj.subjectName);

        if (docObj.documentTags && Array.isArray(docObj.documentTags)) {
            docObj.documentTags.forEach(t => {
                if (typeof t === 'string') combined.push(t);
                else if (t && typeof t === 'object' && t.name) combined.push(t.name);
                else if (t && typeof t === 'object' && t.label) combined.push(t.label);
            });
        }
        if (docObj.tags && Array.isArray(docObj.tags)) {
            docObj.tags.forEach(t => {
                if (typeof t === 'string') combined.push(t);
                else if (t && typeof t === 'object' && t.name) combined.push(t.name);
                else if (t && typeof t === 'object' && t.label) combined.push(t.label);
            });
        }
        return Array.from(new Set(combined)).join(', ');
    };

    const [tags, setTags] = useState(getInitialTagsString(preLoadedDoc));
    const [isPublic, setIsPublic] = useState(
        preLoadedDoc?.visibility === 'PUBLIC' || preLoadedDoc?.status === 'PUBLIC' || preLoadedDoc?.status === 'PENDING'
    );

    const [isFetching, setIsFetching] = useState(false);
    const [fullDocumentData, setFullDocumentData] = useState(preLoadedDoc || null);

    useEffect(() => {
        const fetchDocumentDetail = async () => {
            try {
                setIsFetching(true);
                const token = localStorage.getItem('token');

                const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/${id}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error('Failed to fetch details from server');
                const result = await response.json();

                if (result && result.data) {
                    const doc = result.data;
                    setFullDocumentData(doc);
                    setTitle(doc.title || '');
                    setDescription(doc.description || '');
                    setTags(getInitialTagsString(doc));
                    setIsPublic(doc.visibility === 'PUBLIC' || doc.status === 'PUBLIC' || doc.status === 'PENDING');
                }
            } catch (error) {
                console.error('API Error occurred, securing current form state with fallback:', error);
                if (preLoadedDoc) {
                    setFullDocumentData(preLoadedDoc);
                    setTitle(preLoadedDoc.title || '');
                    setDescription(preLoadedDoc.description || '');
                    setTags(getInitialTagsString(preLoadedDoc));
                    setIsPublic(preLoadedDoc.status === 'PUBLIC' || preLoadedDoc.status === 'PENDING');
                }
            } finally {
                setIsFetching(false);
            }
        };

        if (id) {
            fetchDocumentDetail();
        }
    }, [id, preLoadedDoc]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const token = localStorage.getItem('token');

            // --- XỬ LÝ CHUẨN MỐI QUAN HỆ NHIỀU - NHIỀU (MANY-TO-MANY ARRAY OBJECTS) ---
            let formattedTagsArray = [];

            const originalTagsSource = fullDocumentData?.documentTags || fullDocumentData?.tags;
            if (originalTagsSource && Array.isArray(originalTagsSource) && originalTagsSource.length > 0) {
                // Duyệt qua mảng tag cũ từ Database trả về, bóc lấy ID để build mảng [{id: 1}, {id: 2}]
                formattedTagsArray = originalTagsSource
                    .map(t => {
                        if (t && typeof t === 'object' && t.id) {
                            return { id: Number(t.id) };
                        }
                        return null;
                    })
                    .filter(Boolean);
            }

            // Phòng hờ nếu mảng trống hoàn toàn, gán mặc định tag ID 1 để tránh Backend ném NullPointerException
            if (formattedTagsArray.length === 0) {
                formattedTagsArray = [{ id: 1 }];
            }

            const updatePayload = {
                ...fullDocumentData,                    // Giữ nguyên uploader_id, file_url, file_size...
                title: title,
                description: description,
                documentTags: formattedTagsArray,       // SỬA DỨT ĐIỂM: Truyền mảng dạng [{id: 1}] khớp với Hibernate Many-to-Many
                tags: formattedTagsArray,               // Gửi kèm cho cả trường dự phòng nếu trùng tên mapping
                visibility: isPublic ? 'PUBLIC' : 'PRIVATE',
                status: isPublic ? 'PENDING' : 'PRIVATE'
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
                    {isFetching && (
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                            <span className="visually-hidden">Refreshing...</span>
                        </div>
                    )}
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
                                    <label htmlFor="tags" className="form-label fw-semibold text-dark">
                                        Tags <span className="text-danger">*</span>
                                    </label>
                                    <input id="tags" type="text" className="form-control" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., Computer Science, AI, ML" required />
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
                                    {isFetching ? 'Syncing...' : 'Save Changes'}
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
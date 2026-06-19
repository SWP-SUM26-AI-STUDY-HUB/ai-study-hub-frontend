import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { mockDocuments } from '../../data/mockData';
import { Dropdown, Modal } from 'react-bootstrap';
import { Upload, MoreVertical, Edit, Share2, Trash2, Copy, ArrowLeft, AlertTriangle } from 'lucide-react';
// Thư viện sonner dùng để hiển thị các thông báo nhanh (alert toast) ở góc màn hình
import { toast } from 'sonner';

export default function MyDocumentsPage() {
    const { user } = useApp();
    const navigate = useNavigate();

    // Trạng thái đóng/mở Modal chia sẻ tài liệu
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [selectedDocId, setSelectedDocId] = useState('');
    const [myDocuments, setMyDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- TRẠNG THÁI POP-UP XÁC NHẬN XÓA ---
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState(null);

    // Hook useEffect tự động chạy khi component được render hoặc khi user thay đổi
    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');

                const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/personal?authorId=${user?.id}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error('API request failed');
                const result = await response.json();

                if (result && result.data) {
                    setMyDocuments(result.data);
                } else {
                    setMyDocuments([]);
                }
            } catch (error) {
                console.warn('Backend API server not found, falling back to mockData:', error);
                const filtered = mockDocuments.filter((doc) => doc.authorId === user?.id);
                setMyDocuments(filtered);
            } finally {
                setLoading(false);
            }
        };

        if (user?.id) {
            fetchDocuments();
        } else {
            setMyDocuments([]);
            setLoading(false);
        }
    }, [user]);

    const formatBytes = (bytes) => {
        if (!bytes) return '0.00 MB';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    const getStatusBadge = (status) => {
        if (!status) return null;
        const classes = {
            public: 'bg-success',
            private: 'bg-secondary',
            pending: 'bg-warning text-dark',
            completed: 'bg-success',
            failed: 'bg-danger',
            rejected: 'bg-danger',
        };
        return (
            <span className={`badge ${classes[status.toLowerCase()] || 'bg-light text-dark'} px-2.5 py-1.5`} style={{ fontSize: '11px' }}>
                {status.toUpperCase()}
            </span>
        );
    };

    const handleShare = (docId) => {
        setSelectedDocId(docId);
        setShareDialogOpen(true);
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/document/${selectedDocId}`;
        navigator.clipboard.writeText(link);
        toast.success('Link copied to clipboard!');
        setShareDialogOpen(false);
    };

    // --- LOGIC XỬ LÝ XÓA DỮ LIỆU CÓ POP-UP XÁC NHẬN ---
    // 1. Kích hoạt khi bấm nút Delete ngoài danh sách: Lưu thông tin file lại và mở Pop-up hỏi ý kiến
    const triggerDeleteConfirm = (doc) => {
        setDocToDelete(doc);
        setDeleteModalOpen(true);
    };

    // 2. Chạy khi người dùng nhấn nút chấp nhận xóa trên Pop-up thực tế
    const handleConfirmDelete = async () => {
        if (!docToDelete) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/${docToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete document');

            // Xóa thành công trên DB -> Cập nhật loại bỏ file khỏi State Frontend để mất dòng đó ngay
            setMyDocuments(prev => prev.filter(item => item.id !== docToDelete.id));
            toast.success(`Document "${docToDelete.title}" has been deleted successfully!`);
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete the document. Please try again.');
        } finally {
            // Đóng Pop-up dọn sạch bộ nhớ tạm
            setDeleteModalOpen(false);
            setDocToDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4 px-4 px-md-5 text-start">
            <div className="mb-4">
                <Link to="/user/home" className="d-inline-flex align-items-center gap-2 text-decoration-none text-muted" style={{ fontSize: '14px' }}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="fw-medium">Back to Homepage</span>
                </Link>
            </div>

            <div className="mb-4">
                <h1 className="fw-bold text-dark mb-1" style={{ fontSize: '28px' }}>My Documents</h1>
            </div>

            <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
                {myDocuments.length > 0 && (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="py-3 px-4" style={{ minWidth: '200px' }}>Title</th>
                                    <th className="py-3">Tag</th>
                                    <th className="py-3">Date</th>
                                    <th className="py-3">Size</th>
                                    <th className="py-3">Status</th>
                                    <th className="py-3 px-4 text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myDocuments.map((doc) => (
                                    <tr key={doc.id}>
                                        <td className="py-3 px-4">
                                            <Link to={`/document/${doc.id}`} className="fw-medium text-dark text-decoration-none hover:text-primary hover:underline">
                                                {doc.title}
                                            </Link>
                                        </td>
                                        <td className="py-3 text-muted">{doc.subjectName || "N/A"}</td>
                                        <td className="py-3 text-muted">
                                            {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-US') : 'N/A'}
                                        </td>
                                        <td className="py-3 text-muted">{formatBytes(doc.size)}</td>
                                        <td className="py-3">{getStatusBadge(doc.status)}</td>
                                        <td className="py-3 px-4 text-end">
                                            <Dropdown align="end">
                                                <Dropdown.Toggle as="button" className="btn btn-link p-1 text-muted border-0 bg-transparent no-caret">
                                                    <MoreVertical className="h-5 w-5" />
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu className="shadow border-0 p-2">
                                                    <Dropdown.Item onClick={() => navigate(`/document/${doc.id}/edit`, { state: { document: doc } })} className="d-flex align-items-center gap-2 px-3 py-2 rounded">
                                                        <Edit className="h-4 w-4 text-muted" />
                                                        <span style={{ fontSize: '14px' }}>Edit Document</span>
                                                    </Dropdown.Item>
                                                    <Dropdown.Item onClick={() => handleShare(doc.id)} className="d-flex align-items-center gap-2 px-3 py-2 rounded">
                                                        <Share2 className="h-4 w-4 text-muted" />
                                                        <span style={{ fontSize: '14px' }}>Share</span>
                                                    </Dropdown.Item>
                                                    <Dropdown.Divider />
                                                    <Dropdown.Item onClick={() => triggerDeleteConfirm(doc)} className="d-flex align-items-center gap-2 px-3 py-2 text-danger hover-bg-danger-subtle rounded">
                                                        <Trash2 className="h-4 w-4 text-danger" />
                                                        <span style={{ fontSize: '14px' }}>Delete</span>
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {myDocuments.length === 0 && (
                    <div className="text-center py-5">
                        <Upload className="h-16 w-16 text-muted mx-auto mb-3" />
                        <h5 className="fw-bold text-dark mb-1">No documents yet</h5>
                        <p className="text-muted mb-0">You haven't uploaded any documents</p>
                    </div>
                )}
            </div>

            {/* Share Document Modal */}
            <Modal show={shareDialogOpen} onHide={() => setShareDialogOpen(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold" style={{ fontSize: '18px' }}>Share Document</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-start">
                    <p className="text-muted mb-3" style={{ fontSize: '14px' }}>Anyone with this link can view this document</p>
                    <div className="input-group">
                        <input type="text" readOnly value={`${window.location.origin}/document/${selectedDocId}`} className="form-control" style={{ fontSize: '14px' }} />
                        <button onClick={handleCopyLink} className="btn text-white px-3 d-flex align-items-center gap-2 border-0" style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}>
                            <Copy className="h-4 w-4" /> Copy
                        </button>
                    </div>
                </Modal.Body>
            </Modal>

            {/* --- MODAL DIALOG XÁC NHẬN XÓA TÀI LIỆU CỐT LÕI --- */}
            <Modal show={deleteModalOpen} onHide={() => setDeleteModalOpen(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold text-danger d-flex align-items-center gap-2" style={{ fontSize: '18px' }}>
                        <AlertTriangle className="h-5 w-5 text-danger" /> Confirm Delete
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-start py-3">
                    <p className="mb-1 text-dark fw-medium" style={{ fontSize: '15px' }}>
                        Do you want to delete this document?
                    </p>
                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                        Action: <strong className="text-dark">"{docToDelete?.title}"</strong>. This action cannot be undone.
                    </p>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0 d-flex gap-2">
                    <button onClick={handleConfirmDelete} className="btn btn-danger flex-grow-1 fw-bold border-0 py-2" style={{ fontSize: '14px' }}>
                        Confirm Delete
                    </button>
                    <button onClick={() => setDeleteModalOpen(false)} className="btn btn-light flex-grow-1 border fw-medium py-2" style={{ fontSize: '14px' }}>
                        Cancel
                    </button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
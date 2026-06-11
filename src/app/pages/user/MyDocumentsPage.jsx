import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { mockDocuments } from '../../data/mockData';
import { Dropdown, Modal } from 'react-bootstrap';
import { Upload, MoreVertical, Edit, Share2, Trash2, Copy, ArrowLeft } from 'lucide-react';
//Thư viện sonner dùng để hiển thị các thông báo nhanh (alert toast) ở góc màn hình
import { toast } from 'sonner';

export default function MyDocumentsPage() {
    const { user } = useApp();
    const navigate = useNavigate();
    //// Trạng thái đóng/mở Modal chia sẻ
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    //// Lưu ID của tài liệu đang được chọn để chia sẻ
    const [selectedDocId, setSelectedDocId] = useState('');

    const myDocuments = mockDocuments.filter((doc) => doc.authorId === user?.id);

    const formatBytes = (bytes) => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    const getStatusBadge = (status) => {
        const classes = {
            public: 'bg-success',
            private: 'bg-secondary',
            pending: 'bg-warning text-dark',
            rejected: 'bg-danger',
        };
        return (
            <span className={`badge ${classes[status] || 'bg-light text-dark'} px-2.5 py-1.5`} style={{ fontSize: '11px' }}>
                {status.toUpperCase()}
            </span>
        );
    };
    //lưu id tài liệu được chọn để chia sẻ vào state selectedDocId, sau đó mở Modal chia sẻ bằng cách set shareDialogOpen thành true. Khi người dùng nhấn nút "Copy" trong Modal, hàm handleCopyLink sẽ được gọi để sao chép liên kết tài liệu vào clipboard và hiển thị thông báo thành công bằng toast, sau đó đóng Modal chia sẻ.
    const handleShare = (docId) => {
        setSelectedDocId(docId);
        setShareDialogOpen(true);
    };
    //tạo ra đường dẫn, ghi nó vào bộ nhớ tạm (clipboard) bằng lệnh navigator.clipboard.writeText(link), hiển thị thông báo thành công bằng toast, và đóng Modal chia sẻ bằng cách set shareDialogOpen thành false. báo thành công bằng toast.success
    const handleCopyLink = () => {
        const link = `${window.location.origin}/document/${selectedDocId}`;
        navigator.clipboard.writeText(link);
        toast.success('Link copied to clipboard!');
        setShareDialogOpen(false);
    };

    const handleDelete = (docId, title) => {
        toast.success(`Document "${title}" has been deleted`);
    };

    return (
        <div className="container-fluid py-4 px-4 px-md-5 text-start">
            {/* NÚT QUAY VỀ TRANG CHỦ USER */}
            <div className="mb-4">
                <Link
                    to="/user/home"
                    className="d-inline-flex align-items-center gap-2 text-decoration-none text-muted"
                    style={{ fontSize: '14px' }}
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="fw-medium">Back to Homepage</span>
                </Link>
            </div>

            <div className="mb-4">
                <h1 className="fw-bold text-dark mb-1" style={{ fontSize: '28px' }}>My Documents</h1>
            </div>

            <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
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
                                        <Link
                                            to={`/document/${doc.id}`}
                                            className="fw-medium text-dark text-decoration-none hover:text-primary hover:underline"
                                        >
                                            {doc.title}
                                        </Link>
                                    </td>
                                    <td className="py-3 text-muted">{doc.tag}</td>
                                    <td className="py-3 text-muted">{new Date(doc.date).toLocaleDateString('en-US')}</td>
                                    <td className="py-3 text-muted">{formatBytes(doc.size)}</td>
                                    <td className="py-3">{getStatusBadge(doc.status)}</td>
                                    <td className="py-3 px-4 text-end">
                                        <Dropdown align="end">
                                            <Dropdown.Toggle as="button" className="btn btn-link p-1 text-muted border-0 bg-transparent no-caret">
                                                <MoreVertical className="h-5 w-5" />
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu className="shadow border-0 p-2">
                                                <Dropdown.Item onClick={() => navigate(`/document/${doc.id}/edit`)} className="d-flex align-items-center gap-2 px-3 py-2 rounded">
                                                    <Edit className="h-4 w-4 text-muted" />
                                                    <span style={{ fontSize: '14px' }}>Edit Document</span>
                                                </Dropdown.Item>
                                                <Dropdown.Item onClick={() => handleShare(doc.id)} className="d-flex align-items-center gap-2 px-3 py-2 rounded">
                                                    <Share2 className="h-4 w-4 text-muted" />
                                                    <span style={{ fontSize: '14px' }}>Share</span>
                                                </Dropdown.Item>
                                                <Dropdown.Divider />
                                                <Dropdown.Item onClick={() => handleDelete(doc.id, doc.title)} className="d-flex align-items-center gap-2 px-3 py-2 text-danger hover-bg-danger-subtle rounded">
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
                {/* //nếu không có tài liệu được up lên */}
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
                        <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/document/${selectedDocId}`}
                            className="form-control"
                            style={{ fontSize: '14px' }}
                        />
                        <button
                            onClick={handleCopyLink}
                            className="btn text-white px-3 d-flex align-items-center gap-2 border-0"
                            style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                        >
                            <Copy className="h-4 w-4" />
                            Copy
                        </button>
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { 
    Clock, CheckCircle2, XCircle, AlertCircle, Search, ArrowLeft, 
    User, Calendar, Filter, FileText, Loader2, Eye
} from 'lucide-react';
import { Modal, Form } from 'react-bootstrap';
import { toast } from 'sonner';

export default function PendingDocumentsPage() {
    const navigate = useNavigate();
    
    // 1. Quản lý Dữ liệu (Khởi tạo mảng rỗng, không dùng dữ liệu giả mockData)
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // 2. Quản lý Tìm kiếm & Lọc
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('all');

    // 3. Quản lý Modal Hành động (Xem trước, Từ chối)
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('Low document quality / Unreadable scan');

    // GIẢ LẬP GỌI API KHI VÀO TRANG (Sau này thay bằng lệnh fetch lấy dữ liệu từ Backend)
    useEffect(() => {
        // Tạm dừng 1 giây để hiển thị vòng xoay loading
        const timer = setTimeout(() => {
            setDocuments([]); // Tạm thời set mảng rỗng
            setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    // 4. Lọc ra các tài liệu đang chờ duyệt (pending) và tính toán thống kê
    const pendingDocs = documents.filter(d => d.status === 'pending');
    const totalPendingCount = pendingDocs.length;
    const totalApprovedCount = documents.filter(d => d.status === 'public').length;
    const totalRejectedCount = documents.filter(d => d.status === 'rejected').length;

    // Lấy danh sách các môn học (subject) không trùng lặp để cho vào dropdown Lọc
    const subjects = ['all', ...new Set(documents.filter(d => d.subject).map(d => d.subject))];

    // Logic Lọc và Tìm kiếm trên danh sách Pending
    const filteredPendingDocs = pendingDocs.filter(doc => {
        const matchesSearch = 
            doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            doc.author?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject = subjectFilter === 'all' || doc.subject === subjectFilter;
        return matchesSearch && matchesSubject;
    });

    // Hàm Xử lý Phê duyệt (Approve)
    const handleApprove = (docId, title) => {
        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: 'public' } : d));
        toast.success(`Document "${title}" has been approved and is now public.`);
        setShowPreviewModal(false);
    };

    // Hàm mở Modal Từ chối (Reject)
    const openRejectModal = (doc) => {
        setSelectedDoc(doc);
        setRejectionReason('Low document quality / Unreadable scan'); // Reset lý do mặc định
        setShowRejectModal(true);
    };

    // Hàm Xử lý Xác nhận Từ chối
    const handleRejectConfirm = () => {
        if (!selectedDoc) return;

        setDocuments(prev => prev.map(d => d.id === selectedDoc.id ? { ...d, status: 'rejected', rejectionReason } : d));

        toast.error(`Document "${selectedDoc.title}" has been rejected. Reason: ${rejectionReason}`);
        setShowRejectModal(false);
        setShowPreviewModal(false);
        setSelectedDoc(null);
    };

    // Hàm hiển thị dung lượng file cho đẹp
    const formatBytes = (bytes) => {
        if (!bytes) return '0 Bytes';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    // Hàm trả về màu sắc của Badge Môn học
    const getTagStyle = (subject) => {
        const themeStyles = {
            'Computer Science': { bg: '#FFF0E6', color: '#FD8F52', border: 'rgba(253, 143, 82, 0.2)' },
            'Web Development': { bg: '#FFF0E6', color: '#FD8F52', border: 'rgba(253, 143, 82, 0.2)' },
            'Database': { bg: '#FFF0E6', color: '#FD8F52', border: 'rgba(253, 143, 82, 0.2)' },
            'Mathematics': { bg: '#FFF9F2', color: '#FFBD71', border: 'rgba(255, 189, 113, 0.2)' },
            'Physics': { bg: '#FFEAEA', color: '#EF4444', border: 'rgba(239, 68, 68, 0.2)' }
        };
        const defaultStyle = { bg: '#F3F4F6', color: '#4B5563', border: 'rgba(75, 85, 99, 0.2)' };
        const activeTheme = themeStyles[subject] || defaultStyle;
        
        return { background: activeTheme.bg, color: activeTheme.color, border: `1px solid ${activeTheme.border}` };
    };

    return (
        <div className="pending-documents-container py-5 px-4 px-md-5 text-start">
            {/* CSS Tùy chỉnh giữ nguyên giao diện */}
            <style>{`
                .pending-documents-container { background-color: #fafbfe; min-height: calc(100vh - 80px); font-family: 'Montserrat', 'Inter', sans-serif; }
                .back-link { color: var(--muted-foreground); font-size: 14px; transition: color 0.2s; }
                .back-link:hover { color: var(--primary); }
                .page-title { font-size: 28px; font-weight: 700; color: #C73866; }
                .stats-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.01); display: flex; align-items: center; gap: 16px; height: 100%; }
                .stats-icon-box { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                .stats-icon-box.pending { background-color: rgba(253, 143, 82, 0.08); color: #FD8F52; }
                .stats-icon-box.approved { background-color: rgba(16, 185, 129, 0.08); color: #10B981; }
                .stats-icon-box.rejected { background-color: rgba(239, 68, 68, 0.08); color: #EF4444; }
                .search-filter-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.01); }
                .search-input-wrapper { position: relative; }
                .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #a0aec0; }
                .form-control-custom { background-color: #FFF9F5; border: 1px solid rgba(253, 143, 82, 0.18); border-radius: 10px; padding: 10px 16px 10px 40px; font-size: 14px; color: #1f1f1f; transition: all 0.2s; }
                .form-control-custom:focus { background-color: #ffffff; border-color: #FD8F52; box-shadow: 0 0 0 3px rgba(253, 143, 82, 0.15); outline: none; }
                .form-select-custom { background-color: #FFF9F5; border: 1px solid rgba(253, 143, 82, 0.18); border-radius: 10px; padding: 10px 16px; font-size: 14px; color: #1f1f1f; height: 100%; text-transform: capitalize; }
                .form-select-custom:focus { background-color: #ffffff; border-color: #FD8F52; box-shadow: 0 0 0 3px rgba(253, 143, 82, 0.15); outline: none; }
                .doc-table-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02); }
                .action-link-btn { background: transparent; border: none; font-size: 13px; font-weight: 600; cursor: pointer; padding: 6px 12px; border-radius: 6px; transition: all 0.2s; }
                .action-link-btn.preview { color: #FD8F52; } .action-link-btn.preview:hover { background-color: rgba(253, 143, 82, 0.08); }
                .action-link-btn.approve { color: #10B981; } .action-link-btn.approve:hover { background-color: rgba(16, 185, 129, 0.08); }
                .action-link-btn.reject { color: #EF4444; } .action-link-btn.reject:hover { background-color: rgba(239, 68, 68, 0.08); }
                .admin-modal .modal-content { border: none; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                .admin-modal .modal-header { border-bottom: none; padding: 24px 24px 8px 24px; }
                .admin-modal .modal-body { padding: 8px 24px 24px 24px; }
                .admin-modal .modal-footer { border-top: none; padding: 0 24px 24px 24px; }
                .btn-rounded-pill { border-radius: 20px; font-weight: 600; padding: 8px 20px; }
                .doc-preview-meta-box { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
                .subject-pill { font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 12px; white-space: nowrap; display: inline-block; }
                .doc-tag-badge { background-color: #FFF5ED; color: #FD8F52; border: 1px solid rgba(253, 143, 82, 0.15); border-radius: 20px; padding: 3px 10px; font-size: 11px; display: inline-block; font-weight: 500; }
            `}</style>

            {/* Back to Home */}
            <div className="mb-4">
                <Link to="/admin/home" className="d-inline-flex align-items-center gap-2 text-decoration-none back-link fw-medium">
                    <ArrowLeft size={16} />
                    <span>Back to Dashboard</span>
                </Link>
            </div>

            {/* Tiêu đề */}
            <div className="mb-4">
                <h1 className="page-title mb-1">Pending Document Approvals</h1>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Review, preview, and approve or reject uploaded study documents.</p>
            </div>

            {/* Thống kê 3 thẻ */}
            <div className="row g-4 mb-4">
                <div className="col-12 col-md-4">
                    <div className="stats-card">
                        <div className="stats-icon-box pending"><Clock size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{totalPendingCount}</h4>
                            <span className="text-muted small">Awaiting Review</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="stats-card">
                        <div className="stats-icon-box approved"><CheckCircle2 size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{totalApprovedCount}</h4>
                            <span className="text-muted small">Approved Documents</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="stats-card">
                        <div className="stats-icon-box rejected"><XCircle size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{totalRejectedCount}</h4>
                            <span className="text-muted small">Rejected Documents</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Thanh Tìm Kiếm & Lọc */}
            <div className="search-filter-card mb-4">
                <div className="row g-3 align-items-center">
                    <div className="col-md-8">
                        <div className="search-input-wrapper">
                            <Search size={18} className="search-icon" />
                            <input 
                                type="text" 
                                className="form-control form-control-custom w-100" 
                                placeholder="Search pending documents by title or author name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="d-flex align-items-center gap-2">
                            <Filter size={18} className="text-muted" />
                            <select 
                                className="form-select form-select-custom w-100"
                                value={subjectFilter}
                                onChange={(e) => setSubjectFilter(e.target.value)}
                            >
                                <option value="all">All Subjects</option>
                                {subjects.filter(s => s !== 'all').map((sub, idx) => (
                                    <option key={idx} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bảng Danh Sách Tài Liệu Đang Chờ Duyệt */}
            <div className="doc-table-card">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr>
                                <th className="py-3 px-4">Document Title</th>
                                <th className="py-3">Author</th>
                                <th className="py-3">Subject</th>
                                <th className="py-3">Upload Date</th>
                                <th className="py-3">Size</th>
                                <th className="py-3 px-4 text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5 text-muted">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" style={{ animation: 'spin 1s linear infinite' }} />
                                        <p>Loading documents...</p>
                                    </td>
                                </tr>
                            ) : filteredPendingDocs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5 text-muted">
                                        <AlertCircle size={48} className="mx-auto mb-3 text-muted-foreground opacity-50" />
                                        <h6>No pending documents awaiting review</h6>
                                    </td>
                                </tr>
                            ) : (
                                filteredPendingDocs.map((doc) => (
                                    <tr key={doc.id}>
                                        <td className="py-3 px-4">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="p-2 bg-light rounded text-primary border">
                                                    <FileText size={20} />
                                                </div>
                                                <span 
                                                    className="fw-semibold text-dark hover-text-primary text-truncate d-inline-block" 
                                                    style={{ cursor: 'pointer', maxWidth: '280px' }}
                                                    onClick={() => {
                                                        setSelectedDoc(doc);
                                                        setShowPreviewModal(true);
                                                    }}
                                                    title={doc.title}
                                                >
                                                    {doc.title}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 text-muted small">
                                            <span className="d-inline-flex align-items-center gap-1">
                                                <User size={12} /> {doc.author || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <span className="subject-pill" style={getTagStyle(doc.subject)}>
                                                {doc.subject}
                                            </span>
                                        </td>
                                        <td className="py-3 text-muted small">
                                            <span className="d-inline-flex align-items-center gap-1">
                                                <Calendar size={12} /> {new Date(doc.date || Date.now()).toLocaleDateString('en-US')}
                                            </span>
                                        </td>
                                        <td className="py-3 text-muted small">
                                            {formatBytes(doc.size)}
                                        </td>
                                        <td className="py-3 px-4 text-end">
                                            <div className="d-flex justify-content-end gap-1">
                                                <button 
                                                    className="action-link-btn preview"
                                                    title="Preview details"
                                                    onClick={() => {
                                                        setSelectedDoc(doc);
                                                        setShowPreviewModal(true);
                                                    }}
                                                >
                                                    Preview
                                                </button>
                                                <button 
                                                    className="action-link-btn approve"
                                                    title="Approve document"
                                                    onClick={() => handleApprove(doc.id, doc.title)}
                                                >
                                                    Approve
                                                </button>
                                                <button 
                                                    className="action-link-btn reject"
                                                    title="Reject document"
                                                    onClick={() => openRejectModal(doc)}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Xem Trước Chi Tiết Tài Liệu */}
            <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} centered size="lg" className="admin-modal">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold" style={{ fontSize: '18px' }}>
                        Document Review & Preview
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-start">
                    {selectedDoc && (
                        <div>
                            <h4 className="fw-bold text-dark mb-3" style={{ fontSize: '20px' }}>{selectedDoc.title}</h4>

                            {/* Khối Thông Tin Meta */}
                            <div className="doc-preview-meta-box">
                                <div className="row g-3">
                                    <div className="col-sm-6">
                                        <span className="text-muted small d-block">Author</span>
                                        <span className="fw-semibold text-dark d-inline-flex align-items-center gap-1">
                                            <User size={14} className="text-secondary" />
                                            {selectedDoc.author || 'Unknown'} (ID: {selectedDoc.authorId || 'N/A'})
                                        </span>
                                    </div>
                                    <div className="col-sm-6">
                                        <span className="text-muted small d-block">Subject / Topic</span>
                                        <span className="subject-pill mt-1" style={getTagStyle(selectedDoc.subject)}>
                                            {selectedDoc.subject}
                                        </span>
                                    </div>
                                    <div className="col-sm-6">
                                        <span className="text-muted small d-block">Upload Date</span>
                                        <span className="fw-semibold text-dark d-inline-flex align-items-center gap-1">
                                            <Calendar size={14} className="text-secondary" />
                                            {new Date(selectedDoc.date || Date.now()).toLocaleDateString('en-US')}
                                        </span>
                                    </div>
                                    <div className="col-sm-6">
                                        <span className="text-muted small d-block">File Size</span>
                                        <span className="fw-semibold text-dark">{formatBytes(selectedDoc.size)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <span className="fw-bold text-dark small d-block mb-1">Document Description</span>
                                <div className="p-3 bg-light rounded text-dark small border border-light" style={{ minHeight: '80px' }}>
                                    {selectedDoc.description || 'No description provided.'}
                                </div>
                            </div>

                            <div>
                                <span className="fw-bold text-dark small d-block mb-2">Associated Tags</span>
                                <div className="d-flex flex-wrap gap-2">
                                    {selectedDoc.tags && selectedDoc.tags.length > 0 ? (
                                        selectedDoc.tags.map((tag, idx) => (
                                            <span key={idx} className="doc-tag-badge">{tag}</span>
                                        ))
                                    ) : (
                                        <span className="text-muted small">No tags defined.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="justify-content-between">
                    <div>
                        <button 
                            type="button" 
                            className="btn btn-outline-danger btn-rounded-pill px-3 py-1.5 fw-semibold"
                            onClick={() => openRejectModal(selectedDoc)}
                        >
                            Reject Document
                        </button>
                    </div>
                    <div className="d-flex gap-2">
                        <button 
                            type="button" 
                            className="btn btn-light btn-rounded-pill border text-secondary px-3"
                            onClick={() => setShowPreviewModal(false)}
                        >
                            Close
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-success btn-rounded-pill px-4"
                            onClick={() => handleApprove(selectedDoc.id, selectedDoc.title)}
                        >
                            Approve Document
                        </button>
                    </div>
                </Modal.Footer>
            </Modal>

            {/* Modal Nhập Lý Do Từ Chối */}
            <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered className="admin-modal">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold text-dark" style={{ fontSize: '18px' }}>
                        Confirm Document Rejection
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-start">
                    <p className="text-muted mb-3">
                        Are you sure you want to reject the document <strong>"{selectedDoc?.title}"</strong>? It will not be published publicly.
                    </p>
                    
                    <Form.Group className="mb-0">
                        <Form.Label className="fw-semibold small text-dark">Reason for Rejection</Form.Label>
                        <Form.Select 
                            className="form-select form-select-custom"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        >
                            <option value="Low document quality / Unreadable scan">Low document quality / Unreadable scan</option>
                            <option value="Copyrighted material / Plagiarism detected">Copyrighted material / Plagiarism detected</option>
                            <option value="Inappropriate subject matter or description">Inappropriate subject matter or description</option>
                            <option value="Incorrect subject category classification">Incorrect subject category classification</option>
                            <option value="Spam / Advertisements / Duplicates">Spam / Advertisements / Duplicates</option>
                            <option value="Other Policy Violation">Other Policy Violation</option>
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <button 
                        type="button" 
                        className="btn btn-light btn-rounded-pill border text-secondary px-3"
                        onClick={() => setShowRejectModal(false)}
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-danger btn-rounded-pill px-4"
                        onClick={handleRejectConfirm}
                    >
                        Reject & Notify User
                    </button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
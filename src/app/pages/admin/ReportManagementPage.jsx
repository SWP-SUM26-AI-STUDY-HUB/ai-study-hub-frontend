import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { 
    AlertCircle, CheckCircle, XCircle, Search, ArrowLeft, 
    Flag, Filter, Clock, User, Eye, Trash2, Loader2
} from 'lucide-react';
import { Modal, Form } from 'react-bootstrap';
import { toast } from 'sonner';

export default function ReportManagementPage() {
    const navigate = useNavigate();
    
    // 1. Quản lý Dữ liệu
    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // 2. Quản lý Tìm kiếm & Lọc
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all | pending | resolved | dismissed

    // 3. Quản lý Modal Hành động (Chi tiết, Bỏ qua, Xóa, Cảnh cáo)
    const [showModal, setShowModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [actionType, setActionType] = useState(''); // details | dismiss | resolve_delete | resolve_warn
    const [resolutionNote, setResolutionNote] = useState('');

    const fetchReports = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Session expired. Please login again.');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const response = await fetch('http://14.225.254.145:8080/api/v1/admin/reports', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`Failed to load reports: ${response.status}`);
            }

            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                const parsedReports = result.data.map(report => ({
                    id: report.reportId || report.id,
                    documentId: report.documentId,
                    documentTitle: report.documentTitle || report.document?.title || `Document ${report.documentId}`,
                    reportedBy: report.reportedBy || report.reporterName || report.user?.fullName || 'Community Member',
                    reason: report.reason || 'Flagged for moderation',
                    date: report.createdAt || report.date || new Date().toISOString(),
                    status: (report.status || 'pending').toLowerCase(),
                    note: report.note || '',
                    authorId: report.authorId || report.document?.uploader?.id || null
                }));
                setReports(parsedReports);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'An error occurred while loading reports.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    // 4. Tính toán số lượng thống kê (Tự động cập nhật dựa trên mảng reports)
    const totalReports = reports.length;
    const pendingCount = reports.filter(r => r.status === 'pending').length;
    const resolvedCount = reports.filter(r => r.status === 'resolved').length;
    const dismissedCount = reports.filter(r => r.status === 'dismissed').length;

    // 5. Logic Tìm kiếm và Lọc
    const filteredReports = reports.filter(report => {
        const matchesSearch = 
            report.documentTitle?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            report.reportedBy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.reason?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Mở Modal và cài đặt trạng thái
    const openActionModal = (report, type) => {
        setSelectedReport(report);
        setActionType(type);
        setResolutionNote(''); // Reset lại ghi chú
        setShowModal(true);
    };

    // Xử lý khi nhấn nút xác nhận trong Modal
    const handleConfirmAction = async () => {
        if (!selectedReport) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            let newStatus = selectedReport.status;
            let successMessage = '';

            if (actionType === 'dismiss') {
                const response = await fetch(`http://14.225.254.145:8080/api/v1/admin/reports/${selectedReport.id}/reject`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Failed to dismiss report.');
                }
                newStatus = 'dismissed';
                successMessage = `Report for "${selectedReport.documentTitle}" has been dismissed.`;

            } else if (actionType === 'resolve_delete') {
                const response = await fetch(`http://14.225.254.145:8080/api/v1/admin/reports/${selectedReport.id}/resolve`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ note: resolutionNote })
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Failed to resolve report.');
                }
                newStatus = 'resolved';
                successMessage = `Document "${selectedReport.documentTitle}" has been deleted, and report resolved.`;

            } else if (actionType === 'resolve_warn') {
                if (selectedReport.authorId) {
                    await fetch(`http://14.225.254.145:8080/api/v1/admin/users/${selectedReport.authorId}/warn`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ reason: resolutionNote || 'Document policy violation flagged by reports.' })
                    });
                }

                const response = await fetch(`http://14.225.254.145:8080/api/v1/admin/reports/${selectedReport.id}/resolve`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ note: `Warned author. ${resolutionNote}` })
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Failed to resolve report.');
                }
                newStatus = 'resolved';
                successMessage = `Author of "${selectedReport.documentTitle}" was warned, and report resolved.`;
            }

            setReports(prev => prev.map(r => r.id === selectedReport.id ? { ...r, status: newStatus, note: resolutionNote } : r));
            toast.success(successMessage);
            setShowModal(false);
            setSelectedReport(null);

        } catch (error) {
            toast.error(error.message);
        }
    };

    // Hàm trả về màu sắc của Badge trạng thái
    const getStatusBadge = (status) => {
        const badges = {
            pending: <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2.5 py-1.5 fw-semibold" style={{ fontSize: '11px' }}>PENDING</span>,
            resolved: <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1.5 fw-semibold" style={{ fontSize: '11px' }}>RESOLVED</span>,
            dismissed: <span className="badge bg-secondary-subtle text-secondary px-2.5 py-1.5 fw-semibold" style={{ fontSize: '11px' }}>DISMISSED</span>
        };
        return badges[status] || <span className="badge bg-light text-dark px-2.5 py-1.5" style={{ fontSize: '11px' }}>UNKNOWN</span>;
    };

    return (
        <div className="report-management-container py-5 px-4 px-md-5 text-start">
            {/* CSS Tùy chỉnh (Giữ nguyên giao diện cao cấp) */}
            <style>{`
                .report-management-container { background-color: #fafbfe; min-height: calc(100vh - 80px); font-family: 'Montserrat', 'Inter', sans-serif; }
                .back-link { color: var(--muted-foreground); font-size: 14px; transition: color 0.2s; }
                .back-link:hover { color: var(--primary); }
                .page-title { font-size: 28px; font-weight: 700; color: #C73866; }
                .stats-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.01); display: flex; align-items: center; gap: 16px; height: 100%; }
                .stats-icon-box { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                .stats-icon-box.total { background-color: rgba(199, 56, 102, 0.08); color: #C73866; }
                .stats-icon-box.pending { background-color: rgba(245, 158, 11, 0.08); color: #F59E0B; }
                .stats-icon-box.resolved { background-color: rgba(16, 185, 129, 0.08); color: #10B981; }
                .stats-icon-box.dismissed { background-color: rgba(113, 128, 150, 0.08); color: #718096; }
                .search-filter-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.01); }
                .search-input-wrapper { position: relative; }
                .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #a0aec0; }
                .form-control-custom { background-color: #FFF9F5; border: 1px solid rgba(253, 143, 82, 0.18); border-radius: 10px; padding: 10px 16px 10px 40px; font-size: 14px; color: #1f1f1f; transition: all 0.2s; }
                .form-control-custom:focus { background-color: #ffffff; border-color: #FD8F52; box-shadow: 0 0 0 3px rgba(253, 143, 82, 0.15); outline: none; }
                .form-select-custom { background-color: #FFF9F5; border: 1px solid rgba(253, 143, 82, 0.18); border-radius: 10px; padding: 10px 16px; font-size: 14px; color: #1f1f1f; height: 100%; }
                .form-select-custom:focus { background-color: #ffffff; border-color: #FD8F52; box-shadow: 0 0 0 3px rgba(253, 143, 82, 0.15); outline: none; }
                .report-table-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02); }
                .action-link { background: transparent; border: none; font-size: 13px; font-weight: 600; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: all 0.2s; }
                .action-link.view { color: #FD8F52; } .action-link.view:hover { background-color: rgba(253, 143, 82, 0.08); }
                .action-link.dismiss { color: #718096; } .action-link.dismiss:hover { background-color: rgba(113, 128, 150, 0.08); }
                .action-link.resolve-del { color: #EF4444; } .action-link.resolve-del:hover { background-color: rgba(239, 68, 68, 0.08); }
                .action-link.resolve-warn { color: #F59E0B; } .action-link.resolve-warn:hover { background-color: rgba(245, 158, 11, 0.08); }
                .admin-modal .modal-content { border: none; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                .admin-modal .modal-header { border-bottom: none; padding: 24px 24px 8px 24px; }
                .admin-modal .modal-body { padding: 8px 24px 24px 24px; }
                .admin-modal .modal-footer { border-top: none; padding: 0 24px 24px 24px; }
                .btn-rounded-pill { border-radius: 20px; font-weight: 600; padding: 8px 20px; }
            `}</style>

            {/* Back to Home Link */}
            <div className="mb-4">
                <Link to="/admin/home" className="d-inline-flex align-items-center gap-2 text-decoration-none back-link fw-medium">
                    <ArrowLeft size={16} /> <span>Back to Dashboard</span>
                </Link>
            </div>

            {/* Tiêu đề trang */}
            <div className="mb-4 text-start">
                <h1 className="page-title mb-1">Report Management</h1>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Review document reports flagged by users, enforce copyright policies and content guidelines.</p>
            </div>

            {/* 4 Thẻ Thống kê */}
            <div className="row g-4 mb-4">
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="stats-card">
                        <div className="stats-icon-box total"><Flag size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{totalReports}</h4>
                            <span className="text-muted small">Total Reports</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="stats-card">
                        <div className="stats-icon-box pending"><Clock size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{pendingCount}</h4>
                            <span className="text-muted small">Pending Reviews</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="stats-card">
                        <div className="stats-icon-box resolved"><CheckCircle size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{resolvedCount}</h4>
                            <span className="text-muted small">Resolved Reports</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="stats-card">
                        <div className="stats-icon-box dismissed"><XCircle size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{dismissedCount}</h4>
                            <span className="text-muted small">Dismissed Reports</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Thanh Tìm kiếm và Lọc */}
            <div className="search-filter-card mb-4">
                <div className="row g-3 align-items-center">
                    <div className="col-md-8">
                        <div className="search-input-wrapper">
                            <Search size={18} className="search-icon" />
                            <input 
                                type="text" 
                                className="form-control form-control-custom w-100" 
                                placeholder="Search by document title, reporter, reason..."
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
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="resolved">Resolved</option>
                                <option value="dismissed">Dismissed</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bảng Danh sách Báo cáo */}
            <div className="report-table-card">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr>
                                <th className="py-3 px-4">Document Title</th>
                                <th className="py-3">Reported By</th>
                                <th className="py-3">Reason / Details</th>
                                <th className="py-3">Report Date</th>
                                <th className="py-3 text-center">Status</th>
                                <th className="py-3 px-4 text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5 text-muted">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" style={{ animation: 'spin 1s linear infinite' }} />
                                        <p>Loading reports...</p>
                                    </td>
                                </tr>
                            ) : filteredReports.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5 text-muted">
                                        <AlertCircle size={48} className="mx-auto mb-3 text-muted-foreground opacity-50" />
                                        <h6>No reports found matching filters</h6>
                                    </td>
                                </tr>
                            ) : (
                                filteredReports.map((report) => (
                                    <tr key={report.id}>
                                        <td className="py-3 px-4 fw-semibold text-dark" style={{ maxWidth: '220px' }}>
                                            <span 
                                                className="d-block text-truncate text-decoration-none hover-text-primary" 
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => navigate(`/document/${report.documentId}`)}
                                                title={report.documentTitle}
                                            >
                                                {report.documentTitle}
                                            </span>
                                            <span className="text-muted small fw-normal">Doc ID: {report.documentId}</span>
                                        </td>
                                        <td className="py-3 text-muted small">
                                            <span className="d-inline-flex align-items-center gap-1">
                                                <User size={12} /> {report.reportedBy}
                                            </span>
                                        </td>
                                        <td className="py-3 text-muted small" style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {report.reason}
                                        </td>
                                        <td className="py-3 text-muted small">
                                            {new Date(report.date || Date.now()).toLocaleDateString('en-US')}
                                        </td>
                                        <td className="py-3 text-center">
                                            {getStatusBadge(report.status)}
                                        </td>
                                        <td className="py-3 px-4 text-end">
                                            <div className="d-flex justify-content-end gap-1">
                                                <button className="action-link view" title="View Details" onClick={() => openActionModal(report, 'details')}>
                                                    View
                                                </button>
                                                {report.status === 'pending' && (
                                                    <>
                                                        <button className="action-link dismiss" title="Dismiss Report" onClick={() => openActionModal(report, 'dismiss')}>
                                                            Dismiss
                                                        </button>
                                                        <button className="action-link resolve-warn" title="Warn Author" onClick={() => openActionModal(report, 'resolve_warn')}>
                                                            Warn Author
                                                        </button>
                                                        <button className="action-link resolve-del" title="Delete Document" onClick={() => openActionModal(report, 'resolve_delete')}>
                                                            Delete Doc
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Nhập ghi chú / Xác nhận hành động */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered className="admin-modal">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold text-dark" style={{ fontSize: '18px' }}>
                        {actionType === 'details' && 'Report details'}
                        {actionType === 'dismiss' && 'Dismiss Report'}
                        {actionType === 'resolve_delete' && 'Resolve & Delete Document'}
                        {actionType === 'resolve_warn' && 'Resolve & Warn Author'}
                    </Modal.Title>
                </Modal.Header>
                
                <Modal.Body className="text-start">
                    {actionType === 'details' ? (
                        <div className="report-detail-modal">
                            <div className="mb-3">
                                <label className="fw-bold text-dark small d-block">Report ID</label>
                                <span className="text-secondary small">{selectedReport?.id}</span>
                            </div>
                            <div className="mb-3">
                                <label className="fw-bold text-dark small d-block">Reported Document</label>
                                <span 
                                    className="text-primary fw-semibold" 
                                    style={{ cursor: 'pointer', fontSize: '14px' }}
                                    onClick={() => {
                                        setShowModal(false);
                                        navigate(`/document/${selectedReport?.documentId}`);
                                    }}
                                >
                                    {selectedReport?.documentTitle} (ID: {selectedReport?.documentId})
                                </span>
                            </div>
                            <div className="mb-3">
                                <label className="fw-bold text-dark small d-block">Reported By</label>
                                <span className="text-secondary small">{selectedReport?.reportedBy}</span>
                            </div>
                            <div className="mb-3">
                                <label className="fw-bold text-dark small d-block">Date of Report</label>
                                <span className="text-secondary small">
                                    {selectedReport?.date ? new Date(selectedReport.date).toLocaleDateString('en-US') : ''}
                                </span>
                            </div>
                            <div className="mb-3">
                                <label className="fw-bold text-dark small d-block">Reason Flagged</label>
                                <div className="p-3 bg-light rounded text-dark small border border-light" style={{ whiteSpace: 'pre-wrap' }}>
                                    {selectedReport?.reason}
                                </div>
                            </div>
                            {selectedReport?.note && (
                                <div className="mb-0">
                                    <label className="fw-bold text-dark small d-block">Resolution Note</label>
                                    <span className="text-muted small italic">"{selectedReport.note}"</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <p className="text-muted mb-3">
                                {actionType === 'dismiss' && `Are you sure you want to dismiss the report against "${selectedReport?.documentTitle}"? The document will remain public.`}
                                {actionType === 'resolve_delete' && `Are you sure you want to permanently delete the document "${selectedReport?.documentTitle}"? This will resolve the report.`}
                                {actionType === 'resolve_warn' && `Are you sure you want to warn the author of "${selectedReport?.documentTitle}" regarding policy violations?`}
                            </p>
                            
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-semibold small text-dark">Resolution Memo (Optional)</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    className="form-control-custom w-100"
                                    placeholder="E.g., Verified copyright claims, resolved accordingly."
                                    style={{ paddingLeft: '12px' }}
                                    value={resolutionNote}
                                    onChange={(e) => setResolutionNote(e.target.value)}
                                />
                            </Form.Group>
                        </div>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <button type="button" className="btn btn-light btn-rounded-pill border text-secondary px-3" onClick={() => setShowModal(false)}>
                        {actionType === 'details' ? 'Close' : 'Cancel'}
                    </button>
                    {actionType !== 'details' && (
                        <button 
                            type="button" 
                            className={`btn btn-rounded-pill px-4 ${actionType === 'resolve_delete' ? 'btn-danger' : actionType === 'resolve_warn' ? 'btn-warning text-white' : 'btn-secondary'}`}
                            onClick={handleConfirmAction}
                        >
                            {actionType === 'dismiss' && 'Confirm Dismiss'}
                            {actionType === 'resolve_delete' && 'Delete & Resolve'}
                            {actionType === 'resolve_warn' && 'Warn & Resolve'}
                        </button>
                    )}
                </Modal.Footer>
            </Modal>
        </div>
    );
}
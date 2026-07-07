import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { 
    AlertCircle, CheckCircle, XCircle, Search, ArrowLeft, 
    Flag, Clock, User, Loader2
} from 'lucide-react';
import { Modal, Form } from 'react-bootstrap';
import { toast } from 'sonner';

export default function ReportManagementPage() {
    const navigate = useNavigate();
    
    // 1. Core Data States
    const [reportedDocs, setReportedDocs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // 2. Search Filter States
    const [searchQuery, setSearchQuery] = useState('');

    // 3. Modal & Active Actions States
    const [showModal, setShowModal] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [reportsForSelectedDoc, setReportsForSelectedDoc] = useState([]);
    const [isLoadingReports, setIsLoadingReports] = useState(false);
    const [resolutionNote, setResolutionNote] = useState('');

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmActionType, setConfirmActionType] = useState(''); // reject | resolve
    const [activeReport, setActiveReport] = useState(null);

    // Fetch list of reported documents
    const fetchReportedDocs = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Session expired. Please login again.');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const response = await fetch('http://14.225.254.145:8080/api/v1/admin/reports/documents', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`Failed to load reported documents: ${response.status}`);
            }

            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                setReportedDocs(result.data);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'An error occurred while loading reported documents.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReportedDocs();
    }, []);

    // Stats calculations
    const totalReportedDocs = reportedDocs.length;
    const activeReportsCount = reportedDocs.reduce((acc, curr) => acc + (curr.reportCount || 0), 0);

    // Filtering reported docs list
    const filteredDocs = reportedDocs.filter(doc => {
        return (
            doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            doc.uploaderName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.documentId?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    // View individual reports for a specific document
    const handleViewReports = async (doc) => {
        setSelectedDoc(doc);
        setShowModal(true);
        setReportsForSelectedDoc([]);
        setIsLoadingReports(true);

        const token = localStorage.getItem('token');
        if (!token) {
            setIsLoadingReports(false);
            return;
        }

        try {
            const response = await fetch(`http://14.225.254.145:8080/api/v1/admin/reports/documents/${doc.documentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error(`Failed to load reports: ${response.status}`);
            }
            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                setReportsForSelectedDoc(result.data);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to load report details.');
        } finally {
            setIsLoadingReports(false);
        }
    };

    // Open confirmation step for report actions
    const openConfirmModal = (report, type) => {
        setActiveReport(report);
        setConfirmActionType(type);
        setResolutionNote('');
        setShowConfirmModal(true);
    };

    // Confirm execution of Reject (Dismiss) or Resolve (Delete)
    const handleConfirmAction = async () => {
        if (!activeReport) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            if (confirmActionType === 'reject') {
                const response = await fetch(`http://14.225.254.145:8080/api/v1/admin/reports/${activeReport.reportId}/reject`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Failed to dismiss report.');
                }
                toast.success('Report has been dismissed successfully.');
            } else if (confirmActionType === 'resolve') {
                const response = await fetch(`http://14.225.254.145:8080/api/v1/admin/reports/${activeReport.reportId}/resolve`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ note: resolutionNote || 'Violation resolved and document removed' })
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Failed to resolve report.');
                }
                toast.success('Document deleted and report resolved successfully.');
                setShowModal(false); // Close parent details modal on complete deletion
            }

            setShowConfirmModal(false);
            setActiveReport(null);
            
            // Reload lists
            fetchReportedDocs();
            if (selectedDoc && confirmActionType === 'reject') {
                handleViewReports(selectedDoc);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to execute moderation action.');
        }
    };

    return (
        <div className="report-management-container py-5 px-4 px-md-5 text-start">
            <style>{`
                .report-management-container { background-color: #fafbfe; min-height: calc(100vh - 80px); font-family: 'Montserrat', 'Inter', sans-serif; }
                .back-link { color: #6c757d; font-size: 14px; transition: color 0.2s; }
                .back-link:hover { color: #FD8F52; }
                .page-title { font-size: 28px; font-weight: 700; color: #C73866; }
                .stats-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.01); display: flex; align-items: center; gap: 16px; height: 100%; }
                .stats-icon-box { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                .stats-icon-box.total-docs { background-color: rgba(199, 56, 102, 0.08); color: #C73866; }
                .stats-icon-box.total-reports { background-color: rgba(245, 158, 11, 0.08); color: #F59E0B; }
                .search-filter-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.01); }
                .search-input-wrapper { position: relative; }
                .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #a0aec0; }
                .form-control-custom { background-color: #FFF9F5; border: 1px solid rgba(253, 143, 82, 0.18); border-radius: 10px; padding: 10px 16px 10px 40px; font-size: 14px; color: #1f1f1f; transition: all 0.2s; }
                .form-control-custom:focus { background-color: #ffffff; border-color: #FD8F52; box-shadow: 0 0 0 3px rgba(253, 143, 82, 0.15); outline: none; }
                .report-table-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02); }
                .action-link { background: transparent; border: none; font-size: 13px; font-weight: 600; cursor: pointer; padding: 6px 12px; border-radius: 8px; transition: all 0.2s; }
                .action-link.view { color: white; background-color: #FD8F52; } .action-link.view:hover { background-color: #e07234; }
                .action-link.dismiss { color: #718096; border: 1px solid #cbd5e0; } .action-link.dismiss:hover { background-color: #f7fafc; }
                .action-link.resolve-del { color: white; background-color: #EF4444; } .action-link.resolve-del:hover { background-color: #dc2626; }
                .admin-modal .modal-content { border: none; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                .admin-modal .modal-header { border-bottom: none; padding: 24px 24px 8px 24px; }
                .admin-modal .modal-body { padding: 8px 24px 24px 24px; }
                .admin-modal .modal-footer { border-top: none; padding: 0 24px 24px 24px; }
                .btn-rounded-pill { border-radius: 20px; font-weight: 600; padding: 8px 20px; }
                .report-item-box { border-bottom: 1px solid #edf2f7; padding-bottom: 16px; margin-bottom: 16px; }
                .report-item-box:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }

                /* Dark Mode Overrides */
                [data-theme='dark'] .report-management-container { background-color: var(--bg-global); }
                [data-theme='dark'] .stats-card { background: var(--bg-card-container); border-color: var(--border-color); }
                [data-theme='dark'] .search-filter-card { background: var(--bg-card-container); border-color: var(--border-color); }
                [data-theme='dark'] .form-control-custom { background-color: #11141a !important; border-color: rgba(253, 143, 82, 0.3) !important; color: var(--text-main) !important; }
                [data-theme='dark'] .form-control-custom:focus { background-color: #0b0d12 !important; border-color: #FD8F52 !important; color: var(--text-main) !important; }
                [data-theme='dark'] .report-table-card { background: var(--bg-card-container); border-color: var(--border-color); }
                [data-theme='dark'] .admin-modal .modal-content { background-color: var(--bg-card-container); border: 1px solid var(--border-color); }
                [data-theme='dark'] .report-item-box { border-bottom-color: var(--border-color); }
                [data-theme='dark'] .action-link.dismiss { color: var(--text-muted); border-color: var(--border-color); }
                [data-theme='dark'] .action-link.dismiss:hover { background-color: var(--bg-global); }
            `}</style>

            {/* Back to Home Link */}
            <div className="mb-4">
                <Link to="/admin/home" className="d-inline-flex align-items-center gap-2 text-decoration-none back-link fw-medium">
                    <ArrowLeft size={16} /> <span>Back to Dashboard</span>
                </Link>
            </div>

            {/* Title */}
            <div className="mb-4 text-start">
                <h1 className="page-title mb-1">Report Management</h1>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Review and handle policy violations or copyright complaints against study materials.</p>
            </div>

            {/* Stats Summary Cards */}
            <div className="row g-4 mb-4">
                <div className="col-12 col-md-6">
                    <div className="stats-card">
                        <div className="stats-icon-box total-docs"><Flag size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{totalReportedDocs}</h4>
                            <span className="text-muted small">Reported Documents</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-md-6">
                    <div className="stats-card">
                        <div className="stats-icon-box total-reports"><Clock size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{activeReportsCount}</h4>
                            <span className="text-muted small">Total Pending Complaints</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search filter toolbar */}
            <div className="search-filter-card mb-4">
                <div className="row g-3 align-items-center">
                    <div className="col-12">
                        <div className="search-input-wrapper">
                            <Search size={18} className="search-icon" />
                            <input 
                                type="text" 
                                className="form-control form-control-custom w-100" 
                                placeholder="Search reported files by title, uploader name, ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Document list table */}
            <div className="report-table-card">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr>
                                <th className="py-3 px-4">Document Details</th>
                                <th className="py-3">Uploaded By</th>
                                <th className="py-3 text-center">Active Complaints</th>
                                <th className="py-3 text-center">Latest Flagged Date</th>
                                <th className="py-3 px-4 text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-5 text-muted">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" style={{ animation: 'spin 1s linear infinite' }} />
                                        <p>Loading reports...</p>
                                    </td>
                                </tr>
                            ) : filteredDocs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-5 text-muted">
                                        <AlertCircle size={48} className="mx-auto mb-3 text-muted-foreground opacity-50" />
                                        <h6>No reports found</h6>
                                    </td>
                                </tr>
                            ) : (
                                filteredDocs.map((doc) => (
                                    <tr key={doc.documentId}>
                                        <td className="py-3 px-4 fw-semibold text-dark text-start" style={{ maxWidth: '260px' }}>
                                            <span 
                                                className="d-block text-truncate text-decoration-none text-dark hover-text-primary" 
                                                style={{ cursor: 'pointer', fontWeight: 600 }}
                                                onClick={() => navigate(`/document/${doc.documentId}`)}
                                                title={doc.title}
                                            >
                                                {doc.title || 'Untitled Document'}
                                            </span>
                                            <span className="text-muted small fw-normal">ID: {doc.documentId}</span>
                                        </td>
                                        <td className="py-3 text-muted small text-start">
                                            <span className="d-inline-flex align-items-center gap-1">
                                                <User size={12} /> {doc.uploaderName || 'Contributor'}
                                            </span>
                                        </td>
                                        <td className="py-3 text-center">
                                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2.5 py-1 fw-bold">
                                                {doc.reportCount} reports
                                            </span>
                                        </td>
                                        <td className="py-3 text-center text-muted small">
                                            {doc.latestReportAt ? new Date(doc.latestReportAt).toLocaleDateString('en-US') : 'N/A'}
                                        </td>
                                        <td className="py-3 px-4 text-end">
                                            <button className="action-link view" title="View Reports Details" onClick={() => handleViewReports(doc)}>
                                                View Complaints
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal 1: View List of Complaints */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered className="admin-modal">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold text-dark" style={{ fontSize: '18px' }}>
                        Active Complaints for: {selectedDoc?.title}
                    </Modal.Title>
                </Modal.Header>
                
                <Modal.Body className="text-start">
                    {isLoadingReports ? (
                        <div className="text-center py-5 text-muted">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" style={{ animation: 'spin 1s linear infinite' }} />
                            <p>Loading complaints list...</p>
                        </div>
                    ) : reportsForSelectedDoc.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <CheckCircle size={40} className="mx-auto mb-2 text-success" />
                            <p>No active pending complaints found for this document.</p>
                        </div>
                    ) : (
                        <div className="reports-details-list" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                            {reportsForSelectedDoc.map((report) => (
                                <div key={report.reportId} className="report-item-box text-start">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <span className="fw-semibold text-dark small">
                                            Reported by: {report.reporterName || 'Anonymous User'}
                                        </span>
                                        <span className="text-muted small">
                                            {report.createdAt ? new Date(report.createdAt).toLocaleDateString('en-US') : ''}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-light rounded text-dark small border border-light mb-3">
                                        <strong>Reason:</strong> {report.reason || 'No description provided'}
                                    </div>
                                    <div className="d-flex justify-content-end gap-2">
                                        <button 
                                            className="action-link dismiss" 
                                            onClick={() => openConfirmModal(report, 'reject')}
                                        >
                                            Dismiss Report
                                        </button>
                                        <button 
                                            className="action-link resolve-del" 
                                            onClick={() => openConfirmModal(report, 'resolve')}
                                        >
                                            Delete & Resolve
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button type="button" className="btn btn-light btn-rounded-pill border text-secondary px-4" onClick={() => setShowModal(false)}>
                        Close
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Modal 2: Confirm Dismiss or Resolve Actions */}
            <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered className="admin-modal" style={{ zIndex: 1060 }}>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold text-dark" style={{ fontSize: '16px' }}>
                        {confirmActionType === 'reject' ? 'Dismiss Complaint' : 'Resolve & Delete Document'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-start">
                    {confirmActionType === 'reject' ? (
                        <p className="text-muted mb-0">
                            Are you sure you want to dismiss the complaint reported by <strong>{activeReport?.reporterName}</strong>? The document will remain active.
                        </p>
                    ) : (
                        <div>
                            <p className="text-muted mb-3">
                                Are you sure you want to resolve the complaint and permanently delete <strong>{selectedDoc?.title}</strong>? This action cannot be undone.
                            </p>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-semibold small text-dark">Resolution Note (Optional)</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    className="form-control-custom w-100"
                                    placeholder="Reason for deletion (e.g., Copyright Infringement)"
                                    style={{ paddingLeft: '12px' }}
                                    value={resolutionNote}
                                    onChange={(e) => setResolutionNote(e.target.value)}
                                />
                            </Form.Group>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button type="button" className="btn btn-light btn-rounded-pill border text-secondary px-3" onClick={() => setShowConfirmModal(false)}>
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        className={`btn btn-rounded-pill px-4 ${confirmActionType === 'resolve' ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={handleConfirmAction}
                    >
                        Confirm Action
                    </button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
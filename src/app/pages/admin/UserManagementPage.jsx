import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { 
    Users, UserCheck, UserMinus, UserX, Search, ArrowLeft, 
    Trash2, Mail, Calendar, AlertTriangle, Filter, FileText, Loader2
} from 'lucide-react';
import { Modal, Form } from 'react-bootstrap';
import { toast } from 'sonner';

export default function UserManagementPage() {
    const navigate = useNavigate();
    
    // 1. Quản lý Dữ liệu (Khởi tạo mảng rỗng, không dùng mockData)
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // 2. Quản lý Tìm kiếm & Lọc
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all | active | warned | banned

    // 3. Quản lý Modal Hành động (Cảnh cáo, Khóa, Xóa...)
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [actionType, setActionType] = useState(''); // warn | ban | activate | delete
    const [actionReason, setActionReason] = useState('Spam upload materials');

    // MÔ PHỎNG GỌI API KHI VÀO TRANG (Sau này thay bằng fetch API thật)
    useEffect(() => {
        // Tạm thời set mảng rỗng sau 1 giây để xem hiệu ứng loading
        const timer = setTimeout(() => {
            setUsers([]); 
            setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    // 4. Tính toán thống kê từ mảng users hiện tại
    const totalUsers = users.length;
    const activeCount = users.filter(u => u.status === 'active').length;
    const warnedCount = users.filter(u => u.status === 'warned').length;
    const bannedCount = users.filter(u => u.status === 'banned').length;

    // 5. Xử lý logic Lọc và Tìm kiếm
    const filteredUsers = users.filter(user => {
        const matchesSearch = 
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            user.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Mở Modal và nạp thông tin user được chọn
    const openActionModal = (user, type) => {
        setSelectedUser(user);
        setActionType(type);
        setActionReason('Spam upload materials'); // Reset lý do mặc định
        setShowModal(true);
    };

    // Xác nhận hành động trong Modal
    const handleConfirmAction = () => {
        if (!selectedUser) return;

        // Xóa hẳn user khỏi mảng
        if (actionType === 'delete') {
            setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
            toast.success(`Account for "${selectedUser.name}" has been permanently deleted.`);
        } 
        // Đổi trạng thái (active, warned, banned)
        else {
            const newStatus = actionType === 'warn' ? 'warned' : actionType === 'ban' ? 'banned' : 'active';
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, status: newStatus } : u));
            
            const messageMap = {
                warn: `User "${selectedUser.name}" has been warned. Reason: ${actionReason}`,
                ban: `User "${selectedUser.name}" has been banned. Reason: ${actionReason}`,
                activate: `User "${selectedUser.name}"'s status has been restored to Active.`
            };
            toast.success(messageMap[actionType]);
        }

        setShowModal(false);
        setSelectedUser(null);
    };

    // Hàm render màu sắc Status Badge
    const getStatusBadge = (status) => {
        const badges = {
            active: <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1.5 fw-semibold">ACTIVE</span>,
            warned: <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2.5 py-1.5 fw-semibold">WARNED</span>,
            banned: <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2.5 py-1.5 fw-semibold">BANNED</span>
        };
        return badges[status] || <span className="badge bg-secondary-subtle text-secondary px-2.5 py-1.5 fw-semibold">UNKNOWN</span>;
    };

    return (
        <div className="user-management-container py-5 px-4 px-md-5 text-start">
            {/* CSS Tùy chỉnh giữ nguyên */}
            <style>{`
                .user-management-container { background-color: #fafbfe; min-height: calc(100vh - 80px); font-family: 'Montserrat', 'Inter', sans-serif; }
                .back-link { color: var(--muted-foreground); font-size: 14px; transition: color 0.2s; }
                .back-link:hover { color: var(--primary); }
                .page-title { font-size: 28px; font-weight: 700; color: #C73866; }
                .stats-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.01); display: flex; align-items: center; gap: 16px; height: 100%; }
                .stats-icon-box { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                .stats-icon-box.total { background-color: rgba(199, 56, 102, 0.08); color: #C73866; }
                .stats-icon-box.active { background-color: rgba(16, 185, 129, 0.08); color: #10B981; }
                .stats-icon-box.warned { background-color: rgba(245, 158, 11, 0.08); color: #F59E0B; }
                .stats-icon-box.banned { background-color: rgba(239, 68, 68, 0.08); color: #EF4444; }
                .search-filter-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.01); }
                .search-input-wrapper { position: relative; }
                .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #a0aec0; }
                .form-control-custom { background-color: #FFF9F5; border: 1px solid rgba(253, 143, 82, 0.18); border-radius: 10px; padding: 10px 16px 10px 40px; font-size: 14px; color: #1f1f1f; transition: all 0.2s; }
                .form-control-custom:focus { background-color: #ffffff; border-color: #FD8F52; box-shadow: 0 0 0 3px rgba(253, 143, 82, 0.15); outline: none; }
                .form-select-custom { background-color: #FFF9F5; border: 1px solid rgba(253, 143, 82, 0.18); border-radius: 10px; padding: 10px 16px; font-size: 14px; color: #1f1f1f; height: 100%; }
                .form-select-custom:focus { background-color: #ffffff; border-color: #FD8F52; box-shadow: 0 0 0 3px rgba(253, 143, 82, 0.15); outline: none; }
                .user-table-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02); }
                .action-btn { width: 32px; height: 32px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; border: none; background: transparent; cursor: pointer; transition: background 0.2s, color 0.2s; }
                .action-btn.warn { color: #F59E0B; } .action-btn.warn:hover { background-color: rgba(245, 158, 11, 0.1); }
                .action-btn.ban { color: #EF4444; } .action-btn.ban:hover { background-color: rgba(239, 68, 68, 0.1); }
                .action-btn.activate { color: #10B981; } .action-btn.activate:hover { background-color: rgba(16, 185, 129, 0.1); }
                .action-btn.delete { color: #718096; } .action-btn.delete:hover { background-color: rgba(113, 128, 150, 0.1); color: #E53E3E; }
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

            {/* Title */}
            <div className="mb-4">
                <h1 className="page-title mb-1">User Management</h1>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Search, review warned states, and ban or suspend user accounts.</p>
            </div>

            {/* Khối Thống Kê 4 thẻ */}
            <div className="row g-4 mb-4">
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="stats-card">
                        <div className="stats-icon-box total"><Users size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{totalUsers}</h4>
                            <span className="text-muted small">Total Members</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="stats-card">
                        <div className="stats-icon-box active"><UserCheck size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{activeCount}</h4>
                            <span className="text-muted small">Active Accounts</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="stats-card">
                        <div className="stats-icon-box warned"><AlertTriangle size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{warnedCount}</h4>
                            <span className="text-muted small">Warned Accounts</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="stats-card">
                        <div className="stats-icon-box banned"><UserX size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{bannedCount}</h4>
                            <span className="text-muted small">Banned Accounts</span>
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
                                placeholder="Search by name, email..."
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
                                <option value="active">Active only</option>
                                <option value="warned">Warned only</option>
                                <option value="banned">Banned only</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bảng Danh Sách User */}
            <div className="user-table-card">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr>
                                <th className="py-3 px-4">User</th>
                                <th className="py-3">Bio</th>
                                <th className="py-3">Join Date</th>
                                <th className="py-3 text-center">Docs</th>
                                <th className="py-3 text-center">Status</th>
                                <th className="py-3 px-4 text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5 text-muted">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" style={{ animation: 'spin 1s linear infinite' }} />
                                        <p>Loading users...</p>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5 text-muted">
                                        <Users size={48} className="mx-auto mb-3 text-muted-foreground opacity-50" />
                                        <h6>No users found matching filters</h6>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id}>
                                        <td className="py-3 px-4">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white bg-primary" style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                                                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                                </div>
                                                <div>
                                                    <span className="fw-semibold text-dark d-block">{user.name}</span>
                                                    <span className="text-muted small d-inline-flex align-items-center gap-1">
                                                        <Mail size={12} /> {user.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 text-muted small" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {user.bio || 'No bio info'}
                                        </td>
                                        <td className="py-3 text-muted small">
                                            <span className="d-inline-flex align-items-center gap-1">
                                                <Calendar size={12} /> {new Date(user.joinDate || Date.now()).toLocaleDateString('en-US')}
                                            </span>
                                        </td>
                                        <td className="py-3 text-center">
                                            <span className="badge bg-light text-dark border px-2 py-1">
                                                <FileText size={12} className="me-1 text-muted" /> {user.documentCount || 0}
                                            </span>
                                        </td>
                                        <td className="py-3 text-center">
                                            {getStatusBadge(user.status)}
                                        </td>
                                        <td className="py-3 px-4 text-end">
                                            <div className="d-flex justify-content-end gap-1">
                                                {user.status === 'active' && (
                                                    <>
                                                        <button className="action-btn warn" title="Warn User" onClick={() => openActionModal(user, 'warn')}>
                                                            <UserMinus size={18} />
                                                        </button>
                                                        <button className="action-btn ban" title="Ban User" onClick={() => openActionModal(user, 'ban')}>
                                                            <UserX size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                {user.status === 'warned' && (
                                                    <>
                                                        <button className="action-btn activate" title="Restore Active" onClick={() => openActionModal(user, 'activate')}>
                                                            <UserCheck size={18} />
                                                        </button>
                                                        <button className="action-btn ban" title="Ban User" onClick={() => openActionModal(user, 'ban')}>
                                                            <UserX size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                {user.status === 'banned' && (
                                                    <button className="action-btn activate" title="Restore Active (Unban)" onClick={() => openActionModal(user, 'activate')}>
                                                        <UserCheck size={18} />
                                                    </button>
                                                )}
                                                <button className="action-btn delete text-muted" title="Permanently Delete" onClick={() => openActionModal(user, 'delete')}>
                                                    <Trash2 size={16} />
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

            {/* Modal Nhập Lý Do / Xác Nhận */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered className="admin-modal">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold" style={{ fontSize: '18px' }}>
                        {actionType === 'warn' && 'Warn User Account'}
                        {actionType === 'ban' && 'Ban User Account'}
                        {actionType === 'activate' && 'Activate/Restore Account'}
                        {actionType === 'delete' && 'Delete User Account'}
                    </Modal.Title>
                </Modal.Header>
                
                <Modal.Body className="text-start">
                    {actionType === 'delete' ? (
                        <p className="text-muted mb-0">
                            Are you sure you want to permanently delete the user account for <strong>{selectedUser?.name}</strong> ({selectedUser?.email})? This action is permanent and cannot be undone.
                        </p>
                    ) : actionType === 'activate' ? (
                        <p className="text-muted mb-0">
                            Are you sure you want to restore the account for <strong>{selectedUser?.name}</strong> back to <strong>Active</strong>?
                        </p>
                    ) : (
                        <div>
                            <p className="text-muted mb-3">
                                Are you sure you want to {actionType === 'warn' ? 'warn' : 'ban'} the user <strong>{selectedUser?.name}</strong>?
                            </p>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-semibold small text-dark">Reason for Action</Form.Label>
                                <Form.Select 
                                    className="form-select form-select-custom mb-3"
                                    value={actionReason}
                                    onChange={(e) => setActionReason(e.target.value)}
                                >
                                    <option value="Spam upload materials">Spam upload materials</option>
                                    <option value="Copyright infringement">Copyright infringement / Plagiarism</option>
                                    <option value="Harassment or inappropriate comments">Harassment or inappropriate comments</option>
                                    <option value="Uploading malicious files">Uploading malicious files / scripts</option>
                                    <option value="Other Policy Violation">Other Policy Violation</option>
                                </Form.Select>
                            </Form.Group>
                        </div>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <button type="button" className="btn btn-light btn-rounded-pill border text-secondary px-3" onClick={() => setShowModal(false)}>
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        className={`btn btn-rounded-pill px-4 ${actionType === 'delete' || actionType === 'ban' ? 'btn-danger' : actionType === 'warn' ? 'btn-warning text-white' : 'btn-success'}`}
                        onClick={handleConfirmAction}
                    >
                        {actionType === 'warn' && 'Confirm Warning'}
                        {actionType === 'ban' && 'Confirm Ban'}
                        {actionType === 'activate' && 'Confirm Restore'}
                        {actionType === 'delete' && 'Delete Permanently'}
                    </button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
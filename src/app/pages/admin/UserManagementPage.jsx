import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { 
    Users, UserCheck, UserMinus, UserX, Search, ArrowLeft, 
    Mail, AlertTriangle, Filter, Loader2, ShieldCheck
} from 'lucide-react';
import { Modal, Form } from 'react-bootstrap';
import { toast } from 'sonner';

export default function UserManagementPage() {
    const navigate = useNavigate();
    
    // 1. Core Data and Pagination States
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    
    // 2. Filter & Search States
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all | ACTIVE | INACTIVE | BANNED | OVERLIMITSTORAGE
    const [roleFilter, setRoleFilter] = useState('all'); // all | USER | ADMIN

    // 3. Action Modal States
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [actionType, setActionType] = useState(''); // warn | ban | activate
    const [actionReason, setActionReason] = useState('Spam upload materials');

    // 4. Global Stats Summary Card States
    const [summaryStats, setSummaryStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        banned: 0
    });

    // Debounce search query to prevent backend spamming
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(0); // Reset page to 0 on search
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Fetch user counts for summary cards
    const fetchSummaryStats = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const [totalRes, activeRes, inactiveRes, bannedRes] = await Promise.all([
                fetch('http://14.225.254.145:8080/api/v1/admin/users?page=0&size=1', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('http://14.225.254.145:8080/api/v1/admin/users?page=0&size=1&status=ACTIVE', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('http://14.225.254.145:8080/api/v1/admin/users?page=0&size=1&status=INACTIVE', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('http://14.225.254.145:8080/api/v1/admin/users?page=0&size=1&status=BANNED', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const stats = { total: 0, active: 0, inactive: 0, banned: 0 };
            
            if (totalRes.ok) {
                const r = await totalRes.json();
                stats.total = r.data?.totalElements || 0;
            }
            
            if (activeRes.ok) {
                const r = await activeRes.json();
                stats.active = r.data?.totalElements || 0;
            }
            
            if (inactiveRes.ok) {
                const r = await inactiveRes.json();
                stats.inactive = r.data?.totalElements || 0;
            }
            
            if (bannedRes.ok) {
                const r = await bannedRes.json();
                stats.banned = r.data?.totalElements || 0;
            }
            
            setSummaryStats(stats);
        } catch (error) {
            console.error('Error fetching user summary stats:', error);
        }
    };

    // Main user fetching logic (triggered on search, page index, status change, role change)
    const fetchUsers = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Session expired. Please login again.');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            let url = `http://14.225.254.145:8080/api/v1/admin/users?page=${page}&size=${pageSize}`;
            
            if (debouncedSearch.trim()) {
                url += `&search=${encodeURIComponent(debouncedSearch.trim())}`;
            }
            if (statusFilter !== 'all') {
                url += `&status=${statusFilter}`;
            }
            if (roleFilter !== 'all') {
                url += `&role=${roleFilter}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                let errMsg = `Failed to load users: status ${response.status}`;
                try {
                    const result = await response.json();
                    if (result && result.message) {
                        errMsg = result.message;
                    }
                } catch (_) {
                    try {
                        const txt = await response.text();
                        if (txt) errMsg = txt;
                    } catch (__) {}
                }
                throw new Error(errMsg);
            }

            const result = await response.json();
            if (result.success && result.data) {
                const content = result.data.content || (Array.isArray(result.data) ? result.data : []);
                const elementsCount = result.data.totalElements !== undefined ? result.data.totalElements : content.length;
                const pagesCount = result.data.totalPages !== undefined ? result.data.totalPages : Math.ceil(content.length / pageSize);

                setTotalElements(elementsCount);
                setTotalPages(pagesCount);

                const parsedUsers = content.map(user => ({
                    id: user.id,
                    name: user.fullName || 'Unknown User',
                    email: user.email,
                    bio: user.bio || 'No bio info',
                    role: user.role || 'USER',
                    avatarUrl: user.avatarUrl || null,
                    status: (user.status || 'ACTIVE').toLowerCase()
                }));
                setUsers(parsedUsers);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'An error occurred while loading users.');
            setUsers([]);
            setTotalElements(0);
            setTotalPages(0);
        } finally {
            setIsLoading(false);
        }
    };

    // Load initial counts and load page table users
    useEffect(() => {
        fetchSummaryStats();
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [page, pageSize, statusFilter, roleFilter, debouncedSearch]);

    // Open Action Modal with specific user and action type
    const openActionModal = (user, type) => {
        setSelectedUser(user);
        setActionType(type);
        setActionReason('Spam upload materials'); // Reset default reason
        setShowModal(true);
    };

    // Confirm action from Modal dialog
    const handleConfirmAction = async () => {
        if (!selectedUser) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            let successMessage = '';

            if (actionType === 'warn') {
                const response = await fetch(`http://14.225.254.145:8080/api/v1/admin/users/${selectedUser.id}/warn`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ reason: actionReason })
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Failed to warn user.');
                }
                successMessage = `User "${selectedUser.name}" has been warned. Reason: ${actionReason}`;
            } else if (actionType === 'ban') {
                const response = await fetch(`http://14.225.254.145:8080/api/v1/admin/users/${selectedUser.id}/ban`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Failed to ban user.');
                }
                successMessage = `User "${selectedUser.name}" has been banned.`;
            } else if (actionType === 'activate') {
                const response = await fetch(`http://14.225.254.145:8080/api/v1/admin/users/${selectedUser.id}/reactivate`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Failed to reactivate user.');
                }
                successMessage = `User "${selectedUser.name}"'s status has been restored to Active.`;
            }

            toast.success(successMessage);
            setShowModal(false);
            setSelectedUser(null);
            
            // Reload user list and statistics
            fetchUsers();
            fetchSummaryStats();

        } catch (error) {
            toast.error(error.message);
        }
    };

    // Helper to get status badges
    const getStatusBadge = (status) => {
        const badges = {
            active: <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1.5 fw-semibold" style={{ fontSize: '11px' }}>ACTIVE</span>,
            inactive: <span className="badge bg-secondary-subtle text-secondary px-2.5 py-1.5 fw-semibold" style={{ fontSize: '11px' }}>INACTIVE</span>,
            banned: <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2.5 py-1.5 fw-semibold" style={{ fontSize: '11px' }}>BANNED</span>,
            overlimitstorage: <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2.5 py-1.5 fw-semibold" style={{ fontSize: '11px' }}>OVER LIMIT</span>
        };
        return badges[status] || <span className="badge bg-light text-dark px-2.5 py-1.5" style={{ fontSize: '11px' }}>UNKNOWN</span>;
    };

    // Helper to get role badges
    const getRoleBadge = (role) => {
        const normalized = (role || 'USER').toUpperCase();
        if (normalized === 'ADMIN') {
            return (
                <span className="badge bg-danger text-white px-2 py-1 fw-bold d-inline-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
                    <ShieldCheck size={12} /> ADMIN
                </span>
            );
        }
        return (
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 fw-bold" style={{ fontSize: '11px' }}>
                USER
            </span>
        );
    };

    return (
        <div className="user-management-container py-5 px-4 px-md-5 text-start">
            {/* Custom High-Fidelity Styling */}
            <style>{`
                .user-management-container { background-color: #fafbfe; min-height: calc(100vh - 80px); font-family: 'Montserrat', 'Inter', sans-serif; }
                .back-link { color: #6c757d; font-size: 14px; transition: color 0.2s; }
                .back-link:hover { color: #FD8F52; }
                .page-title { font-size: 28px; font-weight: 700; color: #C73866; }
                .stats-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.01); display: flex; align-items: center; gap: 16px; height: 100%; }
                .stats-icon-box { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                .stats-icon-box.total { background-color: rgba(199, 56, 102, 0.08); color: #C73866; }
                .stats-icon-box.active { background-color: rgba(16, 185, 129, 0.08); color: #10B981; }
                .stats-icon-box.inactive { background-color: rgba(113, 128, 150, 0.08); color: #718096; }
                .stats-icon-box.banned { background-color: rgba(239, 68, 68, 0.08); color: #EF4444; }
                .search-filter-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.01); }
                .search-input-wrapper { position: relative; }
                .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #a0aec0; }
                .form-control-custom { background-color: #FFF9F5; border: 1px solid rgba(253, 143, 82, 0.18); border-radius: 10px; padding: 10px 16px 10px 40px; font-size: 14px; color: #1f1f1f; transition: all 0.2s; }
                .form-control-custom:focus { background-color: #ffffff; border-color: #FD8F52; box-shadow: 0 0 0 3px rgba(253, 143, 82, 0.15); outline: none; }
                .form-select-custom { background-color: #FFF9F5; border: 1px solid rgba(253, 143, 82, 0.18); border-radius: 10px; padding: 10px 16px; font-size: 14px; color: #1f1f1f; height: 100%; transition: all 0.2s; }
                .form-select-custom:focus { background-color: #ffffff; border-color: #FD8F52; box-shadow: 0 0 0 3px rgba(253, 143, 82, 0.15); outline: none; }
                .user-table-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02); }
                .action-btn { background: transparent; border: none; font-size: 13px; font-weight: 600; cursor: pointer; padding: 6px 10px; border-radius: 8px; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
                .action-btn.warn { color: #F59E0B; background-color: rgba(245, 158, 11, 0.08); } .action-btn.warn:hover { background-color: rgba(245, 158, 11, 0.15); }
                .action-btn.ban { color: #EF4444; background-color: rgba(239, 68, 68, 0.08); } .action-btn.ban:hover { background-color: rgba(239, 68, 68, 0.15); }
                .action-btn.activate { color: #10B981; background-color: rgba(16, 185, 129, 0.08); } .action-btn.activate:hover { background-color: rgba(16, 185, 129, 0.15); }
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
                <h1 className="page-title mb-1">User Management</h1>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Search and review accounts, warn users, and manage access restrictions.</p>
            </div>

            {/* 4 Thẻ Thống kê */}
            <div className="row g-4 mb-4">
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="stats-card">
                        <div className="stats-icon-box total"><Users size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{summaryStats.total}</h4>
                            <span className="text-muted small">Total Members</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="stats-card">
                        <div className="stats-icon-box active"><UserCheck size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{summaryStats.active}</h4>
                            <span className="text-muted small">Active Accounts</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="stats-card">
                        <div className="stats-icon-box inactive"><Users size={22} className="opacity-75" /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{summaryStats.inactive}</h4>
                            <span className="text-muted small">Inactive Accounts</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="stats-card">
                        <div className="stats-icon-box banned"><UserX size={22} /></div>
                        <div>
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>{summaryStats.banned}</h4>
                            <span className="text-muted small">Banned Accounts</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="search-filter-card mb-4">
                <div className="row g-3 align-items-center">
                    <div className="col-md-6">
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
                    <div className="col-md-3">
                        <div className="d-flex align-items-center gap-2">
                            <Filter size={16} className="text-muted" />
                            <select 
                                className="form-select form-select-custom w-100"
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(0);
                                }}
                            >
                                <option value="all">All Statuses</option>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                                <option value="BANNED">Banned</option>
                                <option value="OVERLIMITSTORAGE">Over Storage Limit</option>
                            </select>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="d-flex align-items-center gap-2">
                            <Filter size={16} className="text-muted" />
                            <select 
                                className="form-select form-select-custom w-100"
                                value={roleFilter}
                                onChange={(e) => {
                                    setRoleFilter(e.target.value);
                                    setPage(0);
                                }}
                            >
                                <option value="all">All Roles</option>
                                <option value="USER">USER</option>
                                <option value="ADMIN">ADMIN</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Users Data Table */}
            <div className="user-table-card">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr>
                                <th className="py-3 px-4">User</th>
                                <th className="py-3">Role</th>
                                <th className="py-3">Bio</th>
                                <th className="py-3 text-center">Status</th>
                                <th className="py-3 px-4 text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-5 text-muted">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" style={{ animation: 'spin 1s linear infinite' }} />
                                        <p>Loading users...</p>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-5 text-muted">
                                        <Users size={48} className="mx-auto mb-3 text-muted-foreground opacity-50" />
                                        <h6>No users found matching filters</h6>
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="py-3 px-4">
                                            <div className="d-flex align-items-center gap-3">
                                                {user.avatarUrl ? (
                                                    <img 
                                                        src={user.avatarUrl} 
                                                        alt={user.name} 
                                                        className="rounded-circle object-cover" 
                                                        style={{ width: '40px', height: '40px' }} 
                                                    />
                                                ) : (
                                                    <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white bg-primary" style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                                                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="fw-semibold text-dark d-block">{user.name}</span>
                                                    <span className="text-muted small d-inline-flex align-items-center gap-1">
                                                        <Mail size={12} /> {user.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3">
                                            {getRoleBadge(user.role)}
                                        </td>
                                        <td className="py-3 text-muted small" style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {user.bio || 'No bio info'}
                                        </td>
                                        <td className="py-3 text-center">
                                            {getStatusBadge(user.status)}
                                        </td>
                                        <td className="py-3 px-4 text-end">
                                            <div className="d-flex justify-content-end gap-1.5">
                                                {user.status !== 'banned' && (
                                                    <>
                                                        <button className="action-btn warn" title="Warn User" onClick={() => openActionModal(user, 'warn')}>
                                                            <UserMinus size={18} />
                                                        </button>
                                                        <button className="action-btn ban" title="Ban User" onClick={() => openActionModal(user, 'ban')}>
                                                            <UserX size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                {(user.status === 'banned' || user.status === 'inactive') && (
                                                    <button className="action-btn activate" title="Activate / Restore Account" onClick={() => openActionModal(user, 'activate')}>
                                                        <UserCheck size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!isLoading && totalPages > 1 && (
                    <div className="card-footer bg-white border-top d-flex align-items-center justify-content-between px-4 py-3">
                        <div className="text-muted small">
                            Showing <span className="fw-semibold">{page * pageSize + 1}</span> to{' '}
                            <span className="fw-semibold">
                                {Math.min((page + 1) * pageSize, totalElements)}
                            </span>{' '}
                            of <span className="fw-semibold">{totalElements}</span> users
                        </div>
                        <nav aria-label="Page navigation">
                            <ul className="pagination pagination-sm mb-0 gap-1">
                                <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
                                    <button
                                        className="page-link rounded-circle border-0 d-flex align-items-center justify-content-center"
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        style={{ width: '32px', height: '32px' }}
                                    >
                                        &laquo;
                                    </button>
                                </li>
                                {[...Array(totalPages)].map((_, i) => (
                                    <li key={i} className={`page-item ${page === i ? 'active' : ''}`}>
                                        <button
                                            className="page-link rounded-circle border-0 d-flex align-items-center justify-content-center"
                                            onClick={() => setPage(i)}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                backgroundColor: page === i ? '#FD8F52' : 'transparent',
                                                borderColor: page === i ? '#FD8F52' : 'transparent',
                                                color: page === i ? 'white' : '#6c757d'
                                            }}
                                        >
                                            {i + 1}
                                        </button>
                                    </li>
                                ))}
                                <li className={`page-item ${page === totalPages - 1 ? 'disabled' : ''}`}>
                                    <button
                                        className="page-link rounded-circle border-0 d-flex align-items-center justify-content-center"
                                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                        style={{ width: '32px', height: '32px' }}
                                    >
                                        &raquo;
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>

            {/* Action Confirmation Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered className="admin-modal">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold text-dark" style={{ fontSize: '18px' }}>
                        {actionType === 'warn' && 'Warn User'}
                        {actionType === 'ban' && 'Ban Account'}
                        {actionType === 'activate' && 'Reactivate Account'}
                    </Modal.Title>
                </Modal.Header>
                
                <Modal.Body className="text-start">
                    <p className="text-muted mb-3">
                        {actionType === 'warn' && `Send an official warning to "${selectedUser?.name}" (${selectedUser?.email}).`}
                        {actionType === 'ban' && `Are you sure you want to ban the account "${selectedUser?.name}"? All active login tokens will be blacklisted.`}
                        {actionType === 'activate' && `Are you sure you want to activate the account "${selectedUser?.name}"?`}
                    </p>
                    
                    {actionType === 'warn' && (
                        <Form.Group className="mb-0">
                            <Form.Label className="fw-semibold small text-dark">Warning Reason</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                className="form-control-custom w-100"
                                placeholder="E.g. Inappropriate comment behavior or spam material uploads."
                                style={{ paddingLeft: '12px' }}
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                            />
                        </Form.Group>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <button type="button" className="btn btn-light btn-rounded-pill border text-secondary px-3" onClick={() => setShowModal(false)}>
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        className={`btn btn-rounded-pill px-4 ${actionType === 'ban' ? 'btn-danger' : actionType === 'activate' ? 'btn-success' : 'btn-warning text-white'}`}
                        onClick={handleConfirmAction}
                    >
                        {actionType === 'warn' && 'Send Warning'}
                        {actionType === 'ban' && 'Ban Account'}
                        {actionType === 'activate' && 'Activate'}
                    </button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
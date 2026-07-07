import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import { useApp } from '../../context/AppContext';
import {
    Bell,
    User,
    LogOut,
    FileCheck,
    Users as UsersIcon,
    Flag,
    Shield
} from 'lucide-react';
import { Dropdown } from 'react-bootstrap';
import logoImg from '/src/image/logo.jpg';

export function AdminNavbar() {
    const { logout, toggleAdminMode } = useApp();
    const navigate = useNavigate();
    const location = useLocation();

    const [profile, setProfile] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Tự động gọi API Profile hệ thống khi AdminNavbar render
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const fetchUserProfile = async () => {
            try {
                const response = await fetch('http://14.225.254.145:8080/api/v1/users/profile', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await response.json();
                if (result && result.data) setProfile(result.data); // Nhận fullName, avatarUrl
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
        };

        const fetchNotifications = async () => {
            try {
                const response = await fetch('http://14.225.254.145:8080/api/v1/notifications', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await response.json();
                if (result && result.data && Array.isArray(result.data)) {
                    setNotifications(result.data);
                    const unread = result.data.filter(n => n && n.isRead === false).length;
                    setUnreadCount(unread);
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };

        fetchUserProfile();
        fetchNotifications();
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        localStorage.removeItem('token');
        navigate('/auth/login');
    };

    const getInitials = (nameString) => {
        if (!nameString) return 'JD';
        return nameString.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
        <header className="bg-white border-b sticky-top z-3 shadow-sm" style={{ borderBottomColor: 'rgba(253, 143, 82, 0.2)' }}>
            <div className="px-4 py-2 d-flex align-items-center justify-content-between w-100 gap-3">

                {/* BÊN TRÁI: GIỮ NGUYÊN LAYOUT LOGO CŨ CỦA NAVBAR NHƯ YÊU CẦU */}
                <div className="d-flex align-items-center gap-3">
                    <Link to="/admin/home" className="d-flex align-items-center gap-2 text-decoration-none">
                        <img
                            src={logoImg}
                            alt="Logo"
                            style={{ 
                                width: '60px', 
                                height: '60px', 
                                objectFit: 'cover', 
                                borderRadius: '50%', 
                                border: '2px solid rgba(255, 255, 255, 0.2)' 
                            }}
                        />
                        <div className="d-none d-md-block text-start">
                            <h5 className="mb-0 fw-bold" style={{ color: '#FD8F52', fontSize: '1.1rem' }}>StudyDocs AI</h5>
                            <p className="mb-0 text-muted" style={{ fontSize: '0.7rem' }}>Document Management</p>
                        </div>
                    </Link>
                </div>

                {/* BÊN PHẢI: KHỐI CHỨC NĂNG THÔNG BÁO VÀ DROPDOWN TÀI KHOẢN ADMIN */}
                {profile ? (
                    <div className="d-flex align-items-center gap-4">

                        {/* CHUÔNG THÔNG BÁO */}
                        <Dropdown align="end">
                            <Dropdown.Toggle as="div" className="position-relative cursor-pointer mt-1" id="notifications-dropdown" style={{ cursor: 'pointer' }}>
                                <Bell className="h-6 w-6 text-dark" style={{ cursor: 'pointer' }} />
                                {unreadCount > 0 && (
                                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white" style={{ fontSize: '9px', padding: '0.25em 0.4em' }}>
                                        {unreadCount}
                                    </span>
                                )}
                            </Dropdown.Toggle>
                            <Dropdown.Menu className="shadow border-0 mt-2 p-2" style={{ width: '320px', maxHeight: '380px', overflowY: 'auto', backgroundColor: 'var(--bg-card-container)', border: '1px solid var(--border-color)' }}>
                                <Dropdown.Header className="fw-bold px-2" style={{ color: 'var(--text-main)' }}>Notifications</Dropdown.Header>
                                <Dropdown.Divider style={{ borderColor: 'var(--border-color)' }} />
                                {notifications.length === 0 ? (
                                    <div className="text-center py-3" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No notifications yet</div>
                                ) : (
                                    <div className="d-flex flex-column gap-2">
                                        {notifications.map((notif) => (
                                            <Dropdown.Item key={notif.id} className={`p-2 rounded text-wrap border-0 ${notif.isRead ? 'bg-transparent' : 'bg-light'}`} style={{ cursor: 'default', color: 'var(--text-main)' }}>
                                                <p className="mb-0 fw-bold" style={{ fontSize: '13px', color: 'var(--text-main)' }}>{notif.title}</p>
                                                <p className="mb-0 mt-0.5" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{notif.content}</p>
                                            </Dropdown.Item>
                                        ))}
                                    </div>
                                )}
                            </Dropdown.Menu>
                        </Dropdown>

                        {/* DROPDOWN MENU ACCOUNT KHỚP THEO THỨ TỰ TRONG HÌNH */}
                        <Dropdown align="end">
                            <Dropdown.Toggle as="div" className="d-flex align-items-center gap-2 border-0 bg-transparent p-0" id="user-dropdown" style={{ cursor: 'pointer' }}>
                                {profile.avatarUrl ? (
                                    <img src={profile.avatarUrl} alt="Avatar" className="rounded-circle border" style={{ width: '36px', height: '36px', objectFit: 'cover', borderColor: 'rgba(253, 143, 82, 0.2)' }} />
                                ) : (
                                    <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '36px', height: '36px', backgroundColor: '#FFF5ED', color: '#FD8F52', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                                        {getInitials(profile.fullName)}
                                    </div>
                                )}
                                <span className="d-none d-md-inline fw-semibold text-dark">
                                    {profile.fullName || 'Admin Account'}
                                </span>
                            </Dropdown.Toggle>

                            <Dropdown.Menu className="shadow border-0 p-2 mt-2" style={{ minWidth: '220px', backgroundColor: 'var(--bg-card-container)', border: '1px solid var(--border-color)' }}>
                                <Dropdown.Header className="px-2 py-1" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    My Account
                                </Dropdown.Header>
                                <Dropdown.Divider style={{ borderColor: 'var(--border-color)' }} />

                                {/* 1. Profile */}
                                <Dropdown.Item onClick={() => navigate('/profile')} className="d-flex align-items-center gap-3 px-2 py-2 rounded bg-transparent border-0" style={{ color: 'var(--text-main)' }}>
                                    <User className="h-4 w-4 text-muted" />
                                    <span className="fw-medium" style={{ fontSize: '14px' }}>Profile</span>
                                </Dropdown.Item>

                                {/* 2. Pending Documents */}
                                <Dropdown.Item onClick={() => navigate('/admin/pending-documents')} className="d-flex align-items-center gap-3 px-2 py-2 rounded bg-transparent border-0" style={{ color: 'var(--text-main)' }}>
                                    <FileCheck className="h-4 w-4 text-muted" />
                                    <span className="fw-medium" style={{ fontSize: '14px' }}>Pending Documents</span>
                                </Dropdown.Item>

                                {/* 3. Report Management */}
                                <Dropdown.Item onClick={() => navigate('/admin/reports')} className="d-flex align-items-center gap-3 px-2 py-2 rounded bg-transparent border-0" style={{ color: 'var(--text-main)' }}>
                                    <Flag className="h-4 w-4 text-muted" />
                                    <span className="fw-medium" style={{ fontSize: '14px' }}>Report Management</span>
                                </Dropdown.Item>

                                {/* 4. User Management */}
                                <Dropdown.Item onClick={() => navigate('/admin/users')} className="d-flex align-items-center gap-3 px-2 py-2 rounded bg-transparent border-0" style={{ color: 'var(--text-main)' }}>
                                    <UsersIcon className="h-4 w-4 text-muted" />
                                    <span className="fw-medium" style={{ fontSize: '14px' }}>User Management</span>
                                </Dropdown.Item>

                                {/* 5. Switch to User Mode */}
                                <Dropdown.Item onClick={toggleAdminMode} className="d-flex align-items-center gap-3 px-2 py-2 rounded bg-transparent border-0" style={{ color: 'var(--text-main)' }}>
                                    <Shield className="h-4 w-4 text-primary" />
                                    <span className="fw-medium" style={{ fontSize: '14px' }}>Switch to User Mode</span>
                                </Dropdown.Item>

                                <Dropdown.Divider style={{ borderColor: 'var(--border-color)' }} />

                                {/* 6. Logout */}
                                <Dropdown.Item onClick={handleLogout} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-danger bg-transparent border-0 hover:bg-danger-subtle">
                                    <LogOut className="h-4 w-4 text-danger" />
                                    <span className="fw-medium" style={{ fontSize: '14px' }}>Logout</span>
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                ) : (
                    <div className="d-flex align-items-center gap-2">
                        <button onClick={() => navigate('/auth/login')} className="btn btn-sm btn-outline-warning" style={{ borderColor: '#FD8F52', color: '#FD8F52', borderRadius: '20px', padding: '0.4rem 1.2rem', fontWeight: '500' }}>Login</button>
                    </div>
                )}
            </div>
        </header>
    );
}
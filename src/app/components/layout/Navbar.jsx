import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import {
    Bell,
    User,
    LogOut,
    FileCheck,
    Users as UsersIcon,
    Flag,
    Crown,
    FileText,
    Upload,
    Search,
    Sun,
    Moon,
    ChevronDown,
    CreditCard
} from 'lucide-react';
import { Dropdown } from 'react-bootstrap';
import logoImg from '/src/image/logo.jpg';
import { API_BASE_URL } from '../../api.js';

// ==========================================
// COMPONENT 1: ADMIN NAVBAR (GIAO DIỆN ADMIN)
// ==========================================
function AdminNavbar({ profile, notifications, unreadCount, handleLogout, getInitials, darkMode, toggleTheme }) {
    const navigate = useNavigate();

    return (
        <header className="sticky-top shadow-sm" style={{ background: 'var(--bg-nav)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', zIndex: 1050, transition: 'all 0.3s ease' }}>
            <div className="px-4 py-2 d-flex align-items-center justify-content-between w-100 gap-3">

                {/* BÊN TRÁI: LOGO */}
                <div className="d-flex align-items-center gap-3">
                    <Link to="/admin/home" className="d-flex align-items-center gap-2 text-decoration-none">
                        <img
                            src={logoImg}
                            alt="Logo"
                            style={{
                                width: '60px',
                                height: '60px',
                                objectFit: 'cover',    // ĐÃ THÊM: Giúp cắt ảnh bo tròn theo khung
                                borderRadius: '50%',   // ĐÃ THÊM: Bo tròn tuyệt đối

                                border: '2px solid rgba(255, 255, 255, 0.2)'
                            }}
                        />
                        <div className="d-none d-md-block text-start">
                            <h5 className="mb-0 fw-bold" style={{ color: '#FD8F52', fontSize: '1.1rem' }}>StudyDocs AI</h5>
                            <p className="mb-0 text-white-50" style={{ fontSize: '0.7rem' }}>Document Management</p>
                        </div>
                    </Link>
                </div>

                {/* BÊN PHẢI: THÔNG BÁO & ACCOUNT */}
                <div className="d-flex align-items-center gap-4">
                    {/* NÚT ĐỔI THEME DARK/LIGHT MODE */}
                    <button
                        onClick={toggleTheme}
                        className="btn p-1.5 rounded-circle border-0 bg-transparent shadow-none"
                        style={{ color: 'var(--text-nav)', transition: 'color 0.3s' }}
                    >
                        {darkMode ? <Sun size={20} className="text-warning" /> : <Moon size={20} className="text-white" />}
                    </button>

                    {/* CHUÔNG THÔNG BÁO */}
                    <div
                        className="position-relative cursor-pointer mt-1"
                        onClick={() => navigate('/notifications')}
                        style={{ cursor: 'pointer' }}
                    >
                        <Bell className="h-6 w-6 text-white" style={{ cursor: 'pointer' }} />
                        {unreadCount > 0 && (
                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white" style={{ fontSize: '9px', padding: '0.25em 0.4em' }}>
                                {unreadCount}
                            </span>
                        )}
                    </div>

                    {/* MENU DROPDOWN ACCOUNT ADMIN - ĐÃ XOÁ CHỮ & DẤU GẠCH */}
                    <Dropdown align="end">
                        <Dropdown.Toggle as="div" className="d-flex align-items-center gap-2 border-0 bg-transparent p-0" id="user-dropdown" style={{ cursor: 'pointer' }}>
                            {profile?.avatarUrl ? (
                                <img src={profile.avatarUrl} alt="Avatar" className="rounded-circle border-white border" style={{ width: '36px', height: '36px', objectFit: 'cover' }} />
                            ) : (
                                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '36px', height: '36px', backgroundColor: '#FFF5ED', color: '#FD8F52' }}>
                                    {getInitials(profile?.fullName)}
                                </div>
                            )}
                            <span className="d-none d-md-inline fw-semibold text-white">
                                {profile?.fullName || 'Admin Account'}
                            </span>
                        </Dropdown.Toggle>

                        <Dropdown.Menu className="shadow border-0 p-2 mt-2" style={{ minWidth: '220px', backgroundColor: 'var(--bg-card-container)', border: '1px solid var(--border-color)' }}>
                            <Dropdown.Item onClick={() => navigate('/admin/pending-documents')} className="d-flex align-items-center gap-3 px-2 py-2 rounded bg-transparent border-0" style={{ color: 'var(--text-main)' }}>
                                <FileCheck className="h-4 w-4 text-muted" />
                                <span className="fw-medium" style={{ fontSize: '14px' }}>Pending Documents</span>
                            </Dropdown.Item>

                            <Dropdown.Item onClick={() => navigate('/admin/reports')} className="d-flex align-items-center gap-3 px-2 py-2 rounded bg-transparent border-0" style={{ color: 'var(--text-main)' }}>
                                <Flag className="h-4 w-4 text-muted" />
                                <span className="fw-medium" style={{ fontSize: '14px' }}>Report Management</span>
                            </Dropdown.Item>

                            <Dropdown.Item onClick={() => navigate('/admin/users')} className="d-flex align-items-center gap-3 px-2 py-2 rounded bg-transparent border-0" style={{ color: 'var(--text-main)' }}>
                                <UsersIcon className="h-4 w-4 text-muted" />
                                <span className="fw-medium" style={{ fontSize: '14px' }}>User Management</span>
                            </Dropdown.Item>

                            <Dropdown.Divider style={{ borderColor: 'var(--border-color)' }} />

                            <Dropdown.Item onClick={handleLogout} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-danger bg-transparent border-0 hover:bg-danger-subtle">
                                <LogOut className="h-4 w-4 text-danger" />
                                <span className="fw-medium" style={{ fontSize: '14px' }}>Logout</span>
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
            </div>
        </header>
    );
}

// ==========================================
// COMPONENT 2: MAIN NAVBAR (GIAO DIỆN USER)
// ==========================================
export function Navbar() {
    const { logout, isAdminMode, user } = useApp();
    const { darkMode, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchVal, setSearchVal] = useState('');

    const [profile, setProfile] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [navTags, setNavTags] = useState([]);

    const isActuallyAdminView = isAdminMode || location.pathname.startsWith('/admin');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const fetchUserProfile = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await response.json();
                if (result && result.data) setProfile(result.data);
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
        };

        const fetchNotifications = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/notifications`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                let apiNotifs = [];
                if (response.ok) {
                    const result = await response.json();
                    if (result && result.data && Array.isArray(result.data)) {
                        apiNotifs = result.data;
                    }
                }
                
                // Merge with local notifications
                const localKey = `notifications_${profile?.id || user?.id}`;
                const localNotifs = JSON.parse(localStorage.getItem(localKey)) || [];
                const merged = [...localNotifs, ...apiNotifs];
                
                // Filter out deleted notifications
                const deletedKey = `deleted_notifications_${profile?.id || user?.id}`;
                const deletedIds = JSON.parse(localStorage.getItem(deletedKey)) || [];
                const visible = merged.filter(n => n && !deletedIds.includes(n.id));
                
                setNotifications(visible);
                const unread = visible.filter(n => n && n.isRead === false).length;
                setUnreadCount(unread);
            } catch (error) {
                console.error('Error fetching notifications:', error);
                
                // Fallback to local
                const localKey = `notifications_${profile?.id || user?.id}`;
                const localNotifs = JSON.parse(localStorage.getItem(localKey)) || [];
                
                const deletedKey = `deleted_notifications_${profile?.id || user?.id}`;
                const deletedIds = JSON.parse(localStorage.getItem(deletedKey)) || [];
                const visible = localNotifs.filter(n => n && !deletedIds.includes(n.id));
                
                setNotifications(visible);
                const unread = visible.filter(n => n && n.isRead === false).length;
                setUnreadCount(unread);
            }
        };

        const fetchNavTags = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/tags/search?keyword=`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    setNavTags([]);
                    return;
                }

                const result = await response.json();
                const rawData = result.data || result;
                if (Array.isArray(rawData)) {
                    setNavTags(rawData);
                } else {
                    setNavTags([]);
                }
            } catch (error) {
                console.error('Error fetching nav tags via GET Search:', error);
                setNavTags([]);
            }
        };

        fetchUserProfile();
        fetchNotifications();
        fetchNavTags();
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        localStorage.removeItem('token');
        navigate('/auth/login');
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchVal.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchVal)}`);
        }
    };

    const getInitials = (nameString) => {
        if (!nameString) return 'JD';
        return nameString.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
    };

    if (isActuallyAdminView) {
        return (
            <AdminNavbar
                profile={profile}
                notifications={notifications}
                unreadCount={unreadCount}
                handleLogout={handleLogout}
                getInitials={getInitials}
                darkMode={darkMode}
                toggleTheme={toggleTheme}
            />
        );
    }

    return (
        <header className="sticky-top shadow-sm" style={{ background: 'var(--bg-nav)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', zIndex: 1050, transition: 'all 0.3s ease' }}>
            <div className="px-4 py-2 d-flex align-items-center justify-content-between w-100 gap-3">

                {/* BÊN TRÁI: LOGO */}
                <div className="d-flex align-items-center gap-3">
                    <Link to={user?.role?.toLowerCase() === 'admin' ? '/admin/home' : (profile ? '/user/home' : '/')} className="d-flex align-items-center gap-2 text-decoration-none">
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
                            <p className="mb-0 text-white-50" style={{ fontSize: '0.7rem' }}>Document Management</p>
                        </div>
                    </Link>

                    {/* THÊM DROPDOWN SUBJECT TAGS NHƯ TRONG HÌNH */}
                    {profile && navTags && navTags.length > 0 && (
                        <Dropdown className="ms-2">
                            <Dropdown.Toggle
                                as="button"
                                className="btn text-white bg-transparent border-0 d-flex align-items-center gap-1 p-0 fw-medium shadow-none"
                                style={{ fontSize: '0.95rem', opacity: 0.9 }}
                            >
                                <span>Subject tags</span>
                                <ChevronDown size={16} className="ms-1" />
                            </Dropdown.Toggle>
                            <Dropdown.Menu
                                className="shadow border-0 mt-2 p-2"
                                style={{
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    minWidth: '180px',
                                    backgroundColor: 'var(--bg-card-container)',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                {navTags.map(tag => {
                                    const tagName = typeof tag === 'object' ? (tag.name || tag.label) : tag;
                                    return (
                                        <Dropdown.Item
                                            key={tag.id || tagName}
                                            onClick={() => navigate(`/search?q=${encodeURIComponent(tagName)}`)}
                                            className="rounded border-0 bg-transparent py-1.5 px-3"
                                            style={{ fontSize: '14px', color: 'var(--text-main)' }}
                                        >
                                            {tagName}
                                        </Dropdown.Item>
                                    );
                                })}
                            </Dropdown.Menu>
                        </Dropdown>
                    )}
                </div>

                {/* CHÍNH GIỮA: THANH TÌM KIẾM TOÀN CỤC */}
                <form onSubmit={handleSearchSubmit} className="flex-grow-1 d-none d-md-flex justify-content-center" style={{ maxWidth: '600px' }}>
                    <div className="input-group input-group-lg w-100" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        <input
                            type="search"
                            placeholder="Search documents..."
                            className="form-control border-0 ps-4"
                            value={searchVal}
                            onChange={(e) => setSearchVal(e.target.value)}
                            style={{
                                boxShadow: 'none',
                                fontSize: '15px',
                                backgroundColor: 'var(--bg-card-container)',
                                color: 'var(--text-main)'
                            }}
                        />
                        <button type="submit" className="btn text-white px-4 border-0 d-flex align-items-center" style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}>
                            <Search className="h-5 w-5" />
                        </button>
                    </div>
                </form>

                {/* BÊN PHẢI: USER PROFILE */}
                {profile ? (
                    <div className="d-flex align-items-center gap-4">

                        {/* NÚT ĐỔI THEME DARK/LIGHT MODE */}
                        <button
                            onClick={toggleTheme}
                            className="btn p-1.5 rounded-circle border-0 bg-transparent shadow-none"
                            style={{ color: 'var(--text-nav)', transition: 'color 0.3s' }}
                        >
                            {darkMode ? <Sun size={20} className="text-warning" /> : <Moon size={20} className="text-white" />}
                        </button>

                        {/* CHUÔNG THÔNG BÁO */}
                        <div
                            className="position-relative cursor-pointer mt-1"
                            onClick={() => navigate('/notifications')}
                            style={{ cursor: 'pointer' }}
                        >
                            <Bell className="h-6 w-6 text-white" style={{ cursor: 'pointer' }} />
                            {unreadCount > 0 && (
                                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white" style={{ fontSize: '9px', padding: '0.25em 0.4em' }}>
                                    {unreadCount}
                                </span>
                            )}
                        </div>

                        {/* MENU DROPDOWN TÀI KHOẢN USER - ĐÃ DỌN SẠCH CHỮ VÀ DẤU GẠCH NGANG */}
                        <Dropdown align="end">
                            <Dropdown.Toggle as="div" className="d-flex align-items-center gap-2 border-0 bg-transparent p-0" id="user-dropdown" style={{ cursor: 'pointer' }}>
                                {profile.avatarUrl ? (
                                    <img src={profile.avatarUrl} alt="Avatar" className="rounded-circle border border-white" style={{ width: '36px', height: '36px', objectFit: 'cover' }} />
                                ) : (
                                    <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '36px', height: '36px', backgroundColor: '#FFF5ED', color: '#FD8F52' }}>
                                        {getInitials(profile.fullName)}
                                    </div>
                                )}
                                <span className="d-none d-md-inline fw-semibold text-white">
                                    {profile.fullName || 'User Account'}
                                </span>
                            </Dropdown.Toggle>

                            <Dropdown.Menu className="shadow border-0 p-2 mt-2" style={{ minWidth: '220px', backgroundColor: 'var(--bg-card-container)', border: '1px solid var(--border-color)' }}>
                                <Dropdown.Item onClick={() => navigate('/profile')} className="d-flex align-items-center gap-3 px-2 py-2 rounded bg-transparent border-0" style={{ color: 'var(--text-main)' }}>
                                    <User className="h-4 w-4 text-muted" />
                                    <span className="fw-medium" style={{ fontSize: '14px' }}>Profile</span>
                                </Dropdown.Item>

                                <Dropdown.Item onClick={() => navigate('/my-documents')} className="d-flex align-items-center gap-3 px-2 py-2 rounded bg-transparent border-0" style={{ color: 'var(--text-main)' }}>
                                    <FileText className="h-4 w-4 text-muted" />
                                    <span className="fw-medium" style={{ fontSize: '14px' }}>My Documents</span>
                                </Dropdown.Item>

                                <Dropdown.Item onClick={() => navigate('/upload')} className="d-flex align-items-center gap-3 px-2 py-2 rounded bg-transparent border-0" style={{ color: 'var(--text-main)' }}>
                                    <Upload className="h-4 w-4 text-muted" />
                                    <span className="fw-medium" style={{ fontSize: '14px' }}>Upload</span>
                                </Dropdown.Item>

                                <Dropdown.Item onClick={() => navigate('/upgrade')} className="d-flex align-items-center gap-3 px-2 py-2 rounded bg-transparent border-0" style={{ color: 'var(--text-main)' }}>
                                    <Crown className="h-4 w-4 text-muted" />
                                    <span className="fw-medium" style={{ fontSize: '14px' }}>Upgrade Storage</span>
                                </Dropdown.Item>

                                <Dropdown.Item onClick={() => navigate('/transaction-history')} className="d-flex align-items-center gap-3 px-2 py-2 rounded bg-transparent border-0" style={{ color: 'var(--text-main)' }}>
                                    <CreditCard className="h-4 w-4 text-muted" />
                                    <span className="fw-medium" style={{ fontSize: '14px' }}>Transaction History</span>
                                </Dropdown.Item>

                                <Dropdown.Divider style={{ borderColor: 'var(--border-color)' }} />

                                <Dropdown.Item onClick={handleLogout} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-danger bg-transparent border-0 hover:bg-danger-subtle">
                                    <LogOut className="h-4 w-4 text-danger" />
                                    <span className="fw-medium" style={{ fontSize: '14px' }}>Logout</span>
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                ) : (
                    <div className="d-flex align-items-center gap-2">
                        <button onClick={() => navigate('/auth/login')} className="btn btn-sm btn-outline-light" style={{ borderRadius: '20px', padding: '0.4rem 1.2rem', fontWeight: '500' }}>Login</button>
                        <button onClick={() => navigate('/auth/register')} className="btn btn-sm text-white border-0" style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)', borderRadius: '20px', padding: '0.4rem 1.2rem', fontWeight: '500' }}>Register</button>
                    </div>
                )}
            </div>
        </header>
    );
}
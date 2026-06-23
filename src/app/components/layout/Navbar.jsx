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
    Crown,
    FileText,
    Upload,
    Search,
    BookOpen
} from 'lucide-react';
import { Dropdown } from 'react-bootstrap';
import logoImg from '/src/image/logo.jpg';

// ==========================================
// COMPONENT 1: ADMIN NAVBAR (GIAO DIỆN ADMIN)
// ==========================================
function AdminNavbar({ profile, notifications, unreadCount, handleLogout, getInitials }) {
    const navigate = useNavigate();

    return (
        <header className="bg-white border-bottom sticky-top shadow-sm" style={{ borderBottomColor: 'rgba(253, 143, 82, 0.2)', zIndex: 1050 }}>
            <div className="px-4 py-2 d-flex align-items-center justify-content-between w-100 gap-3">

                {/* BÊN TRÁI: LOGO */}
                <div className="d-flex align-items-center gap-3">
                    <Link to="/admin/home" className="d-flex align-items-center gap-2 text-decoration-none">
                        <img
                            src={logoImg}
                            alt="Logo"
                            style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                        />
                        <div className="d-none d-md-block text-start">
                            <h5 className="mb-0 fw-bold" style={{ background: 'linear-gradient(to right, #C73866, #FD8F52, #FFBD71)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '1.1rem' }}>StudyDocs AI</h5>
                            <p className="mb-0 text-muted" style={{ fontSize: '0.7rem' }}>Document Management</p>
                        </div>
                    </Link>
                </div>

                {/* BÊN PHẢI: THÔNG BÁO & ACCOUNT */}
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
                        <Dropdown.Menu className="shadow border-0 mt-2 p-2" style={{ width: '320px', maxHeight: '380px', overflowY: 'auto' }}>
                            <Dropdown.Header className="fw-bold text-dark px-2">Notifications</Dropdown.Header>
                            <Dropdown.Divider />
                            {notifications.length === 0 ? (
                                <div className="text-center text-muted py-3" style={{ fontSize: '13px' }}>No notifications yet</div>
                            ) : (
                                <div className="d-flex flex-column gap-2">
                                    {notifications.map((notif) => (
                                        <Dropdown.Item key={notif.id} className={`p-2 rounded text-wrap border-0 ${notif.isRead ? 'bg-transparent' : 'bg-light'}`} style={{ cursor: 'default' }}>
                                            <p className="mb-0 fw-bold text-dark" style={{ fontSize: '13px' }}>{notif.title}</p>
                                            <p className="mb-0 text-muted mt-0.5" style={{ fontSize: '12px' }}>{notif.content}</p>
                                        </Dropdown.Item>
                                    ))}
                                </div>
                            )}
                        </Dropdown.Menu>
                    </Dropdown>

                    {/* MENU DROPDOWN ACCOUNT ADMIN */}
                    <Dropdown align="end">
                        <Dropdown.Toggle as="div" className="d-flex align-items-center gap-2 border-0 bg-transparent p-0" id="user-dropdown" style={{ cursor: 'pointer' }}>
                            {profile?.avatarUrl ? (
                                <img src={profile.avatarUrl} alt="Avatar" className="rounded-circle border" style={{ width: '36px', height: '36px', objectFit: 'cover', borderColor: 'rgba(253, 143, 82, 0.2)' }} />
                            ) : (
                                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '36px', height: '36px', backgroundColor: '#FFF5ED', color: '#FD8F52', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                                    {getInitials(profile?.fullName)}
                                </div>
                            )}
                            <span className="d-none d-md-inline fw-semibold text-dark">
                                {profile?.fullName || 'Admin Account'}
                            </span>
                        </Dropdown.Toggle>

                        <Dropdown.Menu className="shadow border-0 p-2 mt-2" style={{ minWidth: '220px' }}>
                            <Dropdown.Header className="text-muted px-2 py-1" style={{ fontSize: '12px' }}>Admin Dashboard</Dropdown.Header>
                            <Dropdown.Divider />

                            <Dropdown.Item onClick={() => navigate('/admin/pending-documents')} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-dark bg-transparent border-0 hover:bg-light">
                                <FileCheck className="h-4 w-4 text-muted" />
                                <span className="fw-medium" style={{ fontSize: '14px' }}>Pending Documents</span>
                            </Dropdown.Item>

                            <Dropdown.Item onClick={() => navigate('/admin/reports')} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-dark bg-transparent border-0 hover:bg-light">
                                <Flag className="h-4 w-4 text-muted" />
                                <span className="fw-medium" style={{ fontSize: '14px' }}>Report Management</span>
                            </Dropdown.Item>

                            <Dropdown.Item onClick={() => navigate('/admin/users')} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-dark bg-transparent border-0 hover:bg-light">
                                <UsersIcon className="h-4 w-4 text-muted" />
                                <span className="fw-medium" style={{ fontSize: '14px' }}>User Management</span>
                            </Dropdown.Item>

                            <Dropdown.Divider />

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
    const { logout, isAdminMode } = useApp();
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
                const response = await fetch('http://14.225.254.145:8080/api/v1/users/profile', {
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

        // Hàm đọc dữ liệu tags động chuẩn cấu trúc Paging từ Database
        // Thay thế hàm fetchNavTags cũ trong file Navbar.jsx của bạn bằng logic này:
        const fetchNavTags = async () => {
            try {
                // Chuyển sang dùng GET Search để quét toàn bộ dữ liệu DB bằng từ khóa rỗng
                const response = await fetch('http://14.225.254.145:8080/api/v1/tags/search?keyword=', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    setNavTags([]);
                    return;
                }

                const result = await response.json();

                // API Search trả về mảng trực tiếp trong result.data hoặc result 
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
            />
        );
    }

    return (
        <header className="bg-white border-bottom sticky-top shadow-sm" style={{ borderBottomColor: 'rgba(253, 143, 82, 0.2)', zIndex: 1050 }}>
            <div className="px-4 py-2 d-flex align-items-center justify-content-between w-100 gap-3">

                {/* BÊN TRÁI: LOGO & DROPDOWN MÔN HỌC ĐỌC TỪ DB */}
                <div className="d-flex align-items-center gap-3">
                    <Link to={profile ? '/user/home' : '/'} className="d-flex align-items-center gap-2 text-decoration-none">
                        <img src={logoImg} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                        <div className="d-none d-md-block text-start">
                            <h5 className="mb-0 fw-bold" style={{ background: 'linear-gradient(to right, #C73866, #FD8F52, #FFBD71)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '1.1rem' }}>StudyDocs AI</h5>
                            <p className="mb-0 text-muted" style={{ fontSize: '0.7rem' }}>Document Management</p>
                        </div>
                    </Link>

                    <Dropdown>
                        <Dropdown.Toggle as="button" id="dropdown-subjects" className="btn d-flex align-items-center gap-2 border-0 bg-transparent px-2" style={{ fontSize: '14px', fontFamily: "'Montserrat', sans-serif", fontWeight: '400', color: '#C73866', letterSpacing: '0.25em', textTransform: 'uppercase', boxShadow: 'none' }}>
                            <BookOpen className="h-4 w-4" style={{ color: '#C73866' }} />
                            SUBJECT TAGS
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="shadow border-0 mt-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {navTags.length === 0 ? (
                                <div className="text-center text-muted p-2" style={{ fontSize: '13px' }}>No tags available</div>
                            ) : (
                                navTags.map((tag) => {
                                    // Chuẩn hóa đọc linh hoạt cả .name hoặc .label nhận về từ DB
                                    const tagName = tag.name || tag.label || 'Unknown';
                                    return (
                                        <Dropdown.Item key={tag.id} onClick={() => navigate(`/search?subject=${encodeURIComponent(tagName)}`)} style={{ fontSize: '14px' }}>
                                            {tagName}
                                        </Dropdown.Item>
                                    );
                                })
                            )}
                        </Dropdown.Menu>
                    </Dropdown>
                </div>

                {/* CHÍNH GIỮA: THANH TÌM KIẾM TOÀN CỤC */}
                <form onSubmit={handleSearchSubmit} className="flex-grow-1 d-none d-md-flex justify-content-center" style={{ maxWidth: '600px' }}>
                    <div className="input-group input-group-lg w-100" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(253, 143, 82, 0.4)' }}>
                        <input type="search" placeholder="Search documents..." className="form-control border-0 ps-4 bg-light" value={searchVal} onChange={(e) => setSearchVal(e.target.value)} style={{ boxShadow: 'none', fontSize: '15px' }} />
                        <button type="submit" className="btn text-white px-4 border-0 d-flex align-items-center" style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}>
                            <Search className="h-5 w-5" />
                        </button>
                    </div>
                </form>

                {/* BÊN PHẢI: USER PROFILE */}
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
                            <Dropdown.Menu className="shadow border-0 mt-2 p-2" style={{ width: '320px', maxHeight: '380px', overflowY: 'auto' }}>
                                <Dropdown.Header className="fw-bold text-dark px-2">Notifications</Dropdown.Header>
                                <Dropdown.Divider />
                                {notifications.length === 0 ? (
                                    <div className="text-center text-muted py-3" style={{ fontSize: '13px' }}>No notifications yet</div>
                                ) : (
                                    <div className="d-flex flex-column gap-2">
                                        {notifications.map((notif) => (
                                            <Dropdown.Item key={notif.id} className={`p-2 rounded text-wrap border-0 ${notif.isRead ? 'bg-transparent' : 'bg-light'}`} style={{ cursor: 'default' }}>
                                                <p className="mb-0 fw-bold text-dark" style={{ fontSize: '13px' }}>{notif.title}</p>
                                                <p className="mb-0 text-muted mt-0.5" style={{ fontSize: '12px' }}>{notif.content}</p>
                                            </Dropdown.Item>
                                        ))}
                                    </div>
                                )}
                            </Dropdown.Menu>
                        </Dropdown>

                        {/* MENU DROPDOWN TÀI KHOẢN USER */}
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
                                    {profile.fullName || 'User Account'}
                                </span>
                            </Dropdown.Toggle>

                            <Dropdown.Menu className="shadow border-0 p-2 mt-2" style={{ minWidth: '220px' }}>
                                <Dropdown.Header className="text-muted px-2 py-1" style={{ fontSize: '12px' }}>My Account</Dropdown.Header>
                                <Dropdown.Divider />

                                <Dropdown.Item onClick={() => navigate('/profile')} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-dark bg-transparent border-0 hover:bg-light">
                                    <User className="h-4 w-4 text-muted" />
                                    <span className="fw-medium" style={{ fontSize: '14px' }}>Profile</span>
                                </Dropdown.Item>

                                <Dropdown.Item onClick={() => navigate('/my-documents')} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-dark bg-transparent border-0 hover:bg-light">
                                    <FileText className="h-4 w-4 text-muted" />
                                    <span className="fw-medium" style={{ fontSize: '14px' }}>My Documents</span>
                                </Dropdown.Item>

                                <Dropdown.Item onClick={() => navigate('/upload')} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-dark bg-light border-0 hover:bg-light">
                                    <Upload className="h-4 w-4 text-muted" />
                                    <span className="fw-medium" style={{ fontSize: '14px' }}>Upload</span>
                                </Dropdown.Item>

                                <Dropdown.Item onClick={() => navigate('/upgrade')} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-dark bg-transparent border-0 hover:bg-light">
                                    <Crown className="h-4 w-4 text-muted" />
                                    <span className="fw-medium" style={{ fontSize: '14px' }}>Upgrade Storage</span>
                                </Dropdown.Item>

                                <Dropdown.Divider />

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
                        <button onClick={() => navigate('/auth/register')} className="btn btn-sm text-white border-0" style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)', borderRadius: '20px', padding: '0.4rem 1.2rem', fontWeight: '500' }}>Register</button>
                    </div>
                )}
            </div>
        </header>
    );
}
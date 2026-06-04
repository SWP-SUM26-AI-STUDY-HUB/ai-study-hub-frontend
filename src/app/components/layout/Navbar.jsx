import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import { useApp } from '../../context/AppContext';
import {
    Bell, User, LogOut, FileCheck, Users as UsersIcon, Flag, GraduationCap, Crown, FileText,
    Upload, Search, ChevronDown, MessageSquare, Shield, LayoutDashboard
} from 'lucide-react';
import { Dropdown } from 'react-bootstrap';

// Tuyệt chiêu Vite: Dùng /src/ để không bao giờ bị sai đường dẫn
import logoImg from '/src/image/logo.jpg'; 

export function Navbar() {
    const { user, logout, isAdminMode, toggleAdminMode } = useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchVal, setSearchVal] = useState('');

    const isActuallyAdminView = isAdminMode || location.pathname.startsWith('/admin');

    const handleLogout = () => {
        logout();
        navigate('/auth/login');
    };

    const homeLink = isActuallyAdminView
        ? '/admin/home'
        : (user ? '/user/home' : '/');

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchVal.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchVal)}`);
        }
    };

    const subjects = [
        'Technology', 'Science', 'Mathematics', 'Business', 'Java Programming', 'Python Programming', 'Data Science', 'Machine Learning', 'Artificial Intelligence', 'Web Development', 'Mobile Development', 'Cloud Computing', 'Cybersecurity', 'Digital Marketing', 'Graphic Design', 'Project Management'
    ];

    return (
        <header className="bg-white border-b sticky-top z-3 shadow-sm" style={{ borderBottomColor: 'rgba(253, 143, 82, 0.2)' }}>
            <div className="px-4 py-2 d-flex align-items-center justify-content-between w-100 gap-3">

                {/* BÊN TRÁI: LOGO & DROPDOWN MÔN HỌC */}
                <div className="d-flex align-items-center gap-3">
                    <Link to={homeLink} className="d-flex align-items-center gap-2 text-decoration-none">
                        
                        <img 
                            src={logoImg} 
                            alt="Logo" 
                            style={{ width: '40px', height: '40px', objectFit: 'contain' }} 
                        />
                        
                        <div className="d-none d-md-block text-start">
                            <h5 className="mb-0 fw-bold bg-gradient-to-r from-[#C73866] via-[#FD8F52] to-[#FFBD71] bg-clip-text text-transparent leading-none" style={{ background: 'linear-gradient(to right, #C73866, #FD8F52, #FFBD71)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '1.1rem' }}>StudyDocs AI</h5>
                            <p className="mb-0 text-muted" style={{ fontSize: '0.7rem' }}>Document Management</p>
                        </div>
                    </Link>

                    {/* DROPDOWN CHỌN MÔN HỌC */}
                    <Dropdown>
                        <Dropdown.Toggle as="button" id="dropdown-subjects" className="btn d-flex align-items-center gap-1 border-0 bg-transparent text-dark fw-semibold px-2" style={{ fontSize: '14px', boxShadow: 'none' }}>
                            Subject tags <ChevronDown className="h-4 w-4 text-muted" />
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="shadow border-0 mt-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {subjects.map((sub) => (
                                <Dropdown.Item key={sub} onClick={() => navigate(`/search?subject=${encodeURIComponent(sub)}`)} style={{ fontSize: '14px' }}>
                                    {sub}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>
                </div>

                {/* CHÍNH GIỮA: THANH TÌM KIẾM TOÀN CỤC */}
                <form onSubmit={handleSearchSubmit} className="flex-grow-1 d-none d-md-flex justify-content-center" style={{ maxWidth: '450px' }}>
                    <div className="input-group input-group-sm w-100" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(253, 143, 82, 0.4)' }}>
                        <input
                            type="search"
                            placeholder="Search documents..."
                            className="form-control border-0 ps-3 bg-light"
                            value={searchVal}
                            onChange={(e) => setSearchVal(e.target.value)}
                            style={{ boxShadow: 'none', fontSize: '13px' }}
                        />
                        <button
                            type="submit"
                            className="btn text-white px-3 border-0 d-flex align-items-center"
                            style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                        >
                            <Search className="h-4 w-4" />
                        </button>
                    </div>
                </form>

                {/* BÊN PHẢI: THAY ĐỔI DỰA TRÊN ĐÃ LOGIN HAY CHƯA */}
                {user ? (
                    <div className="d-flex align-items-center gap-4">
                        {/* CHUÔNG THÔNG BÁO */}
                        <Dropdown align="end">
                            <Dropdown.Toggle as="div" className="position-relative cursor-pointer mt-1" id="notifications-dropdown" style={{ cursor: 'pointer' }}>
                                <Bell className="h-6 w-6 text-dark" style={{ cursor: 'pointer' }} />
                                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white" style={{ fontSize: '9px', padding: '0.25em 0.4em' }}>
                                    3
                                </span>
                            </Dropdown.Toggle>
                            <Dropdown.Menu className="shadow border-0 mt-2" style={{ width: '300px' }}>
                                <Dropdown.Header className="fw-bold text-dark">Notifications</Dropdown.Header>
                                <Dropdown.Divider />
                                <div className="p-2">
                                    <Dropdown.Item className="p-2 rounded text-wrap bg-light border-0">
                                        <p className="mb-0 fw-bold text-dark" style={{ fontSize: '13px' }}>Document Approved</p>
                                        <p className="mb-0 text-muted" style={{ fontSize: '11px' }}>
                                            Your document "Introduction to AI" has been approved.
                                        </p>
                                    </Dropdown.Item>
                                </div>
                            </Dropdown.Menu>
                        </Dropdown>

                        {/* MENU DROPDOWN CHỨA PROFILE VÀ DANH SÁCH CHỨC NĂNG */}
                        <Dropdown align="end">
                            <Dropdown.Toggle as="div" className="d-flex align-items-center gap-2 border-0 bg-transparent p-0" id="user-dropdown" style={{ cursor: 'pointer' }}>
                                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '36px', height: '36px', backgroundColor: '#FFF5ED', color: '#FD8F52', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                                    {user?.name
                                        ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
                                        : 'JD'}
                                </div>
                                <span className="d-none d-md-inline fw-semibold text-dark">
                                    {user?.name || 'John Doe'}
                                </span>
                            </Dropdown.Toggle>

                            <Dropdown.Menu className="shadow border-0 p-2 mt-2" style={{ minWidth: '220px' }}>
                                <Dropdown.Header className="text-muted px-2 py-1" style={{ fontSize: '12px' }}>
                                    My Account
                                </Dropdown.Header>
                                <Dropdown.Divider />

                                <Dropdown.Item onClick={() => navigate('/profile')} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-dark bg-transparent border-0 hover:bg-light">
                                    <User className="h-4 w-4 text-muted" />
                                    <span className="fw-medium" style={{ fontSize: '14px' }}>Profile</span>
                                </Dropdown.Item>

                                {isActuallyAdminView ? (
                                    <>
                                        <Dropdown.Item onClick={() => navigate('/admin/home')} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-dark bg-transparent border-0 hover:bg-light">
                                            <LayoutDashboard className="h-4 w-4 text-muted" />
                                            <span className="fw-medium" style={{ fontSize: '14px' }}>Admin Dashboard</span>
                                        </Dropdown.Item>

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

                                        {user?.role === 'admin' && (
                                            <Dropdown.Item onClick={toggleAdminMode} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-dark bg-transparent border-0 hover:bg-light">
                                                <Shield className="h-4 w-4 text-muted" />
                                                <span className="fw-medium" style={{ fontSize: '14px' }}>Switch to User Mode</span>
                                            </Dropdown.Item>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <Dropdown.Item onClick={() => navigate('/my-documents')} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-dark bg-transparent border-0 hover:bg-light">
                                            <FileText className="h-4 w-4 text-muted" />
                                            <span className="fw-medium" style={{ fontSize: '14px' }}>My Documents</span>
                                        </Dropdown.Item>

                                        <Dropdown.Item onClick={() => navigate('/chat-history')} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-dark bg-transparent border-0 hover:bg-light">
                                            <MessageSquare className="h-4 w-4 text-muted" />
                                            <span className="fw-medium" style={{ fontSize: '14px' }}>Chat History</span>
                                        </Dropdown.Item>

                                        <Dropdown.Item onClick={() => navigate('/upload')} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-dark bg-light border-0 hover:bg-light">
                                            <Upload className="h-4 w-4 text-muted" />
                                            <span className="fw-medium" style={{ fontSize: '14px' }}>Upload</span>
                                        </Dropdown.Item>

                                        <Dropdown.Item onClick={() => navigate('/upgrade')} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-dark bg-transparent border-0 hover:bg-light">
                                            <Crown className="h-4 w-4 text-muted" />
                                            <span className="fw-medium" style={{ fontSize: '14px' }}>Upgrade Storage</span>
                                        </Dropdown.Item>

                                        {user?.role === 'admin' && (
                                            <Dropdown.Item onClick={toggleAdminMode} className="d-flex align-items-center gap-3 px-2 py-2 rounded text-dark bg-transparent border-0 hover:bg-light">
                                                <Shield className="h-4 w-4 text-muted" />
                                                <span className="fw-medium" style={{ fontSize: '14px' }}>Switch to Admin Mode</span>
                                            </Dropdown.Item>
                                        )}
                                    </>
                                )}

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
                        <button
                            onClick={() => navigate('/auth/login')}
                            className="btn btn-sm btn-outline-warning"
                            style={{ borderColor: '#FD8F52', color: '#FD8F52', borderRadius: '20px', padding: '0.4rem 1.2rem', fontWeight: '500' }}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => navigate('/auth/register')}
                            className="btn btn-sm text-white border-0"
                            style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)', borderRadius: '20px', padding: '0.4rem 1.2rem', fontWeight: '500' }}
                        >
                            Register
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
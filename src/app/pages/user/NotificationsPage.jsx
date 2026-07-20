import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import {
    MoreHorizontal,
    Check,
    Trash2,
    MessageSquare,
    ThumbsUp,
    Video,
    Info,
    Bell,
    User,
    Clock,
    ArrowLeft,
    CheckCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../api.js';
import { Dropdown } from 'react-bootstrap';

export default function NotificationsPage() {
    const navigate = useNavigate();
    const { user } = useApp();
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all' or 'unread'

    const token = localStorage.getItem('token');

    // Fetch notifications from API
    const fetchNotifications = async () => {
        if (!token) return;
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/v1/notifications`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            let apiNotifs = [];
            if (response.ok) {
                const result = await response.json();
                apiNotifs = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
            }
            
            // Merge with local notifications
            const localKey = `notifications_${user?.id}`;
            const localNotifs = JSON.parse(localStorage.getItem(localKey)) || [];
            const merged = [...localNotifs, ...apiNotifs];

            // Filter out deleted notification IDs
            const deletedKey = `deleted_notifications_${user?.id}`;
            const deletedIds = JSON.parse(localStorage.getItem(deletedKey)) || [];
            const visible = merged.filter(n => n && !deletedIds.includes(n.id));
            
            setNotifications(visible);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast.error('Failed to load notifications');
            setNotifications([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    // Mark single notification as read
    const handleMarkAsRead = async (notifId, isAlreadyRead) => {
        if (isAlreadyRead) return;

        // Optimistic update locally
        setNotifications(prev =>
            prev.map(n => n.id === notifId ? { ...n, isRead: true } : n)
        );

        // Update local storage if it is a local notification
        const localKey = `notifications_${user?.id}`;
        const localNotifs = JSON.parse(localStorage.getItem(localKey)) || [];
        if (localNotifs.some(n => n.id === notifId)) {
            const updated = localNotifs.map(n => n.id === notifId ? { ...n, isRead: true } : n);
            localStorage.setItem(localKey, JSON.stringify(updated));
            return;
        }

        if (!token) return;

        // Call API endpoint to mark as read using PUT
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/notifications/${notifId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                console.warn('Failed to mark read on server, status:', response.status);
            }
        } catch (error) {
            console.warn('API call to mark notification read failed, state updated locally.', error);
        }
    };

    // Handle clicking a notification and routing accordingly
    const handleNotificationClick = async (notif) => {
        if (!notif) return;

        // 1. Mark as read if not already read
        if (!notif.isRead) {
            handleMarkAsRead(notif.id, false);
        }

        // 2. Perform redirection based on notification metadata & user role
        const title = (notif.title || '').toLowerCase();
        const content = (notif.content || '').toLowerCase();
        const type = (notif.type || '').toLowerCase();
        const isAdmin = user?.role?.toLowerCase() === 'admin';

        // Check categories in order of specificity:

        // A. Report & Moderation Violations (Admin -> /admin/reports)
        const isReport = 
            title.includes('report') || title.includes('báo cáo') || title.includes('vi phạm') || title.includes('violation') ||
            type.includes('report') || type.includes('violation') ||
            content.includes('report') || content.includes('báo cáo') || content.includes('vi phạm') || content.includes('violation');

        if (isReport) {
            if (isAdmin) {
                navigate('/admin/reports');
            } else if (notif.targetId) {
                navigate(`/document/${notif.targetId}`);
            } else {
                navigate('/my-documents');
            }
            return;
        }

        // B. Pending Documents / Moderation Approval Requests (Admin -> /admin/pending-documents)
        const isPending = 
            title.includes('pending') || title.includes('approval') || title.includes('duyệt') || title.includes('chờ duyệt') ||
            type.includes('pending') || type.includes('approval') ||
            content.includes('pending') || content.includes('waiting to approve') || content.includes('chờ duyệt');

        if (isPending) {
            if (isAdmin) {
                navigate('/admin/pending-documents');
            } else if (notif.targetId) {
                navigate(`/document/${notif.targetId}`);
            } else {
                navigate('/my-documents');
            }
            return;
        }

        // C. User Management (Admin area)
        const isUserMgmt = 
            title.includes('user management') || title.includes('quản lý người dùng') ||
            (isAdmin && (title.includes('user') || title.includes('người dùng') || type.includes('user')));

        if (isUserMgmt) {
            if (isAdmin) {
                navigate('/admin/users');
            } else {
                navigate('/profile');
            }
            return;
        }

        // D. Reviews & Comments
        const isReview = 
            title.includes('comment') || title.includes('bình luận') || title.includes('rating') || title.includes('đánh giá') ||
            type.includes('comment') || type.includes('review');

        if (isReview) {
            if (notif.targetId) {
                navigate(`/document/${notif.targetId}`);
            } else {
                navigate('/my-documents');
            }
            return;
        }

        // E. Account Warning & Profile
        const isAccountWarning = 
            title.includes('warning') || title.includes('cảnh báo') || title.includes('tài khoản') ||
            type.includes('warning') || type.includes('user_warning') || type.includes('account');

        if (isAccountWarning) {
            navigate(isAdmin ? '/admin/users' : '/profile');
            return;
        }

        // F. Upgrade Storage / Payment / Subscriptions
        const isUpgrade = 
            title.includes('upgrade') || title.includes('nâng cấp') || title.includes('hết hạn') || title.includes('dung lượng') || title.includes('thanh toán') ||
            type.includes('payment') || type.includes('storage') || type.includes('plan') ||
            content.includes('gia hạn') || content.includes('upgrade');

        if (isUpgrade) {
            navigate(title.includes('thanh toán') || type.includes('payment') ? '/transaction-history' : '/upgrade');
            return;
        }

        // G. General Document
        const isDocument = 
            title.includes('document') || title.includes('tài liệu') || type.includes('document');

        if (isDocument) {
            if (isAdmin) {
                navigate('/admin/pending-documents');
            } else if (notif.targetId) {
                navigate(`/document/${notif.targetId}`);
            } else {
                navigate('/my-documents');
            }
            return;
        }

        // H. Default Fallback
        if (notif.targetId) {
            navigate(`/document/${notif.targetId}`);
        } else {
            navigate(isAdmin ? '/admin/home' : '/my-documents');
        }
    };

    // Mark all notifications as read
    const handleMarkAllAsRead = async () => {
        if (notifications.length === 0) return;

        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        toast.success('All notifications marked as read');

        // Update local storage
        const localKey = `notifications_${user?.id}`;
        const localNotifs = JSON.parse(localStorage.getItem(localKey)) || [];
        if (localNotifs.length > 0) {
            const updated = localNotifs.map(n => ({ ...n, isRead: true }));
            localStorage.setItem(localKey, JSON.stringify(updated));
        }

        if (!token) return;

        try {
            // Bulk read-all logic: loop PUT read status
            const unreadServerNotifs = notifications.filter(n => n && !n.isRead && !n.id.toString().startsWith('local-notif-'));
            await Promise.all(unreadServerNotifs.map(notif =>
                fetch(`${API_BASE_URL}/api/v1/notifications/${notif.id}/read`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ));
        } catch (error) {
            console.warn('API call to mark all read failed, state updated locally.', error);
        }
    };

    // Clear all notifications
    const handleClearAll = async () => {
        // Collect all currently visible notification IDs
        const idsToDelete = notifications.map(n => n.id);
        
        // Save to deleted IDs in localStorage
        const deletedKey = `deleted_notifications_${user?.id}`;
        const existingDeleted = JSON.parse(localStorage.getItem(deletedKey)) || [];
        localStorage.setItem(deletedKey, JSON.stringify([...existingDeleted, ...idsToDelete]));

        // Clear local storage for local notifications
        const localKey = `notifications_${user?.id}`;
        localStorage.removeItem(localKey);

        setNotifications([]);
        toast.success('All notifications cleared');
    };

    // Helper to format date/time into relative friendly text (e.g. "1 giờ", "6 giờ", "Hôm qua")
    const getRelativeTime = (dateInput) => {
        if (!dateInput) return 'Just now';

        try {
            let date;

            // 1. Array representation of LocalDateTime from Jackson [year, month, day, hour, min, sec]
            if (Array.isArray(dateInput)) {
                const [year, month, day, hour = 0, minute = 0, second = 0] = dateInput;
                date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
            }
            // 2. Number (Unix timestamp)
            else if (typeof dateInput === 'number') {
                const ms = dateInput < 1000000000000 ? dateInput * 1000 : dateInput;
                date = new Date(ms);
            }
            // 3. String
            else if (typeof dateInput === 'string') {
                if (/^\d+$/.test(dateInput)) {
                    const num = parseInt(dateInput, 10);
                    const ms = num < 1000000000000 ? num * 1000 : num;
                    date = new Date(ms);
                } else {
                    let formattedStr = dateInput.trim();
                    // Append Z if no timezone offset is present to treat it as UTC
                    if (!formattedStr.endsWith('Z') && !formattedStr.includes('+') && !/-\d{2}:\d{2}$/.test(formattedStr)) {
                        if (formattedStr.includes('T')) {
                            formattedStr = formattedStr + 'Z';
                        } else if (formattedStr.includes(' ')) {
                            formattedStr = formattedStr.replace(' ', 'T') + 'Z';
                        } else if (/^\d{4}-\d{2}-\d{2}$/.test(formattedStr)) {
                            formattedStr = formattedStr + 'T00:00:00Z';
                        }
                    }
                    date = new Date(formattedStr);
                }
            } else {
                date = new Date(dateInput);
            }

            if (isNaN(date.getTime())) return 'Just now';

            // Current international timestamp (UTC millisecond value)
            const nowMs = Date.now();
            const dateMs = date.getTime();
            const diffMs = Math.max(0, nowMs - dateMs);

            const diffMins = Math.floor(diffMs / (1000 * 60));
            if (diffMins < 60) {
                return diffMins <= 1 ? 'Just now' : `${diffMins} mins`;
            }

            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            if (diffHours < 24) {
                return `${diffHours} hours`;
            }

            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays === 1) return 'Yesterday';
            if (diffDays <= 7) {
                return `${diffDays} days ago`;
            }

            return date.toLocaleDateString('en-US');
        } catch (e) {
            return 'Just now';
        }
    };

    // Helper to determine notification icon and badge color based on text content
    const getNotificationVisuals = (notif) => {
        const text = (notif.title + ' ' + notif.content).toLowerCase();

        // Return default icon, badge color, and a sample fallback user avatar
        let icon = <Bell size={12} className="text-white" />;
        let iconBg = '#FD8F52'; // default orange

        if (text.includes('bình luận') || text.includes('nhắc đến') || text.includes('comment') || text.includes('mention')) {
            icon = <MessageSquare size={12} className="text-white" />;
            iconBg = '#22c55e'; // green
        } else if (text.includes('cảm xúc') || text.includes('thích') || text.includes('like') || text.includes('react')) {
            icon = <ThumbsUp size={12} className="text-white" />;
            iconBg = '#3b82f6'; // blue
        } else if (text.includes('thước phim') || text.includes('video') || text.includes('reel') || text.includes('movie')) {
            icon = <Video size={12} className="text-white" />;
            iconBg = '#ec4899'; // pink
        } else if (text.includes('hệ thống') || text.includes('cảnh báo') || text.includes('dung lượng') || text.includes('thanh toán') || text.includes('nâng cấp')) {
            icon = <Info size={12} className="text-white" />;
            iconBg = '#eab308'; // yellow
        }

        return { icon, iconBg };
    };

    // Filter notifications based on tab
    const filteredNotifications = useMemo(() => {
        if (filter === 'unread') {
            return notifications.filter(n => n && n.isRead === false);
        }
        return notifications;
    }, [notifications, filter]);

    // Group filtered notifications into "Mới" (Unread) and "Trước đó / Hôm nay" (Read)
    const groupedNotifications = useMemo(() => {
        const unread = [];
        const read = [];

        filteredNotifications.forEach(notif => {
            if (notif.isRead === false) {
                unread.push(notif);
            } else {
                read.push(notif);
            }
        });

        return { unread, read };
    }, [filteredNotifications]);

    return (
        <div className="container py-4 text-start" style={{ minHeight: '80vh' }}>
            <div className="mx-auto" style={{ maxWidth: '720px' }}>

                {/* Back button */}
                <div className="mb-4">
                    <Link to={user?.role?.toLowerCase() === 'admin' ? '/admin/home' : '/user/home'} className="d-inline-flex align-items-center gap-2 text-decoration-none text-muted" style={{ fontSize: '14px' }}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="fw-medium">Back to Homepage</span>
                    </Link>
                </div>

                {/* Header Section */}
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <h1 className="fw-bold mb-0" style={{ fontSize: '28px', color: 'var(--text-main)' }}>Notifications</h1>

                    {/* Triple dots option menu */}
                    <Dropdown align="end">
                        <Dropdown.Toggle
                            as="button"
                            className="btn border-0 bg-transparent p-1.5 rounded-circle shadow-none"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <MoreHorizontal size={20} />
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="shadow border-0 p-2 mt-1" style={{ backgroundColor: 'var(--bg-card-container)', border: '1px solid var(--border-color)' }}>
                            <Dropdown.Item
                                onClick={handleMarkAllAsRead}
                                className="d-flex align-items-center gap-2 px-3 py-2 rounded bg-transparent border-0"
                                style={{ color: 'var(--text-main)', fontSize: '14px' }}
                            >
                                <CheckCheck size={16} className="text-success" />
                                <span>Mark all as read</span>
                            </Dropdown.Item>
                            <Dropdown.Item
                                onClick={handleClearAll}
                                className="d-flex align-items-center gap-2 px-3 py-2 rounded bg-transparent border-0 text-danger"
                                style={{ fontSize: '14px' }}
                            >
                                <Trash2 size={16} />
                                <span>Delete all notifications</span>
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>

                {/* Filters Row */}
                <div className="d-flex gap-2 mb-4 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
                    <button
                        onClick={() => setFilter('all')}
                        className="btn px-4 py-1.5 rounded-pill fw-medium border-0 shadow-none"
                        style={{
                            fontSize: '14px',
                            backgroundColor: filter === 'all' ? 'var(--text-main)' : 'transparent',
                            color: filter === 'all' ? 'var(--bg-card-container)' : 'var(--text-muted)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className="btn px-4 py-1.5 rounded-pill fw-medium border-0 shadow-none"
                        style={{
                            fontSize: '14px',
                            backgroundColor: filter === 'unread' ? 'var(--text-main)' : 'transparent',
                            color: filter === 'unread' ? 'var(--bg-card-container)' : 'var(--text-muted)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Unread
                    </button>
                </div>

                {/* Notifications list */}
                {isLoading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-5 bg-white rounded-3 shadow-sm border p-4 text-muted" style={{ backgroundColor: 'var(--bg-card-container)', borderColor: 'var(--border-color)' }}>
                        <Bell size={40} className="mb-3 opacity-30" />
                        <p className="mb-0" style={{ fontSize: '15px' }}>You have no notifications.</p>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-4">

                        {/* Section 1: "Mới" (Unread Notifications) */}
                        {groupedNotifications.unread.length > 0 && (
                            <div>
                                <h6 className="fw-bold mb-3" style={{ color: 'var(--text-main)', fontSize: '16px' }}>New</h6>
                                <div className="d-flex flex-column gap-2">
                                    {groupedNotifications.unread.map(notif => {
                                        const visuals = getNotificationVisuals(notif);
                                        return (
                                            <div
                                                key={notif.id}
                                                onClick={() => handleNotificationClick(notif)}
                                                className="card border-0 shadow-sm position-relative cursor-pointer transition-all-custom"
                                                style={{
                                                    borderRadius: '0.75rem',
                                                    backgroundColor: 'var(--bg-card-container)',
                                                    borderLeft: '4px solid #FD8F52' // Accent line for new/unread
                                                }}
                                            >
                                                <div className="card-body p-3 d-flex align-items-center gap-3">

                                                    {/* Avatar with type badge overlay */}
                                                    <div className="position-relative flex-shrink-0" style={{ width: '48px', height: '48px' }}>
                                                        <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm"
                                                            style={{
                                                                width: '48px',
                                                                height: '48px',
                                                                background: 'linear-gradient(135deg, #C73866, #FD8F52)',
                                                                fontSize: '15px'
                                                            }}>
                                                            {(notif.senderName || notif.title || 'S').substring(0, 1).toUpperCase()}
                                                        </div>
                                                        <div className="position-absolute rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                                                            style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                bottom: '-2px',
                                                                right: '-2px',
                                                                backgroundColor: visuals.iconBg,
                                                                border: '2px solid var(--bg-card-container)'
                                                            }}>
                                                            {visuals.icon}
                                                        </div>
                                                    </div>

                                                    {/* Notification Text */}
                                                    <div className="flex-grow-1 min-w-0">
                                                        <p className="mb-0 text-wrap text-dark fw-semibold" style={{ fontSize: '14.5px', color: 'var(--text-main)' }}>
                                                            {notif.title}
                                                        </p>
                                                        <p className="mb-1 text-wrap text-muted text-truncate-2" style={{ fontSize: '13.5px', color: 'var(--text-muted)', opacity: 0.8 }}>
                                                            {notif.content}
                                                        </p>
                                                        <div className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '12px' }}>
                                                            <Clock size={12} />
                                                            <span>{getRelativeTime(notif.createdAt || notif.createdDate)}</span>
                                                        </div>
                                                    </div>

                                                    {/* Unread indicator dot */}
                                                    <div className="flex-shrink-0 ps-2">
                                                        <div className="rounded-circle" style={{ width: '10px', height: '10px', backgroundColor: '#3b82f6' }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Section 2: "Hôm nay / Trước đó" (Read Notifications) */}
                        {groupedNotifications.read.length > 0 && (
                            <div>
                                <h6 className="fw-bold mb-3" style={{ color: 'var(--text-main)', fontSize: '16px' }}>Earlier</h6>
                                <div className="d-flex flex-column gap-2">
                                    {groupedNotifications.read.map(notif => {
                                        const visuals = getNotificationVisuals(notif);
                                        return (
                                            <div
                                                key={notif.id}
                                                onClick={() => handleNotificationClick(notif)}
                                                className="card border-0 shadow-sm cursor-pointer transition-all-custom"
                                                style={{
                                                    borderRadius: '0.75rem',
                                                    backgroundColor: 'var(--bg-card-container)',
                                                    opacity: 0.85
                                                }}
                                            >
                                                <div className="card-body p-3 d-flex align-items-center gap-3">

                                                    {/* Avatar with type badge overlay */}
                                                    <div className="position-relative flex-shrink-0" style={{ width: '48px', height: '48px' }}>
                                                        <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-muted bg-secondary bg-opacity-10 border shadow-none"
                                                            style={{
                                                                width: '48px',
                                                                height: '48px',
                                                                fontSize: '15px',
                                                                backgroundColor: 'var(--bg-global)'
                                                            }}>
                                                            {(notif.senderName || notif.title || 'S').substring(0, 1).toUpperCase()}
                                                        </div>
                                                        <div className="position-absolute rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                                                            style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                bottom: '-2px',
                                                                right: '-2px',
                                                                backgroundColor: visuals.iconBg,
                                                                border: '2px solid var(--bg-card-container)',
                                                                opacity: 0.9
                                                            }}>
                                                            {visuals.icon}
                                                        </div>
                                                    </div>

                                                    {/* Notification Text */}
                                                    <div className="flex-grow-1 min-w-0">
                                                        <p className="mb-0 text-wrap text-dark" style={{ fontSize: '14.5px', color: 'var(--text-main)' }}>
                                                            {notif.title}
                                                        </p>
                                                        <p className="mb-1 text-wrap text-muted text-truncate-2" style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
                                                            {notif.content}
                                                        </p>
                                                        <div className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '12px' }}>
                                                            <Clock size={12} />
                                                            <span>{getRelativeTime(notif.createdAt || notif.createdDate)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>

            {/* Custom hover effects styling */}
            <style>{`
                .transition-all-custom {
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                }
                .transition-all-custom:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 0.25rem 0.75rem rgba(0,0,0,0.08) !important;
                }
            `}</style>
        </div>
    );
}

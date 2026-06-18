import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Users, Clock, AlertCircle, Eye, Download, ArrowRight } from 'lucide-react';

// Sub-component hiển thị thẻ số liệu (Sử dụng col-md-4 chia đều 3 cột)
const StatCard = ({ icon: Icon, value, label, subtext, iconClass, onClick }) => (
    <div className="col-12 col-md-4 mb-4" onClick={onClick}>
        <div className="stat-card">
            <div className="stat-card-header">
                <div className={`icon-box ${iconClass}`}>
                    <Icon size={20} />
                </div>
                <ArrowRight className="arrow-icon" size={16} />
            </div>
            <div>
                <div className="stat-number">{value}</div>
                <div className="stat-label">{label}</div>
                <div className="stat-subtext">{subtext}</div>
            </div>
        </div>
    </div>
);

export default function AdminHomePage() {
    const navigate = useNavigate();

    // 1. Quản lý toàn bộ số liệu bằng State (Khởi tạo bằng 0, không dùng dữ liệu giả)
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        warnedUsers: 0,
        bannedUsers: 0,
        pendingDocs: 0,
        activeReports: 0,
        documentsThisMonth: 0
    });

    const [latestDocuments, setLatestDocuments] = useState([]);

    // 2. Hook useEffect để trống, sẵn sàng cho việc gọi API sau này
    useEffect(() => {
        // Sau này khi cần đọc API, bạn viết hàm fetch ở đây rồi cập nhật lại qua setStats và setLatestDocuments
    }, []);

    // 3. Định dạng màu sắc tự động cho Tag môn học
    const getTagStyle = (subject) => {
        const themeStyles = {
            'Computer Science': { bg: '#FFF0E6', color: '#FD8F52', border: 'rgba(253, 143, 82, 0.2)' },
            'Mathematics': { bg: '#FFF9F2', color: '#FFBD71', border: 'rgba(255, 189, 113, 0.2)' },
            'Physics': { bg: '#FFEAEA', color: '#EF4444', border: 'rgba(239, 68, 68, 0.2)' }
        };
        const defaultStyle = { bg: '#F3F4F6', color: '#4B5563', border: 'rgba(75, 85, 99, 0.2)' };
        const activeTheme = themeStyles[subject] || defaultStyle;
        
        return { 
            background: activeTheme.bg, 
            color: activeTheme.color, 
            border: `1px solid ${activeTheme.border}` 
        };
    };

    return (
        <div className="admin-dashboard-container py-5 px-4 px-md-5 text-start">
            {/* Nhúng CSS trực tiếp trong file */}
            <style>{`
                .admin-dashboard-container { font-family: 'Montserrat', 'Inter', sans-serif; }
                .dashboard-title { font-size: 32px; font-weight: 700; color: #C73866; margin-bottom: 4px; }
                .dashboard-subtitle { font-size: 14px; color: #6c757d; margin-bottom: 40px; }
                .stat-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; height: 100%; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02); transition: all 0.3s; cursor: pointer; }
                .stat-card:hover { transform: translateY(-5px); box-shadow: 0 12px 28px rgba(253, 143, 82, 0.08); border-color: rgba(253, 143, 82, 0.3); }
                .stat-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
                .icon-box { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                .icon-box.users { background-color: rgba(199, 56, 102, 0.08); color: #C73866; }
                .icon-box.pending { background-color: rgba(255, 189, 113, 0.12); color: #FFBD71; }
                .icon-box.reports { background-color: rgba(239, 68, 68, 0.08); color: #EF4444; }
                .arrow-icon { color: #ced4da; transition: color 0.2s, transform 0.2s; }
                .stat-card:hover .arrow-icon { color: #FD8F52; transform: translateX(3px); }
                .stat-number { font-size: 28px; font-weight: 700; color: #212529; margin-bottom: 2px; }
                .stat-label { font-size: 13px; font-weight: 500; color: #6c757d; margin-bottom: 8px; }
                .stat-subtext { font-size: 11px; color: #868e96; }
                .content-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; height: 100%; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02); overflow: hidden; }
                .content-card-header { padding: 20px 24px; background: #FFFBF9; border-bottom: 1px solid rgba(253, 143, 82, 0.08); font-size: 16px; font-weight: 600; color: #212529; }
                .content-card-body { padding: 24px; }
                .doc-item { display: flex; align-items: center; justify-content: space-between; padding-bottom: 18px; margin-bottom: 18px; border-bottom: 1px solid rgba(0, 0, 0, 0.04); }
                .doc-item:last-child { padding-bottom: 0; margin-bottom: 0; border-bottom: none; }
                .doc-info { flex-grow: 1; padding-right: 16px; }
                .doc-title { font-size: 14.5px; font-weight: 600; color: #2D3748; margin-bottom: 4px; line-height: 1.4; cursor: pointer; transition: color 0.2s; }
                .doc-title:hover { color: #FD8F52; }
                .doc-author { font-size: 12px; color: #718096; margin-bottom: 6px; }
                .doc-stats { display: flex; gap: 16px; font-size: 12px; color: #A0AEC0; }
                .stat-value { inline-flex; align-items: center; gap: 4px; }
                .subject-pill { font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 12px; white-space: nowrap; }
                .activity-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid rgba(0, 0, 0, 0.04); }
                .activity-row:last-child { border-bottom: none; }
                .activity-desc { flex-grow: 1; }
                .activity-title { font-size: 14px; font-weight: 600; color: #2D3748; margin-bottom: 2px; }
                .activity-sub { font-size: 12px; color: #718096; }
                .activity-badge { width: 32px; height: 20px; border-radius: 10px; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; }
                .activity-badge.active-user { background-color: #FFF3E0; color: #FB8C00; }
                .activity-badge.warned-user { background-color: #FFF3E0; color: #FB8C00; border: 1px solid #FFB74D; }
                .activity-badge.banned-user { background-color: #C2185B; color: #FFFFFF; }
                .activity-badge.doc-month { background-color: #FFFFFF; color: #FB8C00; border: 1px solid #FFB74D; }
            `}</style>

            {/* Dashboard Title */}
            <div className="mb-4">
                <h1 className="dashboard-title">Admin Dashboard</h1>
                <p className="dashboard-subtitle">System statistics and activity overview</p>
            </div>

            {/* Grid hiển thị 3 thẻ số liệu thống kê (Đã ẩn thẻ Total Documents) */}
            <div className="row mb-5">
                <StatCard 
                    icon={Users} value={stats.totalUsers} label="Total Users" 
                    subtext={`${stats.warnedUsers} warned, ${stats.bannedUsers} banned`} 
                    iconClass="users" onClick={() => navigate('/admin/users')} 
                />
                <StatCard 
                    icon={Clock} value={stats.pendingDocs} label="Pending Reviews" 
                    subtext="Documents awaiting approval" 
                    iconClass="pending" onClick={() => navigate('/admin/pending-documents')} 
                />
                <StatCard 
                    icon={AlertCircle} value={stats.activeReports} label="Active Reports" 
                    subtext="Reports to review" 
                    iconClass="reports" onClick={() => navigate('/admin/reports')} 
                />
            </div>

            <div className="row mb-5">
                {/* Khối bên trái: Danh sách tài liệu mới */}
                <div className="col-12 col-lg-7 mb-4">
                    <div className="content-card">
                        <div className="content-card-header">Latest Documents</div>
                        <div className="content-card-body">
                            {latestDocuments.length === 0 ? (
                                <div className="text-muted text-center py-4" style={{ fontSize: '14px' }}>
                                    No recent documents available.
                                </div>
                            ) : (
                                latestDocuments.map((doc) => (
                                    <div key={doc.id} className="doc-item">
                                        <div className="doc-info">
                                            <div className="doc-title" onClick={() => navigate(`/document/${doc.id}`)}>
                                                {doc.title}
                                            </div>
                                            <div className="doc-author">By {doc.author}</div>
                                            <div className="doc-stats">
                                                <span className="stat-value"><Eye size={14} /> {doc.views}</span>
                                                <span className="stat-value"><Download size={14} /> {doc.downloads}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="subject-pill" style={getTagStyle(doc.subject)}>
                                                {doc.subject}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Khối bên phải: Hoạt động của User */}
                <div className="col-12 col-lg-5 mb-4">
                    <div className="content-card">
                        <div className="content-card-header">User Activity</div>
                        <div className="content-card-body">
                            <div className="activity-row">
                                <div className="activity-desc">
                                    <div className="activity-title">Active Users</div>
                                    <div className="activity-sub">Currently active accounts</div>
                                </div>
                                <div className="activity-badge active-user">{stats.activeUsers}</div>
                            </div>

                            <div className="activity-row">
                                <div className="activity-desc">
                                    <div className="activity-title">Warned Users</div>
                                    <div className="activity-sub">Accounts with warnings</div>
                                </div>
                                <div className="activity-badge warned-user">{stats.warnedUsers}</div>
                            </div>

                            <div className="activity-row">
                                <div className="activity-desc">
                                    <div className="activity-title">Banned Users</div>
                                    <div className="activity-sub">Currently suspended accounts</div>
                                </div>
                                <div className="activity-badge banned-user">{stats.bannedUsers}</div>
                            </div>

                            <div className="activity-row">
                                <div className="activity-desc">
                                    <div className="activity-title">Documents This Month</div>
                                    <div className="activity-sub">Uploaded documents</div>
                                </div>
                                <div className="activity-badge doc-month">{stats.documentsThisMonth}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Đã xóa hoàn toàn phần nút chuyển trang nhanh ở dưới đáy */}
        </div>
    );
}
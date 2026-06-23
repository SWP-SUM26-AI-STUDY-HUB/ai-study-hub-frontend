import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
    Users, Clock, AlertCircle, Eye, Download, ArrowRight, 
    FileText, Database, CreditCard, Loader2 
} from 'lucide-react';

// Stats Card Component with responsive widths (col-12 col-sm-6 col-lg-3)
const StatCard = ({ icon: Icon, value, label, subtext, iconClass, onClick }) => (
    <div className="col-12 col-sm-6 col-lg-3 mb-4" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
        <div className="stat-card">
            <div className="stat-card-header">
                <div className={`icon-box ${iconClass}`}>
                    <Icon size={20} />
                </div>
                {onClick && <ArrowRight className="arrow-icon" size={16} />}
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

    const [stats, setStats] = useState(null);
    const [latestDocuments, setLatestDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Keep trackers for action item counters
    const [pendingCount, setPendingCount] = useState(0);
    const [reportsCount, setReportsCount] = useState(0);

    const formatBytes = (bytes) => {
        if (bytes === undefined || bytes === null || isNaN(bytes)) return '0.00 MB';
        if (bytes === 0) return '0 Bytes';
        const mb = bytes / (1024 * 1024);
        if (mb >= 1024) {
            return `${(mb / 1024).toFixed(2)} GB`;
        }
        return `${mb.toFixed(2)} MB`;
    };

    const formatRevenue = (amount) => {
        if (amount === undefined || amount === null || isNaN(amount)) return '0 VND';
        return amount.toLocaleString('vi-VN') + ' VND';
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Session expired. Please login again.');
                setIsLoading(false);
                return;
            }

            // Calculate date range (last 30 days)
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 30);

            const formatDate = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const startDate = formatDate(start);
            const endDate = formatDate(end);

            try {
                setIsLoading(true);
                setError(null);

                // Fetch stats, all documents list, and reports in parallel
                const [statsRes, docsRes, reportsRes] = await Promise.all([
                    fetch(`http://14.225.254.145:8080/api/v1/admin/dashboard/stats?startDate=${startDate}&endDate=${endDate}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`http://14.225.254.145:8080/api/v1/documents`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(e => {
                        console.warn("Failed to fetch documents:", e);
                        return null;
                    }),
                    fetch(`http://14.225.254.145:8080/api/v1/admin/reports`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(e => {
                        console.warn("Failed to fetch reports:", e);
                        return null;
                    })
                ]);

                if (!statsRes.ok) {
                    throw new Error(`Failed to load analytics: ${statsRes.status}`);
                }

                const statsResult = await statsRes.json();
                if (statsResult.success && statsResult.data) {
                    setStats(statsResult.data);
                } else {
                    throw new Error(statsResult.message || 'Failed to fetch dashboard stats');
                }

                // Handle documents list and pending counts
                let allDocs = [];
                if (docsRes && docsRes.ok) {
                    const docsResult = await docsRes.json();
                    if (docsResult.success && Array.isArray(docsResult.data)) {
                        allDocs = docsResult.data;
                        // Count pending documents
                        const pendingDocs = allDocs.filter(d => d.status?.toLowerCase() === 'pending');
                        setPendingCount(pendingDocs.length);
                    }
                }

                // Handle reports counts
                if (reportsRes && reportsRes.ok) {
                    const reportsResult = await reportsRes.json();
                    if (reportsResult.success && Array.isArray(reportsResult.data)) {
                        const activeReports = reportsResult.data.filter(r => r.status?.toLowerCase() === 'pending');
                        setReportsCount(activeReports.length);
                    }
                }

                // Populate latest documents
                if (allDocs.length > 0) {
                    // Sort by date or id descending to show newest
                    const sorted = [...allDocs].sort((a, b) => (b.id || 0) - (a.id || 0));
                    setLatestDocuments(sorted.slice(0, 5));
                } else {
                    setLatestDocuments([]);
                }

            } catch (err) {
                console.error("Dashboard error:", err);
                setError(err.message || 'An error occurred while loading dashboard statistics.');
                setStats(null);
                setLatestDocuments([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const getTagStyle = (subject) => {
        const themeStyles = {
            'Computer Science': { bg: '#FFF0E6', color: '#FD8F52', border: 'rgba(253, 143, 82, 0.2)' },
            'Technology': { bg: '#FFF0E6', color: '#FD8F52', border: 'rgba(253, 143, 82, 0.2)' },
            'Science': { bg: '#FFF9F2', color: '#FFBD71', border: 'rgba(255, 189, 113, 0.2)' },
            'Mathematics': { bg: '#FFF9F2', color: '#FFBD71', border: 'rgba(255, 189, 113, 0.2)' },
            'Business': { bg: '#FFEAEA', color: '#EF4444', border: 'rgba(239, 68, 68, 0.2)' }
        };
        const defaultStyle = { bg: '#F3F4F6', color: '#4B5563', border: 'rgba(75, 85, 99, 0.2)' };
        const activeTheme = themeStyles[subject] || defaultStyle;
        
        return { 
            background: activeTheme.bg, 
            color: activeTheme.color, 
            border: `1px solid ${activeTheme.border}` 
        };
    };

    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <div className="spinner-border text-primary" role="status" style={{ color: '#FD8F52' }}>
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard-container py-5 px-4 px-md-5 text-start">
            <style>{`
                .admin-dashboard-container { font-family: 'Montserrat', 'Inter', system-ui, sans-serif; background-color: #fafbfe; min-height: calc(100vh - 80px); }
                .dashboard-title { font-size: 32px; font-weight: 700; color: #C73866; margin-bottom: 4px; }
                .dashboard-subtitle { font-size: 14px; color: #6c757d; margin-bottom: 40px; }
                .stat-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; height: 100%; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02); transition: all 0.3s; }
                .stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(253, 143, 82, 0.06); border-color: rgba(253, 143, 82, 0.25); }
                .stat-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
                .icon-box { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                .icon-box.users { background-color: rgba(199, 56, 102, 0.08); color: #C73866; }
                .icon-box.docs { background-color: rgba(255, 189, 113, 0.12); color: #FFBD71; }
                .icon-box.storage { background-color: rgba(16, 185, 129, 0.08); color: #10B981; }
                .icon-box.revenue { background-color: rgba(59, 130, 246, 0.08); color: #3B82F6; }
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
                .stat-value { display: inline-flex; align-items: center; gap: 4px; }
                .subject-pill { font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 12px; white-space: nowrap; }
                .action-item-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-radius: 10px; margin-bottom: 12px; background-color: #FFFBF9; border: 1px solid rgba(253, 143, 82, 0.1); cursor: pointer; transition: 0.2s; }
                .action-item-row:hover { border-color: #FD8F52; background-color: #FFF5ED; transform: translateX(2px); }
                .action-item-title { font-size: 14.5px; font-weight: 600; color: #2D3748; }
                .action-item-sub { font-size: 12px; color: #718096; margin-top: 2px; }
                .action-badge { min-width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: white; }
                .action-badge.pending { background-color: #FD8F52; }
                .action-badge.reports { background-color: #EF4444; }
                .action-badge.users { background-color: #C73866; }
            `}</style>

            {/* Dashboard Title */}
            <div className="mb-4">
                <h1 className="dashboard-title">Admin Dashboard</h1>
                <p className="dashboard-subtitle">Real-time platform metrics and registration analytics</p>
            </div>

            {/* Row 1: Dashboard statistics cards */}
            <div className="row mb-4">
                <StatCard 
                    icon={Users} 
                    value={stats?.totalUsers || 0} 
                    label="Total Users" 
                    subtext="Registered members in system" 
                    iconClass="users"
                    onClick={() => navigate('/admin/users')}
                />
                <StatCard 
                    icon={FileText} 
                    value={stats?.totalSuccessfulDocuments || 0} 
                    label="Approved Documents" 
                    subtext="Published study files" 
                    iconClass="docs"
                />
                <StatCard 
                    icon={Database} 
                    value={formatBytes(stats?.totalStorageUsedBytes)} 
                    label="Storage Capacity" 
                    subtext="Space consumed on system S3" 
                    iconClass="storage"
                />
                <StatCard 
                    icon={CreditCard} 
                    value={formatRevenue(stats?.totalRevenueCurrentMonth)} 
                    label="Monthly Revenue" 
                    subtext="Storage upgrades subscription" 
                    iconClass="revenue"
                />
            </div>

            {/* Row 2: Latest documents & Action center */}
            <div className="row mb-5">
                {/* Left column: Latest Documents */}
                <div className="col-12 col-lg-7 mb-4">
                    <div className="content-card">
                        <div className="content-card-header">Latest Documents</div>
                        <div className="content-card-body">
                            {latestDocuments.length === 0 ? (
                                <div className="text-muted text-center py-5" style={{ fontSize: '14px' }}>
                                    No recent documents uploaded.
                                </div>
                            ) : (
                                latestDocuments.map((doc) => (
                                    <div key={doc.id} className="doc-item">
                                        <div className="doc-info text-start">
                                            <div className="doc-title" onClick={() => navigate(`/document/${doc.id}`)}>
                                                {doc.title}
                                            </div>
                                            <div className="doc-author">By {doc.author || 'Contributor'}</div>
                                            <div className="doc-stats">
                                                <span className="stat-value"><Eye size={14} /> {doc.views} views</span>
                                                <span className="stat-value"><Download size={14} /> {doc.downloads || 0} downloads</span>
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

                {/* Right column: Action Center (Quick links) */}
                <div className="col-12 col-lg-5 mb-4">
                    <div className="content-card">
                        <div className="content-card-header">Action & Control Center</div>
                        <div className="content-card-body d-flex flex-column gap-1">
                            
                            <div className="action-item-row" onClick={() => navigate('/admin/pending-documents')}>
                                <div>
                                    <div className="action-item-title d-flex align-items-center gap-2">
                                        <Clock size={16} style={{ color: '#FD8F52' }} />
                                        Pending Approvals
                                    </div>
                                    <div className="action-item-sub">Review new document submissions</div>
                                </div>
                                <div className="action-badge pending">
                                    {pendingCount}
                                </div>
                            </div>

                            <div className="action-item-row" onClick={() => navigate('/admin/reports')}>
                                <div>
                                    <div className="action-item-title d-flex align-items-center gap-2">
                                        <AlertCircle size={16} style={{ color: '#EF4444' }} />
                                        Active Reports
                                    </div>
                                    <div className="action-item-sub">Address user-submitted complaints</div>
                                </div>
                                <div className="action-badge reports">
                                    {reportsCount}
                                </div>
                            </div>

                            <div className="action-item-row" onClick={() => navigate('/admin/users')}>
                                <div>
                                    <div className="action-item-title d-flex align-items-center gap-2">
                                        <Users size={16} style={{ color: '#C73866' }} />
                                        User Database
                                    </div>
                                    <div className="action-item-sub">Manage user roles and warnings</div>
                                </div>
                                <div className="action-badge users">
                                    i
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
    Users, Clock, AlertCircle, Eye, Download, ArrowRight,
    FileText, Database, CreditCard, Loader2, Tag, Plus, Search
} from 'lucide-react';
import { Modal, Form } from 'react-bootstrap';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../api.js';

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

// =========================================================================
// BIỂU ĐỒ SVG THỂ HIỆN XU HƯỚNG ĐĂNG KÝ THÀNH VIÊN (SignupTrendChart)
// - Hoạt động:
//   1. Nhận mảng `signupStats` chứa thông tin thống kê số lượng tài khoản mới đăng ký theo ngày.
//   2. Sắp xếp mảng theo thứ tự thời gian tăng dần từ trái sang phải.
//   3. Tính toán tọa độ (x, y) động cho từng điểm dựa trên kích thước khung SVG (`svgWidth` x `svgHeight`) và giá trị lớn nhất (`maxCount`).
//   4. Dựng đường cong Bezier (`linePath`) nối các điểm lại với nhau bằng thuộc tính `path` trong SVG 
//      để tạo đường biểu diễn mượt mà (smooth curve).
//   5. Dựng vùng phủ bóng phía dưới đường cong (`areaPath`) bằng gradient màu cam nhạt tạo cảm giác hiện đại, cao cấp.
//   6. Kết xuất trục tọa độ cùng các nhãn mác (ngày tháng, số lượng) hoàn toàn bằng các phần tử SVG gốc như <path>, <text>, <circle>.
// =========================================================================
const SignupTrendChart = ({ signupStats }) => {
    if (!signupStats || signupStats.length === 0) {
        return (
            <div className="text-center text-muted py-5" style={{ fontSize: '14.5px' }}>
                No registration trend data available for the selected period.
            </div>
        );
    }

    // Prepare data
    const maxCount = Math.max(...signupStats.map(s => s.count || 0), 5); // Default max to 5 to avoid flat scale

    // Sort by date to make sure it runs left to right
    const sortedStats = [...signupStats].sort((a, b) => new Date(a.date) - new Date(b.date));

    // SVG parameters
    const svgWidth = 800;
    const svgHeight = 220;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const chartWidth = svgWidth - paddingLeft - paddingRight;
    const chartHeight = svgHeight - paddingTop - paddingBottom;

    // Calculate points
    const points = sortedStats.map((item, index) => {
        const x = paddingLeft + (index / (sortedStats.length - 1 || 1)) * chartWidth;
        const count = item.count || 0;
        const y = paddingTop + chartHeight - (count / maxCount) * chartHeight;
        return { x, y, date: item.date, count };
    });

    // Create line path
    let linePath = '';
    if (points.length > 0) {
        linePath = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const cpX1 = prev.x + (curr.x - prev.x) / 3;
            const cpY1 = prev.y;
            const cpX2 = prev.x + 2 * (curr.x - prev.x) / 3;
            const cpY2 = curr.y;
            linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
        }
    }

    // Create area path under the line
    const areaPath = linePath ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z` : '';

    // Label dates (show 6 labels maximum to keep clean)
    const labelIndices = [];
    if (sortedStats.length > 1) {
        const step = Math.max(1, Math.floor(sortedStats.length / 5));
        for (let i = 0; i < sortedStats.length; i += step) {
            labelIndices.push(i);
        }
        if (!labelIndices.includes(sortedStats.length - 1)) {
            labelIndices.push(sortedStats.length - 1);
        }
    } else if (sortedStats.length === 1) {
        labelIndices.push(0);
    }

    const formatDateLabel = (dateStr) => {
        try {
            const date = new Date(dateStr);
            return `${date.getDate()}/${date.getMonth() + 1}`;
        } catch {
            return dateStr;
        }
    };

    const [hoveredPoint, setHoveredPoint] = useState(null);

    return (
        <div className="position-relative">
            <style>{`
                .chart-point { transition: r 0.2s, stroke-width 0.2s; cursor: pointer; }
                .chart-point:hover { r: 6.5; stroke-width: 3; }
                .chart-line { stroke-dasharray: 1200; stroke-dashoffset: 1200; animation: draw 1.8s forwards ease-in-out; }
                .chart-area { opacity: 0; animation: fadeIn 1s 0.8s forwards; }
                @keyframes draw { to { stroke-dashoffset: 0; } }
                @keyframes fadeIn { to { opacity: 1; } }
                .tooltip-box {
                    position: absolute;
                    background: #1E293B !important;
                    color: #ffffff !important;
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 11px;
                    pointer-events: none;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.25);
                    z-index: 10;
                    transform: translate(-50%, -100%);
                    margin-top: -10px;
                    transition: left 0.1s ease-out, top 0.1s ease-out;
                    border: 1px solid rgba(253, 143, 82, 0.3);
                }
                .tooltip-box div {
                    color: #ffffff !important;
                }
                .tooltip-box .tooltip-date {
                    color: #94a3b8 !important;
                }
                .tooltip-box span {
                    color: #FD8F52 !important;
                }
            `}</style>

            {hoveredPoint && (
                <div
                    className="tooltip-box text-center"
                    style={{
                        left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                        top: `${(hoveredPoint.y / svgHeight) * 100}%`
                    }}
                >
                    <div className="fw-semibold tooltip-date mb-0.5" style={{ fontSize: '10px' }}>
                        {new Date(hoveredPoint.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="fw-bold tooltip-value" style={{ fontSize: '13px' }}>
                        {hoveredPoint.count} <span>Signups</span>
                    </div>
                </div>
            )}

            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%" className="w-100" style={{ overflow: 'visible' }}>
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FD8F52" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#FD8F52" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#C73866" />
                        <stop offset="50%" stopColor="#FD8F52" />
                        <stop offset="100%" stopColor="#FFBD71" />
                    </linearGradient>
                </defs>

                {/* Y Axis Gridlines & Labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = paddingTop + chartHeight - ratio * chartHeight;
                    const val = Math.round(ratio * maxCount);
                    return (
                        <g key={idx} opacity="0.3">
                            <line
                                x1={paddingLeft}
                                y1={y}
                                x2={svgWidth - paddingRight}
                                y2={y}
                                stroke="#E2E8F0"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                            />
                            <text
                                x={paddingLeft - 12}
                                y={y + 4}
                                fill="#718096"
                                fontSize="11"
                                textAnchor="end"
                                fontWeight="500"
                            >
                                {val}
                            </text>
                        </g>
                    );
                })}

                {/* Area under the line */}
                {areaPath && (
                    <path
                        d={areaPath}
                        fill="url(#chartGradient)"
                        className="chart-area"
                    />
                )}

                {/* Line Path */}
                {linePath && (
                    <path
                        d={linePath}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        className="chart-line"
                    />
                )}

                {/* X Axis Date Labels */}
                {labelIndices.map((idx) => {
                    const pt = points[idx];
                    if (!pt) return null;
                    return (
                        <text
                            key={idx}
                            x={pt.x}
                            y={paddingTop + chartHeight + 20}
                            fill="#718096"
                            fontSize="10"
                            textAnchor="middle"
                            fontWeight="500"
                        >
                            {formatDateLabel(pt.date)}
                        </text>
                    );
                })}

                {/* Active Dots */}
                {points.map((pt, idx) => (
                    <circle
                        key={idx}
                        cx={pt.x}
                        cy={pt.y}
                        r="4"
                        fill="#ffffff"
                        stroke="#FD8F52"
                        strokeWidth="2"
                        className="chart-point"
                        onMouseEnter={() => setHoveredPoint(pt)}
                        onMouseLeave={() => setHoveredPoint(null)}
                    />
                ))}
            </svg>
        </div>
    );
};

export default function AdminHomePage() {
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [latestDocuments, setLatestDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Keep trackers for action item counters
    const [pendingCount, setPendingCount] = useState(0);
    const [reportsCount, setReportsCount] = useState(0);

    // State for Tag Creator Modal
    const tagDropdownRef = useRef(null);
    const [showTagModal, setShowTagModal] = useState(false);
    const [newTagLabel, setNewTagLabel] = useState('');
    const [isCreatingTag, setIsCreatingTag] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    // Existing tags viewing state
    const [existingTags, setExistingTags] = useState([]);
    const [isLoadingTags, setIsLoadingTags] = useState(false);
    const [tagSearch, setTagSearch] = useState('');

    const fetchExistingTags = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            setIsLoadingTags(true);
            const response = await fetch(`${API_BASE_URL}/api/v1/tags/public`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                setExistingTags(result.data);
            } else if (Array.isArray(result)) {
                setExistingTags(result);
            }
        } catch (error) {
            console.error("Error fetching existing public tags:", error);
        } finally {
            setIsLoadingTags(false);
        }
    };

    useEffect(() => {
        if (showTagModal) {
            fetchExistingTags();
            setTagSearch('');
        }
    }, [showTagModal]);

    useEffect(() => {
        if (!newTagLabel.trim() || !showTagModal) {
            setSuggestions([]);
            setShowSuggestions(false);
            setIsLoadingSuggestions(false);
            return;
        }

        setIsLoadingSuggestions(true);
        setShowSuggestions(true);

        const handler = setTimeout(async () => {
            const token = localStorage.getItem('token');
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/tags/search?keyword=${encodeURIComponent(newTagLabel.trim())}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const result = await response.json();
                if (result.success && result.data) {
                    // Filter: only show PUBLIC tags
                    const publicOnly = result.data.filter(tag => tag.visibility === 'PUBLIC');
                    setSuggestions(publicOnly);
                } else {
                    setSuggestions([]);
                }
            } catch (error) {
                console.error("Error searching tags:", error);
                setSuggestions([]);
            } finally {
                setIsLoadingSuggestions(false);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [newTagLabel, showTagModal]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCreateTag = async (e) => {
        e.preventDefault();
        const label = newTagLabel.trim();
        if (!label) {
            toast.error("Please enter a tag name.");
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            setIsCreatingTag(true);
            const response = await fetch(`${API_BASE_URL}/api/v1/admin/tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ label: label })
            });

            const result = await response.json();
            if (response.ok && result.success) {
                toast.success(`Public tag "${label}" created successfully!`);
                setNewTagLabel('');
                setShowTagModal(false);
            } else {
                throw new Error(result.message || "Failed to create public tag");
            }
        } catch (err) {
            console.error("Create tag error:", err);
            toast.error(err.message || "An error occurred while creating the tag.");
        } finally {
            setIsCreatingTag(false);
        }
    };



    const formatBytes = (bytes) => {
        if (bytes === undefined || bytes === null || isNaN(bytes)) return 'N/A';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        if (i < 0 || !isFinite(i)) return '0 Bytes';
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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

            const startDate = start.toISOString();
            const endDate = end.toISOString();

            try {
                setIsLoading(true);
                setError(null);

                // Fetch stats, pending documents count, reports count, and public documents in parallel
                const [statsRes, pendingRes, reportsRes, searchRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/v1/admin/dashboard/stats?startDate=${startDate}&endDate=${endDate}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`${API_BASE_URL}/api/v1/admin/documents/pending`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(e => {
                        console.warn("Failed to fetch pending documents:", e);
                        return null;
                    }),
                    fetch(`${API_BASE_URL}/api/v1/admin/reports/documents`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(e => {
                        console.warn("Failed to fetch reports:", e);
                        return null;
                    }),
                    fetch(`${API_BASE_URL}/api/v1/documents/trending`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(e => {
                        console.warn("Failed to fetch public documents:", e);
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

                // Handle pending documents counts
                if (pendingRes && pendingRes.ok) {
                    const pendingResult = await pendingRes.json();
                    if (pendingResult.success && Array.isArray(pendingResult.data)) {
                        setPendingCount(pendingResult.data.length);
                    }
                }

                // Handle active reports counts
                if (reportsRes && reportsRes.ok) {
                    const reportsResult = await reportsRes.json();
                    if (reportsResult.success && Array.isArray(reportsResult.data)) {
                        const totalReports = reportsResult.data.reduce((acc, curr) => acc + (curr.reportCount || 0), 0);
                        setReportsCount(totalReports);
                    }
                }

                // Populate latest documents from public trending/search results
                if (searchRes && searchRes.ok) {
                    const searchResult = await searchRes.json();
                    let list = [];
                    if (searchResult.success && Array.isArray(searchResult.data)) {
                        list = searchResult.data;
                    }
                    if (list.length > 0) {
                        const sorted = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                        setLatestDocuments(sorted.slice(0, 5));
                    }
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
                .doc-title { font-size: 14.5px; font-weight: 600; color: #2D3748; margin-bottom: 4px; line-height: 1.4; }
                .doc-author { font-size: 12px; color: #718096; margin-bottom: 6px; }
                .doc-stats { display: flex; gap: 16px; font-size: 12px; color: #A0AEC0; }
                .stat-value { display: inline-flex; align-items: center; gap: 4px; }
                .subject-pill { font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 12px; white-space: nowrap; background: #FFF5ED; color: #FD8F52 !important; border: 1px solid rgba(253, 143, 82, 0.2); }
                .action-item-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-radius: 10px; margin-bottom: 12px; background-color: #FFFBF9; border: 1px solid rgba(253, 143, 82, 0.1); cursor: pointer; transition: 0.2s; }
                .action-item-row:hover { border-color: #FD8F52; background-color: #FFF5ED; transform: translateX(2px); }
                .action-item-title { font-size: 14.5px; font-weight: 600; color: #2D3748; }
                .action-item-sub { font-size: 12px; color: #718096; margin-top: 2px; }
                .action-badge { min-width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: white; }
                .action-badge.pending { background-color: #FD8F52; }
                .action-badge.reports { background-color: #EF4444; }
                .action-badge.users { background-color: #C73866; }

                /* Dark Mode Overrides */
                [data-theme='dark'] .admin-dashboard-container { background-color: var(--bg-global); }
                [data-theme='dark'] .subject-pill { background: rgba(253, 143, 82, 0.15) !important; color: #FD8F52 !important; border-color: rgba(253, 143, 82, 0.3) !important; }
                [data-theme='dark'] .stat-card { background: var(--bg-card-container); border-color: var(--border-color); }
                [data-theme='dark'] .stat-number { color: var(--text-main); }
                [data-theme='dark'] .stat-label { color: var(--text-muted); }
                [data-theme='dark'] .stat-subtext { color: var(--text-muted); }
                [data-theme='dark'] .content-card { background: var(--bg-card-container); border-color: var(--border-color); }
                [data-theme='dark'] .content-card-header { background: var(--bg-global); border-bottom-color: var(--border-color); color: var(--text-main); }
                [data-theme='dark'] .doc-item { border-bottom-color: var(--border-color); }
                [data-theme='dark'] .doc-title { color: var(--text-main); }
                [data-theme='dark'] .doc-author { color: var(--text-muted); }
                [data-theme='dark'] .doc-stats { color: var(--text-muted); }
                [data-theme='dark'] .action-item-row { background-color: var(--bg-global); border-color: var(--border-color); }
                [data-theme='dark'] .action-item-row:hover { background-color: rgba(253, 143, 82, 0.15); border-color: #FD8F52; }
                [data-theme='dark'] .action-item-title { color: var(--text-main); }
                [data-theme='dark'] .action-item-sub { color: var(--text-muted); }

                /* Create Public Tag Modal Styles */
                .admin-modal-header { background: #FFFBF9; border: none; }
                .admin-modal-body { background: #FFFBF9; }
                .admin-modal-input { background-color: #FFF9F5 !important; border: 1px solid rgba(253, 143, 82, 0.2) !important; border-radius: 10px; padding: 12px 16px; fontSize: 14.5px; }

                [data-theme='dark'] .admin-modal .modal-content { background-color: var(--bg-card-container) !important; border: 1px solid var(--border-color) !important; }
                [data-theme='dark'] .admin-modal-header { background: var(--bg-card-container) !important; }
                [data-theme='dark'] .admin-modal-body { background: var(--bg-card-container) !important; }
                [data-theme='dark'] .admin-modal-input, [data-theme='dark'] .admin-modal-input-sm { background-color: #11141a !important; border-color: rgba(253, 143, 82, 0.3) !important; color: var(--text-main) !important; }

                .tag-suggestions-list { position: absolute; width: 100%; background: var(--bg-card-container, #ffffff); border: 1px solid var(--border-color, rgba(253, 143, 82, 0.2)); border-radius: 12px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15); margin-top: 6px; padding: 6px 0; list-style: none; z-index: 1000; max-height: 200px; overflow-y: auto; text-align: start; }
                .tag-suggestion-item { padding: 10px 16px; font-size: 14px; color: var(--text-main, #4a5568); cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s ease; }
                .tag-suggestion-item:hover { background-color: var(--bg-global, #FFF5ED); color: #FD8F52; }
                .tag-suggestion-empty { padding: 12px 16px; font-size: 13px; color: var(--text-muted, #a0aec0); text-align: center; }

                [data-theme='dark'] .tag-suggestions-list { background: var(--bg-card-container); border-color: var(--border-color); }
                [data-theme='dark'] .tag-suggestion-item { color: var(--text-main); }
                [data-theme='dark'] .tag-suggestion-item:hover { background-color: rgba(253, 143, 82, 0.15); color: #FD8F52; }

                .existing-tags-container { background-color: #fafbfe; border-color: rgba(0,0,0,0.05); }
                .existing-tag-badge { background-color: rgba(253, 143, 82, 0.05); border: 1px solid rgba(253, 143, 82, 0.2); color: #2d3748; }
                
                [data-theme='dark'] .existing-tags-container { background-color: rgba(255,255,255,0.02) !important; border-color: var(--border-color) !important; }
                [data-theme='dark'] .existing-tag-badge { background-color: rgba(253, 143, 82, 0.1) !important; border-color: rgba(253, 143, 82, 0.3) !important; color: var(--text-main) !important; }
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

            {/* Row 1.5: Signup Trend Chart */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="content-card">
                        <div className="content-card-header d-flex justify-content-between align-items-center">
                            <span>User Registration Trend (Last 30 Days)</span>
                            <span className="badge border fw-semibold subject-pill" style={{ fontSize: '11px' }}>
                                Total Signups: {stats?.signupStats?.reduce((acc, curr) => acc + (curr.count || 0), 0) || 0}
                            </span>
                        </div>
                        <div className="content-card-body" style={{ minHeight: '240px' }}>
                            <SignupTrendChart signupStats={stats?.signupStats} />
                        </div>
                    </div>
                </div>
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
                                            <div className="doc-title">
                                                {doc.title}
                                            </div>
                                            <div className="doc-author">By {doc.uploader?.fullName || doc.uploader?.name || ''}</div>
                                            <div className="doc-stats">
                                                <span className="stat-value"><FileText size={14} /> {(doc.fileType || doc.file_type || 'PDF').toUpperCase()}</span>
                                                <span className="stat-value"><Database size={14} /> {formatBytes(doc.fileSizeBytes ?? doc.fileSize ?? doc.size ?? doc.file_size_bytes)}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="subject-pill">
                                                {doc.visibility || 'PUBLIC'}
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

                            <div className="action-item-row" onClick={() => setShowTagModal(true)}>
                                <div>
                                    <div className="action-item-title d-flex align-items-center gap-2">
                                        <Tag size={16} style={{ color: '#805AD5' }} />
                                        Create New Tag
                                    </div>
                                    <div className="action-item-sub">Create a new public document tag</div>
                                </div>
                                <div className="action-badge" style={{ backgroundColor: '#805AD5' }}>
                                    <Plus size={13} />
                                </div>
                            </div>


                        </div>
                    </div>
                </div>
            </div>

            {/* Create Tag Modal */}
            <Modal show={showTagModal} onHide={() => setShowTagModal(false)} centered className="admin-modal">
                <Modal.Header closeButton className="border-0 pb-0 admin-modal-header">
                    <Modal.Title className="fw-bold" style={{ color: '#C73866', fontSize: '20px' }}>
                        <span className="d-flex align-items-center gap-2">
                            <Tag size={20} style={{ color: '#FD8F52' }} />
                            Create Public Tag
                        </span>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-2 px-4 pb-4 admin-modal-body">
                    <p className="text-muted small mb-4">
                        Creating a public tag as an administrator will automatically merge any existing private user tags matching this label.
                    </p>
                    <Form onSubmit={handleCreateTag}>
                        <Form.Group className="mb-4 position-relative" ref={tagDropdownRef}>
                            <Form.Label className="fw-semibold text-dark small mb-2">Tag Name / Label</Form.Label>
                            <div className="position-relative">
                                <Form.Control
                                    type="text"
                                    placeholder="e.g. Node.js, React, Spring Boot"
                                    value={newTagLabel}
                                    onChange={(e) => setNewTagLabel(e.target.value)}
                                    className="admin-modal-input"
                                    disabled={isCreatingTag}
                                    autoFocus
                                    onFocus={() => {
                                        if (newTagLabel.trim()) setShowSuggestions(true);
                                    }}
                                />
                                {isLoadingSuggestions && (
                                    <div className="position-absolute end-0 top-50 translate-middle-y pe-3" style={{ zIndex: 10 }}>
                                        <div className="spinner-border spinner-border-sm text-primary" style={{ width: '1rem', height: '1rem', color: '#FD8F52' }} role="status" />
                                    </div>
                                )}
                            </div>
                            {showSuggestions && (
                                <ul className="tag-suggestions-list">
                                    {suggestions.map((tag) => (
                                        <li
                                            key={tag.id}
                                            className="tag-suggestion-item d-flex align-items-center justify-content-between"
                                            onClick={() => {
                                                setNewTagLabel(tag.label);
                                                setShowSuggestions(false);
                                            }}
                                        >
                                            <div className="d-flex align-items-center gap-2">
                                                <Tag size={14} className="opacity-75" />
                                                <span>{tag.label}</span>
                                            </div>
                                            <span className="badge bg-primary-subtle text-primary px-2 py-0.5" style={{ fontSize: '10px', borderRadius: '12px', border: '1px solid rgba(253, 143, 82, 0.15)' }}>
                                                Public
                                            </span>
                                        </li>
                                    ))}
                                    {suggestions.length === 0 && !isLoadingSuggestions && (
                                        <li className="tag-suggestion-empty">No matching public tags found (Create new)</li>
                                    )}
                                </ul>
                            )}
                        </Form.Group>

                        {/* Existing tags section */}
                        <div className="mt-4 border-top pt-3 text-start mb-4">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <span className="fw-semibold text-dark small">Existing Public Tags ({existingTags.length})</span>
                                <div className="position-relative" style={{ maxWidth: '180px' }}>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search tags..."
                                        value={tagSearch}
                                        onChange={(e) => setTagSearch(e.target.value)}
                                        size="sm"
                                        style={{
                                            borderRadius: '12px',
                                            fontSize: '11.5px',
                                            paddingRight: '24px',
                                            backgroundColor: '#FFF9F5',
                                            borderColor: 'rgba(253, 143, 82, 0.15)'
                                        }}
                                        className="admin-modal-input-sm"
                                    />
                                    <span className="position-absolute end-0 top-50 translate-middle-y pe-2 text-muted" style={{ fontSize: '11px', pointerEvents: 'none' }}>
                                        <Search size={11} />
                                    </span>
                                </div>
                            </div>
                            
                            {isLoadingTags ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border spinner-border-sm text-primary" style={{ color: '#FD8F52' }} role="status" />
                                </div>
                            ) : (
                                <div 
                                    className="d-flex flex-wrap gap-2 overflow-auto align-content-start border rounded-3 p-2.5 existing-tags-container" 
                                    style={{ 
                                        maxHeight: '140px', 
                                        minHeight: '60px'
                                    }}
                                >
                                    {existingTags
                                        .filter(tag => (tag.label || tag.name || '').toLowerCase().includes(tagSearch.toLowerCase()))
                                        .map((tag, idx) => (
                                            <span 
                                                key={tag.id || idx} 
                                                className="badge px-2.5 py-1.5 rounded-pill d-inline-flex align-items-center gap-1.5 existing-tag-badge"
                                                style={{ 
                                                    fontSize: '12px',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                <Tag size={10} className="text-muted" style={{ color: '#FD8F52' }} />
                                                {tag.label || tag.name}
                                            </span>
                                        ))
                                    }
                                    {existingTags.filter(tag => (tag.label || tag.name || '').toLowerCase().includes(tagSearch.toLowerCase())).length === 0 && (
                                        <div className="text-muted small text-center w-100 py-3">
                                            No tags found.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="d-flex justify-content-end gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-secondary rounded-pill px-4"
                                onClick={() => setShowTagModal(false)}
                                disabled={isCreatingTag}
                                style={{ fontSize: '14px', fontWeight: '500' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn px-4 text-white rounded-pill d-inline-flex align-items-center gap-2"
                                disabled={isCreatingTag || !newTagLabel.trim()}
                                style={{
                                    background: 'linear-gradient(135deg, #C73866, #FD8F52)',
                                    border: 'none',
                                    fontSize: '14px',
                                    fontWeight: '600'
                                }}
                            >
                                {isCreatingTag ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={16} />
                                        Create
                                    </>
                                )}
                            </button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

        </div>
    );
}
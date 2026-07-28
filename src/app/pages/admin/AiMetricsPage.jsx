import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Activity, AlertTriangle, Info, Coins, DollarSign,
    Clock, Layers, Route as RouteIcon, ShieldAlert, Database,
    TrendingUp, Zap, BarChart3, ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../api.js';

// =========================================================================
// TRANG ADMIN: AI / RAG OBSERVABILITY (LANGFUSE METRICS)
// -------------------------------------------------------------------------
// Fetches `GET /api/v1/admin/dashboard/ai-metrics` (ADMIN-only, cache-only —
// server scheduler refreshes 6x/ngày, cửa sổ cố định 7 ngày, fails open) và render:
//   - Summary cards: requests / tokens / cost / citation coverage
//   - Token time series (daily)
//   - Latency p95 by stage + by endpoint
//   - Request volume + route distribution
//   - Token usage + cost by model
//   - Refusal count + empty-retrieval by endpoint
//
// Không dùng thư viện chart (Recharts/Chart.js chưa được cài trong project),
// tất cả biểu đồ tự vẽ SVG theo đúng pattern `SignupTrendChart` ở AdminHomePage.
// =========================================================================

// --- Màu sắc dùng chung (khớp chart palette trong theme.css) -------------
const CHART_COLORS = ['#C73866', '#FE676E', '#FD8F52', '#FFBD71', '#FFDCA2', '#805AD5', '#3B82F6', '#10B981'];
const COLOR_PRIMARY = '#FD8F52';
const COLOR_PINK = '#C73866';

// =========================================================================
// WIDGET: CARD BỌC NGOÀI (tiêu đề + icon + body)
// =========================================================================
const WidgetCard = ({ title, subtitle, icon: Icon, children, action }) => (
    <div className="content-card">
        <div className="content-card-header d-flex justify-content-between align-items-center gap-2">
            <div className="d-flex align-items-center gap-2">
                {Icon && <Icon size={18} style={{ color: COLOR_PRIMARY }} />}
                <div className="text-start">
                    <div>{title}</div>
                    {subtitle && <div className="stat-subtext" style={{ fontSize: '11px', marginTop: '2px' }}>{subtitle}</div>}
                </div>
            </div>
            {action}
        </div>
        <div className="content-card-body">{children}</div>
    </div>
);

// =========================================================================
// WIDGET: SUMMARY CARD (số liệu lớn phía trên trang)
// =========================================================================
const SummaryCard = ({ icon: Icon, value, label, subtext, tint }) => (
    <div className="col-12 col-sm-6 col-lg-3 mb-4">
        <div className="stat-card">
            <div className="stat-card-header">
                <div className="icon-box" style={tint}>
                    <Icon size={20} />
                </div>
            </div>
            <div>
                <div className="stat-number">{value}</div>
                <div className="stat-label">{label}</div>
                {subtext && <div className="stat-subtext">{subtext}</div>}
            </div>
        </div>
    </div>
);

// =========================================================================
// CHART: DANH SÁCH BAR NGANG (label + value) — dùng cho mọi breakdown
// -------------------------------------------------------------------------
// Tự tính max, render thanh gradient theo % giá trị, tooltip hover không cần
// vì label + value hiện sẵn bên phải.
// =========================================================================
const HorizontalBarList = ({ data, formatter, color = COLOR_PRIMARY, emptyText }) => {
    if (!data || data.length === 0) {
        return <EmptyHint text={emptyText} />;
    }
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="d-flex flex-column gap-3">
            {data.map((row, idx) => {
                const pct = Math.max((row.value / max) * 100, 2); // tối thiểu 2% để vẫn nhìn thấy mảnh nhỏ
                return (
                    <div key={row.label + idx}>
                        <div className="d-flex justify-content-between align-items-baseline mb-1">
                            <span className="ai-bar-label">{row.label || '—'}</span>
                            <span className="ai-bar-value">{formatter ? formatter(row.value) : row.value}</span>
                        </div>
                        <div className="ai-bar-track">
                            <div
                                className="ai-bar-fill"
                                style={{
                                    width: `${pct}%`,
                                    background: `linear-gradient(90deg, ${color}, ${CHART_COLORS[(idx + 3) % CHART_COLORS.length]})`
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// =========================================================================
// CHART: DONUT (phân bố route / volume) — vẽ bằng SVG circle + stroke-dasharray
// =========================================================================
const DonutChart = ({ data, centerLabel, centerValue, emptyText }) => {
    const total = useMemo(() => data.reduce((acc, d) => acc + d.value, 0), [data]);
    if (!data || data.length === 0 || total === 0) {
        return <EmptyHint text={emptyText} />;
    }

    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    let cumulative = 0;

    return (
        <div className="d-flex flex-wrap align-items-center gap-4 justify-content-center">
            <svg width="160" height="160" viewBox="0 0 160 160" className="ai-donut">
                <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="18" />
                {data.map((slice, idx) => {
                    const fraction = slice.value / total;
                    const dash = fraction * circumference;
                    const offset = -cumulative * circumference;
                    cumulative += fraction;
                    return (
                        <circle
                            key={slice.label + idx}
                            cx="80"
                            cy="80"
                            r={radius}
                            fill="none"
                            stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                            strokeWidth="18"
                            strokeDasharray={`${dash} ${circumference - dash}`}
                            strokeDashoffset={offset}
                            transform="rotate(-90 80 80)"
                            style={{ transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease' }}
                        />
                    );
                })}
                <text x="80" y="74" textAnchor="middle" className="ai-donut-center-value">{centerValue}</text>
                <text x="80" y="94" textAnchor="middle" className="ai-donut-center-label">{centerLabel}</text>
            </svg>
            <div className="d-flex flex-column gap-2 flex-grow-1" style={{ minWidth: '160px' }}>
                {data.map((slice, idx) => (
                    <div key={slice.label + idx} className="d-flex align-items-center justify-content-between gap-2">
                        <div className="d-flex align-items-center gap-2">
                            <span className="ai-legend-dot" style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }} />
                            <span className="ai-bar-label">{slice.label || '—'}</span>
                        </div>
                        <span className="ai-bar-value">{slice.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// =========================================================================
// CHART: TOKEN TIME SERIES (daily) — area + line như SignupTrendChart
// =========================================================================
const TokenAreaChart = ({ series }) => {
    const [hovered, setHovered] = useState(null);

    if (!series || series.length === 0) {
        return <EmptyHint text="No token usage recorded in this window." />;
    }

    // Đảm bảo tăng dần theo ngày
    const sorted = [...series].sort((a, b) => new Date(a.date) - new Date(b.date));
    const maxValue = Math.max(...sorted.map(s => s.value || 0), 1);

    const svgWidth = 800;
    const svgHeight = 240;
    const padL = 56, padR = 20, padT = 20, padB = 40;
    const chartW = svgWidth - padL - padR;
    const chartH = svgHeight - padT - padB;

    const points = sorted.map((item, idx) => {
        const x = padL + (sorted.length === 1 ? chartW / 2 : (idx / (sorted.length - 1)) * chartW);
        const y = padT + chartH - ((item.value || 0) / maxValue) * chartH;
        return { x, y, date: item.date, value: item.value };
    });

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpX1 = prev.x + (curr.x - prev.x) / 3;
        const cpX2 = prev.x + (2 * (curr.x - prev.x)) / 3;
        linePath += ` C ${cpX1} ${prev.y}, ${cpX2} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`;

    // Nhãn trục X: tối đa ~6 nhãn
    const labelIdx = [];
    if (sorted.length > 1) {
        const step = Math.max(1, Math.floor(sorted.length / 5));
        for (let i = 0; i < sorted.length; i += step) labelIdx.push(i);
        if (!labelIdx.includes(sorted.length - 1)) labelIdx.push(sorted.length - 1);
    } else {
        labelIdx.push(0);
    }

    const fmtDate = (d) => {
        try {
            const dt = new Date(d);
            return `${dt.getDate()}/${dt.getMonth() + 1}`;
        } catch { return d; }
    };
    const fmtNum = (n) => new Intl.NumberFormat('en-US').format(Math.round(n));

    return (
        <div className="position-relative">
            <style>{`
                .ai-token-point { transition: r 0.2s, stroke-width 0.2s; cursor: pointer; }
                .ai-token-point:hover { r: 6; stroke-width: 3; }
                .ai-token-line { stroke-dasharray: 1500; stroke-dashoffset: 1500; animation: aiTokenDraw 1.6s forwards ease-in-out; }
                .ai-token-area { opacity: 0; animation: aiTokenFade 1s 0.7s forwards; }
                @keyframes aiTokenDraw { to { stroke-dashoffset: 0; } }
                @keyframes aiTokenFade { to { opacity: 1; } }

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
                    color: ${COLOR_PRIMARY} !important;
                }
            `}</style>

            {hovered && (
                <div
                    className="tooltip-box text-center"
                    style={{
                        left: `${(hovered.x / svgWidth) * 100}%`,
                        top: `${(hovered.y / svgHeight) * 100}%`
                    }}
                >
                    <div className="fw-semibold tooltip-date mb-0.5" style={{ fontSize: '10px' }}>
                        {new Date(hovered.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="fw-bold tooltip-value" style={{ fontSize: '13px' }}>
                        {fmtNum(hovered.value)} <span>tokens</span>
                    </div>
                </div>
            )}

            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" style={{ overflow: 'visible' }}>
                <defs>
                    <linearGradient id="aiTokenAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLOR_PRIMARY} stopOpacity="0.28" />
                        <stop offset="100%" stopColor={COLOR_PRIMARY} stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="aiTokenLineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={COLOR_PINK} />
                        <stop offset="100%" stopColor={COLOR_PRIMARY} />
                    </linearGradient>
                </defs>

                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = padT + chartH - ratio * chartH;
                    const val = Math.round(ratio * maxValue);
                    return (
                        <g key={idx} opacity="0.35">
                            <line x1={padL} y1={y} x2={svgWidth - padR} y2={y} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
                            <text x={padL - 10} y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">{fmtNum(val)}</text>
                        </g>
                    );
                })}

                <path d={areaPath} fill="url(#aiTokenAreaGrad)" className="ai-token-area" />
                <path d={linePath} fill="none" stroke="url(#aiTokenLineGrad)" strokeWidth="3" strokeLinecap="round" className="ai-token-line" />

                {labelIdx.map((idx) => {
                    const pt = points[idx];
                    if (!pt) return null;
                    return (
                        <text key={idx} x={pt.x} y={padT + chartH + 22} fill="var(--text-muted)" fontSize="10" textAnchor="middle">
                            {fmtDate(pt.date)}
                        </text>
                    );
                })}

                {points.map((pt, idx) => (
                    <circle
                        key={idx}
                        cx={pt.x}
                        cy={pt.y}
                        r="4"
                        fill="var(--bg-card-container)"
                        stroke={COLOR_PRIMARY}
                        strokeWidth="2"
                        className="ai-token-point"
                        onMouseEnter={() => setHovered(pt)}
                        onMouseLeave={() => setHovered(null)}
                    />
                ))}
            </svg>
        </div>
    );
};

// =========================================================================
// UI: Empty hint gọn gàng khi widget không có data
// =========================================================================
const EmptyHint = ({ text }) => (
    <div className="text-center text-muted py-4" style={{ fontSize: '13px' }}>
        <Info size={18} className="mb-2" style={{ opacity: 0.5 }} />
        <div>{text || 'No data available.'}</div>
    </div>
);

// =========================================================================
// UI: Banner trạng thái Langfuse (chưa config / không có data / error)
// =========================================================================
const StatusBanner = ({ variant, icon: Icon, title, children }) => {
    const palette = {
        warning: { bg: 'rgba(255, 189, 113, 0.15)', border: 'rgba(255, 189, 113, 0.4)', color: '#92400e' },
        danger: { bg: 'rgba(254, 103, 110, 0.12)', border: 'rgba(254, 103, 110, 0.4)', color: '#9f1239' },
        info: { bg: 'rgba(59, 130, 246, 0.10)', border: 'rgba(59, 130, 246, 0.35)', color: '#1e40af' }
    }[variant] || {};
    return (
        <div
            className="d-flex align-items-start gap-3 p-3 rounded-3 mb-4"
            style={{ background: palette.bg, border: `1px solid ${palette.border}`, color: palette.color }}
        >
            <Icon size={20} className="flex-shrink-0 mt-1" />
            <div>
                <div className="fw-semibold" style={{ fontSize: '14px' }}>{title}</div>
                <div style={{ fontSize: '13px', opacity: 0.85 }}>{children}</div>
            </div>
        </div>
    );
};

// =========================================================================
// PAGE CHÍNH
// =========================================================================

const fmtInt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0));
const fmtUSD = (n) => `$${(n || 0).toFixed(4)}`;
const fmtMs = (n) => `${Math.round(n || 0).toLocaleString('en-US')} ms`;
const fmtPct = (n) => `${((n || 0) * 100).toFixed(1)}%`;
const fmtTokens = (n) => {
    const v = Math.round(n || 0);
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
    return `${v}`;
};

export default function AiMetricsPage() {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Endpoint giờ là cache-only: server refresh cache 6x/ngày qua scheduler,
    // cửa sổ cố định 7 ngày → không còn chọn khoảng thời gian hay nút Refresh ở client.
    const fetchMetrics = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Session expired. Please login again.');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const res = await fetch(
                `${API_BASE_URL}/api/v1/admin/dashboard/ai-metrics`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) {
                throw new Error(`Failed to load AI metrics (${res.status})`);
            }

            const json = await res.json();
            if (json.success && json.data) {
                setData(json.data);
            } else {
                throw new Error(json.message || 'Failed to load AI metrics.');
            }
        } catch (err) {
            console.error('AI metrics error:', err);
            setError(err.message || 'An error occurred while loading AI metrics.');
            setData(null);
            toast.error(err.message || 'Failed to load AI metrics.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    // --- Trạng thái loading lần đầu ---------------------------------------
    if (isLoading && !data) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <div className="spinner-border" role="status" style={{ color: COLOR_PRIMARY }}>
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    const configured = data?.configured ?? false;
    const dataAvailable = data?.dataAvailable ?? false;
    const generatedAt = data?.generatedAt
        ? new Date(data.generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
        : '—';

    // Tính metric phụ
    const refusalTotal = (data?.refusalCount || []).reduce((a, r) => a + r.value, 0);
    const emptyRetrievalTotal = data?.emptyRetrievalCount || 0;
    const totalRequests = data?.totalRequests || 0;
    const emptyRetrievalRate = totalRequests > 0 ? emptyRetrievalTotal / totalRequests : 0;

    return (
        <div className="admin-dashboard-container py-5 px-4 px-md-5 text-start">
            <style>{`
                .back-link { color: #6c757d; font-size: 14px; transition: color 0.2s; }
                .back-link:hover { color: #FD8F52; }
                [data-theme='dark'] .back-link { color: var(--text-muted); }
                [data-theme='dark'] .back-link:hover { color: #FD8F52; }

                .admin-dashboard-container { font-family: 'Montserrat', 'Inter', system-ui, sans-serif; background-color: #fafbfe; min-height: calc(100vh - 80px); }
                .dashboard-title { font-size: 32px; font-weight: 700; color: ${COLOR_PINK}; margin-bottom: 4px; }
                .dashboard-subtitle { font-size: 14px; color: #6c757d; }
                .stat-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.12); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; height: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.02); transition: all 0.3s; }
                .stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(253,143,82,0.06); border-color: rgba(253,143,82,0.25); }
                .stat-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
                .icon-box { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                .stat-label { font-size: 13px; font-weight: 500; color: #6c757d; margin-bottom: 4px; }
                .stat-subtext { font-size: 11px; color: #868e96; }
                .content-card { background: #ffffff; border: 1px solid rgba(253,143,82,0.12); border-radius: 16px; height: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.02); overflow: hidden; }
                .content-card-header { padding: 18px 24px; background: #FFFBF9; border-bottom: 1px solid rgba(253,143,82,0.08); font-size: 15px; font-weight: 600; color: #212529; }
                .content-card-body { padding: 22px 24px; }

                .ai-bar-label { font-size: 13px; font-weight: 500; color: #2D3748; word-break: break-word; }
                .ai-bar-value { font-size: 13px; font-weight: 600; color: ${COLOR_PRIMARY}; white-space: nowrap; }
                .ai-bar-track { width: 100%; height: 8px; background: rgba(253,143,82,0.10); border-radius: 6px; overflow: hidden; }
                .ai-bar-fill { height: 100%; border-radius: 6px; transition: width 0.7s cubic-bezier(0.22,1,0.36,1); }

                .ai-donut-center-value { font-size: 22px; font-weight: 700; fill: #212529; }
                .ai-donut-center-label { font-size: 10px; font-weight: 500; fill: #868e96; }
                .ai-legend-dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }


                /* Dark mode */
                [data-theme='dark'] .admin-dashboard-container { background-color: var(--bg-global); }
                [data-theme='dark'] .stat-card { background: var(--bg-card-container); border-color: var(--border-color); }
                [data-theme='dark'] .stat-number { color: var(--text-main); }
                [data-theme='dark'] .stat-label { color: var(--text-muted); }
                [data-theme='dark'] .stat-subtext { color: var(--text-muted); }
                [data-theme='dark'] .content-card { background: var(--bg-card-container); border-color: var(--border-color); }
                [data-theme='dark'] .content-card-header { background: var(--bg-global); border-bottom-color: var(--border-color); color: var(--text-main); }
                [data-theme='dark'] .ai-bar-label { color: var(--text-main); }
                [data-theme='dark'] .ai-bar-track { background: rgba(255,255,255,0.06); }
                [data-theme='dark'] .ai-donut-center-value { fill: var(--text-main); }
                [data-theme='dark'] .ai-donut-center-label { fill: var(--text-muted); }
            `}</style>

            {/* Back to Home */}
            <div className="mb-4">
                <Link to="/admin/home" className="d-inline-flex align-items-center gap-2 text-decoration-none back-link fw-medium">
                    <ArrowLeft size={16} />
                    <span>Back to Dashboard</span>
                </Link>
            </div>

            {/* ------------------ HEADER ------------------ */}
            <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
                <div>
                    <h1 className="dashboard-title mb-1 d-flex align-items-center gap-2">
                        <Activity size={28} style={{ color: COLOR_PRIMARY }} />
                        AI Observability
                    </h1>
                    <p className="dashboard-subtitle mb-0">
                        RAG pipeline metrics from Langfuse · Generated {generatedAt}
                    </p>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <span
                        className="d-inline-flex align-items-center gap-2 rounded-pill px-3 py-2"
                        style={{
                            background: 'rgba(253,143,82,0.08)',
                            color: COLOR_PINK,
                            fontSize: '13px', fontWeight: '600',
                            border: '1px solid rgba(253,143,82,0.25)'
                        }}
                    >
                        <Clock size={15} />
                        Last 7 days · auto-refreshed
                    </span>
                </div>
            </div>

            {/* ------------------ STATUS BANNERS ------------------ */}
            {error && (
                <StatusBanner variant="danger" icon={AlertTriangle} title="Failed to load metrics">
                    {error}
                </StatusBanner>
            )}
            {!error && configured && !dataAvailable && (
                <StatusBanner variant="info" icon={Info} title="No trace data for this window">
                    Langfuse is configured but returned no observations in the selected range.
                    Try a wider window or confirm the RAG service is emitting traces.
                </StatusBanner>
            )}
            {!error && !configured && (
                <StatusBanner variant="warning" icon={ShieldAlert} title="Langfuse is not configured">
                    The backend has no Langfuse API keys set (<code>LANGFUSE_PUBLIC_KEY</code> / <code>LANGFUSE_SECRET_KEY</code>).
                    Add them to the API service environment to populate this dashboard.
                </StatusBanner>
            )}

            {/* ------------------ SUMMARY CARDS ------------------ */}
            <div className="row mb-2">
                <SummaryCard
                    icon={Zap}
                    value={fmtInt(totalRequests)}
                    label="Total Requests"
                    subtext="Trace count (SPAN) in window"
                    tint={{ backgroundColor: 'rgba(199,56,102,0.08)', color: COLOR_PINK }}
                />
                <SummaryCard
                    icon={Coins}
                    value={fmtTokens(data?.totalTokens || 0)}
                    label="Total Tokens"
                    subtext={`${fmtInt(data?.totalTokens || 0)} consumed`}
                    tint={{ backgroundColor: 'rgba(255,189,113,0.14)', color: '#FFBD71' }}
                />
                <SummaryCard
                    icon={DollarSign}
                    value={fmtUSD(data?.totalCost || 0)}
                    label="Total Cost"
                    subtext="Auto-priced by Langfuse"
                    tint={{ backgroundColor: 'rgba(16,185,129,0.10)', color: '#10B981' }}
                />
                <SummaryCard
                    icon={TrendingUp}
                    value={fmtPct(data?.citationCoverageAvg || 0)}
                    label="Citation Coverage"
                    subtext="Avg RAG QA quality score"
                    tint={{ backgroundColor: 'rgba(59,130,246,0.10)', color: '#3B82F6' }}
                />
            </div>

            {/* Secondary stats line */}
            <div className="d-flex flex-wrap gap-3 mb-4" style={{ fontSize: '13px' }}>
                <span className="d-inline-flex align-items-center gap-1 px-3 py-1 rounded-pill"
                    style={{ background: 'rgba(254,103,110,0.10)', color: '#9f1239' }}>
                    <ShieldAlert size={14} /> Refusals: <strong>{fmtInt(refusalTotal)}</strong>
                </span>
                <span className="d-inline-flex align-items-center gap-1 px-3 py-1 rounded-pill"
                    style={{ background: 'rgba(253,143,82,0.10)', color: COLOR_PRIMARY }}>
                    <Database size={14} /> Empty retrieval: <strong>{fmtInt(emptyRetrievalTotal)}</strong>
                    {totalRequests > 0 && <span className="opacity-75">({fmtPct(emptyRetrievalRate)})</span>}
                </span>
            </div>

            {/* ------------------ ROW: TOKEN TIME SERIES (full width) ------------------ */}
            <div className="row mb-4">
                <div className="col-12">
                    <WidgetCard title="Daily Token Usage" subtitle="Summed totalTokens per day" icon={BarChart3}>
                        <TokenAreaChart series={data?.tokenTimeSeries} />
                    </WidgetCard>
                </div>
            </div>

            {/* ------------------ ROW: LATENCY BY STAGE + ENDPOINT LATENCY ------------------ */}
            <div className="row mb-4">
                <div className="col-12 col-lg-6 mb-4">
                    <WidgetCard title="Latency p95 by Stage" subtitle="Pipeline observation name" icon={Clock}>
                        <HorizontalBarList
                            data={data?.latencyByStage}
                            formatter={fmtMs}
                            color={COLOR_PINK}
                            emptyText="No latency observations recorded."
                        />
                    </WidgetCard>
                </div>
                <div className="col-12 col-lg-6 mb-4">
                    <WidgetCard title="Endpoint Latency p95" subtitle="Per trace name (SPAN)" icon={Clock}>
                        <HorizontalBarList
                            data={data?.endpointLatency}
                            formatter={fmtMs}
                            color={COLOR_PRIMARY}
                            emptyText="No endpoint latency recorded."
                        />
                    </WidgetCard>
                </div>
            </div>

            {/* ------------------ ROW: REQUEST VOLUME + ROUTE DISTRIBUTION ------------------ */}
            <div className="row mb-4">
                <div className="col-12 col-lg-6 mb-4">
                    <WidgetCard title="Request Volume" subtitle="Count per trace name" icon={Layers}>
                        <HorizontalBarList
                            data={data?.requestVolume}
                            formatter={fmtInt}
                            color="#3B82F6"
                            emptyText="No requests recorded."
                        />
                    </WidgetCard>
                </div>
                <div className="col-12 col-lg-6 mb-4">
                    <WidgetCard title="Route Distribution" subtitle="Chat intent split (metadata.route)" icon={RouteIcon}>
                        <DonutChart
                            data={data?.routeDistribution}
                            centerLabel="routes"
                            centerValue={(data?.routeDistribution || []).filter(r => r.value > 0).length}
                            emptyText="No route metadata recorded."
                        />
                    </WidgetCard>
                </div>
            </div>

            {/* ------------------ ROW: TOKEN BY MODEL + COST BY MODEL ------------------ */}
            <div className="row mb-4">
                <div className="col-12 col-lg-6 mb-4">
                    <WidgetCard title="Token Usage by Model" subtitle="Summed totalTokens" icon={Coins}>
                        <HorizontalBarList
                            data={data?.tokenUsageByModel}
                            formatter={fmtInt}
                            color="#805AD5"
                            emptyText="No model usage recorded."
                        />
                    </WidgetCard>
                </div>
                <div className="col-12 col-lg-6 mb-4">
                    <WidgetCard title="Cost by Model" subtitle="USD, auto-priced" icon={DollarSign}>
                        <HorizontalBarList
                            data={data?.costByModel}
                            formatter={fmtUSD}
                            color="#10B981"
                            emptyText="No cost data recorded."
                        />
                    </WidgetCard>
                </div>
            </div>

            {/* ------------------ ROW: REFUSAL COUNT + EMPTY RETRIEVAL ------------------ */}
            <div className="row mb-5">
                <div className="col-12 col-lg-6 mb-4">
                    <WidgetCard title="Refusal Count" subtitle="metadata.refused=true per type" icon={ShieldAlert}>
                        <HorizontalBarList
                            data={data?.refusalCount}
                            formatter={fmtInt}
                            color={COLOR_PINK}
                            emptyText="No refusals recorded — healthy."
                        />
                    </WidgetCard>
                </div>
                <div className="col-12 col-lg-6 mb-4">
                    <WidgetCard title="Empty Retrieval by Endpoint" subtitle="metadata.empty_retrieval=true" icon={Database}>
                        <HorizontalBarList
                            data={data?.emptyRetrievalByEndpoint}
                            formatter={fmtInt}
                            color="#FE676E"
                            emptyText="No empty retrievals recorded — healthy."
                        />
                    </WidgetCard>
                </div>
            </div>
        </div>
    );
}

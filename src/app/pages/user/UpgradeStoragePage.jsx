import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Check, Crown, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../api.js';

export default function UpgradeStoragePage() {
    const { user } = useApp();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    // Khởi tạo state ban đầu đồng bộ cấu trúc object camelCase từ Swagger
    const [storageInfo, setStorageInfo] = useState({
        storageUsed: 0,
        storageLimit: 2 * 1024 * 1024 * 1024, // Mặc định 2 GB bằng Bytes cho gói Free
        planName: 'Free'
    });

    useEffect(() => {
        const fetchStorage = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/users/storage`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await response.json();

                // Đọc chính xác cấu trúc camelCase bọc trong result.data từ Swagger
                if (result.success && result.data) {
                    setStorageInfo({
                        storageUsed: result.data.storageUsed || 0,
                        storageLimit: result.data.storageLimit || 2 * 1024 * 1024 * 1024,
                        planName: result.data.planName || 'Free'
                    });
                }
            } catch (error) {
                console.error("Error fetching storage data:", error);
            }
        };
        fetchStorage();
    }, []);

    // Bóc tách biến dữ liệu camelCase
    const storageUsed = storageInfo.storageUsed;
    const storageLimit = storageInfo.storageLimit;
    const isPremium = storageInfo.planName?.toLowerCase().includes('premium');

    // Tính toán tỷ lệ phần trăm thực tế dựa trên đơn vị Bytes gốc để Progress hoạt động đúng
    const storagePercent = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;

    // HÀM QUY ĐỔI ĐƠN VỊ THÔNG MINH: Tự động hoán đổi MB và GB tránh lỗi làm tròn hiển thị 0.00 GB
    const formatBytes = (bytes) => {
        if (!bytes || isNaN(bytes)) return '0.00 MB';

        // Nếu dung lượng nhỏ hơn 1 GB (1024 * 1024 * 1024 Bytes), hiển thị đơn vị MB
        if (bytes < 1024 * 1024 * 1024) {
            const mb = bytes / (1024 * 1024);
            return `${mb.toFixed(2)} MB`;
        }

        // Nếu từ 1 GB trở lên, hiển thị đơn vị GB
        const gb = bytes / (1024 * 1024 * 1024);
        return `${gb.toFixed(2)} GB`;
    };

    // Hàm gọi API cổng thanh toán VNPay trực tiếp, loại bỏ hoàn toàn Modal trung gian
    const handleUpgradeAndPay = async (plan) => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error("Session expired. Please log in again.");
            return;
        }

        try {
            setIsProcessing(true);
            toast.loading(`Connecting to VNPay secure gateway...`);

            // Payload tinh gọn gửi duy nhất trường planId khớp 100% Swagger
            const paymentPayload = {
                planId: plan === 'premium' ? 2 : 1
            };

            const response = await fetch(`${API_BASE_URL}/api/v1/payments/create-payment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentPayload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Server returned status: ${response.status}`);
            }

            const result = await response.json();
            // Trích xuất chuỗi URL từ API VNPay
            const redirectUrl = result.data?.paymentUrl || result.paymentUrl;

            toast.dismiss();

            if (redirectUrl && typeof redirectUrl === 'string') {
                toast.success('Redirecting to VNPay Gateway...');
                // Điều hướng chạy thẳng trình duyệt sang trang nhập thông tin thẻ test của VNPay Sandbox
                window.location.href = redirectUrl;
            } else {
                toast.error('Payment link (paymentUrl) not found from Server.');
            }
        } catch (error) {
            console.error('Payment error:', error);
            toast.dismiss();
            toast.error(`Payment error: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const features = {
        free: [
            '2 GB Storage',
            'Unlimited document views',
            'Basic document search',
        ],
        premium: [
            '10 GB Storage',
            'Unlimited document views',
            'Advanced AI Chat features',
            'Priority document search',
            'Early access to new features',
        ],
    };

    return (
        <div className="container-fluid py-4 px-4 px-md-5 text-start">
            <div className="mb-4">
                <Link to="/user/home" className="d-inline-flex align-items-center gap-2 text-decoration-none text-muted" style={{ fontSize: '14px' }}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="fw-medium">Back to Homepage</span>
                </Link>
            </div>

            <div className="mx-auto" style={{ maxWidth: '1000px' }}>
                <div className="mb-5 text-center">
                    <h1 className="fw-bold text-dark mb-1" style={{ fontSize: '32px' }}>Upgrade Your Storage</h1>
                    <p className="text-muted">Get more space and premium features</p>
                </div>

                {user && (
                    <div className="card shadow-sm border-0 mb-5" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                        <div className="card-body p-4 text-start">
                            <h5 className="fw-bold text-dark mb-1">Current Storage Usage</h5>
                            <p className="text-muted mb-4" style={{ fontSize: '14px' }}>
                                You're using {storagePercent.toFixed(1)}% of your available storage
                            </p>

                            <div className="text-start">
                                <div className="d-flex justify-content-between text-muted mb-2" style={{ fontSize: '14px' }}>
                                    {/* Hiển thị chuỗi format động theo MB/GB chuẩn chỉ */}
                                    <span>
                                        {formatBytes(storageUsed)} / {formatBytes(storageLimit)}
                                    </span>
                                    <span className="fw-bold text-dark">{storagePercent.toFixed(1)}%</span>
                                </div>
                                <div className="progress" style={{ height: '12px', borderRadius: '6px' }}>
                                    <div
                                        className="progress-bar progress-bar-striped progress-bar-animated"
                                        role="progressbar"
                                        style={{ width: `${Math.min(100, storagePercent)}%`, background: 'linear-gradient(to right, #C73866, #FD8F52)' }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="row g-4 mb-5">
                    {/* Free Plan */}
                    <div className="col-12 col-md-6">
                        <div
                            className="card shadow-sm border-0 h-100 p-4"
                            style={{
                                borderRadius: '1.25rem',
                                border: !isPremium ? '1px solid rgba(253, 143, 82, 0.3)' : '1px solid rgba(0,0,0,0.05)',
                            }}
                        >
                            <div className="card-body p-0 d-flex flex-column justify-content-between text-start">
                                <div>
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <h3 className="fw-bold text-dark mb-0">Free Plan</h3>
                                        {!isPremium && (
                                            <span className="badge bg-secondary px-2.5 py-1.5" style={{ fontSize: '11px' }}>
                                                Current Plan
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-muted mb-4" style={{ fontSize: '14px' }}>Perfect for casual users</p>
                                    <div className="mb-4">
                                        <span className="text-dark fw-bold display-5">0 VND</span>
                                        <span className="text-muted">/month</span>
                                    </div>

                                    <ul className="list-unstyled d-flex flex-column gap-3 mb-5">
                                        {features.free.map((feature, index) => (
                                            <li key={index} className="d-flex align-items-start gap-2">
                                                <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                                                <span className="text-muted-dark" style={{ fontSize: '14px' }}>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <button className="btn btn-outline-secondary w-100 py-2.5 fw-bold" disabled={!isPremium}>
                                    {isPremium ? 'Downgrade' : 'Current Plan'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Premium Plan */}
                    <div className="col-12 col-md-6">
                        <div
                            className="card shadow-lg border-0 h-100 p-4 position-relative"
                            style={{
                                borderRadius: '1.25rem',
                                border: '2px solid #FD8F52',
                            }}
                        >
                            <div className="position-absolute top-0 start-50 translate-middle">
                                <span
                                    className="badge text-white px-3 py-2 border-0 d-flex align-items-center gap-1 shadow-sm"
                                    style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)', fontSize: '12px', borderRadius: '20px' }}
                                >
                                    <Crown className="h-3 w-3" />
                                    Most Popular
                                </span>
                            </div>

                            <div className="card-body p-0 d-flex flex-column justify-content-between text-start mt-2">
                                <div>
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <h3 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                                            <Crown className="h-6 w-6 text-warning" />
                                            Premium Plan
                                        </h3>
                                        {isPremium && (
                                            <span className="badge bg-success px-2.5 py-1.5" style={{ fontSize: '11px' }}>
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-muted mb-4" style={{ fontSize: '14px' }}>For power users and professionals</p>
                                    <div className="mb-4">
                                        <span className="text-dark fw-bold display-5">50.000 VND</span>
                                        <span className="text-muted">/1 month</span>
                                    </div>

                                    <ul className="list-unstyled d-flex flex-column gap-3 mb-5">
                                        {features.premium.map((feature, index) => (
                                            <li key={index} className="d-flex align-items-start gap-2">
                                                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                                <span className="text-muted-dark" style={{ fontSize: '14px' }}>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <button
                                    className="btn text-white w-100 py-2.5 fw-bold border-0 d-flex align-items-center justify-content-center gap-2"
                                    style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                                    onClick={() => handleUpgradeAndPay('premium')}
                                    disabled={isPremium || isProcessing}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing...
                                        </>
                                    ) : isPremium ? (
                                        'Current Plan'
                                    ) : (
                                        'Upgrade Now'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, XCircle, Calendar, CreditCard, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../api.js';

export default function PaymentSuccessPage() {
    const { setUser, refetchStorage } = useApp();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [isSyncing, setIsSyncing] = useState(false);

    // Extract VNPay callback query parameters
    const responseCode = searchParams.get('vnp_ResponseCode');
    const amountStr = searchParams.get('vnp_Amount');
    const transactionNo = searchParams.get('vnp_TransactionNo');
    const txnRef = searchParams.get('vnp_TxnRef');
    const payDateStr = searchParams.get('vnp_PayDate');
    const orderInfo = searchParams.get('vnp_OrderInfo');
    const bankCode = searchParams.get('vnp_BankCode');

    // If responseCode is present, check if it's '00' (success). 
    // If not present (e.g. static access), default to success.
    const isSuccess = responseCode ? responseCode === '00' : true;

    // Helper to format VNPay amount (VNPay amount is multiplied by 100)
    const formatAmount = (amountVal) => {
        if (!amountVal) return '50.000 VND';
        const num = parseFloat(amountVal) / 100;
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
    };

    // Helper to format VNPay PayDate (YYYYMMDDHHmmss -> DD/MM/YYYY HH:mm:ss)
    const formatDate = (dateStr) => {
        if (!dateStr || dateStr.length < 14) {
            return new Date().toLocaleString('vi-VN');
        }
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = dateStr.substring(8, 10);
        const minute = dateStr.substring(10, 12);
        const second = dateStr.substring(12, 14);
        return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
    };

    const hasSynced = useRef(false);

    // Auto update user profile & storage context upon success
    useEffect(() => {
        if (isSuccess && !hasSynced.current) {
            hasSynced.current = true;
            const syncAccountData = async () => {
                const token = localStorage.getItem('token');
                if (!token) return;

                try {
                    setIsSyncing(true);

                    // Fetch profile to get updated plan/role
                    const response = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (response.ok) {
                        const result = await response.json();
                        if (result.success && result.data) {
                            setUser(result.data);
                        }
                    }

                    // Refetch storage info to update the progress bar/capacity
                    refetchStorage();
                    toast.success("Storage limits and premium account features updated!");
                } catch (error) {
                    console.error("Error syncing profile data after payment:", error);
                } finally {
                    setIsSyncing(false);
                }
            };

            syncAccountData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSuccess]);

    return (
        <div className="container py-5 text-start" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
            <div className="mx-auto w-100" style={{ maxWidth: '550px' }}>


                <div className="card shadow border-0 overflow-hidden" style={{ borderRadius: '1.25rem' }}>
                    {/* Top gradient accent line */}
                    <div style={{ height: '6px', background: isSuccess ? 'linear-gradient(to right, #C73866, #FD8F52)' : 'linear-gradient(to right, #dc3545, #f8d7da)' }}></div>

                    <div className="card-body p-4 p-md-5 text-center">
                        {/* Status Icon */}
                        <div className="mb-4 d-flex justify-content-center">
                            {isSuccess ? (
                                <div className="position-relative d-inline-block">
                                    <div className="position-absolute translate-middle top-50 start-50 rounded-circle animate-ping-custom"
                                        style={{
                                            width: '80px',
                                            height: '80px',
                                            backgroundColor: 'rgba(253, 143, 82, 0.15)',
                                            zIndex: 0
                                        }}></div>
                                    <CheckCircle2 className="h-16 w-16 text-success position-relative" style={{ zIndex: 1, width: '64px', height: '64px' }} />
                                </div>
                            ) : (
                                <XCircle className="h-16 w-16 text-danger" style={{ width: '64px', height: '64px' }} />
                            )}
                        </div>

                        {/* Title & Description */}
                        <h2 className="fw-bold text-dark mb-2" style={{ fontSize: '26px' }}>
                            {isSuccess ? 'Payment Successful!' : 'Payment Unsuccessful'}
                        </h2>
                        <p className="text-muted mb-4" style={{ fontSize: '15px' }}>
                            {isSuccess
                                ? "Thank you for upgrading! Your subscription is active, and storage limits have been extended."
                                : "The transaction was canceled or did not complete. No funds were debited."
                            }
                        </p>

                        {/* Syncing loader */}
                        {isSyncing && (
                            <div className="d-flex align-items-center justify-content-center gap-2 mb-4 text-primary bg-light py-2 px-3 rounded" style={{ fontSize: '14px' }}>
                                <Loader2 className="animate-spin" size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                <span>Syncing account details...</span>
                            </div>
                        )}

                        {/* Transaction Detail Box */}
                        <div className="text-start bg-light p-4 rounded-3 border mb-4" style={{ fontSize: '14px' }}>
                            <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">Transaction Summary</h6>

                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">Payment For:</span>
                                <span className="fw-semibold text-dark">{orderInfo || 'Upgrade Premium Storage'}</span>
                            </div>

                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">Amount:</span>
                                <span className="fw-bold text-dark">{formatAmount(amountStr)}</span>
                            </div>

                            {txnRef && (
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">Ref ID / Order ID:</span>
                                    <span className="fw-semibold text-dark">{txnRef}</span>
                                </div>
                            )}

                            {transactionNo && (
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">VNPay Trans No:</span>
                                    <span className="text-dark font-monospace">{transactionNo}</span>
                                </div>
                            )}

                            {bankCode && (
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">Bank/Gateway:</span>
                                    <span className="fw-semibold text-dark">{bankCode}</span>
                                </div>
                            )}

                            <div className="d-flex justify-content-between">
                                <span className="text-muted">Date & Time:</span>
                                <span className="text-dark">{formatDate(payDateStr)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="d-flex flex-column gap-2">
                            <Link
                                to="/upgrade"
                                className="btn text-white w-100 py-2.5 fw-bold border-0"
                                style={{ background: isSuccess ? 'linear-gradient(135deg, #C73866, #FD8F52)' : '#495057' }}
                            >
                                Back to Upgrades
                            </Link>

                            <Link
                                to="/user/home"
                                className="btn btn-outline-secondary w-100 py-2.5 fw-semibold"
                            >
                                Go to Homepage
                            </Link>
                        </div>
                    </div>
                </div>

                {/* CSS keyframe animations injection */}
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes ping-custom {
                        0% {
                            transform: translate(-50%, -50%) scale(1);
                            opacity: 1;
                        }
                        75%, 100% {
                            transform: translate(-50%, -50%) scale(1.6);
                            opacity: 0;
                        }
                    }
                    .animate-ping-custom {
                        animation: ping-custom 2s cubic-bezier(0, 0, 0.2, 1) infinite;
                    }
                `}</style>
            </div>
        </div>
    );
}

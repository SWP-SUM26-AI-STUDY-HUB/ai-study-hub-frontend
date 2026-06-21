import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Modal } from 'react-bootstrap';
import { Check, Crown, Zap, Shield, Cloud, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function UpgradeStoragePage() {
    const { user } = useApp();
    const navigate = useNavigate();
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('premium');

    const storagePercent = user ? (user.storageUsed / user.storageLimit) * 100 : 0;

    const formatBytes = (bytes) => {
        const gb = bytes / (1024 * 1024 * 1024);
        return `${gb.toFixed(2)} GB`;
    };

    const handleUpgrade = (plan) => {
        setSelectedPlan(plan);
        setShowPaymentDialog(true);
    };

    const handlePayment = (method) => {
        toast.success(`Payment with ${method} initiated! (Demo mode)`);
        setShowPaymentDialog(false);
    };

    const features = {
        free: [
            '2 GB Storage',
            'Unlimited document views',
            'AI Chat with documents',
            'Basic document search',
            'Email support',
        ],
        premium: [
            '5 GB Storage',
            'Unlimited document views',
            'Advanced AI Chat features',
            'Priority document search',
            'Advanced analytics',
            'Priority email support',
            'Early access to new features',
            'Ad-free experience',
        ],
    };

    return (
        <div className="container-fluid py-4 px-4 px-md-5 text-start">
            {/* NÚT QUAY VỀ TRANG CHỦ USER */}
            <div className="mb-4">
                <Link
                    to="/user/home"
                    className="d-inline-flex align-items-center gap-2 text-decoration-none text-muted"
                    style={{ fontSize: '14px' }}
                >
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
                                You're using {storagePercent.toFixed(0)}% of your available storage
                            </p>

                            <div className="text-start">
                                <div className="d-flex justify-content-between text-muted mb-2" style={{ fontSize: '14px' }}>
                                    <span>
                                        {formatBytes(user.storageUsed)} of {formatBytes(user.storageLimit)} used
                                    </span>
                                    <span className="fw-bold">{storagePercent.toFixed(0)}%</span>
                                </div>
                                <div className="progress" style={{ height: '12px', borderRadius: '6px' }}>
                                    <div
                                        className="progress-bar progress-bar-striped progress-bar-animated bg-warning"
                                        role="progressbar"
                                        style={{ width: `${storagePercent}%`, background: 'linear-gradient(to right, #C73866, #FD8F52)' }}
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
                                border: !user?.isPremium ? '1px solid rgba(253, 143, 82, 0.3)' : '1px solid rgba(0,0,0,0.05)',
                            }}
                        >
                            <div className="card-body p-0 d-flex flex-column justify-content-between text-start">
                                <div>
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <h3 className="fw-bold text-dark mb-0">Free Plan</h3>
                                        {!user?.isPremium && (
                                            <span className="badge bg-secondary px-2.5 py-1.5" style={{ fontSize: '11px' }}>
                                                Current Plan
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-muted mb-4" style={{ fontSize: '14px' }}>Perfect for casual users</p>
                                    <div className="mb-4">
                                        <span className="text-dark fw-bold display-5">$0</span>
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

                                <button className="btn btn-outline-secondary w-100 py-2.5 fw-bold" disabled={!user?.isPremium}>
                                    {user?.isPremium ? 'Downgrade' : 'Current Plan'}
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
                                        {user?.isPremium && (
                                            <span className="badge bg-success px-2.5 py-1.5" style={{ fontSize: '11px' }}>
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-muted mb-4" style={{ fontSize: '14px' }}>For power users and professionals</p>
                                    <div className="mb-4">
                                        <span className="text-dark fw-bold display-5">$4.99</span>
                                        <span className="text-muted">/month</span>
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
                                    className="btn text-white w-100 py-2.5 fw-bold border-0"
                                    style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                                    onClick={() => handleUpgrade('premium')}
                                    disabled={user?.isPremium}
                                >
                                    {user?.isPremium ? 'Current Plan' : 'Upgrade Now'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Method Modal */}
            <Modal show={showPaymentDialog} onHide={() => setShowPaymentDialog(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold" style={{ fontSize: '18px' }}>Select Payment Method</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <p className="text-muted mb-4" style={{ fontSize: '14px' }}>
                        Choose your preferred payment method to upgrade to Premium
                    </p>

                    <div className="d-flex flex-column gap-3">
                        <button
                            className="btn btn-outline-secondary w-100 p-3 text-start d-flex align-items-center gap-3"
                            style={{ borderRadius: '0.75rem', minHeight: '64px' }}
                            onClick={() => handlePayment('VNPay')}
                        >
                            <div
                                className="rounded d-flex align-items-center justify-content-center fw-bold text-primary flex-shrink-0"
                                style={{ width: '40px', height: '40px', backgroundColor: '#E8F0FE', fontSize: '16px' }}
                            >
                                VP
                            </div>
                            <div className="text-start">
                                <h6 className="mb-0 fw-bold text-dark">VNPay</h6>
                                <small className="text-muted" style={{ fontSize: '11px' }}>Vietnam's leading payment gateway</small>
                            </div>
                        </button>

                        <button
                            className="btn btn-outline-secondary w-100 p-3 text-start d-flex align-items-center gap-3"
                            style={{ borderRadius: '0.75rem', minHeight: '64px' }}
                            onClick={() => handlePayment('MoMo')}
                        >
                            <div
                                className="rounded d-flex align-items-center justify-content-center fw-bold text-danger flex-shrink-0"
                                style={{ width: '40px', height: '40px', backgroundColor: '#FCE8E6', fontSize: '16px' }}
                            >
                                M
                            </div>
                            <div className="text-start">
                                <h6 className="mb-0 fw-bold text-dark">MoMo</h6>
                                <small className="text-muted" style={{ fontSize: '11px' }}>Fast and secure mobile payment</small>
                            </div>
                        </button>
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    );
}

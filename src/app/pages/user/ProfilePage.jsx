import { Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { mockDocuments } from '../../data/mockData';
import { ArrowLeft, Crown, Check } from 'lucide-react';

export default function ProfilePage() {
    const { user } = useApp();

    const uploadedDocsCount = user
        ? mockDocuments.filter((doc) => doc.authorId === user.id).length
        : 0;

    const storagePercent = user ? (user.storageUsed / user.storageLimit) * 100 : 0;

    const formatBytes = (bytes) => {
        if (bytes === undefined || bytes === null)
            return '0.00 GB';
        const gb = bytes / (1024 * 1024 * 1024);
        return `${gb.toFixed(2)} GB`;
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

            <div className="mx-auto" style={{ maxWidth: '900px' }}>
                {/* HEADER SECTION WITH USER INITIAL AND TITLE */}
                <div className="d-flex align-items-center gap-3 mb-4 text-start">
                    <div
                        className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm"
                        style={{
                            width: '56px',
                            height: '56px',
                            fontSize: '22px',
                            background: 'linear-gradient(135deg, #C73866, #FD8F52)'
                        }}
                    >
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <h2 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>INFORMATION ACCOUNT</h2>
                        <div className="d-flex align-items-center gap-2 mt-1">
                            {user?.isPremium ? (
                                <span
                                    className="badge px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1 shadow-sm text-white"
                                    style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)', borderRadius: '20px', fontSize: '11px' }}
                                >
                                    <Crown className="h-3.5 w-3.5 text-warning" />
                                    Premium Member
                                </span>
                            ) : (
                                <span
                                    className="badge px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1 shadow-sm text-secondary bg-secondary-subtle"
                                    style={{ borderRadius: '20px', fontSize: '11px' }}
                                >
                                    Free Member
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="row g-4 text-start">
                    {/* CỘT TRÁI: THÔNG TIN CARD */}
                    <div className="col-12 col-md-7">
                        <div className="card shadow-sm border-0 h-100" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                            <div className="card-body p-4">
                                <h4 className="fw-bold text-dark mb-4" style={{ fontSize: '20px' }}>Information</h4>

                                {/* Họ tên */}
                                <div className="mb-4">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <span className="fw-semibold text-muted" style={{ fontSize: '14px' }}>Full Name</span>
                                        <Link to="/profile/edit" className="text-decoration-underline text-muted fw-medium" style={{ fontSize: '14px' }}>Edit</Link>
                                    </div>
                                    <div className="fw-bold text-dark" style={{ fontSize: '16px' }}>
                                        {user?.name || 'Not set'}
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="mb-4">
                                    <span className="fw-semibold text-muted d-block mb-1" style={{ fontSize: '14px' }}>Email</span>
                                    <div className="fw-bold text-dark d-inline-flex align-items-center gap-2" style={{ fontSize: '16px' }}>
                                        {user?.email || 'Not set'}
                                        <span
                                            className="d-inline-flex align-items-center justify-content-center bg-success-subtle rounded-circle"
                                            style={{ width: '18px', height: '18px' }}
                                        >
                                            <Check className="text-success" style={{ width: '12px', height: '12px', strokeWidth: '3px' }} />
                                        </span>
                                    </div>
                                </div>

                                {/* Bio */}
                                <div className="mb-4">
                                    <span className="fw-semibold text-muted d-block mb-1" style={{ fontSize: '14px' }}>Bio</span>
                                    <div className="fw-bold text-dark" style={{ fontSize: '16px' }}>
                                        {user?.bio || 'Not set'}
                                    </div>
                                </div>

                                {/* Mật khẩu */}
                                <div className="mb-2">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <span className="fw-semibold text-muted" style={{ fontSize: '14px' }}>Password</span>
                                        <Link to="/profile/edit" className="text-decoration-underline text-muted fw-medium" style={{ fontSize: '14px' }}>Edit</Link>
                                    </div>
                                    <div className="fw-bold text-dark" style={{ fontSize: '16px' }}>
                                        ********
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* CỘT PHẢI: STORAGE VÀ HOẠT ĐỘNG */}
                    <div className="col-12 col-md-5 d-flex flex-column gap-4">
                        {/* CARD 1: CURRENT STORAGE USAGE */}
                        <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                            <div className="card-body p-4">
                                <h4 className="fw-bold text-dark mb-1" style={{ fontSize: '20px' }}>Current Storage Usage</h4>
                                <p className="text-muted mb-4" style={{ fontSize: '14px' }}>
                                    You're using {storagePercent.toFixed(0)}% of your available storage
                                </p>

                                <div className="d-flex justify-content-between text-muted mb-2" style={{ fontSize: '14px' }}>
                                    <span>
                                        {formatBytes(user?.storageUsed)} of {formatBytes(user?.storageLimit)} used
                                    </span>
                                    <span className="fw-bold text-dark">{storagePercent.toFixed(0)}%</span>
                                </div>

                                <div className="progress mb-2" style={{ height: '12px', borderRadius: '6px' }}>
                                    <div
                                        className="progress-bar progress-bar-striped progress-bar-animated"
                                        role="progressbar"
                                        style={{
                                            width: `${storagePercent}%`,
                                            background: 'linear-gradient(to right, #C73866, #FD8F52)',
                                            borderRadius: '6px'
                                        }}
                                    ></div>
                                </div>

                                {!user?.isPremium && (
                                    <div className="mt-3 pt-3 border-top text-start">
                                        <Link
                                            to="/upgrade"
                                            className="text-decoration-none fw-bold d-inline-flex align-items-center gap-1"
                                            style={{ color: '#C73866', fontSize: '13px' }}
                                        >
                                            <span> Upgrade premium to explore →</span>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CARD 2: HOẠT ĐỘNG */}
                        <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                            <div className="card-body p-4">
                                <h4 className="fw-bold text-dark mb-3" style={{ fontSize: '20px' }}>Activity:</h4>

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <span className="text-muted-dark fw-medium">
                                        Uploaded documents: <strong className="text-dark fw-bold">{uploadedDocsCount}</strong>
                                    </span>
                                    <Link to="/my-documents" className="text-decoration-underline text-muted fw-semibold" style={{ fontSize: '14px' }}>Details</Link>
                                </div>

                                <div className="text-start">
                                    <span className="text-muted-dark fw-medium">
                                        Download attempts: <strong className="text-dark fw-bold">{user?.isPremium ? 'Unlimited' : '0'}</strong> remaining
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

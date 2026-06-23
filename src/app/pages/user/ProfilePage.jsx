import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, Crown, Check } from 'lucide-react';

export default function ProfilePage() {
    const { user } = useApp();
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState({ uploadedDocs: 0, storageUsed: 0, storageLimit: 0 });

    // 1. Gọi API lấy thông tin Profile thực tế
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch('http://14.225.254.145:8080/api/v1/users/profile', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const result = await response.json();
                if (result.success) setProfile(result.data);
            } catch (error) { console.error("Error fetching profile:", error); }
        };

        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const [storageRes, docsRes] = await Promise.all([
                    fetch('http://14.225.254.145:8080/api/v1/users/storage', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(e => null),
                    fetch(`http://14.225.254.145:8080/api/v1/documents/personal?authorId=${user?.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(e => null)
                ]);

                let storageData = null;
                let docsCount = 0;

                if (storageRes && storageRes.ok) {
                    const storageResult = await storageRes.json();
                    if (storageResult.success && storageResult.data) {
                        storageData = storageResult.data;
                    }
                }

                if (docsRes && docsRes.ok) {
                    const docsResult = await docsRes.json();
                    if (docsResult.success && Array.isArray(docsResult.data)) {
                        docsCount = docsResult.data.length;
                    }
                }

                const isPremium = storageData ? storageData.planName?.toLowerCase().includes('premium') : false;
                setStats({
                    uploadedDocs: docsCount,
                    storageUsed: storageData ? storageData.storageUsed : 0,
                    storageLimit: isPremium ? (storageData ? storageData.storageLimit : 5 * 1024 * 1024 * 1024) : (2 * 1024 * 1024 * 1024)
                });
            } catch (error) { 
                console.error("Error calculating stats:", error); 
            }
        };

        if (user) {
            fetchProfile();
            fetchStats();
        }
    }, [user]);

    const storagePercent = stats.storageLimit > 0 ? (stats.storageUsed / stats.storageLimit) * 100 : 0;

    const formatBytes = (bytes) => {
        if (!bytes) return '0.00 GB';
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    return (
        <div className="container-fluid py-4 px-4 px-md-5 text-start">
            <div className="mb-4">
                <Link to="/user/home" className="d-inline-flex align-items-center gap-2 text-decoration-none text-muted" style={{ fontSize: '14px' }}>
                    <ArrowLeft className="h-4 w-4" /> <span className="fw-medium">Back to Homepage</span>
                </Link>
            </div>

            <div className="mx-auto" style={{ maxWidth: '900px' }}>
                <div className="d-flex align-items-center gap-3 mb-4">
                    <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm" style={{ width: '56px', height: '56px', fontSize: '22px', background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}>
                        {profile?.fullName?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <h2 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>INFORMATION ACCOUNT</h2>
                        <span className="badge px-3 py-1.5 fw-semibold text-secondary bg-secondary-subtle" style={{ borderRadius: '20px', fontSize: '11px' }}>
                            {profile?.status || 'Member'}
                        </span>
                    </div>
                </div>

                <div className="row g-4 text-start">
                    {/* CỘT TRÁI */}
                    <div className="col-12 col-md-7">
                        <div className="card shadow-sm border-0 h-100" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                            <div className="card-body p-4">
                                <h4 className="fw-bold text-dark mb-4" style={{ fontSize: '20px' }}>Information</h4>
                                
                                <div className="mb-4">
                                    <div className="d-flex justify-content-between mb-1"><span className="fw-semibold text-muted" style={{ fontSize: '14px' }}>Full Name</span><Link to="/profile/edit" className="text-decoration-underline text-muted" style={{ fontSize: '14px' }}>Edit</Link></div>
                                    <div className="fw-bold text-dark" style={{ fontSize: '16px' }}>{profile?.fullName || 'Not set'}</div>
                                </div>

                                <div className="mb-4">
                                    <span className="fw-semibold text-muted d-block mb-1" style={{ fontSize: '14px' }}>Email</span>
                                    <div className="fw-bold text-dark">{profile?.email || 'Not set'} <Check className="text-success" size={14} /></div>
                                </div>

                                <div className="mb-0">
                                    <span className="fw-semibold text-muted d-block mb-1" style={{ fontSize: '14px' }}>Bio</span>
                                    <div className="fw-bold text-dark">{profile?.bio || 'Not set'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CỘT PHẢI */}
                    <div className="col-12 col-md-5 d-flex flex-column gap-4">
                        <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                            <div className="card-body p-4">
                                <h4 className="fw-bold text-dark mb-1" style={{ fontSize: '20px' }}>Storage Usage</h4>
                                <div className="d-flex justify-content-between text-muted mb-2" style={{ fontSize: '14px' }}>
                                    <span>{formatBytes(stats.storageUsed)} / {formatBytes(stats.storageLimit)}</span>
                                </div>
                                <div className="progress" style={{ height: '12px', borderRadius: '6px' }}>
                                    <div className="progress-bar" style={{ width: `${storagePercent}%`, background: '#FD8F52' }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                            <div className="card-body p-4">
                                <h4 className="fw-bold text-dark mb-3" style={{ fontSize: '20px' }}>Activity:</h4>
                                <p className="text-muted-dark fw-medium">Uploaded documents: <strong className="text-dark fw-bold">{stats.uploadedDocs}</strong></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
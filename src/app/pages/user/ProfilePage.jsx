import { useState } from 'react';
import { Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import { User, Mail, FileText, Lock, ArrowLeft } from 'lucide-react';

export default function ProfilePage() {
    const { user, updateProfile } = useApp();
    const [name, setName] = useState(user?.name || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleUpdateProfile = (e) => {
        e.preventDefault();
        updateProfile({ name, bio });
        toast.success('Profile updated successfully!');
    };

    const handleUpdatePassword = (e) => {
        e.preventDefault();

        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error('Please fill in all password fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        toast.success('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
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

            <div className="mx-auto" style={{ maxWidth: '800px' }}>
                <div className="mb-4">
                    <h1 className="fw-bold text-dark mb-1" style={{ fontSize: '28px' }}>Profile Settings</h1>
                    <p className="text-muted">Manage your account information and preferences</p>
                </div>

                <div className="d-flex flex-column gap-4">
                    {/* Profile Information Card */}
                    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                        <div className="card-body p-4">
                            <h4 className="card-title fw-bold text-dark mb-1">Profile Information</h4>
                            <p className="text-muted mb-4" style={{ fontSize: '14px' }}>Update your personal details</p>

                            <form onSubmit={handleUpdateProfile}>
                                <div className="d-flex align-items-center gap-4 mb-4">
                                    <div
                                        className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-warning-emphasis bg-warning-subtle"
                                        style={{ width: '96px', height: '96px', fontSize: '32px' }}
                                    >
                                        {user?.name
                                            ?.split(' ')
                                            .map((n) => n[0])
                                            .join('')
                                            .toUpperCase()
                                            .substring(0, 2) || 'U'}
                                    </div>
                                    <div className="text-start">
                                        <button type="button" className="btn btn-sm btn-outline-secondary py-2 px-3 fw-semibold">
                                            Change Avatar
                                        </button>
                                        <p className="text-muted mt-2 mb-0" style={{ fontSize: '12px' }}>
                                            JPG, PNG or GIF. Max size 2MB.
                                        </p>
                                    </div>
                                </div>

                                <hr className="my-4 text-muted" />

                                <div className="row g-3 mb-4">
                                    <div className="col-12 col-md-6 text-start">
                                        <label htmlFor="name" className="form-label fw-semibold text-dark">
                                            <User className="h-4 w-4 inline mr-2 text-muted" />
                                            Full Name
                                        </label>
                                        <input
                                            id="name"
                                            type="text"
                                            className="form-control"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="col-12 col-md-6 text-start">
                                        <label htmlFor="email" className="form-label fw-semibold text-dark">
                                            <Mail className="h-4 w-4 inline mr-2 text-muted" />
                                            Email Address
                                        </label>
                                        <input
                                            id="email"
                                            type="email"
                                            className="form-control"
                                            value={user?.email}
                                            disabled
                                        />
                                    </div>

                                    <div className="col-12 text-start">
                                        <label htmlFor="bio" className="form-label fw-semibold text-dark">
                                            <FileText className="h-4 w-4 inline mr-2 text-muted" />
                                            Bio
                                        </label>
                                        <textarea
                                            id="bio"
                                            className="form-control"
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            placeholder="Tell us about yourself..."
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="btn text-white px-4 py-2 border-0 fw-bold"
                                    style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                                >
                                    Save Changes
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Change Password Card */}
                    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                        <div className="card-body p-4">
                            <h4 className="card-title fw-bold text-dark d-flex align-items-center gap-2 mb-1">
                                <Lock className="h-5 w-5 text-muted" />
                                Change Password
                            </h4>
                            <p className="text-muted mb-4" style={{ fontSize: '14px' }}>Update your password to keep your account secure</p>

                            <form onSubmit={handleUpdatePassword} className="d-flex flex-column gap-3">
                                <div className="text-start">
                                    <label htmlFor="currentPassword" className="form-label fw-semibold text-dark">Current Password</label>
                                    <input
                                        id="currentPassword"
                                        type="password"
                                        className="form-control"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                    />
                                </div>

                                <div className="text-start">
                                    <label htmlFor="newPassword" className="form-label fw-semibold text-dark">New Password</label>
                                    <input
                                        id="newPassword"
                                        type="password"
                                        className="form-control"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                </div>

                                <div className="text-start">
                                    <label htmlFor="confirmPassword" className="form-label fw-semibold text-dark">Confirm New Password</label>
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        className="form-control"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn text-white px-4 py-2 border-0 fw-bold align-self-start mt-2"
                                    style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                                >
                                    Update Password
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

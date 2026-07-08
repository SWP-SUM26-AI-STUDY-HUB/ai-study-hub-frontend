import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import { User, Mail, FileText, Lock, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../../api.js';

export default function EditProfilePage() {
    const { user, setUser } = useApp();
    const navigate = useNavigate();
    const avatarInputRef = useRef(null);

    const [name, setName] = useState(user?.fullName || user?.name || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const token = localStorage.getItem('token');

    // 1. Logic Update Avatar (Khớp với API /edit-profile/avatar)
    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/users/edit-profile/avatar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) { toast.success('Avatar updated!'); window.location.reload(); }
            else toast.error('Failed to update avatar');
        } catch (err) { toast.error('Error uploading avatar'); }
    };

    // 2. Logic Update Profile & Password (Khớp với edit-profile & change-password)
    const handleUpdateAll = async (e) => {
        e.preventDefault();
        try {
            // Update Profile Name & Bio
            const profileRes = await fetch(`${API_BASE_URL}/api/v1/users/edit-profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ fullName: name, bio: bio })
            });
            if (!profileRes.ok) throw new Error('Update profile failed');

            // Change Password
            if (currentPassword && newPassword) {
                if (newPassword !== confirmPassword) return toast.error('New passwords do not match');
                const passRes = await fetch(`${API_BASE_URL}/api/v1/users/change-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                if (!passRes.ok) throw new Error('Change password failed');
            }

            toast.success('Profile updated successfully!');
            setUser({ ...user, fullName: name, name: name, bio });
            navigate('/profile');
        } catch (err) { toast.error(err.message); }
    };

    return (
        <div className="container-fluid py-4 px-4 px-md-5 text-start">
            <div className="mb-4">
                <Link to="/profile" className="d-inline-flex align-items-center gap-2 text-decoration-none text-muted" style={{ fontSize: '14px' }}>
                    <ArrowLeft className="h-4 w-4" /> <span className="fw-medium">Back to Profile</span>
                </Link>
            </div>

            <div className="mx-auto" style={{ maxWidth: '800px' }}>
                <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                    <div className="card-body p-4">
                        <form onSubmit={handleUpdateAll}>
                            <h4 className="card-title fw-bold text-dark mb-1">Profile Information</h4>
                            <p className="text-muted mb-4" style={{ fontSize: '14px' }}>Update your personal details</p>

                            <div className="d-flex align-items-center gap-4 mb-4">
                                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-warning-emphasis bg-warning-subtle" style={{ width: '96px', height: '96px', fontSize: '32px' }}>
                                    {name.substring(0, 2).toUpperCase() || 'U'}
                                </div>
                                <div className="text-start">
                                    <input type="file" ref={avatarInputRef} className="d-none" accept="image/*" onChange={handleAvatarChange} />
                                    <button type="button" className="btn btn-sm btn-outline-secondary py-2 px-3 fw-semibold" onClick={() => avatarInputRef.current.click()}>
                                        Change Avatar
                                    </button>
                                    <p className="text-muted mt-2 mb-0" style={{ fontSize: '12px' }}>JPG, PNG or GIF. Max size 2MB.</p>
                                </div>
                            </div>

                            <hr className="my-4 text-muted" />

                            <div className="row g-3 mb-4">
                                <div className="col-12 col-md-6">
                                    <label htmlFor="name" className="form-label fw-semibold text-dark"><User className="h-4 w-4 inline mr-2 text-muted" /> Full Name</label>
                                    <input 
                                        id="name" 
                                        type="text" 
                                        className="form-control" 
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)} 
                                        autoComplete="off" 
                                        required 
                                    />
                                </div>
                                <div className="col-12 col-md-6">
                                    <label htmlFor="email" className="form-label fw-semibold text-dark"><Mail className="h-4 w-4 inline mr-2 text-muted" /> Email Address</label>
                                    <input id="email" type="email" className="form-control" value={user?.email || ''} disabled />
                                </div>
                                <div className="col-12">
                                    <label htmlFor="bio" className="form-label fw-semibold text-dark"><FileText className="h-4 w-4 inline mr-2 text-muted" /> Bio</label>
                                    <textarea id="bio" className="form-control" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
                                </div>
                            </div>

                            <hr className="my-4 text-muted" />

                            <h4 className="card-title fw-bold text-dark mb-1"><Lock className="h-5 w-5 inline mr-2 text-muted" /> Change Password</h4>
                            <div className="d-flex flex-column gap-3 mb-4">
                                <input 
                                    type="password" 
                                    placeholder="Current Password" 
                                    className="form-control" 
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)} 
                                    autoComplete="new-password"
                                />
                                <input 
                                    type="password" 
                                    placeholder="New Password" 
                                    className="form-control" 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)} 
                                    autoComplete="new-password"
                                />
                                <input 
                                    type="password" 
                                    placeholder="Confirm New Password" 
                                    className="form-control" 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                    autoComplete="new-password"
                                />
                            </div>

                            <button type="submit" className="btn text-white px-4 py-2 border-0 fw-bold w-100" style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)', borderRadius: '0.5rem' }}>
                                Update Profile
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
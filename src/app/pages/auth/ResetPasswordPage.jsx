import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router'; 
import { Card, Form, Button, Spinner } from 'react-bootstrap';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../../api.js';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token'); 
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validated, setValidated] = useState(false);
  
  const navigate = useNavigate();

  // Tự động dọn dẹp thông báo cũ và kiểm tra tính hợp lệ của token
  useEffect(() => {
    window.scrollTo(0, 0);
    toast.dismiss(); 
    if (!token) {
      toast.error('Invalid reset link. Please request a new one.');
      navigate('/auth/forgot-password');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      toast.error('Password must be at least 8 characters, containing uppercase, lowercase, number, and special character.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }

    setIsLoading(true);
    setValidated(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: token ? token.trim() : '', 
          newPassword: newPassword 
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Invalid or expired token.');
      }

      toast.dismiss();
      toast.success('Password reset successfully!');
      navigate('/auth/login');

    } catch (error) {
      toast.dismiss();
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const originalTheme = document.documentElement.getAttribute('data-theme') || 'light';
    document.documentElement.setAttribute('data-theme', 'light');
    return () => {
      document.documentElement.setAttribute('data-theme', originalTheme);
    };
  }, []);

  return (
    <div className="min-vh-100 w-100 d-flex align-items-center justify-content-center p-3" style={{ background: 'linear-gradient(135deg, #FFF5ED 0%, #FFEAD9 50%, #FFDCA2 100%)' }}>
      <Card className="card-custom border-0 shadow-lg" style={{ borderRadius: '1.25rem', maxWidth: '400px', width: '100%' }}>
        <Card.Body className="p-4 p-md-5">
          <div className="mb-4 text-center">
            <h2 className="fw-bold text-dark mb-2">Reset Password</h2>
            <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>
              Please enter your new password below.
            </p>
          </div>

          <Form noValidate validated={validated} onSubmit={handleSubmit} className="d-flex flex-column gap-3">
            
            {/* New Password */}
            <Form.Floating className="mb-2">
              <Form.Control
                type="password"
                placeholder=" "
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-3 border-light-subtle shadow-none"
                pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$"
                required
              />
              <label className="text-muted">New Password</label>
              <Form.Control.Feedback type="invalid">Min 8 characters, containing uppercase, lowercase, number, and special character.</Form.Control.Feedback>
            </Form.Floating>

            {/* Confirm Password */}
            <Form.Floating className="mb-2">
              <Form.Control
                type="password"
                placeholder=" "
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-3 border-light-subtle shadow-none"
                minLength={8}
                required
              />
              <label className="text-muted">Confirm New Password</label>
              <Form.Control.Feedback type="invalid">Passwords must match.</Form.Control.Feedback>
            </Form.Floating>

            <Button 
              type="submit" 
              disabled={isLoading || !token}
              className="w-100 py-2 rounded-3 fw-semibold mt-3 border-0 shadow-sm"
              style={{ backgroundColor: '#FD8F52', color: 'white' }}
            >
              {isLoading ? <Spinner animation="border" size="sm" /> : 'Reset Password'}
            </Button>

            <Button variant="link" onClick={() => navigate('/auth/login')} className="text-decoration-none mt-2" style={{ color: '#FD8F52' }}>
              <ArrowLeft size={16} className="me-2" /> Back to Login
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}
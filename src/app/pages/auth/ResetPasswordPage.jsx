import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Card, Form, Button, FloatingLabel, Spinner } from 'react-bootstrap';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [validated, setValidated] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Nhận email được truyền sang từ trang Forgot Password
  const email = location.state?.email;

  // Bảo mật UX: Nếu ai đó gõ thẳng link /auth/reset-password mà chưa qua bước nhập email, đá về trang Forgot
  useEffect(() => {
    if (!email) {
      toast.error('Session expired or invalid. Please request a new reset link.');
      navigate('/auth/forgot-password');
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    const form = e.currentTarget;
    e.preventDefault();

    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }

    setIsLoading(true);
    setValidated(true);

    try {
      //Chỉ gửi token và newPassword qua JSON Body theo đúng Swagger
      const response = await fetch('http://14.225.254.145:8080/api/v1/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*'
        },
        body: JSON.stringify({ 
          token: token,
          newPassword: newPassword 
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Invalid or expired token. Please try again.');
      }

      toast.success('Password has been reset successfully! You can now log in.');
      navigate('/auth/login');

    } catch (error) {
      toast.error(error.message || 'Server connection error.');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Card className="card-custom border-0 shadow-lg" style={{ borderRadius: '1.25rem' }}>
      <Card.Body className="p-4 p-md-5">
        <div className="mb-4 text-center">
          <h2 className="fw-bold text-dark mb-2">Reset Password</h2>
          <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>
            Enter the reset code sent to <strong className="text-dark">{email}</strong> and your new password.
          </p>
        </div>

        <Form noValidate validated={validated} onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          
          {/* Token/OTP Input */}
          <FloatingLabel controlId="token" label="Reset Code (Token/OTP)" className="text-muted">
            <Form.Control
              type="text"
              placeholder="Enter your code"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="rounded-3 border-light-subtle shadow-none text-center fw-bold"
              style={{ letterSpacing: '2px' }}
              required
              disabled={isLoading}
            />
            <Form.Control.Feedback type="invalid">
              Please enter the reset code.
            </Form.Control.Feedback>
          </FloatingLabel>

          {/* New Password Input */}
          <FloatingLabel controlId="newPassword" label="New Password" className="text-muted">
            <Form.Control
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-3 border-light-subtle shadow-none"
              minLength={8}
              required
              disabled={isLoading}
            />
            <Form.Control.Feedback type="invalid">
              Password must be at least 8 characters long.
            </Form.Control.Feedback>
          </FloatingLabel>

          {/* Confirm Password Input */}
          <FloatingLabel controlId="confirmPassword" label="Confirm New Password" className="text-muted">
            <Form.Control
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-3 border-light-subtle shadow-none"
              minLength={8}
              required
              disabled={isLoading}
            />
            <Form.Control.Feedback type="invalid">
              Please confirm your new password.
            </Form.Control.Feedback>
          </FloatingLabel>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={isLoading || !token || !newPassword || !confirmPassword}
            className="w-100 btn-primary-gradient py-2 rounded-3 fw-semibold mt-3 border-0 shadow-sm d-flex justify-content-center align-items-center gap-2"
            style={{ backgroundColor: '#FD8F52', color: 'white' }}
          >
            {isLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                <span>Resetting...</span>
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}
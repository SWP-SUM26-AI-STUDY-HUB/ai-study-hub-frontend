import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext.jsx';
import { Card, Form, Button, FloatingLabel } from 'react-bootstrap';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, user } = useApp(); // Lấy thêm biến 'user' từ Context để theo dõi trạng thái login
  const navigate = useNavigate();

  // Tự động theo dõi khi biến 'user' thay đổi trạng thái (đã có dữ liệu từ hàm login)
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin/home');
      } else {
        navigate('/user/home');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (email && password) {
      try {
        await login(email, password);
        toast.success('Login successful!');
        // Logic điều hướng đã được useEffect ở trên tự động xử lý khi 'user' cập nhật thành công
      } catch (error) {
        toast.error('Login failed! Please check your credentials.');
      }
    } else {
      toast.error('Please fill in all fields');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await login('user@gmail.com', 'dummy_password');
      toast.success('Login with Google successful!');
      // Logic điều hướng đã được useEffect ở trên tự động xử lý
    } catch (error) {
      toast.error('Google login failed!');
    }
  };

  return (
    <Card className="card-custom border-0 shadow-lg" style={{ borderRadius: '1.25rem' }}>
      <Card.Body className="p-4 p-md-5">
        {/* Header */}
        <div className="mb-4">
          <h2 className="fw-bold text-dark mb-2">Welcome Back</h2>
          <p className="text-muted mb-0">Sign in to access your study documents</p>
        </div>

        <Form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          {/* Email Input */}
          <FloatingLabel controlId="email" label="Email address" className="text-muted">
            <Form.Control
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-3 border-light-subtle shadow-none"
              required
            />
          </FloatingLabel>

          {/* Password Input */}
          <div className="d-flex flex-column gap-2">
            <FloatingLabel controlId="password" label="Password" className="text-muted">
              <Form.Control
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-3 border-light-subtle shadow-none"
                required
              />
            </FloatingLabel>

            {/* Forgot Password Link */}
            <div className="d-flex justify-content-end">
              <Link
                to="/auth/forgot-password"
                className="text-decoration-none small fw-medium transition-all"
                style={{ color: '#FD8F52' }}
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-100 btn-primary-gradient py-2 rounded-3 fw-semibold mt-2 border-0"
            style={{ backgroundColor: '#FD8F52', color: 'white' }}
          >
            Log In
          </Button>
        </Form>

        {/* Divider */}
        <div className="position-relative my-4 text-center">
          <hr className="text-muted opacity-25" />
          <span
            className="position-absolute top-50 start-50 translate-middle bg-white px-3 text-muted fw-medium"
            style={{ fontSize: '0.85rem' }}
          >
            Or continue with
          </span>
        </div>

        {/* Google Login */}
        <Button
          type="button"
          variant="light"
          className="w-100 d-flex align-items-center justify-content-center gap-2 py-2 rounded-3 shadow-sm border border-light-subtle"
          onClick={handleGoogleLogin}
        >
          <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="fw-medium text-dark">Google</span>
        </Button>

        {/* Link register */}
        <p className="text-center text-muted mt-4 mb-0" style={{ fontSize: '0.9rem' }}>
          Don't have an account?{' '}
          <Link
            to="/auth/register"
            className="text-decoration-none ms-1"
            style={{ color: '#FD8F52', fontWeight: 600 }}
          >
            Register here
          </Link>
        </p>
      </Card.Body>
    </Card>
  );
}
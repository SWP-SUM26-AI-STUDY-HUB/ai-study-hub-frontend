import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext.jsx';
import { Card, Form, Button, FloatingLabel, Spinner } from 'react-bootstrap';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validated, setValidated] = useState(false); // Trạng thái kiểm tra form (đỏ/xanh)
  const [isLoading, setIsLoading] = useState(false); // Trạng thái đang load API
  const { user, setUser } = useApp();
  const navigate = useNavigate();
  
  // Tự động chuyển trang nếu đã có dữ liệu user
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin/home');
      } else {
        navigate('/user/home');
      }
    }
  }, [user, navigate]);

  //bắt đầu gọi api
  //HỨNG MÃ CODE TỪ GOOGLE
  useEffect(() => {
    // Lấy tham số ?code=... từ thanh URL của trình duyệt
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');

    if (code) {
      const handleGoogleCallback = async () => {
        setIsLoading(true);
        try {
          // Gọi API đổi code lấy token
          const response = await fetch(`http://14.225.254.145:8080/api/v1/auth/google/callback?code=${encodeURIComponent(code)}`, {
            method: 'GET'
          });

          const result = await response.json();

          if (response.ok && result.success) {
            // Đọc token từ kết quả backend trả về giống hệt hàm login thường
            const token = result.data?.accessToken || result.data?.token || result.token;
            const refreshToken = result.data?.refreshToken || result.refreshToken;
            const userInfo = result.data?.user || result.user || result.data;

            if (token) localStorage.setItem('token', token);
            if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
            if (userInfo) setUser(userInfo);

            toast.success('Google login successful!');
            // Sau khi setUser, EFFECT 1 ở trên sẽ tự động đá người dùng vào Home
          } else {
            throw new Error(result.message || 'Google authentication failed.');
          }
        } catch (error) {
          toast.error(error.message);
        } finally {
          setIsLoading(false);
          // Xóa cái đoạn mã ?code=... trên URL đi để giao diện sạch sẽ và không bị lặp lại logic
          navigate('/auth/login', { replace: true });
        }
      };

      handleGoogleCallback();
    }
  }, [navigate, setUser]);

  const handleSubmit = async (e) => {
    const form = e.currentTarget;
    e.preventDefault();

    // 1. Kiểm tra Validate Form UI
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    setValidated(true);
    setIsLoading(true);

    try {
      // 2. Gọi API Đăng nhập
      const response = await fetch('http://14.225.254.145:8080/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      // 3. XỬ LÝ KHI CÓ LỖI TỪ BACKEND
      if (!response.ok || !result.success) {
        const errorMessage = result.message || '';

        // Bắt lỗi tài khoản Inactive và tự động chuyển trang
        if (errorMessage.toLowerCase().includes('inactive')) {
          toast.error('Your account is currently inactive. Redirecting to verification page...');
          setTimeout(() => {
            navigate('/auth/verify-email', { state: { email: email } });
          }, 3000);
          return; 
        }

        // Văng ra lỗi chung nếu sai pass / sai email
        throw new Error(errorMessage || 'Login failed. Please check your credentials and try again.');
      }

      // 4. XỬ LÝ KHI ĐĂNG NHẬP THÀNH CÔNG (Status 200)

      // Dò tìm token và thông tin user từ cục data Backend gửi về
      const token = result.data?.accessToken || result.data?.token || result.token;
      const refreshToken = result.data?.refreshToken || result.refreshToken;
      const userInfo = result.data?.user || result.user || result.data;

      // Lưu Token xuống máy tính để giữ phiên đăng nhập
      if (token) {
        localStorage.setItem('token', token);
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      // Cập nhật State toàn cục cho React biết ai đang đăng nhập
      if (userInfo) {
        setUser(userInfo);
      }

      toast.success('Login successful!');

      // 5. Điều hướng người dùng dựa vào Role (Quyền)
      if (userInfo?.role === 'admin' || userInfo?.role === 'ADMIN') {
        navigate('/admin/home');
      } else {
        navigate('/user/home');
      }

    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  //xong 1 api
  const handleGoogleLogin = async () => {
    try {
      const response = await fetch('http://14.225.254.145:8080/api/v1/auth/social-login?login_type=google', {
        method: 'GET'
      });

      const result = await response.json();

      // Chỉ cần có HTTP 200 (response.ok) và có đường link trả về trong result.data là chạy luôn
      if (response.ok && result.data && result.data.includes('accounts.google.com')) {
        // Đá người dùng sang trang đăng nhập của Google
        window.location.href = result.data;
      } else {
        toast.error('Unable to fetch Google Auth URL.');
      }
    } catch (error) {
      toast.error('Google login connection failed!');
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

        {/* Form Bootstrap có validation */}
        <Form noValidate validated={validated} onSubmit={handleSubmit} className="d-flex flex-column gap-3">

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
            <Form.Control.Feedback type="invalid">
              Please enter a valid email address.
            </Form.Control.Feedback>
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
              <Form.Control.Feedback type="invalid">
                Please enter your password.
              </Form.Control.Feedback>
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

          {/* Nút Submit có trạng thái Loading */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-100 btn-primary-gradient py-2 rounded-3 fw-semibold mt-2 border-0 d-flex justify-content-center align-items-center gap-2"
            style={{ backgroundColor: '#FD8F52', color: 'white' }}
          >
            {isLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                <span>Processing...</span>
              </>
            ) : (
              'Log In'
            )}
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

        {/* Google Login Button */}
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
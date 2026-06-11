import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext.jsx';
import { Card, Form, Button, FloatingLabel, Spinner } from 'react-bootstrap';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Các state để xử lý giao diện
  const [validated, setValidated] = useState(false); // Quản lý màu đỏ/xanh của form
  const [isLoading, setIsLoading] = useState(false); // Quản lý trạng thái vòng xoay loading
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    const form = e.currentTarget;
    e.preventDefault(); // Chặn load lại trang

    // 1. Kiểm tra validation mặc định của Bootstrap (đã nhập đủ thông tin chưa)
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    // 2. Kiểm tra logic mật khẩu
    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp!');
      return;
    }

    setValidated(true);
    setIsLoading(true);

    try {
      // 3. Gọi API đăng ký (Map biến 'name' vào trường 'fullName' của API)
      const response = await fetch('http://14.225.254.145:8080/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email, 
          password: password,
          fullName: name 
        }),
      });

      const result = await response.json();

      // Nếu API báo lỗi
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Đăng ký thất bại, vui lòng thử lại!');
      }

      // 4. Xử lý sau khi đăng ký thành công
      toast.success('Đăng ký thành công! Vui lòng kiểm tra email.');
      
      // Chuyển hướng sang trang nhập mã OTP. 
      // Mẹo: Truyền thêm email qua state để trang verify tự động điền email giúp người dùng.
      navigate('/auth/verify-email', { state: { email: email } });

    } catch (error) {
      toast.error(error.message || 'Không thể kết nối đến server.');
    } finally {
      setIsLoading(false); // Tắt loading dù thành công hay thất bại
    }
  };

  return (
    <Card className="card-custom border-0 shadow-lg" style={{ borderRadius: '1.25rem' }}>
      <Card.Body className="p-4 p-md-5">
        {/* Header */}
        <div className="mb-4">
          <h2 className="fw-bold text-dark mb-2">Create Account</h2>
          <p className="text-muted mb-0">Join us to manage your study documents</p>
        </div>

        {/* Thêm noValidate và validated để Bootstrap tự lo vụ báo đỏ báo xanh */}
        <Form noValidate validated={validated} onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          
          {/* Full Name Input */}
          <FloatingLabel controlId="name" label="Full Name" className="text-muted">
            <Form.Control
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-3 border-light-subtle shadow-none"
              required
            />
            <Form.Control.Feedback type="invalid">
              Vui lòng nhập họ và tên của bạn.
            </Form.Control.Feedback>
          </FloatingLabel>

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
              Vui lòng nhập địa chỉ email hợp lệ.
            </Form.Control.Feedback>
          </FloatingLabel>

          {/* Password Input */}
          <FloatingLabel controlId="password" label="Password" className="text-muted">
            <Form.Control
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-3 border-light-subtle shadow-none"
              minLength={8} // Yêu cầu tối thiểu 8 ký tự
              required
            />
            <Form.Control.Feedback type="invalid">
              Mật khẩu phải có ít nhất 8 ký tự.
            </Form.Control.Feedback>
          </FloatingLabel>

          {/* Confirm Password Input */}
          <FloatingLabel controlId="confirmPassword" label="Confirm Password" className="text-muted">
            <Form.Control
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-3 border-light-subtle shadow-none"
              minLength={8}
              required
            />
            {/* Lỗi mặc định nếu trống, logic 2 mật khẩu khớp nhau đã xử lý ở handleSubmit */}
            <Form.Control.Feedback type="invalid">
              Vui lòng xác nhận lại mật khẩu.
            </Form.Control.Feedback>
          </FloatingLabel>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-100 btn-primary-gradient py-2 rounded-3 fw-semibold mt-3 border-0 shadow-sm d-flex justify-content-center align-items-center gap-2"
            style={{ backgroundColor: '#FD8F52', color: 'white' }}
          >
            {isLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                <span>Đang đăng ký...</span>
              </>
            ) : (
              'Register'
            )}
          </Button>

          {/* Link back to login */}
          <p className="text-center text-muted mt-4 mb-0" style={{ fontSize: '0.9rem' }}>
            Already have an account?{' '}
            <Link 
              to="/auth/login" 
              className="text-decoration-none ms-1" 
              style={{ color: '#FD8F52', fontWeight: 600 }}
            >
              Login here
            </Link>
          </p>
        </Form>
      </Card.Body>
    </Card>
  );
}
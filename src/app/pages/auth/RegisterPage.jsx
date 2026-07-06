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
  const [validated, setValidated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    const form = e.currentTarget;
    e.preventDefault();

    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp!');
      return;
    }

    setValidated(true);
    setIsLoading(true);

    try {
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

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Đăng ký thất bại, vui lòng thử lại!');
      }

      toast.success('Đăng ký thành công! Vui lòng kiểm tra email.');

      // Chuyển sang verify email kích hoạt tài khoản
      navigate('/auth/verify-email', { state: { email: email } });

    } catch (error) {
      toast.error(error.message || 'Không thể kết nối đến server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="card-custom border-0 shadow-lg" style={{ borderRadius: '1.25rem' }}>
      <Card.Body className="p-4 p-md-5">
        <div className="mb-4">
          <h2 className="fw-bold text-dark mb-2">Create Account</h2>
          <p className="text-muted mb-0">Join us to manage your study documents</p>
        </div>

        <Form noValidate validated={validated} onSubmit={handleSubmit} className="d-flex flex-column gap-3">

          <FloatingLabel controlId="name" label="Full Name" className="text-muted">
            <Form.Control
              type="text"
              placeholder=" "
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-3 border-light-subtle shadow-none"
              required
            />
            <Form.Control.Feedback type="invalid">
              Vui lòng nhập họ và tên của bạn.
            </Form.Control.Feedback>
          </FloatingLabel>

          <FloatingLabel controlId="email" label="Email address" className="text-muted">
            <Form.Control
              type="email"
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-3 border-light-subtle shadow-none"
              required
            />
            <Form.Control.Feedback type="invalid">
              Vui lòng nhập địa chỉ email hợp lệ.
            </Form.Control.Feedback>
          </FloatingLabel>

          <FloatingLabel controlId="password" label="Password" className="text-muted">
            <Form.Control
              type="password"
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-3 border-light-subtle shadow-none"
              minLength={8}
              required
            />
            <Form.Control.Feedback type="invalid">
              Mật khẩu phải có ít nhất 8 ký tự.
            </Form.Control.Feedback>
          </FloatingLabel>

          <FloatingLabel controlId="confirmPassword" label="Confirm Password" className="text-muted">
            <Form.Control
              type="password"
              placeholder=" "
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-3 border-light-subtle shadow-none"
              minLength={8}
              required
            />
            <Form.Control.Feedback type="invalid">
              Vui lòng xác nhận lại mật khẩu.
            </Form.Control.Feedback>
          </FloatingLabel>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-100 py-2 rounded-3 fw-semibold mt-3 border-0 shadow-sm d-flex justify-content-center align-items-center gap-2"
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
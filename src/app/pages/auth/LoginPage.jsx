import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext.jsx';
import { Card, Form, Button } from 'react-bootstrap';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password) {
      login(email, password);
      toast.success('Login successful!');
      navigate('/');
    } else {
      toast.error('Please fill in all fields');
    }
  };

  const handleGoogleLogin = () => {
    toast.success('Login with Google successful!');
    login('user@gmail.com', 'dummy_password');
    navigate('/');
  };

  return (
    <Card className="card-custom">
      <Card.Body className="p-4">
        <h2 className="h4 font-weight-bold text-dark mb-1">Welcome Back</h2>
        <p className="text-muted small mb-4">Sign in to access your study documents</p>

        <Form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <Form.Group>
            <Form.Label htmlFor="email" className="font-weight-medium text-dark small mb-1">Email</Form.Label>
            <Form.Control
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group>
            <Form.Label htmlFor="password" className="font-weight-medium text-dark small mb-1">Password</Form.Label>
            <Form.Control
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>
          <div className="d-flex align-items-center justify-content-end">
            <Link
              to="/auth/forgot-password"
              className="text-decoration-none small"
              style={{ color: '#FD8F52' }}
            >
              Forgot Password?
            </Link>
          </div>
          <Button type="submit" className="w-100 btn-primary-gradient py-2">
            Login
          </Button>
        </Form>

        {/* Divider */}
        <div className="position-relative my-4 text-center">
          <hr className="text-muted opacity-25" />
          <span 
            className="position-absolute top-50 start-50 translate-middle bg-white px-2 text-muted small"
            style={{ fontSize: '12px' }}
          >
            Or continue with
          </span>
        </div>

        {/* Google Login */}
        <Button 
          type="button" 
          variant="outline-secondary" 
          className="w-100 d-flex align-items-center justify-content-center gap-2 py-2"
          style={{ borderColor: '#ddd', color: '#555', backgroundColor: '#fff' }}
          onClick={handleGoogleLogin}
        >
          <svg className="me-1" style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </Button>

        {/* Link register */}
        <p className="text-center text-muted small mt-4 mb-0">
          Don't have an account?{' '}
          <Link to="/auth/register" className="text-decoration-none font-weight-medium" style={{ color: '#FD8F52', fontWeight: 600 }}>
            Register here
          </Link>
        </p>
      </Card.Body>
    </Card>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, Form, Button, FloatingLabel } from 'react-bootstrap';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      toast.success('Password reset link sent to your email');
      setTimeout(() => {
        navigate('/auth/reset-password');
      }, 1500);
    } else {
      toast.error('Please enter your email address');
    }
  };

  return (
    <Card className="card-custom border-0 shadow-lg" style={{ borderRadius: '1.25rem' }}>
      <Card.Body className="p-4 p-md-5">
        {/* Header */}
        <div className="mb-4">
          <h2 className="fw-bold text-dark mb-2">Forgot Password </h2>
          <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>
            Enter your email and we'll send you a link to reset your password.
          </p>
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

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-100 btn-primary-gradient py-2 rounded-3 fw-semibold mt-3 border-0 shadow-sm"
            style={{ backgroundColor: '#FD8F52', color: 'white' }}
          >
            Send Reset Link
          </Button>

          {/* Back to Login Link */}
          <Link 
            to="/auth/login" 
            className="d-flex align-items-center justify-content-center gap-2 text-decoration-none mt-3"
            style={{ color: '#FD8F52', fontWeight: 500 }}
          >
            <ArrowLeft size={18} />
            <span>Back to Login</span>
          </Link>
        </Form>
      </Card.Body>
    </Card>
  );
}
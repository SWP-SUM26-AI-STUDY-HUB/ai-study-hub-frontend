import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, Form, Button } from 'react-bootstrap';
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
    <Card className="card-custom">
      <Card.Body className="p-4">
        <h2 className="h4 font-weight-bold text-dark mb-1">Forgot Password</h2>
        <p className="text-muted small mb-4">
          Enter your email and we'll send you a link to reset your password
        </p>

        <Form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <Form.Group>
            <Form.Label htmlFor="email" className="font-weight-medium text-dark small mb-1">Email Address</Form.Label>
            <Form.Control
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>
          <Button type="submit" className="w-100 btn-primary-gradient py-2 mt-2">
            Send Reset Link
          </Button>
          <Link to="/auth/login" className="d-flex align-items-center justify-content-center gap-2 text-decoration-none text-primary small font-weight-medium mt-2" style={{ color: '#FD8F52' }}>
            <ArrowLeft size={16} />
            <span>Back to Login</span>
          </Link>
        </Form>
      </Card.Body>
    </Card>
  );
}

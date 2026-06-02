import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext.jsx';
import { Card, Form, Button, FloatingLabel } from 'react-bootstrap';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { register } = useApp();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    register(name, email, password);
    toast.success('Registration successful! Please verify your email.');
    navigate('/auth/verify-email');
  };

  return (
    <Card className="card-custom border-0 shadow-lg" style={{ borderRadius: '1.25rem' }}>
      <Card.Body className="p-4 p-md-5">
        {/* Header */}
        <div className="mb-4">
          <h2 className="fw-bold text-dark mb-2">Create Account </h2>
        </div>

        <Form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
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
          </FloatingLabel>

          {/* Password Input */}
          <FloatingLabel controlId="password" label="Password" className="text-muted">
            <Form.Control
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-3 border-light-subtle shadow-none"
              required
            />
          </FloatingLabel>

          {/* Confirm Password Input */}
          <FloatingLabel controlId="confirmPassword" label="Confirm Password" className="text-muted">
            <Form.Control
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            Register
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
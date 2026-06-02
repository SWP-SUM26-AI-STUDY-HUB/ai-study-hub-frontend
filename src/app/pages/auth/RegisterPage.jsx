import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext.jsx';
import { Card, Form, Button } from 'react-bootstrap';
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
    <Card className="card-custom">
      <Card.Body className="p-4">
        <h2 className="h4 font-weight-bold text-dark mb-1">Create Account</h2>
        <p className="text-muted small mb-4">Join StudyDocs AI to manage your study materials</p>

        <Form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <Form.Group>
            <Form.Label htmlFor="name" className="font-weight-medium text-dark small mb-1">Full Name</Form.Label>
            <Form.Control
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>
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
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group>
            <Form.Label htmlFor="confirmPassword" className="font-weight-medium text-dark small mb-1">Confirm Password</Form.Label>
            <Form.Control
              id="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Form.Group>
          <Button type="submit" className="w-100 btn-primary-gradient py-2 mt-2">
            Register
          </Button>
          <p className="text-center text-muted small mt-3 mb-0">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-decoration-none font-weight-medium" style={{ color: '#FD8F52', fontWeight: 600 }}>
              Login here
            </Link>
          </p>
        </Form>
      </Card.Body>
    </Card>
  );
}

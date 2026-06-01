import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, Form, Button } from 'react-bootstrap';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';

export default function VerifyEmailPage() {
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (otp.length === 6) {
      toast.success('Email verified successfully!');
      navigate('/auth/login');
    } else {
      toast.error('Please enter the complete 6-digit code');
    }
  };

  const handleResend = () => {
    toast.success('Verification code resent to your email');
  };

  return (
    <Card className="card-custom">
      <Card.Body className="p-4 text-center">
        <div 
          className="mx-auto d-flex align-items-center justify-content-center mb-3"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(253, 143, 82, 0.2) 0%, rgba(255, 189, 113, 0.2) 100%)'
          }}
        >
          <Mail size={24} style={{ color: '#C73866' }} />
        </div>
        <h2 className="h4 font-weight-bold text-dark mb-1">Verify Your Email</h2>
        <p className="text-muted small mb-4">
          We've sent a 6-digit verification code to your email
        </p>

        <Form onSubmit={handleSubmit} className="d-flex flex-column gap-4">
          <Form.Group className="d-flex justify-content-center">
            <Form.Control
              type="text"
              maxLength={6}
              className="text-center font-weight-bold fs-4 mx-auto"
              style={{ maxWidth: '200px', letterSpacing: '8px', border: '2px solid rgba(253, 143, 82, 0.3)' }}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              required
            />
          </Form.Group>
          <Button type="submit" className="w-100 btn-primary-gradient py-2">
            Verify Email
          </Button>
          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              className="bg-transparent border-0 p-0 text-decoration-none small font-weight-medium"
              style={{ color: '#FD8F52', fontWeight: 600 }}
            >
              Didn't receive the code? Resend
            </button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}

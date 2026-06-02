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
    <Card className="card-custom border-0 shadow-lg" style={{ borderRadius: '1.25rem' }}>
      <Card.Body className="p-4 p-md-5 text-center">
        
        {/* Icon Header */}
        <div 
          className="mx-auto d-flex align-items-center justify-content-center mb-4 shadow-sm"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(253, 143, 82, 0.15) 0%, rgba(255, 189, 113, 0.15) 100%)'
          }}
        >
          <Mail size={32} style={{ color: '#FD8F52' }} />
        </div>
        
        <h2 className="fw-bold text-dark mb-2">Verify Your Email</h2>
        <p className="text-muted mb-4" style={{ fontSize: '0.95rem' }}>
          We've sent a 6-digit verification code to your email.
        </p>

        <Form onSubmit={handleSubmit} className="d-flex flex-column gap-4">
          {/* OTP Input */}
          <Form.Group className="d-flex justify-content-center">
            <Form.Control
              type="text"
              maxLength={6}
              className="text-center fw-bold fs-3 mx-auto rounded-3 shadow-none transition-all"
              style={{ 
                maxWidth: '220px', 
                letterSpacing: '12px', 
                border: '2px solid rgba(253, 143, 82, 0.4)',
                color: '#FD8F52',
                paddingLeft: '24px' // Bù trừ khoảng cách do letter-spacing tạo ra
              }}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              required
            />
          </Form.Group>
          
          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-100 btn-primary-gradient py-2 rounded-3 fw-semibold border-0 shadow-sm"
            style={{ backgroundColor: '#FD8F52', color: 'white' }}
          >
            Verify Email
          </Button>
          
          {/* Resend Action */}
          <div className="text-center mt-1">
            <button
              type="button"
              onClick={handleResend}
              className="bg-transparent border-0 p-0 text-decoration-none fw-medium transition-all"
              style={{ color: '#FD8F52', fontSize: '0.9rem' }}
            >
              Didn't receive the code? Resend
            </button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
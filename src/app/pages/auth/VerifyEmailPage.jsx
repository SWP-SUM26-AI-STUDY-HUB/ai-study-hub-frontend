import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Card, Form, Button, Spinner } from 'react-bootstrap';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';

export default function VerifyEmailPage() {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Trạng thái cho nút Verify
  const [isResending, setIsResending] = useState(false); // Trạng thái cho nút Resend
  const navigate = useNavigate();
  const location = useLocation();

  // Lấy email được truyền sang từ trang Đăng ký (RegisterPage)
  const email = location.state?.email;

  // Nếu người dùng vào thẳng trang này mà không thông qua bước đăng ký, đẩy về trang đăng ký
  useEffect(() => {
    if (!email) {
      toast.error('The email verification information could not be found!');
      navigate('/auth/register');
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      // Gọi API Verify. Chú ý: Dữ liệu được truyền qua Query Params (?email=...&otp=...) theo đúng Swagger
      const url = `http://14.225.254.145:8080/api/v1/auth/verify?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': '*/*'
        }
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'The verification code is invalid or has expired.');
      }

      toast.success('Email verified successfully! You can log in now.');
      navigate('/auth/login');

    } catch (error) {
      toast.error(error.message || 'Unable to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || isResending) return;

    setIsResending(true);
    try {
      // Gọi API Resend OTP. Chỉ cần truyền email qua Query Params
      const url = `http://14.225.254.145:8080/api/v1/auth/resend-otp?email=${encodeURIComponent(email)}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': '*/*'
        }
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to resend the code at this time. Please try again later.');
      }

      toast.success(`The verification code has been resent to ${email}`);
    } catch (error) {
      toast.error(error.message || 'Unable to resend the code at this time. Please try again later.');
    } finally {
      setIsResending(false);
    }
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
          We've sent a 6-digit verification code to <strong className="text-dark">{email}</strong>.
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
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Dùng regex để chỉ cho phép nhập số
              placeholder="000000"
              required
              disabled={isLoading}
            />
          </Form.Group>
          
          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={isLoading || otp.length !== 6}
            className="w-100 btn-primary-gradient py-2 rounded-3 fw-semibold border-0 shadow-sm d-flex justify-content-center align-items-center gap-2"
            style={{ backgroundColor: '#FD8F52', color: 'white' }}
          >
            {isLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              'Verify Email'
            )}
          </Button>
          
          {/* Resend Action */}
          <div className="text-center mt-1">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="bg-transparent border-0 p-0 text-decoration-none fw-medium transition-all"
              style={{ 
                color: isResending ? '#a0a0a0' : '#FD8F52', 
                fontSize: '0.9rem',
                cursor: isResending ? 'not-allowed' : 'pointer'
              }}
            >
              {isResending ? 'Đang gửi lại...' : "Didn't receive the code? Resend"}
            </button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
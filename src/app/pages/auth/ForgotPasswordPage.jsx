import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, Form, Button, FloatingLabel, Spinner } from 'react-bootstrap';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Thêm state quản lý loading
  const [validated, setValidated] = useState(false); // Thêm state quản lý validation
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    const form = e.currentTarget;
    e.preventDefault();

    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    setIsLoading(true);
    setValidated(true);

   try {
      //Gửi email qua Request Body dạng JSON
      const response = await fetch('http://14.225.254.145:8080/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*'
        },
        body: JSON.stringify({ 
          email: email 
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to send request. Please check your email!');
      }

      toast.success('Password reset link sent to your email!');
      
      // Không cần truyền email sang trang sau nữa vì API reset-password không cần
      navigate('/auth/reset-password'); 

    } catch (error) {
      toast.error(error.message || 'Server connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="card-custom border-0 shadow-lg" style={{ borderRadius: '1.25rem' }}>
      <Card.Body className="p-4 p-md-5">
        <div className="mb-4">
          <h2 className="fw-bold text-dark mb-2">Forgot Password</h2>
          <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>
            Enter your email and we'll send you a link or code to reset your password.
          </p>
        </div>

        <Form noValidate validated={validated} onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <FloatingLabel controlId="email" label="Email address" className="text-muted">
            <Form.Control
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-3 border-light-subtle shadow-none"
              required
              disabled={isLoading}
            />
            <Form.Control.Feedback type="invalid">
              Please enter a valid email address.
            </Form.Control.Feedback>
          </FloatingLabel>

          <Button 
            type="submit" 
            disabled={isLoading || !email}
            className="w-100 btn-primary-gradient py-2 rounded-3 fw-semibold mt-3 border-0 shadow-sm d-flex justify-content-center align-items-center gap-2"
            style={{ backgroundColor: '#FD8F52', color: 'white' }}
          >
            {isLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                <span>Sending...</span>
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>

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
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Card, Form, Button, Spinner } from 'react-bootstrap';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { API_BASE_URL } from '../../api.js';

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

  // =========================================================================
  // XỬ LÝ XÁC THỰC MÃ OTP KHI KÍCH HOẠT TÀI KHOẢN (OTP Verification submit)
  // - Hoạt động:
  //   1. Kiểm tra mã OTP nhập vào phải đúng độ dài quy định (6 chữ số).
  //   2. Gửi request POST kèm tham số Query Params `email` và `otp` tới API `POST /api/v1/auth/verify`.
  //   3. Nếu mã OTP khớp và còn hiệu lực, tài khoản sẽ được chuyển trạng thái từ INACTIVE sang ACTIVE.
  //      Hệ thống thông báo thành công và chuyển hướng người dùng tới trang Đăng nhập (`/auth/login`).
  // =========================================================================
  const handleSubmit = async (e) => {
    // Ngăn chặn sự kiện tải lại trang mặc định của Form submit
    e.preventDefault();
    // Kiểm tra độ dài mã OTP nhập vào phải đúng 6 ký tự số
    if (otp.length !== 6) {
      // Hiển thị thông báo Toast cảnh báo nếu nhập thiếu số
      toast.error('Please enter the complete 6-digit code');
      // Kết thúc thực thi hàm
      return;
    }

    // Đặt trạng thái đang tải lên true để vô hiệu hóa nút submit
    setIsLoading(true);
    try {
      // Thiết lập đường dẫn URL API xác thực, đưa các tham số email và otp vào Query Parameters và mã hóa URL an toàn
      const url = `${API_BASE_URL}/api/v1/auth/verify?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`;
      
      // Thực hiện cuộc gọi mạng HTTP POST tới máy chủ để xác thực mã OTP
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': '*/*'
        }
      });

      // Chuyển đổi dữ liệu phản hồi từ server sang JSON
      const result = await response.json();

      // Nếu response trả về mã lỗi HTTP hoặc cờ success là false
      if (!response.ok || !result.success) {
        // Ném ra một ngoại lệ chứa thông báo lỗi để chuyển tới khối catch xử lý
        throw new Error(result.message || 'The verification code is invalid or has expired.');
      }

      // Hiển thị Toast thông báo xác thực tài khoản thành công
      toast.success('Email verified successfully! You can log in now.');
      // Chuyển hướng người dùng về màn hình đăng nhập hệ thống
      navigate('/auth/login');

    } catch (error) {
      toast.error(error.message || 'Unable to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // XỬ LÝ YÊU CẦU GỬI LẠI MÃ OTP (Resend OTP code)
  // - Hoạt động:
  //   1. Kiểm tra điều kiện: email phải tồn tại và không nằm trong trạng thái đang gửi trước đó (`isResending`).
  //   2. Gọi API `POST /api/v1/auth/resend-otp?email=...` thông qua Query Params để yêu cầu server tạo mã xác minh mới.
  //   3. Nếu thành công, hệ thống gửi email mới chứa mã OTP 6 số đến hòm thư và hiển thị Toast thông báo đã gửi lại mã thành công.
  // =========================================================================
  const handleResend = async () => {
    // Nếu email bị trống hoặc tiến trình gửi lại đang diễn ra thì dừng hàm
    if (!email || isResending) return;

    // Đặt cờ đang gửi lại mã lên true để vô hiệu hóa nút bấm gửi lại
    setIsResending(true);
    try {
      // Thiết lập đường dẫn URL API gửi lại OTP kèm email được mã hóa an toàn trên Query Params
      const url = `${API_BASE_URL}/api/v1/auth/resend-otp?email=${encodeURIComponent(email)}`;
      
      // Thực hiện gọi HTTP POST yêu cầu hệ thống gửi lại mã OTP mới về email
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': '*/*'
        }
      });

      // Nhận dữ liệu phản hồi dạng JSON
      const result = await response.json();

      // Nếu cuộc gọi HTTP thất bại hoặc thuộc tính success trả về false
      if (!response.ok || !result.success) {
        // Ném lỗi với thông báo lỗi từ server để chuyển tiếp tới catch xử lý
        throw new Error(result.message || 'Unable to resend the code at this time. Please try again later.');
      }

      // Hiển thị Toast thông báo gửi lại mã thành công kèm địa chỉ email đích
      toast.success(`The verification code has been resent to ${email}`);
    } catch (error) {
      // Hiển thị Toast lỗi màu đỏ kèm thông báo lỗi cụ thể
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
                <span>Verifying...</span>
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
              {isResending ? 'Resending...' : "Didn't receive the code? Resend"}
            </button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
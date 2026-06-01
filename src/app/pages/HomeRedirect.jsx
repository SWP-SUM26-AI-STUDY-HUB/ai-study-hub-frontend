import { useEffect } from 'react';
import { useNavigate } from 'react-router'; // Chuẩn v7

export default function HomeRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/auth/login', { replace: true });
  }, [navigate]);

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100">
      <div className="text-center">
        <div className="spinner-border text-primary mb-3" role="status" style={{ color: '#FD8F52' }}>
          <span className="visually-hidden">Đang tải...</span>
        </div>
        <p className="text-muted">Đang tải...</p>
      </div>
    </div>
  );
}
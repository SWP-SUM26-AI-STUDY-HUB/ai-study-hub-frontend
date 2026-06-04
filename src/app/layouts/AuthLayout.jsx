import { Outlet } from 'react-router';
// Tuyệt chiêu Vite: Dùng /src/ cho đồng bộ, không cần đếm thư mục nữa
import logoImg from '/src/image/logo.jpg';

export function AuthLayout() {
  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center p-3"
      style={{ background: 'linear-gradient(135deg, #FFF5ED 0%, #FFEAD9 50%, #FFDCA2 100%)' }}
    >
      <div className="w-100" style={{ maxWidth: '400px' }}>
        <div className="text-center mb-4">
          <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
            
            {/* Đã cập nhật biến src và style ở đây */}
            <img 
              src={logoImg} 
              alt="Study HUB Logo" 
              style={{ width: '45px', height: '45px', objectFit: 'contain' }} 
            />
            
            <h1
              className="mb-0 fw-bold bg-gradient-to-r from-[#C73866] via-[#FD8F52] to-[#FFBD71] bg-clip-text text-transparent"
              style={{
                background: 'linear-gradient(to right, #C73866, #FD8F52, #FFBD71)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '2.2rem',
              }}
            >
              Study HUB
            </h1>
          </div>
          <p className="text-muted mb-0">AI-Powered Study Document Management</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
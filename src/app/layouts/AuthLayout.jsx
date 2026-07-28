import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import logoImg from '../../image/logo.jpg';


export function AuthLayout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const originalTheme = document.documentElement.getAttribute('data-theme') || 'light';
    document.documentElement.setAttribute('data-theme', 'light');
    return () => {
      document.documentElement.setAttribute('data-theme', originalTheme);
    };
  }, []);

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center p-3"
      style={{ background: 'linear-gradient(135deg, #FFF5ED 0%, #FFEAD9 50%, #FFDCA2 100%)' }}
    >
      <div className="w-100" style={{ maxWidth: '400px' }}>
        <div className="text-center mb-4">
          <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
            <img 
              src={logoImg} 
              alt="StudyDocs Logo" 
              style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '50%', border: '1px solid rgba(253, 143, 82, 0.2)' }} 
              className="shadow-sm" 
            />
            <h1
              className="mb-0"
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: '500',
                color: '#e599b4',
                letterSpacing: '0.15em',
                fontSize: '2.2rem',
                textTransform: 'uppercase'
              }}
            >
              StudyDocs AI
            </h1>
          </div>
          <p className="text-muted mb-0">AI-Powered Study Document Management</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}

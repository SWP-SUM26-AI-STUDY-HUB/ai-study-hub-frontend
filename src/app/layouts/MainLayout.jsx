import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { FloatingChatBox } from "../components/chat/FloatingChatBox";
import { Search, AlertTriangle, X } from 'lucide-react';
import { useApp } from "../context/AppContext";

const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, storageInfo } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [hideBanner, setHideBanner] = useState(false);

  const isHomePage = location.pathname === '/' || location.pathname === '/user/home';

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Calculate storage limits and warnings
  const isPremium = storageInfo?.planName?.toLowerCase().includes('premium');
  const limit = isPremium ? (storageInfo?.storageLimit || 5 * 1024 * 1024 * 1024) : (2 * 1024 * 1024 * 1024);
  const used = storageInfo?.storageUsed || 0;
  const percent = limit > 0 ? (used / limit) * 100 : 0;

  const isOverLimit = user?.status?.toLowerCase() === 'overlimitstorage' || percent >= 100;
  const showBanner = !hideBanner && storageInfo && (percent >= 90 || user?.status?.toLowerCase() === 'overlimitstorage');

  return (
    <div
      className="min-vh-100 d-flex flex-column"
      style={{ background: 'linear-gradient(135deg, rgba(253, 143, 82, 0.05) 0%, rgba(254, 103, 110, 0.05) 50%, rgba(255, 189, 113, 0.05) 100%)' }}
    >
      {/* Sticky Storage Warning Banner */}
      {showBanner && (
        <div 
          className="d-flex align-items-center justify-content-between px-4 py-2.5 text-white" 
          style={{
            background: isOverLimit 
              ? 'linear-gradient(90deg, #EA2027 0%, #EE5A24 100%)' 
              : 'linear-gradient(90deg, #F79F1F 0%, #FFC312 100%)',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            zIndex: 1050,
            position: 'sticky',
            top: 0
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <AlertTriangle size={18} className="flex-shrink-0 animate-bounce" />
            <span>
              {isOverLimit 
                ? `Your storage capacity has reached the maximum limit (${formatBytes(used)} / ${formatBytes(limit)}). You cannot upload new documents.`
                : `Your storage capacity is almost full (${percent.toFixed(1)}% - ${formatBytes(used)} / ${formatBytes(limit)}).`
              }
            </span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <button 
              className="btn btn-sm btn-light fw-bold text-dark px-3 py-1 rounded-pill"
              style={{ fontSize: '12px', border: 'none', transition: 'all 0.2s' }}
              onClick={() => navigate('/upgrade')}
            >
              Upgrade Now
            </button>
            <button 
              className="bg-transparent border-0 text-white p-0 d-flex align-items-center"
              style={{ opacity: 0.8, cursor: 'pointer' }}
              onClick={() => setHideBanner(true)}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Header/Navbar */}
      <Navbar />

      {/* Hero Section - Rendered only on Homepages */}
      {isHomePage && (
        <section className="py-5 text-center flex-grow-0" style={{ background: 'linear-gradient(135deg, rgba(253, 143, 82, 0.08) 0%, rgba(254, 103, 110, 0.08) 50%, rgba(255, 189, 113, 0.08) 100%)' }}>
          <div className="container">
            <h1 className="fw-bold text-dark mb-3 display-5">
              Explore Diverse Study Resources
            </h1>
            <p className="lead text-muted mb-0">
              A vast library of study materials including PDFs, Word docs, and PowerPoint presentations
              <br />
              covering all school subjects to professional academic research.
            </p>
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <main className="flex-grow-1">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />

      {/* Floating Chatbox */}
      <FloatingChatBox />
    </div>
  );
}

import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { FloatingChatBox } from "../components/chat/FloatingChatBox";
import { Search } from 'lucide-react';

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const isHomePage = location.pathname === '/' || location.pathname === '/user/home';

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex flex-column"
      style={{ background: 'linear-gradient(135deg, rgba(253, 143, 82, 0.05) 0%, rgba(254, 103, 110, 0.05) 50%, rgba(255, 189, 113, 0.05) 100%)' }}
    >
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

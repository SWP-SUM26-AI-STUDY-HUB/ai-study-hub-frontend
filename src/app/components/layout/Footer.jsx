import { useState } from 'react';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';

export function Footer() {
  const [name, setName] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !feedback.trim()) return;

    const sheetUrl = import.meta.env.VITE_GOOGLE_SHEETS_FEEDBACK_URL;

    // Check if the placeholder URL is not set or still default
    if (!sheetUrl || sheetUrl.includes('YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
      toast.success('Cảm ơn bạn đã gửi ý kiến đóng góp! (Chế độ offline)');
      setName('');
      setFeedback('');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Send as GET query parameters to avoid CORS preflight issues
      const targetUrl = `${sheetUrl}?name=${encodeURIComponent(name)}&feedback=${encodeURIComponent(feedback)}`;
      await fetch(targetUrl, {
        method: 'GET',
        mode: 'no-cors',
      });

      toast.success('Cảm ơn bạn đã gửi ý kiến đóng góp đến Google Sheets!');
      setName('');
      setFeedback('');
    } catch (error) {
      console.error('Feedback submit error:', error);
      toast.error('Không thể gửi feedback. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="text-white py-5" style={{ background: 'var(--bg-footer)', marginTop: '4rem', transition: 'background 0.3s ease' }}>
      <div className="container">
        <div className="row g-4 text-start">
          {/* About */}
          <div className="col-12 col-md-4">
            <h5 className="fw-bold mb-3">ABOUT STUDY HUB</h5>
            <p className="text-white-50 leading-relaxed mb-0" style={{ fontSize: '14px' }}>
              <strong>STUDY HUB</strong> book library website covering all subjects. Resources are available in multiple file formats such as <strong>eBook, MOBI, PRC,</strong> document files like <strong>DOC</strong>, and compatible with computers and e-readers, covering <strong>every topic, every content.</strong>.
            </p>
          </div>

          {/* Contact */}
          <div className="col-12 col-md-4">
            <h5 className="fw-bold mb-3">CONTACT</h5>
            <div className="d-flex align-items-center gap-2 text-white-50" style={{ fontSize: '14px' }}>
              <Mail className="h-4 w-4" />
              <span>Email: studydocsai@gmail.com</span>
            </div>
          </div>

          {/* Feedback Form */}
          <div className="col-12 col-md-4">
            <h5 className="fw-bold mb-3">FEEDBACK</h5>
            <p className="text-white-50 mb-3" style={{ fontSize: '14px' }}>
              We value your feedback. Please share your thoughts with us!
            </p>
            <form onSubmit={handleFeedbackSubmit} className="d-flex flex-column gap-2">
              <input
                type="text"
                placeholder="Full name / Tên của bạn..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-control bg-white-20 text-white placeholder-white-60 border-light-30"
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.15)', 
                  border: '1px solid rgba(255,255,255,0.3)', 
                  color: '#ffffff',
                  fontSize: '14px',
                  borderRadius: '8px'
                }}
                required
              />
              <textarea
                placeholder="Feedback / Nội dung đóng góp..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="form-control bg-white-20 text-white placeholder-white-60 border-light-30"
                rows={2}
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.15)', 
                  border: '1px solid rgba(255,255,255,0.3)', 
                  color: '#ffffff',
                  fontSize: '14px',
                  borderRadius: '8px',
                  resize: 'none'
                }}
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-light fw-bold px-3 py-1.5 align-self-end mt-1"
                style={{ 
                  color: '#C73866', 
                  borderRadius: '20px', 
                  fontSize: '13px',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting ? 'Sending...' : 'Send Feedback'}
              </button>
            </form>
          </div>
        </div>

        <hr className="my-4 bg-white opacity-25" />

        <div className="d-flex flex-column flex-md-row align-items-center justify-content-between text-white-50" style={{ fontSize: '14px' }}>
          <p className="mb-0">
            © 2024 <strong>StudyDocs.AI</strong> All rights reserved.
          </p>
          <div className="d-flex gap-3 mt-2 mt-md-0">
            <button className="btn btn-link text-white-50 text-decoration-none p-0 bg-transparent border-0" style={{ fontSize: '14px' }}>About</button>
            <span>•</span>
            <button className="btn btn-link text-white-50 text-decoration-none p-0 bg-transparent border-0" style={{ fontSize: '14px' }}>Privacy Policy</button>
            <span>•</span>
            <button className="btn btn-link text-white-50 text-decoration-none p-0 bg-transparent border-0" style={{ fontSize: '14px' }}>Terms of Service</button>
            <span>•</span>
            <button className="btn btn-link text-white-50 text-decoration-none p-0 bg-transparent border-0" style={{ fontSize: '14px' }}>Contact</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

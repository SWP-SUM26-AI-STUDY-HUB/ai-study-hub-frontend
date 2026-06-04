import { useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';

export function Footer() {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e) => {
    e.preventDefault();
    alert('Cảm ơn bạn đã đăng ký nhận tin!');
    setEmail('');
  };

  return (
    <footer className="text-white py-5" style={{ background: 'linear-gradient(to right, #C73866, #FD8F52, #FFBD71)', marginTop: '4rem' }}>
      <div className="container">
        <div className="row g-4 text-start">
          {/* About */}
          <div className="col-12 col-md-4">
            <h5 className="fw-bold mb-3">VỀ STUDYDOCS.AI</h5>
            <p className="text-white-50 leading-relaxed mb-0" style={{ fontSize: '14px' }}>
              <strong>STUDY HUB</strong> book library website covering all subjects. Resources are available in multiple file formats such as <strong>eBook, MOBI, PRC,</strong> document files like <strong>DOC</strong>, and compatible with computers and e-readers, covering <strong>every topic, every content.</strong>.
            </p>
          </div>

          {/* Contact */}
          <div className="col-12 col-md-4">
            <h5 className="fw-bold mb-3">LIÊN HỆ</h5>
            <div className="d-flex align-items-center gap-2 text-white-50" style={{ fontSize: '14px' }}>
              <Mail className="h-4 w-4" />
              <span>Email: studydocsai@gmail.com</span>
            </div>
          </div>

          {/* Newsletter */}
          <div className="col-12 col-md-4">
            <h5 className="fw-bold mb-3">ĐĂNG KÝ NHẬN TIN</h5>
            <p className="text-white-50 mb-3" style={{ fontSize: '14px' }}>
              Receive notifications about new books and useful resources every week
            </p>
            <form onSubmit={handleSubscribe} className="input-group">
              <input
                type="email"
                placeholder="Enter your email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control bg-white-20 text-white placeholder-white-60 border-light-30"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}
                required
              />
              <button
                type="submit"
                className="btn btn-light text-danger"
                style={{ color: '#C73866' }}
              >
                <ArrowRight className="h-4 w-4" />
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

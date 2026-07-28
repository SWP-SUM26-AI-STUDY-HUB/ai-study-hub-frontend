import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Upload, FileText, X, CheckCircle2, ArrowLeft, Eye, Lock, Plus, BookOpen, Tags, Tag, ChevronRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../api.js';

// Các định dạng file được phép upload (Word / PDF / Markdown / Text).
// Đây là nguồn sự thật duy nhất: cả validate logic và thuộc tính `accept`
// của input đều tham chiếu từ đây để tránh hai danh sách bị lệch nhau.
const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'md', 'txt'];
const ACCEPTED_FILE_TYPES = ALLOWED_EXTENSIONS.map(ext => '.' + ext).join(',');

export default function UploadDocumentPage() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // 1. Gộp Form State (Đã loại bỏ subject)
    const [form, setForm] = useState({ title: '', description: '', isPublic: true });
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');

    // Terms & Conditions States
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [agreeChecked, setAgreeChecked] = useState(false);

    // States cho gợi ý tag (Autocomplete) & tạo mới tag
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const dropdownRef = useRef(null);

    // 2. Upload States
    const [file, setFile] = useState(null);
    const [uiState, setUiState] = useState({ step: 'idle', progress: 0, dragActive: false });

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- LOGIC GỢI Ý TAG (Autocomplete) ---
    useEffect(() => {
        if (!tagInput.trim()) {
            setSuggestions([]);
            setShowDropdown(false);
            setIsLoadingSuggestions(false);
            return;
        }

        setIsLoadingSuggestions(true);
        setShowDropdown(true);

        const handler = setTimeout(async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/tags/search?keyword=${encodeURIComponent(tagInput.trim())}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const result = await response.json();
                if (result.success && result.data) {
                    // Lọc bỏ những tag đã được chọn
                    const filtered = result.data.filter(tag => !tags.some(t => t.id === tag.id));
                    setSuggestions(filtered);
                    setActiveIndex(-1);
                } else {
                    setSuggestions([]);
                }
            } catch (error) {
                console.error("Error fetching tags:", error);
                setSuggestions([]);
            } finally {
                setIsLoadingSuggestions(false);
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [tagInput, tags]);

    const addTag = (tagObj) => {
        if (tagObj && !tags.some(t => t.id === tagObj.id)) setTags([...tags, tagObj]);
        setTagInput('');
        setShowDropdown(false);
    };

    const handleCreateNewTag = async (newLabel) => {
        if (!newLabel.trim()) return;
        try {
            setIsLoadingSuggestions(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/v1/tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify([newLabel.trim()])
            });
            const result = await response.json();
            if (result.success && result.data && result.data[0]) {
                const newTag = result.data[0];
                addTag(newTag);
                toast.success(`Created and added tag "${newTag.label}"`);
            } else {
                toast.error(result.message || "Failed to create tag");
            }
        } catch (error) {
            console.error("Error creating tag:", error);
            toast.error("Failed to create tag due to connection error");
        } finally {
            setIsLoadingSuggestions(false);
            setTagInput('');
            setShowDropdown(false);
        }
    };

    const handleKeyDown = (e) => {
        const totalItems = suggestions.length + (tagInput.trim() ? 1 : 0);
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => Math.min(prev + 1, totalItems - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0) {
                if (activeIndex < suggestions.length) {
                    addTag(suggestions[activeIndex]);
                } else {
                    handleCreateNewTag(tagInput);
                }
            }
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    };

    const formatBytes = (b) => b === 0 ? '0 Bytes' : `${parseFloat((b / Math.pow(1024, Math.floor(Math.log(b) / Math.log(1024)))).toFixed(2))} ${['Bytes', 'KB', 'MB', 'GB'][Math.floor(Math.log(b) / Math.log(1024))]}`;

    const handleFile = (selectedFile) => {
        if (!selectedFile) return;
        const ext = selectedFile.name.split('.').pop().toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext))
            return toast.error("Unsupported file format! Only PDF, Word (.docx), Markdown (.md), and TXT files are allowed.");
        if (selectedFile.size > 50 * 1024 * 1024)
            return toast.error("File exceeds 50MB limit!");

        setFile(selectedFile);

        if (!form.title) setForm({ ...form, title: selectedFile.name.replace(/\.[^/.]+$/, "") });
    };

    const handleDrag = (e) => {
        e.preventDefault(); e.stopPropagation();
        setUiState(prev => ({ ...prev, dragActive: e.type === "dragenter" || e.type === "dragover" }));
    };

    const handleDrop = (e) => {
        handleDrag(e);
        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    };

    // =========================================================================
    // XỬ LÝ SUBMIT VÀ XÁC NHẬN TẢI LÊN TÀI LIỆU (UPLOAD FORM FLOW)
    // - Hoạt động:
    //   1. Hàm `handleUploadSubmit` chặn hành vi submit mặc định, kiểm tra tính hợp lệ của dữ liệu đầu vào.
    //      Nếu hợp lệ, hiển thị Modal điều khoản bảo mật thông tin (`TermsModal`).
    //   2. Khi người dùng bấm đồng ý trên Modal, hàm `confirmUpload` được kích hoạt.
    //   3. Hàm `confirmUpload` ẩn Modal điều khoản, chuyển trạng thái UI (`uiState`) sang 'uploading'
    //      và thiết lập một `setInterval` chạy mỗi 400ms để mô phỏng thanh tiến trình tăng dần đến 90%.
    //   4. Sau đó tiến hành tạo đối tượng `FormData` chứa tệp tin vật lý cùng các metadata (title, description, tags, visibility) 
    //      và POST lên API `POST /api/v1/documents/upload` kèm token xác thực.
    //   5. Khi có phản hồi thành công từ backend (HTTP 200, `success:true`), dừng bộ đếm `setInterval` (`clearInterval`),
    //      thiết lập progress 100%, chuyển UI sang 'success' và thông báo tài liệu đã tải lên — đang chờ admin duyệt.
    //      Lưu ý: moderation chạy bất đồng bộ phía backend (Redis Stream → OpenAI Moderation), KHÔNG còn quét client-side.
    // =========================================================================
    const handleUploadSubmit = (e) => {
        e.preventDefault();
        if (!file || !form.title.trim()) return toast.error("Please select a file and enter a title.");
        setAgreeChecked(false);
        setShowTermsModal(true);
    };

    const confirmUpload = async () => {
        // Đóng ẩn Modal điều khoản dịch vụ
        setShowTermsModal(false);
        // Cập nhật trạng thái UI bắt đầu tải lên và reset tiến trình upload về 0%
        setUiState({ ...uiState, step: 'uploading', progress: 0 });
        // Khởi chạy bộ đếm thời gian tăng dần thanh tiến trình (progress) tối đa đến 90% để giả lập tiến độ tải lên
        const interval = setInterval(() => setUiState(p => ({ ...p, progress: Math.min(p.progress + 15, 90) })), 400);

        try {
            // Khởi tạo đối tượng FormData để gửi dữ liệu dạng multipart form
            const formData = new FormData();
            // Đưa tệp tin nhị phân vào key 'file'
            formData.append('file', file);
            // Đưa tiêu đề tài liệu vào key 'title'
            formData.append('title', form.title);
            // Đưa mô tả nội dung vào key 'description'
            formData.append('description', form.description);
            // Xác định quyền riêng tư: hiển thị 'public' hoặc 'private' tùy theo lựa chọn của người dùng
            formData.append('visibility', form.isPublic ? 'public' : 'private');
            // Ghép nối danh sách các nhãn tag được phân tách bằng dấu phẩy
            formData.append('tags', tags.map(t => t.id).join(','));

            // Thực hiện yêu cầu HTTP POST gửi dữ liệu Form lên máy chủ
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });

            clearInterval(interval);
            const result = await response.json();

            if (response.ok && result.success) {
                setUiState({ step: 'success', progress: 100, dragActive: false });
                toast.success("Document uploaded successfully! Pending admin review.");
            } else {
                console.error("Upload failed details:", result);
                const errMsg = result.message || JSON.stringify(result) || "Upload failed";
                throw new Error(errMsg);
            }
        } catch (error) {
            clearInterval(interval);
            setUiState({ step: 'idle', progress: 0, dragActive: false });
            toast.error(error.message || "Upload error. Please try again.");
        }
    };

    return (
        <div className="container-fluid py-4 px-4 px-md-5 text-start upload-page-container">
            <style>{`
                .upload-page-container { background-color: var(--bg-global, #fafbfe); min-height: calc(100vh - 80px); font-family: 'Inter', system-ui, sans-serif; }
                .back-link { color: var(--text-muted, var(--muted-foreground)); font-size: 14px; transition: color 0.2s; }
                .back-link:hover { color: #FD8F52; }
                .upload-card { background: var(--bg-card-container, #ffffff); border: 1px solid var(--border-color, rgba(253, 143, 82, 0.15)); border-radius: 20px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05); transition: 0.3s; }
                .dropzone-container { border: 2px dashed var(--border-color, rgba(253, 143, 82, 0.3)); background-color: var(--bg-global, #FFF9F5); border-radius: 16px; padding: 40px 20px; text-align: center; cursor: pointer; min-height: 250px; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: 0.2s; }
                .dropzone-container.drag-active { border-color: #FD8F52; background-color: var(--bg-card-container, #FFEAD9); transform: scale(0.99); }
                .icon-upload-wrapper { width: 72px; height: 72px; background: linear-gradient(135deg, rgba(253, 143, 82, 0.15), rgba(255, 189, 113, 0.1)); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; color: #FD8F52; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
                .form-control-custom { background-color: var(--bg-global, #FFF9F5); color: var(--text-main, #000000); border: 1px solid var(--border-color, rgba(253, 143, 82, 0.2)); border-radius: 10px; padding: 12px 16px; font-size: 14px; transition: 0.2s; }
                .form-control-custom:focus { outline: none; border-color: #FD8F52; box-shadow: 0 0 0 3px rgba(253, 143, 82, 0.15); background-color: var(--bg-global, #fff); color: var(--text-main, #000000); }
                .tag-badge { background-color: var(--bg-global, #FFF5ED); color: #FD8F52; border: 1px solid var(--border-color, rgba(253, 143, 82, 0.25)); border-radius: 20px; padding: 6px 14px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; font-weight: 500; animation: tagFadeIn 0.2s ease-out; transition: all 0.2s; }
                .btn-close-tag { border: none; background: transparent; color: #FD8F52; cursor: pointer; padding: 0; display: flex; }
                .gradient-btn { background: linear-gradient(135deg, #C73866, #FD8F52); color: white; border: none; border-radius: 30px; padding: 12px 28px; font-weight: 600; transition: 0.2s; }
                .progress-bar-container { width: 100%; height: 8px; background-color: var(--bg-global, #eef1f6); border-radius: 4px; overflow: hidden; margin-top: 15px; }
                .progress-bar-fill { height: 100%; background: linear-gradient(90deg, #C73866, #FD8F52); transition: width 0.3s ease-out; }
                .tag-suggestions-list { position: absolute; width: 100%; background: var(--bg-card-container, #ffffff); border: 1px solid var(--border-color, rgba(253, 143, 82, 0.2)); border-radius: 12px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15); margin-top: 6px; padding: 6px 0; list-style: none; z-index: 1000; max-height: 200px; overflow-y: auto; }
                .tag-suggestion-item { padding: 10px 16px; font-size: 14px; color: var(--text-main, #4a5568); cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease; }
                .tag-suggestion-item.active, .tag-suggestion-item:hover { background-color: var(--bg-global, #FFF5ED); color: #FD8F52; }
                .tag-suggestion-empty, .tag-suggestion-loading { padding: 12px 16px; font-size: 13px; color: var(--text-muted, #a0aec0); text-align: center; }
                
                /* Terms Modal Styles */
                .terms-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(15, 23, 42, 0.45);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    animation: fadeIn 0.3s ease-out forwards;
                    padding: 16px;
                }
                .terms-modal-content {
                    background: var(--bg-card-container, #ffffff);
                    border: 1px solid var(--border-color, rgba(253, 143, 82, 0.2));
                    border-radius: 24px;
                    width: 100%;
                    max-width: 600px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    max-height: 90vh;
                }
                .terms-modal-header {
                    padding: 24px 24px 16px;
                    border-bottom: 1px solid rgba(253, 143, 82, 0.1);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .terms-modal-body {
                    padding: 24px;
                    overflow-y: auto;
                    font-size: 14px;
                    line-height: 1.6;
                    color: var(--text-main, #334155);
                }
                .terms-modal-footer {
                    padding: 16px 24px 24px;
                    border-top: 1px solid rgba(253, 143, 82, 0.1);
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    background-color: var(--bg-global, #fafbfe);
                }
                .terms-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .terms-item {
                    margin-bottom: 20px;
                    padding-bottom: 16px;
                    border-bottom: 1px dashed rgba(0, 0, 0, 0.05);
                }
                .terms-item:last-child {
                    margin-bottom: 0;
                    padding-bottom: 0;
                    border-bottom: none;
                }
                .terms-item-title {
                    font-weight: 700;
                    color: #0f172a;
                    margin-bottom: 6px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .terms-checkbox-label {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    cursor: pointer;
                    font-weight: 500;
                    color: #475569;
                    user-select: none;
                    background-color: var(--bg-global, #FFF9F5);
                    border: 1px solid var(--border-color, rgba(253, 143, 82, 0.15));
                    border-radius: 12px;
                    padding: 14px 16px;
                    transition: 0.2s;
                }
                .terms-checkbox-label:hover {
                    border-color: #FD8F52;
                    background-color: #FFF5ED;
                }
                .terms-checkbox-input {
                    margin-top: 4px;
                    width: 18px;
                    height: 18px;
                    accent-color: #FD8F52;
                    cursor: pointer;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <div className="mb-4">
                <Link to="/user/home" className="d-inline-flex align-items-center gap-2 text-decoration-none back-link fw-medium">
                    <ArrowLeft size={16} /> <span>Back to Homepage</span>
                </Link>
            </div>

            <div className="mb-4 d-flex align-items-center gap-3">
                <div className="p-2 rounded-3 bg-white shadow-sm border border-light" style={{ color: '#FD8F52' }}>
                    <BookOpen size={28} />
                </div>
                <div>
                    <h1 className="fw-bold text-dark mb-1" style={{ fontSize: '26px' }}>Upload Study Document</h1>
                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Share your study materials, lecture notes, or textbooks.</p>
                </div>
            </div>

            {uiState.step === 'success' ? (
                <div className="row justify-content-center">
                    <div className="col-lg-6 card upload-card p-5 text-center shadow-sm">
                        <div className="d-flex justify-content-center mb-4">
                            <div className="rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: '84px', height: '84px', background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)' }}>
                                <CheckCircle2 size={44} />
                            </div>
                        </div>
                        <h2 className="fw-bold text-dark mb-2">Upload Completed!</h2>
                        <p className="text-muted mb-4">Your document <strong>"{form.title}"</strong> has been successfully uploaded.</p>

                        <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center mt-3">
                            <button onClick={() => navigate('/my-documents')} className="btn gradient-btn px-4">Go to My Documents</button>
                            <button onClick={() => { setFile(null); setUiState({ step: 'idle', progress: 0, dragActive: false }); setForm({ title: '', description: '', isPublic: true }); setTags([]); }} className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold">Upload Another</button>
                        </div>
                    </div>
                </div>
            ) : uiState.step === 'uploading' ? (
                <div className="row justify-content-center">
                    <div className="col-lg-6 card upload-card p-5 text-center shadow-sm">
                        <div className="spinner-border text-primary mx-auto mb-4" style={{ width: '4rem', height: '4rem' }} role="status" />
                        <h3 className="fw-bold text-dark mb-2">Uploading Document</h3>
                        <div className="px-md-4">
                            <p className="text-muted mb-2">Uploading file to server ({uiState.progress}%)</p>
                            <div className="progress-bar-container"><div className="progress-bar-fill" style={{ width: `${uiState.progress}%` }}></div></div>
                        </div>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleUploadSubmit}>
                    <div className="row g-4">
                        <div className="col-lg-5">
                            <div className="card upload-card p-4 h-100 d-flex flex-column">
                                <h5 className="fw-bold text-dark mb-3">1. Select Study File</h5>
                                <input type="file" ref={fileInputRef} onChange={(e) => handleFile(e.target.files[0])} className="d-none" accept={ACCEPTED_FILE_TYPES} />

                                {!file ? (
                                    <div className={`dropzone-container flex-grow-1 ${uiState.dragActive ? 'drag-active' : ''}`} onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current.click()}>
                                        <div className="icon-upload-wrapper"><Upload size={32} /></div>
                                        <h6 className="fw-bold text-dark mb-1">Drag & drop document here</h6>
                                        <p className="text-muted mb-3 small">or click to browse your local files</p>
                                        <div className="border-top pt-3 w-100 mt-2"><span className="d-block text-muted small">Max file size: 50MB</span></div>
                                    </div>
                                ) : (
                                    <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center p-4 border rounded-3 text-center position-relative bg-light">
                                        <button type="button" onClick={() => setFile(null)} className="btn position-absolute top-0 end-0 m-2 text-muted border-0 bg-transparent"><X size={20} /></button>
                                        <div className="p-3 bg-white rounded-circle shadow-sm text-primary mb-3"><FileText size={40} /></div>
                                        <h6 className="fw-bold text-dark mb-1">{file.name}</h6>
                                        <span className="badge bg-secondary mb-3">{formatBytes(file.size)}</span>
                                        <button type="button" onClick={() => fileInputRef.current.click()} className="btn btn-sm btn-outline-primary rounded-pill px-3">Change File</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-lg-7">
                            <div className="card upload-card p-4">
                                <h5 className="fw-bold text-dark mb-4">2. Document Information</h5>

                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold" style={{ fontSize: '14px' }}>Document Title <span className="text-danger">*</span></label>
                                    <input type="text" className="form-control form-control-custom" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Enter title..." />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold" style={{ fontSize: '14px' }}>Access</label>
                                    <div className="d-flex gap-2">
                                        <button type="button" className={`btn btn-sm flex-fill py-2 text-start d-flex align-items-center gap-2 border ${form.isPublic ? 'btn-light border-primary' : 'btn-light'}`} onClick={() => setForm({ ...form, isPublic: true })} style={{ border: form.isPublic ? '1px solid #FD8F52' : '1px solid rgba(0,0,0,0.1)' }}>
                                            <Eye size={16} className={form.isPublic ? 'text-primary' : 'text-muted'} /> <span className="fw-bold" style={{ fontSize: '12px' }}>Public</span>
                                        </button>
                                        <button type="button" className={`btn btn-sm flex-fill py-2 text-start d-flex align-items-center gap-2 border ${!form.isPublic ? 'btn-light border-primary' : 'btn-light'}`} onClick={() => setForm({ ...form, isPublic: false })} style={{ border: !form.isPublic ? '1px solid #FD8F52' : '1px solid rgba(0,0,0,0.1)' }}>
                                            <Lock size={16} className={!form.isPublic ? 'text-primary' : 'text-muted'} /> <span className="fw-bold" style={{ fontSize: '12px' }}>Private</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold" style={{ fontSize: '14px' }}>Description</label>
                                    <textarea className="form-control form-control-custom" rows="2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief summary..."></textarea>
                                </div>

                                <div className="mb-4 position-relative" ref={dropdownRef}>
                                    <label className="form-label text-dark fw-bold d-flex align-items-center gap-1" style={{ fontSize: '14px' }}><Tags size={16} /><span>Tags</span></label>
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            className="form-control form-control-custom"
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            onFocus={() => {
                                                if (tagInput.trim()) setShowDropdown(true);
                                            }}
                                            placeholder="Type to search or create tags..."
                                        />
                                        {isLoadingSuggestions && (
                                            <div className="position-absolute end-0 top-50 translate-middle-y pe-3">
                                                <div className="spinner-border spinner-border-sm text-primary" style={{ width: '1rem', height: '1rem', color: '#FD8F52' }} role="status" />
                                            </div>
                                        )}
                                    </div>
                                    {showDropdown && (
                                        <ul className="tag-suggestions-list">
                                            {suggestions.map((tag, i) => (
                                                <li
                                                    key={tag.id}
                                                    className={`tag-suggestion-item d-flex align-items-center justify-content-between ${i === activeIndex ? 'active' : ''}`}
                                                    onClick={() => addTag(tag)}
                                                >
                                                    <div className="d-flex align-items-center gap-2">
                                                        <Tag size={14} className="opacity-75" />
                                                        <span>{tag.label}</span>
                                                    </div>
                                                    {tag.visibility === 'PRIVATE' ? (
                                                        <span className="badge bg-secondary-subtle text-secondary px-2 py-0.5" style={{ fontSize: '10px', borderRadius: '12px', border: '1px solid rgba(100, 116, 139, 0.15)' }}>
                                                            Private
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-primary-subtle text-primary px-2 py-0.5" style={{ fontSize: '10px', borderRadius: '12px', border: '1px solid rgba(253, 143, 82, 0.15)' }}>
                                                            Public
                                                        </span>
                                                    )}
                                                </li>
                                            ))}
                                            {tagInput.trim() && !suggestions.some(s => s.label.toLowerCase() === tagInput.trim().toLowerCase()) && (
                                                <li
                                                    className={`tag-suggestion-item text-primary fw-medium d-flex align-items-center justify-content-between ${activeIndex === suggestions.length ? 'active' : ''}`}
                                                    onClick={() => handleCreateNewTag(tagInput)}
                                                    style={{ borderTop: '1px solid rgba(253, 143, 82, 0.1)' }}
                                                >
                                                    <div className="d-flex align-items-center gap-2">
                                                        <Plus size={14} />
                                                        <span>Create tag: "{tagInput.trim()}"</span>
                                                    </div>
                                                    <span className="badge bg-secondary-subtle text-secondary px-2 py-0.5" style={{ fontSize: '10px', borderRadius: '12px', border: '1px solid rgba(100, 116, 139, 0.15)' }}>
                                                        Private
                                                    </span>
                                                </li>
                                            )}
                                            {suggestions.length === 0 && !tagInput.trim() && (
                                                <li className="tag-suggestion-empty">Type to search tags...</li>
                                            )}
                                        </ul>
                                    )}
                                    <div className="d-flex flex-wrap gap-2 pt-2">
                                        {tags.map(tag => (
                                            <span key={tag.id} className="tag-badge" style={tag.visibility === 'PRIVATE' ? { borderColor: '#cbd5e1', color: '#64748b', backgroundColor: '#f8fafc' } : {}}>
                                                {tag.label}
                                                <button type="button" onClick={() => setTags(tags.filter(t => t.id !== tag.id))} className="btn-close-tag" style={tag.visibility === 'PRIVATE' ? { color: '#64748b' } : {}}><X size={12} /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="d-flex align-items-center justify-content-between border-top pt-3 mt-4">
                                    <span className="text-muted small">Make sure all details are correct.</span>
                                    <button type="submit" disabled={!file} className="btn gradient-btn px-4 d-flex align-items-center gap-2"><span>Upload Document</span> <ChevronRight size={18} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            )}

            {/* Terms and Disclaimer Modal */}
            {showTermsModal && (
                <div className="terms-modal-overlay" onClick={() => setShowTermsModal(false)}>
                    <div className="terms-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="terms-modal-header bg-light">
                            <div className="p-2 rounded bg-white shadow-sm border border-light" style={{ color: '#C73866' }}>
                                <ShieldCheck size={24} />
                            </div>
                            <div className="text-start">
                                <h5 className="fw-bold text-dark mb-0">Document Upload Terms & Agreement</h5>
                                <p className="text-muted mb-0 small">Please read and confirm the terms before uploading.</p>
                            </div>
                            <button type="button" onClick={() => setShowTermsModal(false)} className="btn btn-link ms-auto text-muted p-0 border-0"><X size={20} /></button>
                        </div>
                        <div className="terms-modal-body text-start">
                            <ul className="terms-list">
                                {form.isPublic ? (
                                    <li className="terms-item">
                                        <div className="terms-item-title text-danger">
                                            <AlertTriangle size={16} /> Document Usage Rights (Public)
                                        </div>
                                        <p className="text-muted mb-0">
                                            When you share a document as <strong>Public</strong>, it will be visible to all users on the platform. You agree that any member can view, download, study, and use this document freely <strong>without copyright restrictions</strong> or licensing fees.
                                        </p>
                                    </li>
                                ) : (
                                    <li className="terms-item">
                                        <div className="terms-item-title text-success">
                                            <ShieldCheck size={16} /> Content Security (Private)
                                        </div>
                                        <p className="text-muted mb-0">
                                            For documents uploaded in <strong>Private</strong> mode, the system guarantees absolute security and storage for your account only. No other users will have access to view or download this file.
                                        </p>
                                    </li>
                                )}
                                <li className="terms-item">
                                    <div className="terms-item-title text-dark">
                                        <ShieldCheck size={16} className="text-primary" /> Content Responsibility
                                    </div>
                                    <p className="text-muted mb-0">
                                        You confirm that this document is created by you or you have the full legal right to share it. You assume full legal responsibility in case of copyright disputes or content violating laws.
                                    </p>
                                </li>
                                <li className="terms-item">
                                    <div className="terms-item-title text-dark">
                                        <ShieldCheck size={16} className="text-info" /> Content Moderation
                                    </div>
                                    <p className="text-muted mb-0">
                                        Public documents are reviewed by our moderation system to ensure compliance with community standards (no malware, violence, or sensitive/inappropriate content) before they become visible to other users.
                                    </p>
                                </li>
                            </ul>

                            <div className="mt-4">
                                <label className="terms-checkbox-label w-100">
                                    <input
                                        type="checkbox"
                                        className="terms-checkbox-input"
                                        checked={agreeChecked}
                                        onChange={(e) => setAgreeChecked(e.target.checked)}
                                    />
                                    <span style={{ fontSize: '13px' }}>I have read and agree to all terms regarding security, privacy, and free copyright usage for public documents as stated above.</span>
                                </label>
                            </div>
                        </div>
                        <div className="terms-modal-footer">
                            <button type="button" onClick={() => setShowTermsModal(false)} className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold">Cancel</button>
                            <button
                                type="button"
                                onClick={confirmUpload}
                                disabled={!agreeChecked}
                                className="btn gradient-btn px-4 py-2"
                                style={{ opacity: agreeChecked ? 1 : 0.65 }}
                            >
                                Confirm & Upload
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Upload, FileText, X, CheckCircle2, ArrowLeft, Eye, Lock, Plus, BookOpen, Tags, Tag, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function UploadDocumentPage() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // 1. Gộp Form State (Đã loại bỏ subject)
    const [form, setForm] = useState({ title: '', description: '', isPublic: true });
    const [tags, setTags] = useState([]);
    
    // States cho tính năng chọn tag trực tiếp từ Database
    const [allTags, setAllTags] = useState([]);
    const [isLoadingTags, setIsLoadingTags] = useState(false);

    // 2. Upload States
    const [file, setFile] = useState(null);
    const [uiState, setUiState] = useState({ step: 'idle', progress: 0, dragActive: false });

    // Tải toàn bộ danh sách tag có sẵn từ Database lúc khởi tạo (Hỗ trợ cơ chế fallback)
    useEffect(() => {
        const fetchAllTags = async () => {
            try {
                setIsLoadingTags(true);
                const token = localStorage.getItem('token');
                
                // Thử cách 1: Gọi API lấy toàn bộ tags chung
                try {
                    const response = await fetch('http://14.225.254.145:8080/api/v1/tags', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const result = await response.json();
                    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                        setAllTags(result.data);
                        return;
                    }
                } catch (e) {
                    console.warn("API GET /tags failed, trying search with empty keyword:", e);
                }

                // Thử cách 2: Gọi API tìm kiếm với keyword rỗng
                try {
                    const response = await fetch('http://14.225.254.145:8080/api/v1/tags/search?keyword=', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const result = await response.json();
                    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                        setAllTags(result.data);
                        return;
                    }
                } catch (e) {
                    console.warn("API search with empty keyword failed, trying parallel search:", e);
                }

                // Thử cách 3: Tìm kiếm song song bằng các ký tự phổ biến để gom toàn bộ tag
                try {
                    const searchKeys = ['a', 'e', 'i', 'o', 'u', 'c', 's', 'l', 'p', 'd'];
                    const promises = searchKeys.map(k => 
                        fetch(`http://14.225.254.145:8080/api/v1/tags/search?keyword=${k}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        }).then(r => r.json()).catch(() => ({ success: false, data: [] }))
                    );
                    
                    const results = await Promise.all(promises);
                    const mergedTagsMap = {};
                    
                    results.forEach(res => {
                        if (res.success && Array.isArray(res.data)) {
                            res.data.forEach(tag => {
                                if (tag && tag.id) {
                                    mergedTagsMap[tag.id] = tag;
                                }
                            });
                        }
                    });
                    
                    const uniqueTags = Object.values(mergedTagsMap);
                    if (uniqueTags.length > 0) {
                        setAllTags(uniqueTags);
                    }
                } catch (e) {
                    console.error("Parallel search method failed:", e);
                }
            } catch (error) {
                console.error("Error loading tags:", error);
            } finally {
                setIsLoadingTags(false);
            }
        };
        fetchAllTags();
    }, []);

    const toggleTag = (tag) => {
        if (tags.some(t => t.id === tag.id)) {
            setTags(tags.filter(t => t.id !== tag.id));
        } else {
            setTags([...tags, tag]);
        }
    };

    const formatBytes = (b) => b === 0 ? '0 Bytes' : `${parseFloat((b / Math.pow(1024, Math.floor(Math.log(b) / Math.log(1024)))).toFixed(2))} ${['Bytes', 'KB', 'MB', 'GB'][Math.floor(Math.log(b) / Math.log(1024))]}`;

    const handleFile = (selectedFile) => {
        if (!selectedFile) return;
        const ext = selectedFile.name.split('.').pop().toLowerCase();
        if (!['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) 
            return toast.error("Unsupported file format!");
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

    // --- LOGIC UPLOAD CẬP NHẬT ĐÚNG CẤU TRÚC FORM-DATA ---
    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!file || !form.title.trim()) return toast.error("Please select a file and enter a title.");

        setUiState({ ...uiState, step: 'uploading', progress: 0 });
        const interval = setInterval(() => setUiState(p => ({ ...p, progress: Math.min(p.progress + 15, 90) })), 400);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', form.title);
            formData.append('description', form.description);
            formData.append('visibility', form.isPublic ? 'public' : 'private');
            formData.append('tags', tags.map(t => t.id).join(','));

            const response = await fetch('http://14.225.254.145:8080/api/v1/documents/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });

            clearInterval(interval);
            const result = await response.json();
            
            if (response.ok && result.success) {
                setUiState({ step: 'uploading', progress: 100, dragActive: false });
                setTimeout(() => { setUiState(p => ({ ...p, step: 'success' })); toast.success("Uploaded successfully!"); }, 500);
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
                .upload-page-container { background-color: #fafbfe; min-height: calc(100vh - 80px); font-family: 'Inter', system-ui, sans-serif; }
                .back-link { color: var(--muted-foreground); font-size: 14px; transition: color 0.2s; }
                .back-link:hover { color: var(--primary); }
                .upload-card { background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.15); border-radius: 20px; box-shadow: 0 10px 30px rgba(253, 143, 82, 0.04); transition: 0.3s; }
                .dropzone-container { border: 2px dashed rgba(253, 143, 82, 0.3); background-color: #FFF9F5; border-radius: 16px; padding: 40px 20px; text-align: center; cursor: pointer; min-height: 250px; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: 0.2s; }
                .dropzone-container.drag-active { border-color: #FD8F52; background-color: #FFEAD9; transform: scale(0.99); }
                .icon-upload-wrapper { width: 72px; height: 72px; background: linear-gradient(135deg, #FFEAD9, #FFF5ED); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; color: #FD8F52; box-shadow: 0 4px 10px rgba(253, 143, 82, 0.1); }
                .form-control-custom { background-color: #FFF9F5; border: 1px solid rgba(253, 143, 82, 0.2); border-radius: 10px; padding: 12px 16px; font-size: 14px; transition: 0.2s; }
                .form-control-custom:focus { outline: none; border-color: #FD8F52; box-shadow: 0 0 0 3px rgba(253, 143, 82, 0.15); background-color: #fff; }
                .tag-badge { background-color: #FFF5ED; color: #FD8F52; border: 1px solid rgba(253, 143, 82, 0.25); border-radius: 20px; padding: 6px 14px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; font-weight: 500; animation: tagFadeIn 0.2s ease-out; transition: all 0.2s; }
                .btn-close-tag { border: none; background: transparent; color: #FD8F52; cursor: pointer; padding: 0; display: flex; }
                .gradient-btn { background: linear-gradient(135deg, #C73866, #FD8F52); color: white; border: none; border-radius: 30px; padding: 12px 28px; font-weight: 600; transition: 0.2s; }
                .progress-bar-container { width: 100%; height: 8px; background-color: #eef1f6; border-radius: 4px; overflow: hidden; margin-top: 15px; }
                .progress-bar-fill { height: 100%; background: linear-gradient(90deg, #C73866, #FD8F52); transition: width 0.3s ease-out; }
                .btn-tag-select { background-color: #FFF9F5; color: #6b7280; border: 1px solid rgba(253, 143, 82, 0.2); border-radius: 20px; padding: 6px 14px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; display: inline-flex; align-items: center; margin-bottom: 2px; }
                .btn-tag-select:hover { background-color: #FFF5ED; color: #FD8F52; border-color: rgba(253, 143, 82, 0.3); }
                .btn-tag-select.selected { background-color: #FFF5ED; color: #FD8F52; border-color: #FD8F52; box-shadow: 0 2px 6px rgba(253, 143, 82, 0.15); }
                .btn-tag-select.selected:hover { background-color: #FFEAD9; }
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
                        <div className="spinner-border text-primary mx-auto mb-4" style={{ width: '4rem', height: '4rem' }} role="status"/>
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
                                <input type="file" ref={fileInputRef} onChange={(e) => handleFile(e.target.files[0])} className="d-none" accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx" />

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
                                    <input type="text" className="form-control form-control-custom" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="Enter title..." />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold" style={{ fontSize: '14px' }}>Access</label>
                                    <div className="d-flex gap-2">
                                        <button type="button" className={`btn btn-sm flex-fill py-2 text-start d-flex align-items-center gap-2 border ${form.isPublic ? 'btn-light border-primary' : 'btn-light'}`} onClick={() => setForm({...form, isPublic: true})} style={{ border: form.isPublic ? '1px solid #FD8F52 !important' : '1px solid rgba(0,0,0,0.1)' }}>
                                            <Eye size={16} className={form.isPublic ? 'text-primary' : 'text-muted'} /> <span className="fw-bold" style={{ fontSize: '12px' }}>Public</span>
                                        </button>
                                        <button type="button" className={`btn btn-sm flex-fill py-2 text-start d-flex align-items-center gap-2 border ${!form.isPublic ? 'btn-light border-primary' : 'btn-light'}`} onClick={() => setForm({...form, isPublic: false})} style={{ border: !form.isPublic ? '1px solid #FD8F52 !important' : '1px solid rgba(0,0,0,0.1)' }}>
                                            <Lock size={16} className={!form.isPublic ? 'text-primary' : 'text-muted'} /> <span className="fw-bold" style={{ fontSize: '12px' }}>Private</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold" style={{ fontSize: '14px' }}>Description</label>
                                    <textarea className="form-control form-control-custom" rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Brief summary..."></textarea>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label text-dark fw-bold d-flex align-items-center gap-1" style={{ fontSize: '14px' }}><Tags size={16} /><span>Select Tags</span></label>
                                    {isLoadingTags ? (
                                        <div className="d-flex align-items-center gap-2 py-2">
                                            <div className="spinner-border spinner-border-sm" style={{ width: '1rem', height: '1rem', color: '#FD8F52' }} role="status" />
                                            <span className="text-muted small">Loading tags...</span>
                                        </div>
                                    ) : allTags.length > 0 ? (
                                        <div className="d-flex flex-wrap gap-2 py-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                            {allTags.map(tag => {
                                                const isSelected = tags.some(t => t.id === tag.id);
                                                return (
                                                    <button
                                                        key={tag.id}
                                                        type="button"
                                                        onClick={() => toggleTag(tag)}
                                                        className={`btn-tag-select ${isSelected ? 'selected' : ''}`}
                                                    >
                                                        <Tag size={12} className="me-1 opacity-75" />
                                                        <span>{tag.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <span className="text-muted small">No tags available in database.</span>
                                    )}
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
        </div>
    );
}
import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Upload, FileText, X, CheckCircle2, ArrowLeft, Eye, Lock, Plus, BookOpen, Tags, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function UploadDocumentPage() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // 1. Gộp Form State cho gọn
    const [form, setForm] = useState({ title: '', subject: 'Technology', description: '', isPublic: true });
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');

    // 2. Upload States
    const [file, setFile] = useState(null);
    const [uiState, setUiState] = useState({ step: 'idle', progress: 0, dragActive: false });

    const subjects = ['Technology', 'Science', 'Business', 'Java Programming', 'Python Programming', 'JavaScript Programming', 'Mathematics', 'Artificial Intelligence', 'Physics', 'Web Development', 'Database'];

    const formatBytes = (b) => b === 0 ? '0 Bytes' : `${parseFloat((b / Math.pow(1024, Math.floor(Math.log(b) / Math.log(1024)))).toFixed(2))} ${['Bytes', 'KB', 'MB', 'GB'][Math.floor(Math.log(b) / Math.log(1024))]}`;

    // Xử lý chung khi chọn file hoặc kéo thả file
    const handleFile = (selectedFile) => {
        if (!selectedFile) return;
        const ext = selectedFile.name.split('.').pop().toLowerCase();
        if (!['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) 
            return toast.error("Unsupported file format!");
        if (selectedFile.size > 50 * 1024 * 1024) 
            return toast.error("File exceeds 50MB limit!");

        setFile(selectedFile);
        
        // Tự động điền Title & Tag nếu chưa có
        if (!form.title) setForm({ ...form, title: selectedFile.name.replace(/\.[^/.]+$/, "") });
        if (ext && !tags.includes(ext.toUpperCase())) setTags(prev => [...prev, ext.toUpperCase()]);
    };

    const handleDrag = (e) => {
        e.preventDefault(); e.stopPropagation();
        setUiState(prev => ({ ...prev, dragActive: e.type === "dragenter" || e.type === "dragover" }));
    };

    const handleDrop = (e) => {
        handleDrag(e);
        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!file || !form.title.trim()) return toast.error("Please select a file and enter a title.");

        setUiState({ ...uiState, step: 'uploading', progress: 0 });
        const interval = setInterval(() => setUiState(p => ({ ...p, progress: Math.min(p.progress + 15, 90) })), 400);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('request', new Blob([JSON.stringify({ ...form, tags })], { type: 'application/json' }));

            const response = await fetch('http://14.225.254.145:8080/api/v1/documents/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });

            clearInterval(interval);
            if (response.ok && (await response.json()).success) {
                setUiState({ step: 'uploading', progress: 100, dragActive: false });
                setTimeout(() => { setUiState(p => ({ ...p, step: 'success' })); toast.success("Uploaded successfully!"); }, 500);
            } else throw new Error("Upload failed");
        } catch (error) {
            clearInterval(interval);
            setUiState({ step: 'idle', progress: 0, dragActive: false });
            toast.error("Upload error. Please try again.");
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
                .tag-badge { background-color: #FFF5ED; color: #FD8F52; border: 1px solid rgba(253, 143, 82, 0.25); border-radius: 20px; padding: 6px 14px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; font-weight: 500; }
                .btn-close-tag { border: none; background: transparent; color: #FD8F52; cursor: pointer; padding: 0; display: flex; }
                .gradient-btn { background: linear-gradient(135deg, #C73866, #FD8F52); color: white; border: none; border-radius: 30px; padding: 12px 28px; font-weight: 600; transition: 0.2s; }
                .gradient-btn:disabled { background: #ccc; cursor: not-allowed; }
                .progress-bar-container { width: 100%; height: 8px; background-color: #eef1f6; border-radius: 4px; overflow: hidden; margin-top: 15px; }
                .progress-bar-fill { height: 100%; background: linear-gradient(90deg, #C73866, #FD8F52); transition: width 0.3s ease-out; }
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
                            <button onClick={() => { setFile(null); setUiState({ step: 'idle', progress: 0, dragActive: false }); setForm({ ...form, title: '', description: '' }); setTags([]); }} className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold">Upload Another</button>
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
                        {/* Drag & Drop Zone */}
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

                        {/* Metadata Form */}
                        <div className="col-lg-7">
                            <div className="card upload-card p-4">
                                <h5 className="fw-bold text-dark mb-4">2. Document Information</h5>

                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold" style={{ fontSize: '14px' }}>Document Title <span className="text-danger">*</span></label>
                                    <input type="text" className="form-control form-control-custom" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="Enter title..." />
                                </div>

                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label text-dark fw-bold" style={{ fontSize: '14px' }}>Subject / Topic <span className="text-danger">*</span></label>
                                        <select className="form-select form-control-custom" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}>
                                            {subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
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
                                </div>

                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold" style={{ fontSize: '14px' }}>Description</label>
                                    <textarea className="form-control form-control-custom" rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Brief summary..."></textarea>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label text-dark fw-bold d-flex align-items-center gap-1" style={{ fontSize: '14px' }}><Tags size={16} /><span>Tags</span></label>
                                    <div className="input-group mb-2">
                                        <input type="text" className="form-control form-control-custom" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if(tagInput.trim() && !tags.includes(tagInput.trim())) { setTags([...tags, tagInput.trim()]); setTagInput(''); } } }} placeholder="Type tag and press Enter" />
                                        <button type="button" onClick={() => { if(tagInput.trim() && !tags.includes(tagInput.trim())) { setTags([...tags, tagInput.trim()]); setTagInput(''); } }} className="btn btn-outline-primary d-flex align-items-center gap-1" style={{ borderRadius: '0 10px 10px 0', borderColor: 'rgba(253, 143, 82, 0.2)' }}><Plus size={16} /> Add</button>
                                    </div>
                                    <div className="d-flex flex-wrap gap-2 pt-1">
                                        {tags.map(tag => (
                                            <span key={tag} className="tag-badge">{tag} <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="btn-close-tag"><X size={12} /></button></span>
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
        </div>
    );
}
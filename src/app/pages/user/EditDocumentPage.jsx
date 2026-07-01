import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft, X, Check, Tags, Tag, Plus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function EditDocumentPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const preLoadedDoc = location?.state?.document;

    const [title, setTitle] = useState(preLoadedDoc?.title || '');
    const [description, setDescription] = useState(preLoadedDoc?.description || '');
    const [selectedTags, setSelectedTags] = useState([]);

    // Autocomplete tag states
    const [tagInput, setTagInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const dropdownRef = useRef(null);

    const [isPublic, setIsPublic] = useState(
        preLoadedDoc?.visibility === 'PUBLIC' || preLoadedDoc?.status === 'PUBLIC' || preLoadedDoc?.status === 'PENDING'
    );

    const [isFetching, setIsFetching] = useState(false);
    const [fullDocumentData, setFullDocumentData] = useState(preLoadedDoc || null);

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

    // Autocomplete Tag Search
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
                const response = await fetch(`http://14.225.254.145:8080/api/v1/tags/search?keyword=${encodeURIComponent(tagInput.trim())}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const result = await response.json();
                if (result.success && result.data) {
                    // Filter out already selected tags
                    const filtered = result.data.filter(tag => !selectedTags.some(t => t.id === tag.id));
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
    }, [tagInput, selectedTags]);

    const addTag = (tagObj) => {
        if (tagObj && !selectedTags.some(t => t.id === tagObj.id)) {
            setSelectedTags([...selectedTags, tagObj]);
        }
        setTagInput('');
        setShowDropdown(false);
    };

    const handleCreateNewTag = async (newLabel) => {
        if (!newLabel.trim()) return;
        try {
            setIsLoadingSuggestions(true);
            const token = localStorage.getItem('token');
            const response = await fetch('http://14.225.254.145:8080/api/v1/tags', {
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

    // Robust Tag Parsing from document API
    const parseInitialTags = (docObj) => {
        if (!docObj || !docObj.tags) return [];
        const initialTags = [];
        const detectedIds = new Set();

        const addTagObj = (id, label) => {
            const tagId = Number(id);
            if (!isNaN(tagId) && !detectedIds.has(tagId)) {
                detectedIds.add(tagId);
                initialTags.push({ id: tagId, label: String(label) });
            }
        };

        if (Array.isArray(docObj.tags)) {
            docObj.tags.forEach(t => {
                if (t && typeof t === 'object') {
                    addTagObj(t.id, t.label || t.name || '');
                } else if (t) {
                    addTagObj(t, t);
                }
            });
        } else if (typeof docObj.tags === 'object') {
            Object.entries(docObj.tags).forEach(([key, value]) => {
                addTagObj(key, value);
            });
        }
        return initialTags;
    };

    useEffect(() => {
        if (preLoadedDoc) {
            setSelectedTags(parseInitialTags(preLoadedDoc));
        }
    }, [preLoadedDoc]);

    // 2. Fetch chi tiết tài liệu
    useEffect(() => {
        const fetchDocumentDetail = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                setIsFetching(true);
                const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/${id}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    console.warn('Server API detail returned 500 error, using router state fallback.');
                    return;
                }

                const result = await response.json();
                if (result && result.data) {
                    const doc = result.data;
                    setFullDocumentData(doc);
                    setTitle(doc.title || '');
                    setDescription(doc.description || '');
                    setSelectedTags(parseInitialTags(doc));
                    setIsPublic(doc.visibility === 'PUBLIC' || doc.status === 'PUBLIC' || doc.status === 'PENDING');
                }
            } catch (error) {
                console.error('API Error:', error);
            } finally {
                setIsFetching(false);
            }
        };

        if (id) {
            fetchDocumentDetail();
        }
    }, [id]);

    const handleToggleTag = (tagItem) => {
        if (!tagItem || !tagItem.id) return;
        setSelectedTags(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            const isExisted = safePrev.some(t => t && t.id === tagItem.id);
            if (isExisted) {
                return safePrev.filter(t => t && t.id !== tagItem.id);
            } else {
                // Đồng bộ cấu trúc tag lưu trữ trong state
                return [...safePrev, { id: tagItem.id, label: tagItem.label || tagItem.name }];
            }
        });
    };

    useEffect(() => {
        const handleOutsideClick = () => setIsOpenDropdown(false);
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Session expired. Please login again.');
                return;
            }

            // Trích xuất mảng các số nguyên ID thuần túy gửi lên API PUT
            let intTagsPayload = [];
            if (Array.isArray(selectedTags) && selectedTags.length > 0) {
                intTagsPayload = selectedTags.map(tag => Number(tag.id));
            } else {
                intTagsPayload = [];
            }

            const updatePayload = {
                title: title,
                description: description,
                visibility: isPublic ? 'PUBLIC' : 'PRIVATE',
                tags: intTagsPayload // Truyền mảng Int [1, 2] đúng định dạng Swagger yêu cầu
            };

            const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatePayload)
            });

            if (!response.ok) throw new Error('Failed to update document data');

            toast.success('Document updated successfully!');
            navigate('/my-documents');
        } catch (error) {
            console.error('Error updating document:', error);
            toast.error('Failed to save changes. Please try again.');
        }
    };

    return (
        <div className="container-fluid py-4 px-4 px-md-5 text-start">
            <style>{`
                .tag-badge { background-color: #FFF5ED; color: #FD8F52; border: 1px solid rgba(253, 143, 82, 0.25); border-radius: 20px; padding: 6px 14px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; font-weight: 500; animation: tagFadeIn 0.2s ease-out; transition: all 0.2s; }
                .btn-close-tag { border: none; background: transparent; color: #FD8F52; cursor: pointer; padding: 0; display: flex; }
                .tag-suggestions-list { position: absolute; width: 100%; background: #ffffff; border: 1px solid rgba(253, 143, 82, 0.2); border-radius: 12px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08); margin-top: 6px; padding: 6px 0; list-style: none; z-index: 1000; max-height: 200px; overflow-y: auto; }
                .tag-suggestion-item { padding: 10px 16px; font-size: 14px; color: #4a5568; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease; text-align: left; }
                .tag-suggestion-item.active, .tag-suggestion-item:hover { background-color: #FFF5ED; color: #FD8F52; }
                .tag-suggestion-empty, .tag-suggestion-loading { padding: 12px 16px; font-size: 13px; color: #a0aec0; text-align: center; }
            `}</style>
            <div className="mb-3">
                <button className="btn btn-link text-decoration-none text-muted p-0 d-flex align-items-center gap-2" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to My Document
                </button>
            </div>

            <div className="mx-auto w-100" style={{ maxWidth: '800px' }}>
                <div className="mb-4 d-flex justify-content-between align-items-center">
                    <div>
                        <h1 className="fw-bold text-dark mb-1" style={{ fontSize: '28px' }}>Edit Document</h1>
                        <p className="text-muted mb-0">Update information about your document</p>
                    </div>
                </div>

                <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                    <div className="card-body p-4">
                        <h4 className="card-title fw-bold text-dark mb-4">Document Information</h4>

                        <form onSubmit={handleSubmit} className="d-flex flex-column gap-4">
                            <div className="row g-3">
                                <div className="col-12 text-start">
                                    <label htmlFor="title" className="form-label fw-semibold text-dark">
                                        Title <span className="text-danger">*</span>
                                    </label>
                                    <input id="title" type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required />
                                </div>

                                <div className="col-12 text-start position-relative" ref={dropdownRef}>
                                    <label className="form-label fw-semibold text-dark mb-2 d-flex align-items-center gap-1">
                                        <Tags size={16} /><span>Tags (Select Multiple)</span> <span className="text-danger">*</span>
                                    </label>
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            className="form-control"
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
                                                    className={`tag-suggestion-item ${i === activeIndex ? 'active' : ''}`}
                                                    onClick={() => addTag(tag)}
                                                >
                                                    <Tag size={14} className="opacity-75" />
                                                    <span>{tag.label}</span>
                                                </li>
                                            ))}
                                            {tagInput.trim() && !suggestions.some(s => s.label.toLowerCase() === tagInput.trim().toLowerCase()) && (
                                                <li
                                                    className={`tag-suggestion-item text-primary fw-medium ${activeIndex === suggestions.length ? 'active' : ''}`}
                                                    onClick={() => handleCreateNewTag(tagInput)}
                                                    style={{ borderTop: '1px solid rgba(253, 143, 82, 0.1)' }}
                                                >
                                                    <Plus size={14} />
                                                    <span>Create tag: "{tagInput.trim()}"</span>
                                                </li>
                                            )}
                                            {suggestions.length === 0 && !tagInput.trim() && (
                                                <li className="tag-suggestion-empty">Type to search tags...</li>
                                            )}
                                        </ul>
                                    )}
                                    <div className="d-flex flex-wrap gap-2 pt-2">
                                        {selectedTags.map(tag => (
                                            <span key={tag.id} className="tag-badge">
                                                {tag.label || tag.name}
                                                <button type="button" onClick={() => setSelectedTags(selectedTags.filter(t => t.id !== tag.id))} className="btn-close-tag">
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="col-12 text-start">
                                    <label htmlFor="description" className="form-label fw-semibold text-dark">Description</label>
                                    <textarea id="description" className="form-control" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                                </div>
                            </div>

                            <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded-3">
                                <div className="text-start flex-grow-1">
                                    <label htmlFor="public-toggle" className="fw-bold text-dark mb-1" style={{ cursor: 'pointer', fontSize: '15px' }}>
                                        Make this document public
                                    </label>
                                    <p className="text-muted mb-0" style={{ fontSize: '13px' }}>
                                        Public documents will be reviewed by admins before appearing in search
                                    </p>
                                </div>
                                <div className="form-check form-switch fs-5">
                                    <input id="public-toggle" className="form-check-input" type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} style={{ cursor: 'pointer', outline: 'none', boxShadow: 'none' }} />
                                </div>
                            </div>

                            <div className="d-flex gap-3">
                                <button type="submit" disabled={isFetching} className="btn text-white px-4 py-2 border-0 fw-bold flex-grow-1" style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}>
                                    Save Changes
                                </button>
                                <button type="button" className="btn btn-outline-secondary px-4 py-2" onClick={() => navigate('/my-documents')}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}



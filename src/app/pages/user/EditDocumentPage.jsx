import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { mockDocuments } from '../../data/mockData';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function EditDocumentPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const document = mockDocuments.find((doc) => doc.id === id);

    const [title, setTitle] = useState(document?.title || '');
    const initialTags = [
        ...(document?.subject ? [document.subject] : []),
        ...(document?.tags || [])
    ];
    const uniqueTags = Array.from(new Set(initialTags));
    const [tags, setTags] = useState(uniqueTags.join(', ') || '');
    const [description, setDescription] = useState(document?.description || '');
    const [isPublic, setIsPublic] = useState(document?.status === 'public' || document?.status === 'pending');

    const handleSubmit = (e) => {
        e.preventDefault();

        const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
        const newSubject = parsedTags[0] || 'Uncategorized';

        if (document) {
            document.title = title;
            document.subject = newSubject;
            document.tags = parsedTags;
            document.description = description;
            document.status = isPublic ? 'pending' : 'private';
        }

        toast.success('Document updated successfully!');
        navigate('/my-documents');
    };

    if (!document) {
        return (
            <div className="text-center py-5">
                <h3 className="text-dark mb-3">Document not found</h3>
                <button className="btn btn-primary" onClick={() => navigate('/my-documents')}>
                    Back to My Documents
                </button>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4 px-4 px-md-5 text-start">
            {/* Back Button positioned at the left corner */}
            <div className="mb-3">
                <button className="btn btn-link text-decoration-none text-muted p-0 d-flex align-items-center gap-2" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to My Document
                </button>
            </div>

            {/* Centered card content with max-width of 800px */}
            <div className="mx-auto w-100" style={{ maxWidth: '800px' }}>
                <div className="mb-4">
                    <h1 className="fw-bold text-dark mb-1" style={{ fontSize: '28px' }}>Edit Document</h1>
                    <p className="text-muted">Update information about your document</p>
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
                                    <input
                                        id="title"
                                        type="text"
                                        className="form-control"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="col-12 text-start">
                                    <label htmlFor="tags" className="form-label fw-semibold text-dark">
                                        Tags <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        id="tags"
                                        type="text"
                                        className="form-control"
                                        value={tags}
                                        onChange={(e) => setTags(e.target.value)}
                                        placeholder="e.g., Computer Science, AI, ML, Python (first tag will be used as Subject)"
                                        required
                                    />
                                </div>

                                <div className="col-12 text-start">
                                    <label htmlFor="description" className="form-label fw-semibold text-dark">Description</label>
                                    <textarea
                                        id="description"
                                        className="form-control"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={4}
                                    />
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
                                    <input
                                        id="public-toggle"
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={isPublic}
                                        onChange={(e) => setIsPublic(e.target.checked)}
                                        style={{ cursor: 'pointer', outline: 'none', boxShadow: 'none' }}
                                    />
                                </div>
                            </div>

                            <div className="d-flex gap-3">
                                <button
                                    type="submit"
                                    className="btn text-white px-4 py-2 border-0 fw-bold flex-grow-1"
                                    style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                                >
                                    Save Changes
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary px-4 py-2"
                                    onClick={() => navigate('/my-documents')}
                                >
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

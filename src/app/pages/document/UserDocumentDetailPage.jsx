import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { mockDocuments } from '../../data/mockData';
import {
    ArrowLeft,
    Download,
    FileText,
    Eye,
    Calendar,
    User,
    Star,
    Send,
    Flag,
    AlertTriangle,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Form } from 'react-bootstrap';
import { FloatingChatBox } from '../../components/chat/FloatingChatBox';

const getIframeSrc = (presignedUrl, fileType) => {
    if (!presignedUrl) return '';
    const type = (fileType || '').toLowerCase();
    const isOfficeDoc =
        type.includes('doc') ||
        type.includes('xls') ||
        type.includes('ppt') ||
        presignedUrl.toLowerCase().split('?')[0].endsWith('.docx') ||
        presignedUrl.toLowerCase().split('?')[0].endsWith('.doc') ||
        presignedUrl.toLowerCase().split('?')[0].endsWith('.xlsx') ||
        presignedUrl.toLowerCase().split('?')[0].endsWith('.xls') ||
        presignedUrl.toLowerCase().split('?')[0].endsWith('.pptx') ||
        presignedUrl.toLowerCase().split('?')[0].endsWith('.ppt');

    if (isOfficeDoc) {
        return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(presignedUrl)}`;
    }
    return presignedUrl;
};

const getDocumentTags = (tagsField) => {
    if (!tagsField) return [];
    if (Array.isArray(tagsField)) {
        return tagsField.map(t => (t && typeof t === 'object') ? (t.label || t.name || '') : String(t)).filter(Boolean);
    }
    if (typeof tagsField === 'object') {
        return Object.values(tagsField).map(t => (t && typeof t === 'object') ? (t.label || t.name || '') : String(t)).filter(Boolean);
    }
    if (typeof tagsField === 'string') {
        return tagsField.split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
};

export default function UserDocumentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const preLoadedDoc = location?.state?.document;
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [comments, setComments] = useState([]);

    const [document, setDocument] = useState(preLoadedDoc || null);
    const [preview, setPreview] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Report states
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('Copyrighted material / Plagiarism detected');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    useEffect(() => {
        const fetchDocumentAndPreview = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Session expired. Please login again.');
                setIsLoading(false);
                return;
            }

            try {
                setPreview(null);
                setIsLoading(true);
                setError(null);

                // Fetch document details, preview URL, and reviews list in parallel
                const [docRes, previewRes, reviewsRes] = await Promise.all([
                    fetch(`http://14.225.254.145:8080/api/v1/documents/${id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(err => {
                        console.warn(`GET /api/v1/documents/${id} failed:`, err);
                        return null;
                    }),
                    fetch(`http://14.225.254.145:8080/api/v1/documents/${id}/preview`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(err => {
                        console.warn(`GET /api/v1/documents/${id}/preview failed:`, err);
                        return null;
                    }),
                    fetch(`http://14.225.254.145:8080/api/v1/documents/${id}/reviews`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(err => {
                        console.warn(`GET /api/v1/documents/${id}/reviews failed:`, err);
                        return null;
                    })
                ]);

                let docData = null;
                let previewData = null;
                let reviewsData = null;

                if (docRes && docRes.ok) {
                    const docResult = await docRes.json();
                    if (docResult.success && docResult.data) {
                        docData = docResult.data;
                    }
                } else if (docRes) {
                    console.warn(`GET /api/v1/documents/${id} failed with status: ${docRes.status}`);
                }

                if (previewRes && previewRes.ok) {
                    const previewResult = await previewRes.json();
                    if (previewResult.success && previewResult.data) {
                        previewData = previewResult.data;
                    }
                } else if (previewRes) {
                    console.warn(`GET /api/v1/documents/${id}/preview failed with status: ${previewRes.status}`);
                }

                if (reviewsRes && reviewsRes.ok) {
                    const reviewsResult = await reviewsRes.json();
                    if (reviewsResult.success && reviewsResult.data) {
                        if (Array.isArray(reviewsResult.data)) {
                            reviewsData = reviewsResult.data;
                        } else if (reviewsResult.data.reviews && Array.isArray(reviewsResult.data.reviews)) {
                            reviewsData = reviewsResult.data.reviews;
                        } else if (reviewsResult.data.comments && Array.isArray(reviewsResult.data.comments)) {
                            reviewsData = reviewsResult.data.comments;
                        }
                    }
                } else if (reviewsRes) {
                    console.warn(`GET /api/v1/documents/${id}/reviews failed with status: ${reviewsRes.status}`);
                }

                // If we got data from at least one endpoint or have preLoadedDoc, we use the real DB/fallback data
                if (docData || previewData || preLoadedDoc) {
                    const mergedDoc = {
                        id: id,
                        title: docData?.title || previewData?.title || preLoadedDoc?.title || 'Untitled Document',
                        description: docData?.description || previewData?.description || preLoadedDoc?.description || '',
                        subject: docData?.subject || previewData?.subject || preLoadedDoc?.subject || 'Study Document',
                        tags: docData?.tags || previewData?.tags || preLoadedDoc?.tags || [],
                        author: docData?.author || previewData?.uploader_name || previewData?.author || preLoadedDoc?.author || 'Community Contributor',
                        createdAt: docData?.createdAt || docData?.date || previewData?.created_at || preLoadedDoc?.createdAt || preLoadedDoc?.date || new Date().toISOString(),
                        status: docData?.status || previewData?.status || preLoadedDoc?.status || 'public',
                        size: docData?.size || docData?.fileSize || previewData?.file_size_bytes || preLoadedDoc?.size || preLoadedDoc?.fileSize || 0,
                        views: docData?.views || previewData?.views || preLoadedDoc?.views || 0,
                        rating: docData?.rating || previewData?.rating || preLoadedDoc?.rating || 0,
                        reviewCount: docData?.reviewCount || previewData?.review_count || preLoadedDoc?.reviewCount || 0,
                    };

                    setDocument(mergedDoc);
                    setPreview(previewData);

                    // Parse comments if they exist
                    const reviewsArray = reviewsData || docData?.reviews || docData?.comments || [];
                    if (Array.isArray(reviewsArray) && reviewsArray.length > 0) {
                        setComments(reviewsArray.map((r, index) => ({
                            id: r.reviewId || r.id || `review-${index}-${r.createdAt || Date.now()}`,
                            user: r.reviewerName || r.user || 'User',
                            avatar: (r.reviewerName || r.user || 'U').substring(0, 2).toUpperCase(),
                            content: r.comment || r.content || '',
                            rating: r.rating || 0,
                            date: r.createdAt || r.date || new Date().toISOString()
                        })));
                    } else {
                        setComments([]);
                    }
                } else {
                    // Both requests failed to return valid data. Check if it's a mock ID fallback
                    const mockDoc = mockDocuments.find((doc) => doc.id === id);
                    if (mockDoc) {
                        setDocument({
                            id: mockDoc.id,
                            title: mockDoc.title,
                            description: mockDoc.description,
                            subject: mockDoc.subject,
                            tags: mockDoc.tags,
                            author: mockDoc.author,
                            date: mockDoc.date,
                            size: mockDoc.size,
                            views: mockDoc.views,
                            rating: mockDoc.rating,
                            status: mockDoc.status || 'public',
                        });
                        setPreview({
                            presigned_url: '',
                            file_type: 'pdf',
                        });
                        setComments([
                            {
                                id: '1',
                                user: 'Nguyễn Văn A',
                                avatar: 'NA',
                                content: 'Tài liệu rất chi tiết và dễ hiểu. Cảm ơn tác giả!',
                                rating: 5,
                                date: '2024-05-15',
                            },
                            {
                                id: '2',
                                user: 'Trần Thị B',
                                avatar: 'TB',
                                content: 'Nội dung hay, nhưng có một số chỗ cần cập nhật thêm.',
                                rating: 4,
                                date: '2024-05-14',
                            },
                        ]);
                    } else {
                        throw new Error('Failed to load document details from API (500 Server Error).');
                    }
                }
            } catch (err) {
                console.error('Error fetching document details:', err);
                setError(err.message);
                setDocument(null);
                setPreview(null);
                setComments([]);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchDocumentAndPreview();
        }
    }, [id]);

    // Mock related documents: same subject first, then fall back to others to keep sidebar full
    const relatedDocuments = [
        ...mockDocuments.filter((doc) => doc.id !== id && doc.subject === document?.subject && doc.status === 'public'),
        ...mockDocuments.filter((doc) => doc.id !== id && doc.subject !== document?.subject && doc.status === 'public')
    ].slice(0, 6);

    const handleDownload = () => {
        if (preview?.presigned_url) {
            toast.success('Opening document in new tab...');
            window.open(preview.presigned_url, '_blank');
        } else {
            toast.success('Downloading document (mock)...');
        }
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!comment.trim() || rating === 0) {
            toast.error('Please enter a comment and a rating!');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Session expired. Please login again.');
            return;
        }

        try {
            setIsSubmittingReview(true);
            const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/${id}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    rating: rating,
                    comment: comment
                })
            });

            if (!response.ok) {
                const errResult = await response.json();
                const apiError = new Error(errResult.message || 'Failed to submit review');
                apiError.isServerError = true;
                throw apiError;
            }

            const result = await response.json();

            // Add the new comment dynamically to comments list
            const newComment = {
                id: result.data?.reviewId || Date.now().toString(),
                user: result.data?.reviewerName || 'You',
                avatar: (result.data?.reviewerName || 'Y').substring(0, 2).toUpperCase(),
                content: comment,
                rating,
                date: new Date().toISOString()
            };

            setComments([newComment, ...comments]);
            setComment('');
            setRating(0);
            toast.success('Review submitted successfully!');
        } catch (err) {
            console.error('Review submission error:', err);
            toast.error(err.message || 'Failed to submit review.');

            // Only use offline fallback if it is a local mock document and not a server rejection
            const isMockDoc = id && id.length < 10;
            if (!err.isServerError && isMockDoc) {
                const newComment = {
                    id: Date.now().toString(),
                    user: 'You (Offline)',
                    avatar: 'YO',
                    content: comment,
                    rating,
                    date: new Date().toISOString().split('T')[0]
                };
                setComments([newComment, ...comments]);
                setComment('');
                setRating(0);
            }
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleReportSubmit = async (e) => {
        e.preventDefault();
        if (!reportReason.trim()) {
            toast.error('Please enter or select a reason for reporting!');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Session expired. Please login again.');
            return;
        }

        try {
            setIsSubmittingReport(true);
            const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/${id}/reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    reason: reportReason
                })
            });

            if (!response.ok) {
                const errResult = await response.json();
                throw new Error(errResult.message || 'Failed to report document');
            }

            toast.success('Document reported successfully. Admins will review this case.');
            setShowReportModal(false);
            setReportReason('Copyrighted material / Plagiarism detected'); // Reset
        } catch (err) {
            console.error('Report submission error:', err);
            toast.error(err.message || 'Failed to submit report. Please try again.');
        } finally {
            setIsSubmittingReport(false);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0.00 MB';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    const averageRating = comments.length > 0
        ? (comments.reduce((acc, c) => acc + c.rating, 0) / comments.length).toFixed(1)
        : (document?.rating || 0).toFixed(1);

    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <div className="spinner-border text-primary" role="status" style={{ color: '#FD8F52' }}>
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (error && !document) {
        return (
            <div className="text-center py-5">
                <FileText className="h-16 w-16 text-muted mx-auto mb-3" />
                <h3 className="text-dark mb-3">Document not found</h3>
                <p className="text-muted mb-4">{error}</p>
                <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)', border: 'none' }} onClick={() => navigate('/user/home')}>Back to Homepage</button>
            </div>
        );
    }

    const documentTags = getDocumentTags(document.tags);

    return (
        <div className="container py-4 text-start">
            <button
                onClick={() => navigate(-1)}
                className="btn btn-link text-decoration-none text-muted mb-4 d-flex align-items-center gap-2 p-0"
            >
                <ArrowLeft className="h-4 w-4" />
                Back
            </button>

            <div className="row g-4">
                {/* Main Content */}
                <div className="col-12 col-lg-8 d-flex flex-column gap-4">

                    {/* Main Info Card */}
                    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                        <div className="card-body p-4">
                            <div className="d-flex flex-column flex-md-row align-items-start justify-content-between gap-3 mb-3">
                                <div className="flex-grow-1">
                                    <h2 className="fw-bold text-dark mb-2">{document.title}</h2>
                                    <div className="d-flex flex-wrap align-items-center gap-3 text-muted" style={{ fontSize: '14px' }}>
                                        <div className="d-flex align-items-center gap-1">
                                            <User className="h-4 w-4" />
                                            <span>{document.author || 'Community Contributor'}</span>
                                        </div>
                                        <span>•</span>
                                        <div className="d-flex align-items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            <span>{new Date(document.createdAt || document.date || new Date()).toLocaleDateString('en-US')}</span>
                                        </div>
                                        <span>•</span>
                                        <div className="d-flex align-items-center gap-1">
                                            <Eye className="h-4 w-4" />
                                            <span>{document.views || 0} views</span>
                                        </div>
                                        <span>•</span>
                                        <div className="d-flex align-items-center gap-1">
                                            <Star className="h-4 w-4 fill-warning text-warning" style={{ color: '#FFBD71' }} />
                                            <span>{averageRating} ({comments.length || document?.reviewCount || document?.review_count || 0} reviews)</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex flex-wrap gap-2 align-self-start justify-content-md-end">
                                    {documentTags.length > 0 ? (
                                        documentTags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="badge text-white px-3 py-2 border-0"
                                                style={{ background: 'linear-gradient(135deg, #FD8F52, #FFBD71)', fontSize: '13px', borderRadius: '20px' }}
                                            >
                                                {tag}
                                            </span>
                                        ))
                                    ) : (
                                        <span
                                            className="badge text-white px-3 py-2 border-0"
                                            style={{ background: 'linear-gradient(135deg, #FD8F52, #FFBD71)', fontSize: '13px', borderRadius: '20px' }}
                                        >
                                            {document.subject || 'Study Document'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="mb-4">
                                <h5 className="fw-bold text-dark mb-2">Description:</h5>
                                <p className="text-muted leading-relaxed" style={{ fontSize: '15px' }}>{document.description}</p>
                            </div>

                            {/* Full Document Preview */}
                            <div className="card border-2 mb-4" style={{ borderColor: 'rgba(253, 143, 82, 0.2)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                                <div className="card-body p-4 bg-white">
                                    <h5 className="fw-bold text-dark mb-3">Document Content</h5>
                                    {preview?.presigned_url ? (
                                        <div style={{ height: '650px', width: '100%' }}>
                                            <iframe
                                                key={preview?.presigned_url || 'preview-frame'}
                                                src={getIframeSrc(preview.presigned_url, preview.file_type || document.fileType)}
                                                title={document.title}
                                                width="100%"
                                                height="100%"
                                                style={{ border: 'none' }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="d-flex flex-column gap-3 text-muted leading-relaxed" style={{ fontSize: '14px' }}>
                                            <p>
                                                This is the full content of the document. The document covers fundamental
                                                and advanced topics in {document.subject || 'this subject'}, compiled carefully by experts in the field.
                                            </p>
                                            <p>
                                                The content is structured into sections with illustrative examples, practice
                                                exercises, and detailed answers.
                                            </p>
                                            <h6 className="fw-bold text-dark mt-3">Section 1: Fundamental Concepts</h6>
                                            <p>
                                                This section introduces the foundational concepts, helping learners build a solid
                                                understanding before proceeding to complex topics.
                                            </p>
                                            <div className="p-3 rounded border mt-3" style={{ background: 'linear-gradient(to right, rgba(255, 189, 113, 0.1), rgba(255, 220, 162, 0.1))', borderColor: 'rgba(253, 143, 82, 0.2)' }}>
                                                <p className="mb-0 text-muted fst-italic" style={{ fontSize: '13px' }}>
                                                    Offline Preview Mode: Please connect to the backend to view the real document.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="d-flex flex-column flex-sm-row gap-2 mt-4">
                                <button
                                    onClick={handleDownload}
                                    className="btn text-white flex-grow-1 py-2.5 fw-bold border-0 d-flex align-items-center justify-content-center gap-2 animate-hover"
                                    style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                                >
                                    <Download className="h-4 w-4" />
                                    Download Document ({formatBytes(document.fileSize || document.size || preview?.file_size_bytes)})
                                </button>
                                <button
                                    onClick={() => setShowReportModal(true)}
                                    className="btn btn-outline-danger py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2"
                                    style={{ minWidth: '150px' }}
                                >
                                    <Flag className="h-4 w-4" />
                                    Report
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Comments & Review Section */}
                    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                        <div className="card-header border-0 py-3" style={{ background: 'linear-gradient(to right, rgba(253, 143, 82, 0.1), rgba(255, 189, 113, 0.1))', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}>
                            <h5 className="mb-0 fw-bold text-dark">Reviews & Comments</h5>
                        </div>
                        <div className="card-body p-4">

                            {/* Form submit review */}
                            {(!document?.status || document.status.toLowerCase() === 'public') ? (
                                <form onSubmit={handleSubmitComment} className="mb-5">
                                    <div className="mb-3">
                                        <label className="form-label fw-bold text-dark mb-2">Your rating:</label>
                                        <div className="d-flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setRating(star)}
                                                    onMouseEnter={() => setHoverRating(star)}
                                                    onMouseLeave={() => setHoverRating(0)}
                                                    className="btn p-0 border-0 transition-transform bg-transparent"
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <Star
                                                        className="h-8 w-8"
                                                        style={{
                                                            fill: star <= (hoverRating || rating) ? '#FFBD71' : 'none',
                                                            color: star <= (hoverRating || rating) ? '#FFBD71' : '#ccc',
                                                        }}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold text-dark mb-2">Comment:</label>
                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="Share your thoughts about this document..."
                                            rows={4}
                                            className="form-control"
                                            style={{ borderColor: 'rgba(253, 143, 82, 0.3)' }}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmittingReview}
                                        className="btn text-white px-4 py-2 border-0 fw-bold d-flex align-items-center gap-2"
                                        style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                                    >
                                        {isSubmittingReview ? (
                                            <Loader2 className="h-4 w-4 animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                        Submit Review
                                    </button>
                                </form>
                            ) : (
                                <div className="alert alert-warning border-0 p-3 mb-5 d-flex align-items-start gap-3 text-start" style={{ backgroundColor: 'rgba(253, 143, 82, 0.08)', color: '#FD8F52', borderRadius: '12px' }}>
                                    <AlertTriangle className="h-5 w-5 mt-1 flex-shrink-0" />
                                    <div>
                                        <h6 className="fw-bold mb-1" style={{ fontSize: '14px' }}>This document is not yet approved for review.</h6>
                                        <p className="mb-0 small opacity-75" style={{ fontSize: '12.5px' }}>Once the document is approved and made public by an administrator, you will be able to leave reviews and ratings.</p>
                                    </div>
                                </div>
                            )}

                            {/* Comments List */}
                            <div className="border-top pt-4">
                                <h5 className="fw-bold text-dark mb-4">{comments.length} reviews</h5>
                                <div className="d-flex flex-column gap-3">
                                    {comments.map((c) => (
                                        <div
                                            key={c.id}
                                            className="border rounded-3 p-3 text-start"
                                            style={{
                                                borderColor: 'rgba(253, 143, 82, 0.2)',
                                                background: 'linear-gradient(135deg, rgba(255, 189, 113, 0.03), rgba(255, 220, 162, 0.03))',
                                            }}
                                        >
                                            <div className="d-flex align-items-start gap-3">
                                                <div
                                                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                                                    style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        background: 'linear-gradient(135deg, #C73866, #FD8F52)',
                                                        fontSize: '14px',
                                                    }}
                                                >
                                                    {c.avatar}
                                                </div>
                                                <div className="flex-grow-1">
                                                    <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between mb-2">
                                                        <h6 className="mb-0 fw-bold text-dark">{c.user}</h6>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="d-flex">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <Star
                                                                        key={star}
                                                                        className="h-4 w-4"
                                                                        style={{
                                                                            fill: star <= c.rating ? '#FFBD71' : 'none',
                                                                            color: star <= c.rating ? '#FFBD71' : '#ccc',
                                                                        }}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <span className="text-muted" style={{ fontSize: '12px' }}>
                                                                {new Date(c.date).toLocaleDateString('en-US')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>{c.content}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar - Related Documents */}
                <div className="col-12 col-lg-4">
                    <div className="card shadow-sm border-0 sticky-top" style={{ top: '90px', borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                        <div className="card-header border-0 py-3" style={{ background: 'linear-gradient(to right, rgba(253, 143, 82, 0.1), rgba(255, 189, 113, 0.1))', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}>
                            <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: '16px' }}>Related Documents</h5>
                        </div>
                        <div className="card-body p-3">
                            <div className="d-flex flex-column gap-2">
                                {relatedDocuments.map((doc) => (
                                    <button
                                        key={doc.id}
                                        onClick={() => navigate(`/document/${doc.id}`)}
                                        className="btn btn-outline-light text-start p-3 border rounded-3 w-100"
                                        style={{
                                            borderColor: 'rgba(253, 143, 82, 0.15)',
                                            backgroundColor: 'transparent',
                                            color: 'inherit',
                                            transition: 'border-color 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#FD8F52';
                                            e.currentTarget.style.backgroundColor = 'rgba(255, 189, 113, 0.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(253, 143, 82, 0.15)';
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <div className="d-flex align-items-start gap-2">
                                            <FileText className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#C73866' }} />
                                            <div className="flex-grow-1 min-w-0">
                                                <h6 className="mb-1 fw-semibold text-dark text-truncate-2" style={{ fontSize: '14px', lineHeight: '1.4' }}>
                                                    {doc.title}
                                                </h6>
                                                <small className="text-muted d-block">{doc.views} views</small>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Document Modal */}
            <Modal show={showReportModal} onHide={() => setShowReportModal(false)} centered className="admin-modal">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: '18px' }}>
                        <AlertTriangle className="h-5 w-5 text-danger" /> Report Document
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleReportSubmit}>
                    <Modal.Body className="text-start">
                        <p className="text-muted mb-3">
                            Is this document infringing copyright, low quality, or violating community guidelines? Report it to help our moderators review it.
                        </p>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-dark mb-2">Reason for Reporting</Form.Label>
                            <Form.Select
                                className="form-select"
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                style={{ borderColor: 'rgba(253, 143, 82, 0.3)' }}
                            >
                                <option value="Copyrighted material / Plagiarism detected">Copyrighted material / Plagiarism detected</option>
                                <option value="Low document quality / Unreadable scan">Low document quality / Unreadable scan</option>
                                <option value="Inappropriate subject matter or description">Inappropriate subject matter or description</option>
                                <option value="Incorrect subject category classification">Incorrect subject category classification</option>
                                <option value="Spam / Advertisements / Duplicates">Spam / Advertisements / Duplicates</option>
                                <option value="Other Policy Violation">Other Policy Violation</option>
                            </Form.Select>
                        </Form.Group>

                        {reportReason.startsWith("Other") && (
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-semibold small text-dark mb-2">Detailed Reason</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    placeholder="Please describe why this document violates our policies..."
                                    required
                                    style={{ borderColor: 'rgba(253, 143, 82, 0.3)' }}
                                    onChange={(e) => setReportReason(`Other: ${e.target.value}`)}
                                />
                            </Form.Group>
                        )}
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0 d-flex gap-2">
                        <button
                            type="button"
                            className="btn btn-light flex-grow-1 border fw-semibold text-secondary"
                            onClick={() => setShowReportModal(false)}
                            disabled={isSubmittingReport}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-danger flex-grow-1 fw-bold border-0"
                            disabled={isSubmittingReport}
                        >
                            {isSubmittingReport ? (
                                <span className="d-flex align-items-center justify-content-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Submitting...
                                </span>
                            ) : 'Submit Report'}
                        </button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Floating AI Chatbox */}
            <FloatingChatBox />
        </div>
    );
}

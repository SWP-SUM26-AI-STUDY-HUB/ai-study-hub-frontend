import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft, Download, Calendar, User, Star, Send, Flag, AlertTriangle, Share2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Form } from 'react-bootstrap';
import { FloatingChatBox } from '../../components/chat/FloatingChatBox';

const getIframeSrc = (presignedUrl, fileType, pageNum) => {
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

    let finalUrl = presignedUrl;
    if (pageNum) {
        finalUrl = `${presignedUrl}#page=${pageNum}`;
    }

    if (isOfficeDoc) {
        return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(finalUrl)}`;
    }
    return finalUrl;
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

    // Quản lý trạng thái hiển thị Modal/Popup
    const [showReportModal, setShowReportModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [generatedShareLink, setGeneratedShareLink] = useState('');

    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [reportReason, setReportReason] = useState('Bản quyền sách giáo khoa');
    const [reportDetail, setReportDetail] = useState('');

    const dynamicAverageRating = comments.length > 0
        ? (comments.reduce((acc, curr) => acc + (curr.rating || 0), 0) / comments.length).toFixed(1)
        : '0.0';

    useEffect(() => {
        const fetchDocumentData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Session expired. Please login again.');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const previewRes = await fetch(`http://14.225.254.145:8080/api/v1/documents/${id}/preview`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (previewRes.ok) {
                    const previewResult = await previewRes.json();
                    if (previewResult.success && previewResult.data) {
                        const pData = previewResult.data;
                        setPreview(pData);

                        setDocument({
                            id: id,
                            title: pData.title || 'COS Business Rules.docx',
                            description: pData.description || 'No description available.',
                            subject: pData.subject?.name || 'swt',
                            author: pData.uploader_name || 'Thu Phann',
                            createdAt: pData.created_at || new Date().toISOString(),
                            size: pData.file_size_bytes || 0
                        });
                    }
                }
            } catch (err) {
                console.error('Fetch document preview url error:', err);
            }

            try {
                const reviewsRes = await fetch(`http://14.225.254.145:8080/api/v1/documents/${id}/reviews?page=0&size=10`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (reviewsRes.ok) {
                    const reviewsResult = await reviewsRes.json();
                    if (reviewsResult.success && Array.isArray(reviewsResult.data)) {
                        setComments(reviewsResult.data.map((r, index) => ({
                            id: r.reviewId || r.id || `review-${index}`,
                            user: r.reviewerName || 'User',
                            avatar: (r.reviewerName || 'U').substring(0, 2).toUpperCase(),
                            content: r.comment || '',
                            rating: r.rating || 0,
                            date: r.createdAt || new Date().toISOString()
                        })));
                    }
                }
            } catch (err) {
                console.error('Fetch document reviews list error:', err);
            }

            setIsLoading(false);
        };

        if (id) {
            fetchDocumentData();
        }
    }, [id]);

    // ĐÃ SỬA CHUẨN XÁC: Trỏ link share động về router Frontend của Khách xem tài liệu
    const handleShareLink = async () => {
        const token = localStorage.getItem('token');
        try {
            setIsSharing(true);
            const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/${id}/share`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Share API failure');
            const result = await response.json();

            // Lấy chuẩn trường token nằm trong data object
            const shareToken = result.data?.token;

            if (shareToken) {
                // Ghép nối trỏ thẳng về domain Frontend hiện tại (localhost hoặc domain deploy) vào trang guest shared
                const fullShareLink = `${window.location.origin}/guest/document/shared/${shareToken}`;
                setGeneratedShareLink(fullShareLink);
                setShowShareModal(true);
            } else {
                toast.error('Could not get secure share token from server.');
            }
        } catch (error) {
            console.error('Share execution error:', error);
            toast.error('Failed to generate share link.');
        } finally {
            setIsSharing(false);
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(generatedShareLink);
            toast.success('Link copied to clipboard successfully!');
        } catch (err) {
            toast.error('Failed to copy link.');
        }
    };

    const handleDownload = async () => {
        const token = localStorage.getItem('token');
        try {
            toast.loading('Fetching secure download link from server...');
            const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/${id}/download`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            toast.dismiss();

            if (!response.ok) throw new Error('Download API error');
            const result = await response.json();

            const realDownloadUrl = result.data?.presigned_url;

            if (realDownloadUrl) {
                toast.success('Downloading started! Save file directly to machine.');

                const link = window.document.createElement('a');
                link.href = realDownloadUrl;
                link.setAttribute('download', document?.title || 'document.docx');
                link.target = '_self';
                window.document.body.appendChild(link);
                link.click();
                window.document.body.removeChild(link);
            } else {
                toast.error('Download field (presigned_url) is missing or blank inside server object.');
            }
        } catch (error) {
            console.error('Download error:', error);
            toast.dismiss();
            toast.error('Could not execute download.');
        }
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!comment.trim() || rating === 0) {
            toast.error('Please enter a comment and a rating!');
            return;
        }

        const token = localStorage.getItem('token');
        try {
            setIsSubmittingReview(true);
            const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/${id}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ rating, comment })
            });

            if (!response.ok) throw new Error('Failed to submit review');
            const result = await response.json();

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
            toast.error('Failed to save review.');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleReportSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            setIsSubmittingReport(true);
            const response = await fetch(`http://14.225.254.145:8080/api/v1/documents/${id}/reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason: `${reportReason}${reportDetail ? ' - Chi tiết: ' + reportDetail : ''}` })
            });

            if (!response.ok) throw new Error('Failed to report');
            toast.success('Cảm ơn bạn. Báo cáo của bạn đã được gửi tới quản trị viên để xem xét.');
            setShowReportModal(false);
            setReportDetail('');
        } catch (err) {
            toast.error('Failed to submit report.');
        } finally {
            setIsSubmittingReport(false);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0.15 MB';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <div className="spinner-border text-primary" role="status" style={{ color: '#FD8F52' }}>
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-4 text-start">
            <button onClick={() => navigate(-1)} className="btn btn-link text-decoration-none text-muted mb-4 d-flex align-items-center gap-2 p-0">
                <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div className="row g-4">
                <div className="col-12 d-flex flex-column gap-4">
                    {document && (
                        <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                            <div className="card-body p-4">
                                <div className="d-flex flex-column flex-md-row align-items-start justify-content-between gap-3 mb-3">
                                    <div className="flex-grow-1">
                                        <h2 className="fw-bold text-dark mb-2">{document.title}</h2>
                                        <div className="d-flex flex-wrap align-items-center gap-3 text-muted" style={{ fontSize: '14px' }}>
                                            <div className="d-flex align-items-center gap-1">
                                                <User className="h-4 w-4" />
                                                <span>{document.author}</span>
                                            </div>
                                            <span>•</span>
                                            <div className="d-flex align-items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                <span>{new Date(document.createdAt).toLocaleDateString('en-US')}</span>
                                            </div>
                                            <span>•</span>
                                            <div className="d-flex align-items-center gap-1">
                                                <Star className="h-4 w-4 fill-warning text-warning" style={{ color: '#FFBD71' }} />
                                                <span>{dynamicAverageRating} ({comments.length} reviews)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <span className="badge text-white px-3 py-2 border-0" style={{ background: 'linear-gradient(135deg, #FD8F52, #FFBD71)', fontSize: '13px', borderRadius: '20px' }}>
                                            {document.subject}
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <h5 className="fw-bold text-dark mb-2">Description:</h5>
                                    <p className="text-muted leading-relaxed" style={{ fontSize: '15px' }}>{document.description || 'No description available.'}</p>
                                </div>

                                <div className="card border-2 mb-4" style={{ borderColor: 'rgba(253, 143, 82, 0.2)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                                    <div className="card-body p-4 bg-white">
                                        <h5 className="fw-bold text-dark mb-3">Document Content</h5>
                                        {preview?.presigned_url ? (
                                            <div style={{ height: '650px', width: '100%' }}>
                                                <iframe
                                                    src={getIframeSrc(preview.presigned_url, preview.file_type || 'pdf', new URLSearchParams(location.search).get('page') || (location.hash ? location.hash.replace('#page=', '') : null))}
                                                    title={document.title}
                                                    width="100%"
                                                    height="100%"
                                                    style={{ border: 'none' }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="text-center py-5 text-muted">Preview not ready or failed to fetch file.</div>
                                        )}
                                    </div>
                                </div>

                                <div className="d-flex flex-column gap-2 mt-4">
                                    <div className="d-flex flex-row gap-2 w-100">
                                        <button
                                            onClick={handleShareLink}
                                            disabled={isSharing}
                                            className="btn btn-outline-primary py-2.5 fw-bold flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                                            style={{ borderColor: '#FD8F52', color: '#FD8F52' }}
                                        >
                                            <Share2 className="h-4 w-4" />
                                            {isSharing ? 'Generating...' : 'Share Document Link'}
                                        </button>

                                        <button
                                            onClick={() => setShowReportModal(true)}
                                            className="btn btn-outline-danger py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2"
                                            style={{ minWidth: '150px' }}
                                        >
                                            <Flag className="h-4 w-4" /> Report
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleDownload}
                                        className="btn text-white w-100 py-2.5 fw-bold border-0 d-flex align-items-center justify-content-center gap-2 mt-1"
                                        style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                                    >
                                        <Download className="h-4 w-4" />
                                        Download Document ({formatBytes(document.size)})
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Review Section */}
                    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                        <div className="card-header border-0 py-3" style={{ background: 'linear-gradient(to right, rgba(253, 143, 82, 0.1), rgba(255, 189, 113, 0.1))', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}>
                            <h5 className="mb-0 fw-bold text-dark">Reviews & Comments</h5>
                        </div>
                        <div className="card-body p-4">
                            <form onSubmit={handleSubmitComment} className="mb-5">
                                <div className="mb-3">
                                    <label className="form-label fw-bold text-dark mb-2">Your rating:</label>
                                    <div className="d-flex gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="btn p-0 border-0 bg-transparent">
                                                <Star className="h-8 w-8" style={{ fill: star <= (hoverRating || rating) ? '#FFBD71' : 'none', color: star <= (hoverRating || rating) ? '#FFBD71' : '#ccc' }} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-bold text-dark mb-2">Comment:</label>
                                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your thoughts..." rows={4} className="form-control" style={{ borderColor: 'rgba(253, 143, 82, 0.3)' }} />
                                </div>
                                <button type="submit" disabled={isSubmittingReview} className="btn text-white px-4 py-2 border-0 fw-bold d-flex align-items-center gap-2" style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}>
                                    <Send className="h-4 w-4" /> Submit Review
                                </button>
                            </form>

                            <div className="border-top pt-4">
                                <h5 className="fw-bold text-dark mb-4">{comments.length} reviews</h5>
                                <div className="d-flex flex-column gap-3">
                                    {comments.map((c) => (
                                        <div key={c.id} className="border rounded-3 p-3" style={{ borderColor: 'rgba(253, 143, 82, 0.2)', background: 'linear-gradient(135deg, rgba(255, 189, 113, 0.03), rgba(255, 220, 162, 0.03))' }}>
                                            <div className="d-flex align-items-start gap-3">
                                                <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0" style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #C73866, #FD8F52)', fontSize: '14px' }}>
                                                    {c.avatar}
                                                </div>
                                                <div className="flex-grow-1">
                                                    <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between mb-2">
                                                        <h6 className="mb-0 fw-bold text-dark">{c.user}</h6>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="d-flex">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <Star key={star} className="h-4 w-4" style={{ fill: star <= c.rating ? '#FFBD71' : 'none', color: star <= c.rating ? '#FFBD71' : '#ccc' }} />
                                                                ))}
                                                            </div>
                                                            <span className="text-muted" style={{ fontSize: '12px' }}>{new Date(c.date).toLocaleDateString('en-US')}</span>
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
            </div>

            {/* POPUP Modal Share */}
            <Modal show={showShareModal} onHide={() => setShowShareModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: '18px' }}>
                        <Share2 className="h-5 w-5 text-primary" /> Share Document
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="text-muted small mb-2">Anyone with this link can view this document:</p>
                    <div className="d-flex gap-2">
                        <input
                            type="text"
                            readOnly
                            value={generatedShareLink}
                            className="form-control bg-light text-muted"
                            style={{ fontSize: '13.5px', borderColor: 'rgba(253, 143, 82, 0.3)' }}
                        />
                        <button
                            type="button"
                            onClick={copyToClipboard}
                            className="btn text-white px-3 border-0 d-flex align-items-center justify-content-center"
                            style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                        >
                            <Copy className="h-4 w-4" /> <span className="ms-1 small fw-bold">Copy</span>
                        </button>
                    </div>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <button type="button" className="btn btn-light border w-100 fw-semibold" onClick={() => setShowShareModal(false)}>Close</button>
                </Modal.Footer>
            </Modal>

            {/* Modal Report */}
            <Modal show={showReportModal} onHide={() => setShowReportModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: '18px' }}>
                        <AlertTriangle className="h-5 w-5 text-danger" /> Report Document
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleReportSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-dark mb-2">Lý do báo cáo</Form.Label>
                            <Form.Select className="form-select" value={reportReason} onChange={(e) => setReportReason(e.target.value)} style={{ borderColor: 'rgba(253, 143, 82, 0.3)' }}>
                                <option value="Bản quyền sách giáo khoa">Bản quyền sách giáo khoa</option>
                                <option value="Tài liệu chất lượng kém / Không đọc được">Tài liệu chất lượng kém / Không đọc được</option>
                                <option value="Nội dung không phù hợp">Nội dung không phù hợp</option>
                                <option value="Khác">Khác</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-dark mb-2">Nội dung chi tiết</Form.Label>
                            <Form.Control as="textarea" rows={3} placeholder="Nhập nội dung chi tiết..." value={reportDetail} onChange={(e) => setReportDetail(e.target.value)} style={{ borderColor: 'rgba(253, 143, 82, 0.3)' }} required />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0 d-flex gap-2">
                        <button type="button" className="btn btn-light flex-grow-1 border fw-semibold" onClick={() => setShowReportModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-danger flex-grow-1 fw-bold border-0" disabled={isSubmittingReport}>Submit Report</button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <FloatingChatBox />
        </div>
    );
}
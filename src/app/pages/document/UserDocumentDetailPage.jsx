import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { FloatingChatBox } from '../../components/chat/FloatingChatBox';

export default function UserDocumentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [comments, setComments] = useState([
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

    const document = mockDocuments.find((doc) => doc.id === id);

    // Mock related documents: same subject first, then fall back to others to keep sidebar full
    const relatedDocuments = [
        ...mockDocuments.filter((doc) => doc.id !== id && doc.subject === document?.subject && doc.status === 'public'),
        ...mockDocuments.filter((doc) => doc.id !== id && doc.subject !== document?.subject && doc.status === 'public')
    ].slice(0, 6);

    if (!document) {
        return (
            <div className="text-center py-5">
                <FileText className="h-16 w-16 text-muted mx-auto mb-3" />
                <h3 className="text-dark mb-3">Document not found</h3>
                <button className="btn btn-primary" onClick={() => navigate('/')}>Back to Homepage</button>
            </div>
        );
    }

    const handleDownload = () => {
        toast.success('Downloading document...');
    };

    const handleSubmitComment = (e) => {
        e.preventDefault();
        if (!comment.trim() || rating === 0) {
            toast.error('Please enter a comment and a rating!');
            return;
        }

        const newComment = {
            id: Date.now().toString(),
            user: 'You',
            avatar: 'Y',
            content: comment,
            rating,
            date: new Date().toISOString().split('T')[0],
        };

        setComments([newComment, ...comments]);
        setComment('');
        setRating(0);
        toast.success('Review submitted successfully!');
    };

    const formatBytes = (bytes) => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    const averageRating = comments.length > 0
        ? (comments.reduce((acc, c) => acc + c.rating, 0) / comments.length).toFixed(1)
        : 0;

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
                                            <span>{document.author}</span>
                                        </div>
                                        <span>•</span>
                                        <div className="d-flex align-items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            <span>{new Date(document.date).toLocaleDateString('en-US')}</span>
                                        </div>
                                        <span>•</span>
                                        <div className="d-flex align-items-center gap-1">
                                            <Eye className="h-4 w-4" />
                                            <span>{document.views} views</span>
                                        </div>
                                        <span>•</span>
                                        <div className="d-flex align-items-center gap-1">
                                            <Star className="h-4 w-4 fill-warning text-warning" style={{ color: '#FFBD71' }} />
                                            <span>{averageRating} ({comments.length} reviews)</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="badge text-white px-3 py-2 border-0 align-self-start" style={{ background: 'linear-gradient(135deg, #FD8F52, #FFBD71)', fontSize: '13px', borderRadius: '20px' }}>
                                    {document.subject}
                                </span>
                            </div>

                            <div className="d-flex flex-wrap gap-2 mb-4">
                                {document.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="badge text-dark bg-transparent border px-3 py-2"
                                        style={{ borderColor: 'rgba(253, 143, 82, 0.3)', borderRadius: '20px', fontSize: '12px' }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <div className="mb-4">
                                <h5 className="fw-bold text-dark mb-2">Description:</h5>
                                <p className="text-muted leading-relaxed" style={{ fontSize: '15px' }}>{document.description}</p>
                            </div>

                            {/* Full Document Preview */}
                            <div className="card border-2 mb-4" style={{ borderColor: 'rgba(253, 143, 82, 0.2)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                                <div className="card-body p-4 bg-white">
                                    <h5 className="fw-bold text-dark mb-3">Document Content</h5>
                                    <div className="d-flex flex-column gap-3 text-muted leading-relaxed" style={{ fontSize: '14px' }}>
                                        <p>
                                            This is the full content of the document. The document covers fundamental
                                            and advanced topics in {document.subject}, compiled carefully by experts in the field.
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
                                        <h6 className="fw-bold text-dark mt-3">Section 2: Advanced Topics</h6>
                                        <p>
                                            Advanced topics are presented in detail with real-world examples to help learners
                                            understand practical applications.
                                        </p>
                                        <h6 className="fw-bold text-dark mt-3">Section 3: Practice Exercises</h6>
                                        <p>
                                            A variety of exercises at different difficulty levels, with step-by-step solutions
                                            and detailed answers.
                                        </p>
                                        <div className="p-3 rounded border mt-3" style={{ background: 'linear-gradient(to right, rgba(255, 189, 113, 0.1), rgba(255, 220, 162, 0.1))', borderColor: 'rgba(253, 143, 82, 0.2)' }}>
                                            <p className="mb-0 text-muted fst-italic" style={{ fontSize: '13px' }}>
                                                This is a preview version. The full document contains more formulas, charts,
                                                and detailed practice problems.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <button
                                onClick={handleDownload}
                                className="btn text-white w-100 py-2.5 fw-bold border-0 d-flex align-items-center justify-content-center gap-2 animate-hover"
                                style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                            >
                                <Download className="h-4 w-4" />
                                Download Document ({formatBytes(document.size)})
                            </button>
                        </div>
                    </div>

                    {/* Comments & Review Section */}
                    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                        <div className="card-header border-0 py-3" style={{ background: 'linear-gradient(to right, rgba(253, 143, 82, 0.1), rgba(255, 189, 113, 0.1))', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}>
                            <h5 className="mb-0 fw-bold text-dark">Reviews & Comments</h5>
                        </div>
                        <div className="card-body p-4">

                            {/* Form submit review */}
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
                                    className="btn text-white px-4 py-2 border-0 fw-bold d-flex align-items-center gap-2"
                                    style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                                >
                                    <Send className="h-4 w-4" />
                                    Submit Review
                                </button>
                            </form>

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

            {/* Floating AI Chatbox */}
            <FloatingChatBox />
        </div>
    );
}

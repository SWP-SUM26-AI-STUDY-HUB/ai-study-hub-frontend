import { useNavigate } from "react-router";

const subjects = [
    { name: "Technology", color: "#C73866", docId: "1" },
    { name: "Science", color: "#FE676E", docId: "2" },
    { name: "Business", color: "#FD8F52", docId: "3" },
    { name: "Java Programming", color: "#FFBD71", docId: "1" },
    { name: "Python Programming", color: "#FFDCA2", docId: "6" },
    { name: "JavaScript Programming", color: "#C73866", docId: "1" },
    { name: "Mathematics", color: "#FE676E", docId: "2" },
    { name: "Artificial Intelligence", color: "#FD8F52", docId: "3" },
];

export default function HomePage() {
    const navigate = useNavigate();

    const handleSubjectClick = (docId) => {
        navigate(`/document/${docId}`);
    };

    return (
        <div className="container py-4 text-center">
            {/* Subject Categories */}
            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '1rem', border: '1px solid rgba(253, 143, 82, 0.2)' }}>
                <div className="card-body p-4 text-start">
                    <div className="d-flex align-items-center gap-2 mb-4">
                        <div className="rounded" style={{ width: '4px', height: '24px', background: 'linear-gradient(to bottom, #C73866, #FD8F52)' }}></div>
                        <h5 className="mb-0 fw-bold text-dark">DOCUMENT CATEGORIES FOR YOU</h5>
                    </div>

                    <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-3">
                        {subjects.map((subject, index) => (
                            <div className="col" key={index}>
                                <button
                                    onClick={() => handleSubjectClick(subject.docId)}
                                    className="btn w-100 py-3 rounded-3 text-white fw-bold d-flex align-items-center justify-content-center border-0 shadow-sm text-center"
                                    style={{
                                        backgroundColor: subject.color,
                                        minHeight: '80px',
                                        fontSize: '15px',
                                        transition: 'transform 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    {subject.name}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

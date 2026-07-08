import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext.jsx';
import { Card, Button, Spinner } from 'react-bootstrap';
import { Check, ArrowRight, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../api.js';

export default function InterestSurveyPage() {
    const navigate = useNavigate();
    const { setUser } = useApp();
    const [tags, setTags] = useState([]);
    const [isLoadingTags, setIsLoadingTags] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedTags, setSelectedTags] = useState([]);

    // Tải danh sách public tags từ API thực tế hệ thống
    useEffect(() => {
        const fetchPublicTags = async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            const token = localStorage.getItem('token');

            if (!token) {
                console.warn("No token found in storage yet.");
                setIsLoadingTags(false);
                return;
            }

            try {
                setIsLoadingTags(true);
                const response = await fetch(`${API_BASE_URL}/api/v1/tags/public`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (response.ok && result.success && Array.isArray(result.data)) {
                    setTags(result.data);
                } else {
                    toast.error(result.message || 'Failed to load interest tags from server.');
                }
            } catch (error) {
                console.error('Error fetching tags:', error);
                toast.error('Could not connect to the server to fetch tags.');
            } finally {
                setIsLoadingTags(false);
            }
        };

        fetchPublicTags();
    }, []);

    // Chặn không cho chọn quá 3 tag
    const handleToggleTag = (tagId) => {
        if (selectedTags.includes(tagId)) {
            setSelectedTags(prev => prev.filter(id => id !== tagId));
        } else {
            if (selectedTags.length >= 3) {
                toast.warning('You can only select a maximum of 3 tags!');
                return;
            }
            setSelectedTags(prev => [...prev, tagId]);
        }
    };

    // Lưu cờ skip khảo sát vào localStorage để HomePage ẩn mục đề xuất
    const handleSkip = () => {
        localStorage.setItem('skippedSurvey', 'true');
        toast.info('You have skipped the onboarding survey.');
        navigate('/user/home', { replace: true });
    };

    const handleSubmit = async () => {
        if (selectedTags.length < 3) {
            toast.error('Please select exactly 3 topics of your interest!');
            return;
        }

        try {
            setIsSubmitting(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`${API_BASE_URL}/api/v1/users/preferred-tags`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tagIds: selectedTags })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Xóa cờ skip vì người dùng đã gửi thành công khảo sát
                localStorage.removeItem('skippedSurvey');
                setUser(prev => prev ? { ...prev, hasInterests: true } : null);

                toast.success('Preferences configured successfully!');
                navigate('/user/home', { replace: true });
            } else {
                throw new Error(result.message || 'Server rejected the preferred tags.');
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Network error, please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const originalTheme = document.documentElement.getAttribute('data-theme') || 'light';
        document.documentElement.setAttribute('data-theme', 'light');
        return () => {
            document.documentElement.setAttribute('data-theme', originalTheme);
        };
    }, []);

    return (
        <div
            className="w-100 d-flex justify-content-center align-items-center p-3 p-md-4"
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #C73866 0%, #FD8F52 100%)',
                fontFamily: "'Inter', sans-serif"
            }}
        >
            <Card
                className="border-0 shadow-lg w-100 position-relative"
                style={{
                    borderRadius: '1.75rem',
                    maxWidth: '900px',
                    backgroundColor: 'rgba(255, 255, 255, 0.96)',
                    backdropFilter: 'blur(10px)'
                }}
            >
                <button
                    onClick={handleSkip}
                    className="position-absolute btn d-flex align-items-center gap-1 border-0 fw-semibold text-muted shadow-none"
                    style={{
                        top: '24px',
                        right: '24px',
                        fontSize: '13px',
                        zIndex: 10,
                        backgroundColor: '#F3F4F6',
                        borderRadius: '20px',
                        padding: '6px 16px',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                >
                    <span>Skip survey</span>
                    <X size={14} />
                </button>

                <Card.Body className="p-4 p-md-5 text-center">
                    <div className="mx-auto mb-4" style={{ width: '65px', height: '6px', backgroundColor: '#C73866', borderRadius: '10px' }} />

                    <h2 className="fw-bold text-dark mb-2" style={{ fontSize: '28px', letterSpacing: '-0.5px' }}>
                        Which topics do you want to explore?
                    </h2>
                    <p className="text-muted mb-4 mx-auto" style={{ fontSize: '14px', maxWidth: '520px' }}>
                        Select up to 3 academic tags to let our AI customize and prioritize document recommendations for you.
                    </p>

                    {isLoadingTags ? (
                        <div className="d-flex flex-column justify-content-center align-items-center py-5 my-4" style={{ minHeight: '250px' }}>
                            <Loader2 className="animate-spin mb-2" size={36} style={{ animation: 'spin 1s linear infinite', color: '#FD8F52' }} />
                            <span className="text-muted fw-medium" style={{ fontSize: '14px' }}>Loading available topics...</span>
                        </div>
                    ) : (
                        <div className="row g-3 my-2 overflow-auto text-start" style={{ maxHeight: '390px', padding: '6px' }}>
                            {tags.map((tag) => {
                                const isSelected = selectedTags.includes(tag.id);
                                return (
                                    <div className="col-12 col-sm-6 col-md-4" key={tag.id}>
                                        <div
                                            onClick={() => handleToggleTag(tag.id)}
                                            // CĂN GIỮA CHỮ: tích hợp lớp Flexbox căn giữa cả chiều dọc lẫn chiều ngang hoàn chỉnh
                                            className="p-3 d-flex align-items-center justify-content-center text-center position-relative"
                                            style={{
                                                borderRadius: '18px',
                                                cursor: 'pointer',
                                                minHeight: '100px',
                                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                                background: isSelected
                                                    ? 'linear-gradient(135deg, rgba(199, 56, 102, 0.06) 0%, rgba(253, 143, 82, 0.14) 100%)'
                                                    : '#FFFFFF',
                                                border: isSelected
                                                    ? '2.5px solid #FD8F52'
                                                    : '1px solid rgba(0, 0, 0, 0.08)',
                                                boxShadow: isSelected
                                                    ? '0 8px 20px rgba(253, 143, 82, 0.2)'
                                                    : '0 4px 6px rgba(0, 0, 0, 0.02)',
                                                transform: isSelected ? 'translateY(-2px)' : 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.borderColor = '#FD8F52';
                                                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.02)';
                                                }
                                            }}
                                        >
                                            {isSelected && (
                                                <span className="position-absolute d-flex align-items-center justify-content-center text-white rounded-circle shadow-sm" style={{ top: '14px', right: '14px', width: '22px', height: '22px', backgroundColor: '#FD8F52' }}>
                                                    <Check size={13} strokeWidth={3} />
                                                </span>
                                            )}

                                            {/* Khối chữ bọc trong px-2 để tên dài không chạm biên ô */}
                                            <div className="w-100 px-2">
                                                <h6 className="fw-bold text-dark mb-0" style={{ fontSize: '15px', lineHeight: '1.4' }}>
                                                    {tag.label || 'Unnamed Tag'}
                                                </h6>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {!isLoadingTags && tags.length === 0 && (
                                <div className="text-center py-5 text-muted w-100">
                                    No public tags available on the server database.
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-top d-flex justify-content-center">
                        <Button
                            onClick={handleSubmit}
                            disabled={selectedTags.length !== 3 || isSubmitting || isLoadingTags}
                            className="px-5 py-2.5 rounded-pill fw-bold border-0 d-inline-flex align-items-center gap-2 shadow"
                            style={{
                                background: selectedTags.length === 3 ? 'linear-gradient(135deg, #C73866, #FD8F52)' : '#E5E7EB',
                                color: selectedTags.length === 3 ? '#ffffff' : '#9CA3AF',
                                cursor: selectedTags.length === 3 ? 'pointer' : 'not-allowed',
                                fontSize: '15px',
                                transition: 'all 0.3s'
                            }}
                        >
                            {isSubmitting ? (
                                <Spinner as="span" animation="border" size="sm" />
                            ) : (
                                <>
                                    {selectedTags.length === 3 ? 'Get Started' : `Select exactly 3 topics (${selectedTags.length}/3)`}
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </Button>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
}
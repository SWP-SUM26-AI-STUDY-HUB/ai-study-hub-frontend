import React, { useState } from 'react';
import { Check, XCircle } from 'lucide-react';

// Shared quiz/flashcard renderers. Used by FloatingChatBox (live generation) and
// ChatHistoryPage (replaying a persisted session). Item shape mirrors the backend
// QuizQuestionResponse / FlashcardItemResponse (camelCase).

// === QUIZ CARD: render 1 câu hỏi trắc nghiệm, bấm option để hiện đáp án đúng/sai + giải thích ===
export const QuizCard = ({ item, index }) => {
    const [selected, setSelected] = useState(null);
    const options = Array.isArray(item.options) ? item.options : [];
    const correctIndex = item.correct_index ?? item.correctIndex;

    return (
        <div className="border rounded-3 p-2 mb-2 bg-white" style={{ fontSize: '12px', borderColor: '#f0f0f0' }}>
            <div className="fw-semibold mb-2 d-flex gap-1.5 align-items-start" style={{ color: '#333', lineHeight: 1.4 }}>
                <span className="badge rounded-pill flex-shrink-0" style={{ fontSize: '9px', background: 'rgba(253, 143, 82, 0.15)', color: '#FD8F52' }}>
                    Q{index + 1}
                </span>
                <span className="flex-grow-1">{item.question}</span>
            </div>
            <div className="d-flex flex-column gap-1">
                {options.map((opt, i) => {
                    const isCorrect = i === correctIndex;
                    const isChosen = i === selected;
                    let bg = '#F8F9FA';
                    let border = '1px solid #eef0f2';
                    if (selected !== null) {
                        if (isCorrect) { bg = '#E6F9EE'; border = '1px solid #198754'; }
                        else if (isChosen) { bg = '#FFF0F2'; border = '1px solid #C73866'; }
                    }
                    return (
                        <button
                            key={i}
                            type="button"
                            disabled={selected !== null}
                            onClick={() => setSelected(i)}
                            className="text-start d-flex align-items-center gap-1.5 rounded-2 px-2 py-1"
                            style={{ fontSize: '11px', background: bg, border, cursor: selected !== null ? 'default' : 'pointer', transition: 'all 0.15s' }}
                        >
                            <span className="badge bg-secondary-subtle text-secondary flex-shrink-0" style={{ fontSize: '8px', width: '14px', height: '14px', lineHeight: '14px', padding: 0 }}>
                                {String.fromCharCode(65 + i)}
                            </span>
                            <span className="flex-grow-1" style={{ color: '#444' }}>{opt}</span>
                            {selected !== null && isCorrect && <Check size={12} className="text-success flex-shrink-0" />}
                            {selected !== null && isChosen && !isCorrect && <XCircle size={12} className="text-danger flex-shrink-0" />}
                        </button>
                    );
                })}
            </div>
            {selected !== null && item.explanation && (
                <div className="mt-1.5 p-1.5 rounded-2" style={{ background: '#FFF5ED', fontSize: '10.5px', color: '#717182', lineHeight: 1.4, borderLeft: '2px solid #FD8F52' }}>
                    <span className="fw-semibold">Explanation: </span>{item.explanation}
                </div>
            )}
        </div>
    );
};

// === FLASHCARD: tap để lật giữa Term ↔ Definition ===
export const FlashcardCard = ({ item, index }) => {
    const [flipped, setFlipped] = useState(false);
    return (
        <button
            type="button"
            onClick={() => setFlipped(!flipped)}
            className="text-start w-100 border rounded-3 p-2 mb-2 bg-white d-flex align-items-start gap-1.5"
            style={{ fontSize: '12px', transition: 'all 0.15s', borderColor: flipped ? '#FD8F52' : '#f0f0f0' }}
        >
            <span className="badge rounded-pill flex-shrink-0" style={{ fontSize: '9px', background: 'rgba(253, 143, 82, 0.15)', color: '#FD8F52' }}>
                #{index + 1}
            </span>
            <div className="flex-grow-1">
                {flipped ? (
                    <>
                        <div className="fw-bold mb-0.5" style={{ color: '#FD8F52', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Definition</div>
                        <div style={{ color: '#444', lineHeight: 1.4 }}>{item.definition}</div>
                    </>
                ) : (
                    <>
                        <div className="fw-bold mb-0.5 text-muted" style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Term</div>
                        <div className="fw-semibold" style={{ color: '#333', lineHeight: 1.4 }}>{item.term}</div>
                    </>
                )}
            </div>
            <span className="text-muted flex-shrink-0 align-self-center" style={{ fontSize: '8px', fontStyle: 'italic' }}>
                {flipped ? '← term' : 'flip →'}
            </span>
        </button>
    );
};

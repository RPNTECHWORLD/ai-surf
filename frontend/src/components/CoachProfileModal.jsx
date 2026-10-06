import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'https://www.athnexlive.com';

export default function CoachProfileModal({ isOpen, onClose, coachId, coachName, currentUser }) {
  const [coach, setCoach] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  
  // Review submission state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSubmitMessage(null);
    setComment('');
    setRating(5);

    // Fetch coach data
    const fetchCoach = async () => {
      try {
        let foundCoach = null;

        // 1. Try by ID if available and valid
        if (coachId && !isNaN(parseInt(coachId, 10)) && parseInt(coachId, 10) > 0) {
          try {
            const res = await fetch(`${API}/api/instructors/${coachId}`);
            if (res.ok) {
              foundCoach = await res.json();
            }
          } catch (e) {}
        }

        // 2. Search list by name or ID if direct fetch failed
        if (!foundCoach) {
          const listRes = await fetch(`${API}/api/instructors`);
          if (listRes.ok) {
            const list = await listRes.json();
            if (Array.isArray(list)) {
              const targetName = (coachName || '').toLowerCase().trim();
              const targetId = coachId ? String(coachId) : '';
              foundCoach = list.find(i => 
                (targetId && String(i.id) === targetId) ||
                (targetName && i.name && i.name.toLowerCase().trim() === targetName) ||
                (targetName && i.name && (i.name.toLowerCase().includes(targetName) || targetName.includes(i.name.toLowerCase())))
              );
            }
          }
        }

        if (foundCoach) {
          setCoach(foundCoach);
          const revList = Array.isArray(foundCoach.reviews) ? foundCoach.reviews : [];
          setReviews(revList);
        } else {
          // Fallback object with provided info
          const fallback = {
            id: coachId || 1,
            name: coachName || 'Coach',
            school: 'Surf School',
            bio: `Dedicated surf instructor specializing in wave riding technique and water safety.`,
            specializations: ['Wave Mechanics', 'Video Analysis', 'Paddling Power'],
            certifications: ['ISA Certified', 'Lifeguard Certified'],
            experience: '3+ Years',
            reviews: []
          };
          setCoach(fallback);
          setReviews([]);
        }
      } catch (err) {
        console.error('Error fetching coach details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCoach();
  }, [isOpen, coachId, coachName]);

  // Determine user role and identity
  const sessionUser = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
    } catch (e) {
      return {};
    }
  })();
  const effectiveUser = (currentUser && Object.keys(currentUser).length > 0) ? currentUser : sessionUser;
  const userRole = (effectiveUser?.role || '').toLowerCase();
  const isStudent = userRole === 'athlete' || userRole === 'student';
  const isCoach = userRole === 'coach' || userRole === 'instructor';

  const effectiveUserName = (effectiveUser?.name || effectiveUser?.student_name || '').trim().toLowerCase();
  const coachNameLower = (coach?.name || coachName || '').trim().toLowerCase();
  const isSameCoach = Boolean(effectiveUserName && coachNameLower && effectiveUserName === coachNameLower);

  if (!isOpen) return null;

  // Calculate average rating
  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1)
    : '5.0';

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isStudent || isCoach || isSameCoach) {
      setSubmitMessage({ type: 'error', text: 'Only students are eligible to submit reviews for coaches.' });
      return;
    }

    if (!comment.trim()) {
      setSubmitMessage({ type: 'error', text: 'Please write a brief comment before submitting.' });
      return;
    }

    if (!coach?.id) {
      setSubmitMessage({ type: 'error', text: 'Coach ID not identified.' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    const studentName = effectiveUser?.name || effectiveUser?.student_name || 'Student';
    const studentId = effectiveUser?.student_id || effectiveUser?.id || null;

    try {
      const payload = {
        student_name: studentName,
        student_id: studentId,
        rating: rating,
        comment: comment.trim(),
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      };

      const res = await fetch(`${API}/api/instructors/${coach.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const updatedList = data.reviews || [payload, ...reviews];
        setReviews(updatedList);
        setComment('');
        setRating(5);
        setSubmitMessage({ type: 'success', text: 'Thank you! Your review has been submitted successfully.' });
      } else {
        const errData = await res.json().catch(() => ({}));
        setSubmitMessage({ type: 'error', text: errData.detail || 'Only students can submit reviews.' });
      }
    } catch (err) {
      console.error('Review submit error:', err);
      setSubmitMessage({ type: 'error', text: 'Could not connect to server. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const starLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div 
      className="coach-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        className="coach-modal-container"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div style={{
          background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 50%, #0284C7 100%)',
          padding: '24px 24px 20px',
          color: '#FFFFFF',
          position: 'relative'
        }}>
          <button 
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#FFFFFF',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s ease'
            }}
            title="Close"
          >
            ✕
          </button>

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading Coach Profile...</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              {/* Avatar */}
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                color: '#0D9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                fontWeight: 800,
                boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                border: '3px solid rgba(255,255,255,0.4)',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {coach?.image ? (
                  <img src={coach.image} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (coach?.name || 'C').charAt(0).toUpperCase()
                )}
              </div>

              {/* Title & Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '-0.3px', color: '#FFFFFF' }}>
                    {coach?.name}
                  </h2>
                  <span style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.22)',
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    color: '#FFFFFF'
                  }}>
                    Surf Coach
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', opacity: 0.9, marginTop: '3px' }}>
                  {coach?.school || 'Affiliated Surf Academy'}
                </div>

                {/* Rating & Stats preview */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', fontSize: '12.5px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                    <span style={{ color: '#FDE047' }}>★</span> {avgRating} ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                  </span>
                  {coach?.experience && (
                    <span style={{ opacity: 0.85 }}>• {coach.experience} Exp</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Bio / About */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '13px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.5px' }}>
              About Coach
            </h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
              {coach?.bio || 'Professional surf coach focused on student progression, ocean safety, wave reading, and board control.'}
            </p>
          </div>

          {/* Specializations & Badges */}
          {coach?.specializations && coach.specializations.length > 0 && (
            <div style={{ marginBottom: '22px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.5px' }}>
                Specializations & Focus Areas
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {coach.specializations.map((spec, i) => (
                  <span key={i} style={{
                    backgroundColor: '#F0FDFA',
                    color: '#0F766E',
                    border: '1px solid #99F6E4',
                    borderRadius: '6px',
                    padding: '3px 9px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    🏄 {spec}
                  </span>
                ))}
              </div>
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '20px 0' }} />

          {/* Reviews Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Student Reviews</span>
                <span style={{
                  backgroundColor: '#E2E8F0',
                  color: '#475569',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '10px'
                }}>
                  {reviews.length}
                </span>
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                <span style={{ color: '#F59E0B' }}>★</span>
                <span>{avgRating} / 5.0</span>
              </div>
            </div>

            {/* Write a Review Box (Students Only) */}
            {isStudent && !isCoach && !isSameCoach ? (
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                  Rate & Review Coach {coach?.name}
                </h4>

                {submitMessage && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    marginBottom: '12px',
                    backgroundColor: submitMessage.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                    color: submitMessage.type === 'success' ? '#15803D' : '#B91C1C'
                  }}>
                    {submitMessage.text}
                  </div>
                )}

                <form onSubmit={handleReviewSubmit}>
                  {/* Star Picker */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Your Rating:</span>
                    <div style={{ display: 'flex', gap: '4px', cursor: 'pointer' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          style={{
                            fontSize: '22px',
                            color: (hoverRating || rating) >= star ? '#F59E0B' : '#CBD5E1',
                            transition: 'color 0.15s ease',
                            userSelect: 'none'
                          }}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(star)}
                          title={`${star} Star${star > 1 ? 's' : ''}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span style={{ fontSize: '12px', color: '#0D9488', fontWeight: 700 }}>
                      {starLabels[hoverRating || rating]}
                    </span>
                  </div>

                  {/* Comment Box */}
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={`Write your feedback for Coach ${coach?.name || 'this coach'} (e.g. paddling tips, coaching encouragement, wave selection)...`}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      marginBottom: '10px',
                      outline: 'none',
                      transition: 'border 0.2s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0D9488'}
                    onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={isSubmitting || !comment.trim()}
                      style={{
                        backgroundColor: isSubmitting || !comment.trim() ? '#94A3B8' : '#0D9488',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: isSubmitting || !comment.trim() ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#E2E8F0',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0
                }}>
                  🎓
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '2px' }}>
                    {isSameCoach
                      ? 'Coach Profile View'
                      : isCoach
                      ? 'Coach Review Restricted'
                      : 'Student Reviews Only'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.4' }}>
                    {isSameCoach
                      ? 'Coaches cannot submit reviews for themselves. All reviews below are submitted by your enrolled students.'
                      : isCoach
                      ? 'Only enrolled students can rate and review coaches. Coaches cannot submit reviews for other coaches.'
                      : 'Only enrolled students can submit reviews for coaches. Verified student ratings are shown below.'}
                  </div>
                </div>
              </div>
            )}

            {/* List of Previous Reviews */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reviews.length === 0 ? (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px dashed #CBD5E1',
                  color: '#64748B',
                  fontSize: '13px'
                }}>
                  No reviews submitted for this coach yet. Be the first to leave a review!
                </div>
              ) : (
                reviews.map((rev, idx) => (
                  <div 
                    key={rev.id || idx}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: '#E0F2FE',
                          color: '#0369A1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 800
                        }}>
                          {(rev.student_name || rev.student || 'S').charAt(0).toUpperCase()}
                        </div>
                        <strong style={{ fontSize: '13px', color: '#0F172A' }}>
                          {rev.student_name || rev.student || 'Student'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#F59E0B', fontSize: '13px', letterSpacing: '1px' }}>
                          {'★'.repeat(Number(rev.rating) || 5)}
                        </span>
                        {rev.date && (
                          <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>• {rev.date}</span>
                        )}
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.45 }}>
                      {rev.comment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #E2E8F0',
          background: '#F8FAFC',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {coach?.id ? (
            <a 
              href={`/instructors/${coach.id}`}
              style={{ fontSize: '12.5px', color: '#0D9488', fontWeight: 700, textDecoration: 'none' }}
              onClick={onClose}
            >
              View Full Profile Page →
            </a>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

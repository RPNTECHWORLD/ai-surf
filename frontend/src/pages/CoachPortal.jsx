import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

export default function CoachPortal() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = params.get('id');
  const token = params.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id && !token) {
      // If neither, redirect to instructors list
      sessionStorage.setItem('token', 'coach_guest_session');
      sessionStorage.setItem('user', JSON.stringify({ role: 'coach', name: 'Coach' }));
      navigate('/instructors', { replace: true });
      return;
    }

    const fetchId = id || 1;
    fetch(`${API}/api/instructors/${fetchId}`)
      .then(r => {
        if (!r.ok) throw new Error('Coach profile not found');
        return r.json();
      })
      .then(data => {
        // Automatically establish coach session and direct redirect to coach profile
        const coachUser = {
          id: data.id,
          instructor_id: data.id,
          name: data.name,
          role: 'coach',
          image: data.image,
          school: data.school || 'Aquatic Indica Surf School',
          email: data.email || ''
        };
        sessionStorage.setItem('user', JSON.stringify(coachUser));
        sessionStorage.setItem('token', `coach_invite_${data.id}`);
        navigate(`/instructors/${data.id}`, { replace: true });
      })
      .catch(err => {
        console.error('Coach portal load error:', err);
        // Fallback: establish general coach session and open instructor profile
        const coachUser = {
          id: fetchId,
          instructor_id: fetchId,
          name: 'Coach',
          role: 'coach'
        };
        sessionStorage.setItem('user', JSON.stringify(coachUser));
        sessionStorage.setItem('token', `coach_invite_${fetchId}`);
        navigate(`/instructors/${fetchId}`, { replace: true });
      });
  }, [id, token, navigate]);

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
        <p style={{ marginTop: 16, color: '#0D9488', fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: '700' }}>
          Opening Coach Profile...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.center}>
        <div style={styles.errorCard}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏄‍♂️</div>
          <h2 style={styles.errTitle}>Link Unavailable</h2>
          <p style={styles.errSub}>{error}</p>
          <button style={styles.btnPrimary} onClick={() => navigate('/auth')}>Go to Login</button>
        </div>
      </div>
    );
  }

  return null;
}

const styles = {
  center: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#050B1A',
    padding: '24px',
    fontFamily: 'Inter, sans-serif'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid rgba(13, 148, 136, 0.2)',
    borderTopColor: '#00D1B2',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  errorCard: {
    background: '#0F172A',
    border: '1px solid #1E293B',
    borderRadius: '20px',
    padding: '36px',
    textAlign: 'center',
    maxWidth: '440px',
    color: '#FFFFFF'
  },
  errTitle: {
    fontSize: '22px',
    fontWeight: '800',
    marginBottom: '8px',
    fontFamily: 'Outfit, sans-serif'
  },
  errSub: {
    fontSize: '14px',
    color: '#94A3B8',
    marginBottom: '24px',
    lineHeight: '1.5'
  },
  btnPrimary: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer'
  }
};

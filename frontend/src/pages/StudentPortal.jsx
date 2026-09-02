import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

const levelColors = {
  Beginner:     { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  Intermediate: { bg: 'rgba(13,148,136,0.12)',  color: '#0D9488' },
  Advanced:     { bg: 'rgba(124,58,237,0.12)',   color: '#7C3AED' },
  Master:       { bg: 'rgba(5,11,26,0.07)',       color: '#050B1A' },
};

export default function StudentPortal() {
  const [params]    = useSearchParams();
  const navigate    = useNavigate();
  const token       = params.get('token');

  const [student,   setStudent]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  // Password form
  const [pass,      setPass]      = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [passErr,   setPassErr]   = useState('');

  useEffect(() => {
    if (!token) { setError('No invite token found in the link.'); setLoading(false); return; }
    fetch(`${API}/api/invite/${token}`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.detail || 'Invalid link')))
      .then(data => {
        setStudent(data);
        setLoading(false);
        // Automatically establish student athlete session and redirect to full profile
        const studentUser = {
          id: data.student_id,
          student_id: data.student_id,
          name: data.name,
          email: data.email,
          role: 'athlete',
          image: data.image,
          instructor: data.instructor || data.instructor_name || '',
          school: data.school_name || data.school || (data.instructor ? `${data.instructor} Surf Coaching` : ''),
          has_password: data.password_set,
          invite_token: token,
          approval_status: data.approval_status || 'approved'
        };
        sessionStorage.setItem('user', JSON.stringify(studentUser));
        sessionStorage.setItem('token', `invite_${token}`);
        navigate(`/students/${data.student_id}?token=${token}`, { replace: true });
      })
      .catch(e  => { setError(String(e)); setLoading(false); });
  }, [token]);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setPassErr('');
    if (pass.length < 6)        { setPassErr('Password must be at least 6 characters.'); return; }
    if (pass !== confirm)        { setPassErr('Passwords do not match.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/invite/${token}/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaved(true);
        setTimeout(() => navigate('/auth'), 2800);
      } else {
        setPassErr(data.detail || data.message || 'Something went wrong.');
      }
    } catch { setPassErr('Network error. Please try again.'); }
    setSaving(false);
  };

  const lvl = student?.level || 'Beginner';
  const lvlStyle = levelColors[lvl] || levelColors.Beginner;

  if (loading) return (
    <div style={styles.center}>
      <div style={styles.spinner} />
      <p style={{ marginTop: 16, color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>Loading your profile...</p>
    </div>
  );

  if (error) return (
    <div style={styles.center}>
      <div style={styles.errorCard}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔗</div>
        <h2 style={styles.errTitle}>Link Unavailable</h2>
        <p style={styles.errSub}>{error}</p>
        <button style={styles.btnPrimary} onClick={() => navigate('/auth')}>Go to Login</button>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.heroBg} />

      <div style={styles.container}>

        {/* School badge */}
        <div style={styles.schoolBadge}>
          🏄 {student.school_name}
        </div>

        {/* Profile card */}
        <div style={styles.profileCard}>
          <div style={styles.avatarWrap}>
            {student.image
              ? <img src={student.image} alt={student.name} style={styles.avatar} />
              : <div style={styles.avatarFallback}>{student.name?.[0] || '?'}</div>
            }
          </div>

          <h1 style={styles.name}>{student.name}</h1>
          <p style={styles.email}>{student.email}</p>

          <span style={{ ...styles.levelBadge, background: lvlStyle.bg, color: lvlStyle.color }}>
            {lvl}
          </span>

          <div style={styles.infoGrid}>
            {[
              { icon: '📅', label: 'Course',     value: student.course_duration },
              { icon: '🕐', label: 'Session',    value: student.session_time },
              { icon: '🏫', label: 'Stay',       value: student.staying_at_school || '—' },
              { icon: '🏄', label: 'Instructor', value: student.instructor_name || 'TBD' },
            ].map(item => (
              <div key={item.label} style={styles.infoItem}>
                <span style={styles.infoIcon}>{item.icon}</span>
                <div>
                  <div style={styles.infoLabel}>{item.label}</div>
                  <div style={styles.infoValue}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Password card */}
        {saved ? (
          <div style={styles.successCard}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
            <h3 style={styles.successTitle}>Password Set!</h3>
            <p style={styles.successSub}>Redirecting you to login...</p>
          </div>
        ) : (
          <div style={styles.passwordCard}>
            <div style={styles.pwdHeader}>
              <span style={styles.pwdIcon}>🔐</span>
              <div>
                <h3 style={styles.pwdTitle}>Update Your Password</h3>
                <p style={styles.pwdSub}>
                  {student.password_set
                    ? 'You already have a password — you can update it here.'
                    : 'Set a password to log in anytime with your email and password.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSetPassword} style={styles.pwdForm}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>New Password</label>
                <div style={styles.inputWrap}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                    placeholder="At least 6 characters"
                    style={styles.input}
                    required
                  />
                  <button type="button" style={styles.eyeBtn} onClick={() => setShowPass(p => !p)}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Confirm Password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  style={styles.input}
                  required
                />
              </div>

              {passErr && <div style={styles.errMsg}>{passErr}</div>}

              <button type="submit" style={styles.btnPrimary} disabled={saving}>
                {saving ? 'Saving...' : '💾 Save Password & Continue'}
              </button>

              <p style={styles.skipNote}>
                Without a password, you can only access your profile using this invite link.
              </p>
            </form>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px 80px',
    position: 'relative',
    fontFamily: "'Instrument Sans', sans-serif",
  },
  heroBg: {
    position: 'fixed',
    inset: 0,
    background: 'linear-gradient(160deg, #0F172A 0%, #1e3a5f 40%, #0c4a6e 100%)',
    zIndex: 0,
  },
  container: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: 520,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  schoolBadge: {
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 40,
    color: '#fff',
    fontFamily: 'Outfit, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    padding: '8px 20px',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  profileCard: {
    background: 'rgba(255,255,255,0.97)',
    borderRadius: 24,
    padding: '32px 28px 24px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    textAlign: 'center',
  },
  avatarWrap: { display: 'flex', justifyContent: 'center', marginBottom: 16 },
  avatar: { width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid #F43F5E', boxShadow: '0 4px 16px rgba(244,63,94,0.25)' },
  avatarFallback: { width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg,#F43F5E,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: '#fff', fontWeight: 700, fontFamily: 'Outfit, sans-serif' },
  name:  { fontFamily: 'Outfit, sans-serif', fontSize: 26, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' },
  email: { fontSize: 13, color: '#64748B', margin: '0 0 12px' },
  levelBadge: { display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20, textAlign: 'left' },
  infoItem: { display: 'flex', alignItems: 'flex-start', gap: 10, background: '#F8FAFC', borderRadius: 12, padding: '10px 12px' },
  infoIcon:  { fontSize: 20, flexShrink: 0 },
  infoLabel: { fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 13, fontWeight: 600, color: '#0F172A', marginTop: 2 },
  passwordCard: {
    background: 'rgba(255,255,255,0.97)',
    borderRadius: 24,
    padding: '28px 28px 24px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  },
  pwdHeader: { display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 },
  pwdIcon:   { fontSize: 32, flexShrink: 0 },
  pwdTitle:  { fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' },
  pwdSub:    { fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.5 },
  pwdForm:   { display: 'flex', flexDirection: 'column', gap: 14 },
  fieldGroup:{ display: 'flex', flexDirection: 'column', gap: 6 },
  label:     { fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap: { position: 'relative' },
  input:     { width: '100%', border: '1px solid #E2E8F0', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#0F172A', outline: 'none', background: '#F8FAFC', boxSizing: 'border-box', fontFamily: 'inherit' },
  eyeBtn:    { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 },
  errMsg:    { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#EF4444' },
  btnPrimary:{ background: 'linear-gradient(135deg,#F43F5E,#E11D48)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(244,63,94,0.35)', width: '100%' },
  skipNote:  { fontSize: 12, color: '#94A3B8', textAlign: 'center', margin: 0 },
  successCard: { background: 'rgba(255,255,255,0.97)', borderRadius: 24, padding: 40, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  successTitle:{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 8px' },
  successSub:  { fontSize: 14, color: '#64748B', margin: 0 },
  center:   { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#0F172A,#1e3a5f)', flexDirection: 'column' },
  errorCard:{ background: '#fff', borderRadius: 24, padding: 40, textAlign: 'center', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  errTitle: { fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 8px' },
  errSub:   { fontSize: 14, color: '#64748B', margin: '0 0 20px' },
  spinner:  { width: 40, height: 40, border: '4px solid rgba(255,255,255,0.2)', borderTop: '4px solid #F43F5E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
};

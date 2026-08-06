import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [userType, setUserType] = useState('athlete'); // athlete, coach, admin
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const endpoint = isRegister ? 'http://localhost:8000/api/auth/register' : 'http://localhost:8000/api/auth/login';
    const payload = isRegister
      ? { email, password, full_name: fullName, user_type: userType }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setSuccess(isRegister ? 'Account created successfully! Redirecting...' : 'Login successful! Redirecting...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSSO = async (provider) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/auth/sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          id_token: 'mock_sso_token',
          email: `${provider}_user@example.com`,
          full_name: `${provider} User`,
          user_type: userType
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'SSO failed');

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setSuccess(`Single Sign-On with ${provider} successful!`);
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#050B1A',
      color: '#FFFFFF',
      fontFamily: 'Inter, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#0A152E',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        width: '100%',
        maxWidth: '440px',
        border: '1px solid #1E293B'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0', color: '#38BDF8' }}>
            AI Surf Coach
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '14px', margin: 0 }}>
            {isRegister ? 'Create your athlete or coach account' : 'Sign in to access your intelligence portal'}
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#F87171',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            color: '#4ADE80',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#CBD5E1', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#FFF',
                  fontSize: '14px'
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#CBD5E1', marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="athlete@example.com"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#FFF',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#CBD5E1', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#FFF',
                fontSize: '14px'
              }}
            />
          </div>

          {isRegister && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#CBD5E1', marginBottom: '6px' }}>
                Account Type (RBAC)
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setUserType('athlete')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: userType === 'athlete' ? '2px solid #38BDF8' : '1px solid #334155',
                    backgroundColor: userType === 'athlete' ? '#0284C7' : '#0F172A',
                    color: '#FFF',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  🏄 Athlete
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('coach')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: userType === 'coach' ? '2px solid #38BDF8' : '1px solid #334155',
                    backgroundColor: userType === 'coach' ? '#0284C7' : '#0F172A',
                    color: '#FFF',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  📋 Coach
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#0284C7',
              color: '#FFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }} />
          <span style={{ padding: '0 12px', fontSize: '12px', color: '#64748B' }}>OR CONTINUE WITH</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }} />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => handleSSO('Google')}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#FFF',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Google SSO
          </button>
          <button
            onClick={() => handleSSO('Apple')}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#FFF',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Apple ID SSO
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: '14px', color: '#94A3B8' }}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span
            onClick={() => setIsRegister(!isRegister)}
            style={{ color: '#38BDF8', cursor: 'pointer', fontWeight: '600' }}
          >
            {isRegister ? 'Sign In' : 'Sign Up'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

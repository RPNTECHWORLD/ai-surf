import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Waves, LogOut, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

import bgImage from '../assets/bg.jpeg';

const JudgeLogin = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Email pattern validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await axios.post(`${API_BASE}/judges/login`, { email });
            sessionStorage.setItem('judgeInfo', JSON.stringify(response.data));
            navigate('/judge/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your email.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            padding: '24px'
        }}>
            {/* Dark Overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15, 23, 42, 0.7)',
                zIndex: 1
            }} />

            <div className="container-max" style={{ maxWidth: '450px', width: '100%', position: 'relative', zIndex: 2 }}>
                <div className="card animate-fade-in" style={{
                    padding: '48px',
                    background: 'white',
                    borderRadius: '24px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div className="icon-box" style={{
                            margin: '0 auto 20px',
                            background: '#0f172a',
                            width: '64px',
                            height: '64px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '16px',
                            boxShadow: '0 8px 16px rgba(15, 23, 42, 0.2)'
                        }}>
                            <Waves size={32} strokeWidth={2.5} style={{ color: 'white' }} />
                        </div>
                        <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '8px', color: '#0f172a' }}>Judge Login</h1>
                        <p style={{ fontSize: '15px', color: '#64748b', fontWeight: '500' }}>Enter your registered email to access the scoring console</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#475569',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}>
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="form-control"
                                placeholder="name@email.com"
                                required
                                style={{
                                    width: '100%',
                                    height: '52px',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    padding: '0 16px',
                                    fontSize: '16px',
                                    transition: 'all 0.2s ease'
                                }}
                            />
                        </div>

                        {error && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                marginBottom: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                color: '#ef4444',
                                fontSize: '14px',
                                fontWeight: '600'
                            }}>
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                padding: '16px',
                                fontSize: '16px',
                                fontWeight: '800',
                                borderRadius: '12px',
                                backgroundColor: '#0f172a',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.3)'
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                'Access Scoring Console'
                            )}
                        </button>

                        <div style={{ marginTop: '16px', textAlign: 'center' }}>
                            <button
                                type="button"
                                onClick={() => navigate('/viewer')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    padding: '8px 16px',
                                    transition: 'color 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.color = '#0f172a'}
                                onMouseLeave={(e) => e.target.style.color = '#64748b'}
                            >
                                ← Back to Home
                            </button>
                        </div>
                    </form>
                    {/* 
                    <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
                        New judge? <Link to="/join" style={{ color: 'white', fontWeight: '600', textDecoration: 'none' }}>Join Competition</Link>
                    </div> */}
                </div>

                {/* <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <Link to="/" style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none' }}>
                        &larr; Back to Role Selection
                    </Link>
                </div> */}
            </div>
        </div>
    );
};

export default JudgeLogin;

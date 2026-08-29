import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Send, Loader2, Clock } from 'lucide-react';
import axios from 'axios';
import bgImage from '../assets/bg.jpeg';

const API_BASE = 'http://54.84.243.251/api';

const JoinJudge = () => {
    const [formData, setFormData] = useState({ name: '', email: '' });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [judgeId, setJudgeId] = useState(null);
    const [isWaiting, setIsWaiting] = useState(false);

    useEffect(() => {
        // Get the invite ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const inviteId = urlParams.get('id');

        const storedJudge = sessionStorage.getItem('judgeInfo');

        if (storedJudge) {
            const judge = JSON.parse(storedJudge);

            // If there's a new invite ID in the URL, clear the old judge data
            if (inviteId && judge.invite_id !== inviteId) {
                sessionStorage.removeItem('judgeInfo');
                setJudgeId(null);
                setIsWaiting(false);
                return;
            }

            // If same invite or no invite in URL, proceed with existing logic
            if (judge.status === 'Active') {
                window.location.href = '/judge/dashboard';
            } else if (judge.status === 'Pending') {
                setJudgeId(judge.id);
                setIsWaiting(true);
                startPolling(judge.id);
            }
        }
    }, []);

    const startPolling = (id) => {
        const interval = setInterval(async () => {
            try {
                const response = await axios.get(`${API_BASE}/judges/${id}`);
                const judge = response.data;

                if (!judge) {
                    clearInterval(interval);
                    sessionStorage.removeItem('judgeInfo');
                    setIsWaiting(false);
                    setJudgeId(null);
                    setError('Your request was withdrawn or removed by the admin.');
                    return;
                }

                if (judge.status === 'Active') {
                    clearInterval(interval);
                    sessionStorage.setItem('judgeInfo', JSON.stringify(judge));
                    window.location.href = '/judge/dashboard';
                } else if (judge.status === 'Rejected') {
                    clearInterval(interval);
                    sessionStorage.removeItem('judgeInfo');
                    setIsWaiting(false);
                    setJudgeId(null);
                    setError('Your request was declined by the admin.');
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 3000);

        return () => clearInterval(interval);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Email pattern validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address.');
            return;
        }

        setIsSubmitting(true);

        // Extract invite_id from URL
        const urlParams = new URLSearchParams(window.location.search);
        const inviteId = urlParams.get('id');

        try {
            const response = await axios.post(`${API_BASE}/judges/join`, {
                ...formData,
                invite_id: inviteId
            });

            const newJudge = { ...response.data, invite_id: inviteId };
            setJudgeId(newJudge.id);
            sessionStorage.setItem('judgeInfo', JSON.stringify(newJudge));
            setIsWaiting(true);
            startPolling(newJudge.id);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit request.');
            setIsSubmitting(false);
        }
    };

    const containerStyle = {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        padding: '24px'
    };

    const overlayStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.7)',
        zIndex: 1
    };

    const cardStyle = {
        padding: '48px',
        background: 'white',
        borderRadius: '24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '450px',
        position: 'relative',
        zIndex: 2
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontSize: '13px',
        fontWeight: '700',
        color: '#475569',
        textTransform: 'uppercase',
        letterSpacing: '1px'
    };

    const inputStyle = {
        width: '100%',
        height: '52px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '0 16px',
        fontSize: '16px',
        transition: 'all 0.2s ease'
    };

    if (isWaiting) {
        return (
            <div style={containerStyle}>
                <div style={overlayStyle} />
                <div style={cardStyle} className="animate-fade-in text-center">
                    <div className="icon-box" style={{
                        margin: '0 auto 24px',
                        background: 'rgba(255, 138, 0, 0.1)',
                        width: '80px',
                        height: '80px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '20px'
                    }}>
                        <Clock size={40} style={{ color: '#ff8a00' }} />
                    </div>
                    <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '16px', color: '#0f172a' }}>Waiting for Approval</h2>
                    <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '32px', color: '#64748b', fontWeight: '500' }}>
                        Your request has been sent to the event organizer.
                        This page will automatically refresh once you're approved.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <Loader2 className="animate-spin" size={20} style={{ color: '#ff8a00' }} />
                        <span style={{ fontSize: '15px', color: '#0f172a', fontWeight: '600' }}>Checking status...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <div style={overlayStyle} />
            <div style={cardStyle} className="animate-fade-in">
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
                        <Send size={32} style={{ color: 'white' }} />
                    </div>
                    <h2 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '8px', color: '#0f172a' }}>Join as Judge</h2>
                    <p style={{ fontSize: '15px', color: '#64748b', fontWeight: '500' }}>
                        Request access to score heats in this competition
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={labelStyle}>Full Name</label>
                        <input
                            type="text"
                            style={inputStyle}
                            className="form-control"
                            placeholder="Enter your full name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={labelStyle}>Email Address</label>
                        <input
                            type="email"
                            style={inputStyle}
                            className="form-control"
                            placeholder="name@gmail.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px 16px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '12px',
                            marginBottom: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            color: '#ef4444',
                            fontSize: '14px',
                            fontWeight: '600'
                        }}>
                            <div style={{ flexShrink: 0 }}>
                                <Loader2 size={18} style={{ display: error.includes('withdrawn') ? 'none' : 'block' }} />
                            </div>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Hide button if request was declined */}
                    {error !== 'Your request was declined by the admin.' && (
                        <button
                            type="submit"
                            disabled={isSubmitting}
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
                                boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.3)',
                                border: 'none',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    <span>Sending Request...</span>
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    <span>Send Access Request</span>
                                </>
                            )}
                        </button>
                    )}

                    <p style={{ fontSize: '12px', textAlign: 'center', marginTop: '24px', color: '#94a3b8', lineHeight: '1.5' }}>
                        By requesting access, you agree to follow the official surfing competition guidelines.
                    </p>
                </form>

                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
                    Already have an account? <Link to="/judge/login" style={{ color: '#0f172a', fontWeight: '700', textDecoration: 'none' }}>Login here</Link>
                </div>
            </div>
        </div>
    );
};

export default JoinJudge;

import React, { useState, useEffect } from 'react';
import { Copy, Check, X, User, Users, RefreshCcw, Trash2, Loader2 } from 'lucide-react';
import { useToast } from './ToastContext';
import { useConfirm } from './ConfirmContext';
import axios from 'axios';

const API_BASE = 'http://54.84.243.251/api';
const SURF_API = import.meta.env.VITE_API_URL || 'http://54.242.160.238:8000';

// Global cache for instant tab-switching
let globalJudgeCache = {
    activeJudges: [],
    pendingJudges: [],
    heats: [],
    events: [],
    processedRequests: [],
    hasLoaded: false
};

const JudgesManagement = () => {
    const { showToast } = useToast();
    const { showConfirm } = useConfirm();
    const [activeJudges, setActiveJudges] = useState(globalJudgeCache.activeJudges);
    const [pendingJudges, setPendingJudges] = useState(globalJudgeCache.pendingJudges);
    const [heats, setHeats] = useState(globalJudgeCache.heats);
    const [events, setEvents] = useState(globalJudgeCache.events);
    const [selectedHeatId, setSelectedHeatId] = useState('');
    const [copied, setCopied] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedJudgeIds, setSelectedJudgeIds] = useState([]);
    const [processedRequests, setProcessedRequests] = useState(globalJudgeCache.processedRequests);
    const [admitModal, setAdmitModal] = useState({
        isOpen: false, judge: null,
        selectedEventId: '', selectedDivision: '',
        assignmentType: 'all', selectedHeatId: '',
        role: 'scoring'
    });
    const [isLoading, setIsLoading] = useState(!globalJudgeCache.hasLoaded);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showInviteTooltip, setShowInviteTooltip] = useState(false);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Auto-refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    // Effect to auto-reset role when availability changes
    useEffect(() => {
        if (!admitModal.isOpen) return;

        const availableRoles = getAvailableRoles();
        if (!availableRoles.includes(admitModal.role)) {
            setAdmitModal(prev => ({ ...prev, role: 'scoring' }));
        }
    }, [activeJudges, admitModal.isOpen]);

    const getAvailableRoles = () => {
        const roles = ['scoring']; // Scoring is always available

        // Global check: only 1 Master and 1 Tabulator for the whole system
        const hasMaster = activeJudges.some(j => j.role === 'master');
        const hasTabulator = activeJudges.some(j => j.role === 'tabulator');

        if (!hasMaster) roles.push('master');
        if (!hasTabulator) roles.push('tabulator');

        return roles;
    };

    const fetchData = async () => {
        try {
            const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
            const adminId = adminInfo.adminId || 'admin';

            const [judgesRes, heatsRes, eventsRes, recentProcessedRes, instructorsRes] = await Promise.all([
                axios.get(`${API_BASE}/judges`, { params: { admin_id: adminId } }).catch(() => ({ data: [] })),
                axios.get(`${API_BASE}/heats`, { params: { admin_id: adminId } }).catch(() => ({ data: [] })),
                axios.get(`${API_BASE}/events`, { params: { admin_id: adminId } }).catch(() => ({ data: [] })),
                axios.get(`${API_BASE}/judges/recent-processed`, { params: { admin_id: adminId } }).catch(() => ({ data: [] })),
                axios.get(`${SURF_API}/api/instructors`).catch(() => ({ data: [] }))
            ]);

            const existingJudges = judgesRes.data || [];
            const rawInstructors = instructorsRes.data || [];

            // Deduplicate AI Surf instructors by name
            const seenNames = new Set();
            const instructors = [];
            for (const inst of rawInstructors) {
                const normName = (inst.name || '').trim().toLowerCase();
                if (normName && !seenNames.has(normName)) {
                    seenNames.add(normName);
                    instructors.push(inst);
                }
            }

            // Sync missing instructors to AquaticX backend in background
            for (const inst of instructors) {
                const alreadyExists = existingJudges.some(
                    j => j.name?.toLowerCase().trim() === inst.name?.toLowerCase().trim()
                );
                if (!alreadyExists && inst.name) {
                    try {
                        const email = inst.email || `${inst.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@aisurf.com`;
                        axios.post(`${API_BASE}/judges/join`, {
                            name: inst.name,
                            email,
                            invite_id: null
                        }).then(joinRes => {
                            if (joinRes.data?.id) {
                                axios.patch(`${API_BASE}/judges/${joinRes.data.id}/admit`, { role: 'scoring' }).catch(() => {});
                            }
                        }).catch(() => {});
                    } catch (e) {}
                }
            }

            // Only map the unique AI Surf instructors to active judges
            const active = instructors.map((inst, index) => {
                const matched = existingJudges.find(
                    j => j.name?.toLowerCase().trim() === inst.name?.toLowerCase().trim()
                );
                return {
                    id: matched?.id || `inst_${inst.id || index + 1}`,
                    name: inst.name,
                    email: inst.email || matched?.email || '',
                    status: 'Active',
                    role: matched?.role || 'scoring',
                    judge_number: index + 1,
                    image: inst.image || matched?.image || ''
                };
            });

            setActiveJudges(active);
            setPendingJudges([]);
            setHeats(heatsRes.data || []);
            setEvents(eventsRes.data || []);
            setProcessedRequests(recentProcessedRes.data || []);

            globalJudgeCache = {
                activeJudges: active,
                pendingJudges: [],
                heats: heatsRes.data || [],
                events: eventsRes.data || [],
                processedRequests: recentProcessedRes.data || [],
                hasLoaded: true
            };
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchData();
        setIsRefreshing(false);
    };


    const handleCopyLink = async () => {
        try {
            const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
            const adminId = adminInfo.adminId || 'admin';
            const response = await axios.post(`${API_BASE}/judges/invite/generate`, { admin_id: adminId });
            const inviteLink = `${window.location.origin}/join?id=${response.data.invite_id}`;
            navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            showToast('Invite link generated and copied!', 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Error generating invite link:', err);
            showToast('Failed to generate invite link.', 'error');
        }
    };

    const handleAdmit = (judge) => {
        setAdmitModal({
            isOpen: true,
            judge,
            selectedEventId: '',
            selectedDivision: '',
            assignmentType: 'all',
            selectedHeatId: '',
            role: 'scoring'
        });
    };

    const handleConfirmAdmit = async () => {
        const { judge, selectedEventId, selectedDivision, assignmentType, selectedHeatId: modalHeatId } = admitModal;

        if (assignmentType === 'specific' && !modalHeatId) {
            showToast('Please select a heat', 'error');
            return;
        }

        try {
            setIsSubmitting(true);

            // Admit the judge with role
            await axios.patch(`${API_BASE}/judges/${judge.id}/admit`, {
                assigned_heat_id: assignmentType === 'specific' ? modalHeatId : null,
                role: admitModal.role
            });

            // If assigning all heats in filtered scope
            if (assignmentType === 'all') {
                // Determine heats to assign based on event/division filters
                let heatsToAssign = heats;
                if (selectedEventId) heatsToAssign = heatsToAssign.filter(h => String(h.event_id) === String(selectedEventId));
                if (selectedDivision) heatsToAssign = heatsToAssign.filter(h => h.division === selectedDivision);

                if (admitModal.role === 'master' || admitModal.role === 'tabulator') {
                    heatsToAssign = heatsToAssign.filter(h => h.event_type !== 'SUP Event');
                }

                // Filter out Break heats
                heatsToAssign = heatsToAssign.filter(h => h.division !== 'Break' && !(h.round || '').toLowerCase().includes('break'));

                if (heatsToAssign.length > 0) {
                    await Promise.all(
                        heatsToAssign.map(h =>
                            axios.patch(`${API_BASE}/judges/${judge.id}/assign-heat`, { assigned_heat_id: h.id }).catch(() => { })
                        )
                    );
                } else {
                    await axios.patch(`${API_BASE}/judges/${judge.id}/assign-all-heats`);
                }
            }

            fetchData();
            setAdmitModal({ isOpen: false, judge: null, selectedEventId: '', selectedDivision: '', assignmentType: 'all', selectedHeatId: '', role: 'scoring' });
            showToast(`${judge.name} admitted and assigned!`, 'success');
        } catch (err) {
            console.error('Error admitting judge:', err);
            showToast('Failed to admit judge.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async (id) => {
        try {
            await axios.patch(`${API_BASE}/judges/${id}/reject`);
            fetchData();
        } catch (err) {
            console.error('Error rejecting judge:', err);
        }
    };

    const handleRemove = async (id) => {
        const confirmed = await showConfirm('Remove this judge from active list?');
        if (!confirmed) return;
        try {
            await axios.patch(`${API_BASE}/judges/${id}/remove`);
            showToast('Judge removed successfully', 'success');
            fetchData();
        } catch (err) {
            console.error('Error removing judge:', err);
        }
    };

    const handleDismiss = async (id) => {
        try {
            await axios.patch(`${API_BASE}/judges/${id}/dismiss`);
            fetchData();
        } catch (err) {
            console.error('Error dismissing request:', err);
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await showConfirm('Wipe this judge record permanently?');
        if (!confirmed) return;
        try {
            await axios.delete(`${API_BASE}/judges/${id}`);
            fetchData();
        } catch (err) {
            console.error('Error deleting judge:', err);
        }
    };

    const handleBatchAssignHeat = async () => {
        if (!selectedHeatId) {
            showToast('Please select a heat to assign.', 'error');
            return;
        }
        if (selectedJudgeIds.length === 0) {
            showToast('Please select at least one judge.', 'error');
            return;
        }
        try {
            setIsSubmitting(true);
            if (selectedHeatId === 'all') {
                const scheduledHeats = heats.filter(h => (!h.status || h.status === 'scheduled') && h.division !== 'Break' && !(h.round || '').toLowerCase().includes('break'));
                if (scheduledHeats.length === 0) {
                    showToast('No scheduled heats available.', 'error');
                    setIsSubmitting(false);
                    return;
                }

                for (const h of scheduledHeats) {
                    await axios.patch(`${API_BASE}/judges/batch/assign-heat`, {
                        assigned_heat_id: h.id,
                        judge_ids: selectedJudgeIds
                    });
                }
                showToast(`All scheduled heats assigned to ${selectedJudgeIds.length} judges!`, 'error');
            } else {
                await axios.patch(`${API_BASE}/judges/batch/assign-heat`, {
                    assigned_heat_id: selectedHeatId,
                    judge_ids: selectedJudgeIds
                });
                showToast(`Heat assigned to ${selectedJudgeIds.length} judges!`, 'error');
            }
            fetchData();
            setIsModalOpen(false);
            setSelectedJudgeIds([]);
        } catch (err) {
            console.error('Error assigning heat:', err);
            showToast('Failed to assign heat.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleJudgeSelection = (id) => {
        setSelectedJudgeIds(prev =>
            prev.includes(id) ? prev.filter(jid => jid !== id) : [...prev, id]
        );
    };

    const handleResyncNumbers = async () => {
        const confirmed = await showConfirm('Re-sequence all active scoring judge numbers? This will ensure Scoring Judges are numbered 1, 2, 3... in order of admission.');
        if (!confirmed) return;
        try {
            const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
            const adminId = adminInfo.adminId || 'admin';
            await axios.post(`${API_BASE}/judges/resync-numbers`, { admin_id: adminId });
            fetchData();
            showToast('Scoring judge numbers re-synced successfully!', 'success');
        } catch (err) {
            console.error('Error re-syncing numbers:', err);
            showToast('Failed to re-sync numbers.', 'error');
        }
    };

    return (
        <>
            <div className="admin-layout">
                <div className="admin-content">
                    <div style={{ marginBottom: '40px' }}>
                        <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', color: '#0F172A' }}>Judges Management</h1>
                        <p style={{ fontSize: '15px', color: '#64748B', margin: 0 }}>Manage judges for the event</p>
                    </div>

                    {isLoading ? (
                        <div className="card" style={{ padding: '80px 32px', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 16px', color: 'var(--accent-blue)' }} />
                            <p className="text-secondary">Loading judges data...</p>
                        </div>
                    ) : (
                        <>
                            {/* Select Judges Section */}
                            <div className="card" style={{ padding: '32px', marginBottom: '32px', overflow: 'visible' }}>
                                <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
                                    <div className="flex items-center gap-3">
                                        <Users size={20} />
                                        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Select Judges</h3>
                                    </div>
                                    <div className="jm-action-buttons" style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            onClick={() => setIsModalOpen(true)}
                                            className="btn btn-primary"
                                            disabled={activeJudges.length === 0}
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                                        >
                                            <Users size={18} />
                                            Assign Judge
                                        </button>
                                        <div style={{ position: 'relative' }}>
                                            <button
                                                onClick={handleCopyLink}
                                                onMouseEnter={() => setShowInviteTooltip(true)}
                                                onMouseLeave={() => setShowInviteTooltip(false)}
                                                className="btn btn-secondary"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '10px 20px',
                                                    cursor: 'pointer',
                                                    backgroundColor: '#0084ffff',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontWeight: '600',
                                                    fontSize: '14px',
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                                {copied ? 'Copied!' : 'Copy Invite Link'}
                                            </button>
                                            {showInviteTooltip && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 'calc(100% + 10px)',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    backgroundColor: '#1e293b',
                                                    color: '#ffffff',
                                                    padding: '8px 14px',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    whiteSpace: 'nowrap',
                                                    zIndex: 9999,
                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                                                    pointerEvents: 'none',
                                                    animation: 'fadeIn 0.2s ease-out'
                                                }}>
                                                    To add a new judge, copy the new link
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: '100%',
                                                        left: '50%',
                                                        marginLeft: '-5px',
                                                        borderWidth: '5px',
                                                        borderStyle: 'solid',
                                                        borderColor: 'transparent transparent #1e293b transparent'
                                                    }} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <p className="text-secondary" style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>Active Judges</p>
                                    <button
                                        onClick={handleResyncNumbers}
                                        className="btn-secondary"
                                        style={{
                                            padding: '4px 12px',
                                            fontSize: '11px',
                                            textTransform: 'uppercase',
                                            fontWeight: '700',
                                            letterSpacing: '0.05em',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            background: 'var(--border-dim)',
                                            color: '#334155',
                                            border: '1px solid var(--border-dim)'

                                        }}
                                    >
                                        <RefreshCcw size={12} />
                                        Reorder judges
                                    </button>
                                </div>
                                {activeJudges.length > 0 ? (
                                    <div className="jm-judges-grid" style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(4, 1fr)',
                                        gap: '16px'
                                    }}>
                                        {activeJudges.map(j => (
                                            <div key={j.id} style={{
                                                background: 'var(--surface-hover)',
                                                border: '1px solid var(--border-dim)',
                                                borderRadius: '12px',
                                                padding: '16px 20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                width: '100%',
                                                position: 'relative'
                                            }}>
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                    <User size={18} style={{ color: '#10b981' }} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontWeight: '600', fontSize: '15px', marginBottom: '2px' }}>{j.name}</p>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {j.role === 'scoring' ? (
                                                            <p className="jm-scoring-label" style={{ fontSize: '10px', color: '#10b981', fontWeight: '700', margin: 0, background: 'rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                                                Judge {j.judge_number}
                                                            </p>
                                                        ) : (
                                                            j.role && (
                                                                <span style={{
                                                                    fontSize: '10px',
                                                                    fontWeight: '700',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '6px',
                                                                    background: j.role === 'master' ? 'rgba(255, 138, 0, 0.2)' : 'rgba(0, 71, 255, 0.2)',
                                                                    color: j.role === 'master' ? '#ff8a00' : 'var(--accent-blue)',
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    {j.role === 'master' ? 'Head Judge' : 'Priority'}
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemove(j.id)}
                                                    className="text-muted hover-red jm-judge-remove-btn"
                                                    style={{
                                                        padding: '4px',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <X size={16} style={{ color: '#ef4444' }} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted" style={{ fontSize: '14px', textAlign: 'center', padding: '40px' }}>No active judges yet. Admit judges from requests below.</p>
                                )}
                            </div>



                            {/* Judges Join Requests */}
                            <div className="card" style={{ padding: '32px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Judges Join Requests</h3>
                                    <button
                                        onClick={handleRefresh}
                                        disabled={isRefreshing}
                                        className="btn btn-secondary"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 16px',
                                            fontSize: '14px',
                                            background: 'transparent',
                                            border: '1px solid var(--border-dim)',
                                            color: '#0e1622ff',
                                            opacity: isRefreshing ? 0.7 : 1
                                        }}
                                    >
                                        <RefreshCcw size={16} style={{
                                            animation: isRefreshing ? 'jm-spin 0.7s linear infinite' : 'none'
                                        }} />
                                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                                    </button>
                                </div>
                                <div className="flex flex-col gap-4">
                                    {pendingJudges.length > 0 ? (
                                        pendingJudges.map(j => (
                                            <div key={j.id}
                                                className="request-item p-6 rounded-2xl flex items-center justify-between"
                                                style={{
                                                    border: !selectedHeatId ? '1px solid rgba(255, 138, 0, 0.4)' : '1px solid var(--border-dim)',
                                                    background: !selectedHeatId ? 'rgba(255, 138, 0, 0.02)' : 'rgba(15, 23, 42, 0.01)',
                                                    transition: 'all 0.3s ease'
                                                }}
                                            >
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex items-center gap-6">
                                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ff8a00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800' }}>
                                                            {j.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h4 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)' }}>{j.name}</h4>
                                                            <p className="text-muted" style={{ fontSize: '14px' }}>{j.email}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 jm-request-actions">
                                                    <button
                                                        onClick={() => handleAdmit(j)}
                                                        className="btn"
                                                        style={{
                                                            background: 'rgba(220, 245, 222, 1)',
                                                            color: '#10b981',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            padding: '10px 24px',
                                                            border: '1px solid rgba(16, 185, 129, 0.3)'
                                                        }}
                                                    >
                                                        <Check size={18} />
                                                        Admit
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(j.id)}
                                                        className="btn-secondary"
                                                        style={{
                                                            width: '94px',
                                                            height: '42px',
                                                            padding: 0,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            color: 'var(--accent-red)',
                                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                                            borderRadius: '12px'
                                                        }}
                                                    >
                                                        <X size={20} />
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-muted" style={{ fontSize: '14px', textAlign: 'center', padding: '40px' }}>No pending requests</p>
                                    )}
                                </div>
                            </div>

                            {/* Recently Processed Requests */}
                            <div className="card" style={{ padding: '32px', marginTop: '32px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>Recently Processed Requests</h3>
                                <div className="flex flex-col gap-3">
                                    {processedRequests.length > 0 ? (
                                        processedRequests.map(j => (
                                            <div key={j.id}
                                                className="jm-processed-card"
                                                style={{
                                                    padding: '16px 24px',
                                                    borderRadius: '12px',
                                                    background: j.status === 'Active' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                                    border: j.status === 'Active' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    transition: 'all 0.3s ease'
                                                }}
                                            >
                                                <div className="jm-processed-info">
                                                    <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '2px', color: 'var(--text-dark)' }}>{j.name}</h4>
                                                    <p className="text-muted" style={{ fontSize: '14px' }}>{j.email}</p>
                                                </div>
                                                <div className="jm-processed-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                    {j.status !== 'Active' && (
                                                        <button
                                                            onClick={() => handleAdmit(j)}
                                                            className="btn jm-readmit-btn"
                                                            style={{
                                                                background: 'rgba(5, 255, 172, 1)',
                                                                color: '#fafafa',
                                                                padding: '6px 16px',
                                                                fontSize: '13px',
                                                                fontWeight: '700',
                                                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                                                borderRadius: '8px'
                                                            }}
                                                        >
                                                            Re-admit
                                                        </button>
                                                    )}
                                                    <div className="jm-status-badge" style={{
                                                        padding: '6px 18px',
                                                        borderRadius: '20px',
                                                        fontSize: '13px',
                                                        fontWeight: '800',
                                                        background: j.status === 'Active' ? '#10b981' : j.status === 'Rejected' ? '#ef4444' : '#6b7280',
                                                        color: 'white',
                                                        boxShadow: `0 4px 12px ${j.status === 'Active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                                        textTransform: 'lowercase'
                                                    }}>
                                                        {j.status === 'Active' ? 'approved' : j.status === 'Rejected' ? 'rejected' : 'removed'}
                                                    </div>
                                                    <button
                                                        onClick={() => handleDismiss(j.id)}
                                                        className="jm-dismiss-btn"
                                                        style={{
                                                            padding: '6px',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'red',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-muted" style={{ fontSize: '14px', textAlign: 'center', padding: '20px' }}>No recently processed requests</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Assignment Modal */}
            {isModalOpen && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(8px)',
                    padding: '20px'
                }}>
                    <div className="modal-content" style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-dark)' }}>Assign Judges</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Select judges to assign to a heat</p>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            <div style={{ marginBottom: '24px' }}>
                                <label className="text-secondary" style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Step 1: Select Heat</label>
                                <select
                                    className="form-control"
                                    style={{ width: '100%', padding: '12px' }}
                                    value={selectedHeatId}
                                    onChange={(e) => setSelectedHeatId(e.target.value)}
                                >
                                    <option value="">Select a heat to assign judges to</option>
                                    <option value="all">Assign to All Scheduled Heats</option>
                                    {heats
                                        .filter(h => (!h.status || h.status === 'scheduled') && h.division !== 'Break' && !(h.round || '').toLowerCase().includes('break'))
                                        .map(h => (
                                            <option key={h.id} value={h.id}>
                                                Heat #{h.heat_number} - {h.division} ({h.round})
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <label className="text-secondary" style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Step 2: Select Judges</label>
                            <p className="text-muted" style={{ marginBottom: '16px', fontSize: '13px' }}>Choose which judges will score this heat. Head Judge & Priority judge are already auto assigned</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', marginBottom: '24px', padding: '4px' }}>
                                {activeJudges
                                    .filter(j => j.role === 'scoring')
                                    .map(j => (
                                        <div
                                            key={j.id}
                                            onClick={() => toggleJudgeSelection(j.id)}
                                            style={{
                                                padding: '16px',
                                                borderRadius: '12px',
                                                background: selectedJudgeIds.includes(j.id) ? 'var(--card-hover)' : 'var(--surface-hover)',
                                                border: selectedJudgeIds.includes(j.id) ? '2px solid var(--accent-blue)' : '1px solid var(--border-dim)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'between',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '8px',
                                                    background: 'var(--surface-hover)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <User size={20} style={{ color: selectedJudgeIds.includes(j.id) ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: '700', fontSize: '15px' }}>{j.name}</p>
                                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                        {j.role === 'master' ? 'Head Judge' : j.role === 'tabulator' ? 'Tabulator' : `Judge #${j.judge_number}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '6px',
                                                border: '2px solid',
                                                borderColor: selectedJudgeIds.includes(j.id) ? 'var(--accent-blue)' : 'var(--border-dim)',
                                                background: selectedJudgeIds.includes(j.id) ? 'var(--accent-blue)' : 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {selectedJudgeIds.includes(j.id) && <Check size={16} strokeWidth={3} style={{ color: 'white' }} />}
                                            </div>
                                        </div>
                                    ))}
                            </div>

                            <div className="modal-footer">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
                                <button
                                    type="button"
                                    onClick={handleBatchAssignHeat}
                                    className="btn btn-primary"
                                    disabled={selectedJudgeIds.length === 0 || isSubmitting}
                                    style={{ padding: '10px 32px' }}
                                >
                                    {isSubmitting ? 'Processing...' : 'Confirm Assignment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Advanced Admission Modal */}
            {admitModal.isOpen && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(8px)',
                    padding: '20px'
                }}>
                    <div className="modal-content" style={{
                        maxWidth: '500px',
                        width: '100%',
                        position: 'relative',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: 0
                    }}>
                        <div className="modal-header" style={{ padding: '24px 32px' }}>
                            <div>
                                <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-dark)' }}>Admit Judge</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Admitting <strong style={{ color: 'var(--text-primary)' }}>{admitModal.judge?.name}</strong> to the system
                                </p>
                            </div>
                            <button
                                onClick={() => setAdmitModal({ ...admitModal, isOpen: false })}
                                className="modal-close"
                                style={{ position: 'static' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '32px' }}>

                            {/* Step 1: Judge Type — always shown first */}
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label className="form-label" style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Judge Type</label>
                                <select
                                    className="form-control"
                                    style={{ width: '100%', padding: '12px' }}
                                    value={admitModal.role}
                                    onChange={(e) => setAdmitModal({ ...admitModal, role: e.target.value, selectedEventId: '', selectedDivision: '', assignmentType: 'all', selectedHeatId: '' })}
                                >
                                    <option value="scoring">Scoring Judge</option>
                                    {getAvailableRoles().includes('tabulator') && <option value="tabulator">Priority Judge</option>}
                                    {getAvailableRoles().includes('master') && <option value="master">Head Judge</option>}
                                </select>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                                    {admitModal.role === 'scoring' && 'Standard scoring interface'}
                                    {admitModal.role === 'tabulator' && 'Priority management only'}
                                    {admitModal.role === 'master' && 'Head Judge scoring management'}
                                </p>
                            </div>

                            {/* Steps 2-4: Only shown for Scoring Judge */}
                            {admitModal.role === 'scoring' && (<>

                                {/* Step 2: Select Event */}
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label className="form-label" style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Select Event</label>
                                    <select
                                        className="form-control"
                                        style={{ width: '100%', padding: '12px' }}
                                        value={admitModal.selectedEventId}
                                        onChange={(e) => setAdmitModal({ ...admitModal, selectedEventId: e.target.value, selectedDivision: '', selectedHeatId: '' })}
                                    >
                                        <option value="">All Events</option>
                                        {events.map(ev => (
                                            <option key={ev.id} value={ev.id}>{ev.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Step 3: Select Section */}
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label className="form-label" style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Select Section</label>
                                    <select
                                        className="form-control"
                                        style={{ width: '100%', padding: '12px' }}
                                        value={admitModal.selectedDivision}
                                        onChange={(e) => setAdmitModal({ ...admitModal, selectedDivision: e.target.value, selectedHeatId: '' })}
                                    >
                                        <option value="">All Sections</option>
                                        {admitModal.selectedEventId
                                            ? (() => {
                                                const ev = events.find(e => String(e.id) === String(admitModal.selectedEventId));
                                                try { return JSON.parse(ev?.divisions || '[]'); } catch { return []; }
                                            })().map((div, i) => (
                                                <option key={i} value={div}>{div}</option>
                                            ))
                                            : [...new Set(heats.map(h => h.division).filter(d => d && d !== 'Break'))].map(div => (
                                                <option key={div} value={div}>{div}</option>
                                            ))
                                        }
                                    </select>
                                </div>

                                {/* Step 4: Select Heat */}
                                <div className="form-group" style={{ marginBottom: '24px' }}>
                                    <label className="form-label" style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Select Heat</label>
                                    <select
                                        className="form-control"
                                        style={{ width: '100%', padding: '12px' }}
                                        value={admitModal.assignmentType === 'specific' ? admitModal.selectedHeatId : 'all'}
                                        onChange={(e) => {
                                            if (e.target.value === 'all') {
                                                setAdmitModal({ ...admitModal, assignmentType: 'all', selectedHeatId: '' });
                                            } else {
                                                setAdmitModal({ ...admitModal, assignmentType: 'specific', selectedHeatId: e.target.value });
                                            }
                                        }}
                                    >
                                        <option value="all">All Division Heats</option>
                                        {heats
                                            .filter(h =>
                                                (!admitModal.selectedEventId || String(h.event_id) === String(admitModal.selectedEventId)) &&
                                                (!admitModal.selectedDivision || h.division === admitModal.selectedDivision) &&
                                                h.division !== 'Break' &&
                                                !(h.round || '').toLowerCase().includes('break')
                                            )
                                            .map(h => (
                                                <option key={h.id} value={h.id}>
                                                    Heat #{h.heat_number} — {h.division} ({h.round})
                                                </option>
                                            ))}
                                    </select>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                                        {admitModal.assignmentType === 'all'
                                            ? 'Judge will be assigned to all matching heats'
                                            : 'Judge will be assigned to this specific heat only'}
                                    </p>
                                </div>

                            </>)}

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setAdmitModal({ ...admitModal, isOpen: false })} className="btn btn-secondary" style={{ flex: 1, padding: '14px' }}>Cancel</button>
                                <button
                                    onClick={handleConfirmAdmit}
                                    className="btn btn-primary"
                                    disabled={isSubmitting || (admitModal.assignmentType === 'specific' && !admitModal.selectedHeatId)}
                                    style={{ flex: 1, padding: '14px', background: '#10b981', color: 'white' }}
                                >
                                    {isSubmitting ? 'Processing...' : 'Confirm Admission'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};


export default JudgesManagement;

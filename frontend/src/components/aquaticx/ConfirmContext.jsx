import React, { createContext, useContext, useState, useCallback } from 'react';


const ConfirmContext = createContext();

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};

export const ConfirmProvider = ({ children }) => {
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        message: '',
        resolve: null
    });

    const showConfirm = useCallback((message) => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                message,
                resolve
            });
        });
    }, []);

    const handleConfirm = () => {
        if (confirmState.resolve) confirmState.resolve(true);
        setConfirmState({ isOpen: false, message: '', resolve: null });
    };

    const handleCancel = () => {
        if (confirmState.resolve) confirmState.resolve(false);
        setConfirmState({ isOpen: false, message: '', resolve: null });
    };

    return (
        <ConfirmContext.Provider value={{ showConfirm }}>
            {children}
            {confirmState.isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        width: '90%',
                        maxWidth: '400px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        animation: 'modal-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ paddingTop: '2px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>www.aquaticxsports.com says</h3>
                                <p style={{ margin: 0, fontSize: '15px', color: '#475569', lineHeight: 1.5 }}>
                                    {confirmState.message}
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleCancel}
                                style={{
                                    padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                    background: 'white', color: '#475569', fontSize: '14px', fontWeight: '600',
                                    cursor: 'pointer', transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={e => e.currentTarget.style.background = 'white'}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                style={{
                                    padding: '10px 16px', borderRadius: '8px', border: 'none',
                                    background: '#2563eb', color: 'white', fontSize: '14px', fontWeight: '600',
                                    cursor: 'pointer', transition: 'all 0.2s ease',
                                    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1)'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                                onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                    <style>
                        {`
                        @keyframes modal-slide-up {
                            0% { opacity: 0; transform: translateY(10px) scale(0.95); }
                            100% { opacity: 1; transform: translateY(0) scale(1); }
                        }
                        `}
                    </style>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};

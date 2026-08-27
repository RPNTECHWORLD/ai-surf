import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const activeMessages = useRef(new Set());

    const removeToast = useCallback((id, message) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
        if (message) {
            activeMessages.current.delete(message);
        }
    }, []);

    const showToast = useCallback((message, type = 'success') => {
        if (activeMessages.current.has(message)) {
            return;
        }
        activeMessages.current.add(message);
        
        const id = Date.now().toString() + Math.random().toString(36).substring(2);
        setToasts((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            removeToast(id, message);
        }, 5000);
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div
                style={{
                    position: 'fixed',
                    top: '32px',
                    right: '32px',
                    zIndex: 10000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    pointerEvents: 'none'
                }}
            >
                {toasts.map((toast) => {
                    const isSuccess = toast.type === 'success';
                    const isError = toast.type === 'error';

                    let bg = '#ecfdf5';
                    let border = '#10b981';
                    let color = '#047857';
                    let Icon = CheckCircle2;

                    if (isError) {
                        bg = '#fef2f2';
                        border = '#ef4444';
                        color = '#b91c1c';
                        Icon = XCircle;
                    } else if (toast.type === 'info') {
                        bg = '#eff6ff';
                        border = '#3b82f6';
                        color = '#1d4ed8';
                        Icon = Info;
                    }

                    return (
                        <div
                            key={toast.id}
                            style={{
                                background: bg,
                                border: `1px solid ${border}`,
                                padding: '16px 24px',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                animation: 'toast-slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                color: color,
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                pointerEvents: 'auto'
                            }}
                        >
                            <div
                                style={{
                                    background: border,
                                    color: 'white',
                                    minWidth: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Icon size={14} strokeWidth={3} />
                            </div>
                            <p style={{ fontSize: '15px', fontWeight: '700', margin: 0, flex: 1, paddingRight: '8px' }}>
                                {toast.message}
                            </p>
                            <button
                                onClick={() => removeToast(toast.id, toast.message)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: color,
                                    opacity: 0.6,
                                    transition: 'opacity 0.2s ease',
                                    outline: 'none',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};

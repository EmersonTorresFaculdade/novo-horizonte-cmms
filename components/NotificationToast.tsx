import React, { useEffect } from 'react';
import { Bell, X, ExternalLink, Clock } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationsContext';
import { useNavigate } from 'react-router-dom';

const NotificationToast = () => {
    const { activeToast, clearToast } = useNotifications();
    const navigate = useNavigate();

    useEffect(() => {
        if (activeToast) {
            const timer = setTimeout(() => {
                clearToast();
            }, 8000); // 8 segundos
            return () => clearTimeout(timer);
        }
    }, [activeToast, clearToast]);

    if (!activeToast) return null;

    const handleAction = () => {
        if (activeToast.link) {
            navigate(activeToast.link);
        }
        clearToast();
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-right-full duration-500">
            <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-white/10 p-5 w-80 backdrop-blur-md overflow-hidden relative">
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-primary animate-progress-shrink w-full origin-left"></div>

                <div className="flex items-start gap-4">
                    <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Clock size={24} className="text-primary" />
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-sm tracking-tight">{activeToast.title}</h4>
                            <button
                                onClick={clearToast}
                                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={16} className="text-slate-400" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-300 mb-4 leading-relaxed font-medium">
                            {activeToast.message}
                        </p>

                        <button
                            onClick={handleAction}
                            className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-primary hover:text-white transition-colors"
                        >
                            Ver Detalhes <ExternalLink size={12} />
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes progress-shrink {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
                .animate-progress-shrink {
                    animation: progress-shrink 8s linear forwards;
                }
            `}</style>
        </div>
    );
};

export default NotificationToast;

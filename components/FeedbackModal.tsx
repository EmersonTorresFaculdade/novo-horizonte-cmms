import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'success' | 'error' | 'confirm' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    showLoadingDots?: boolean;
    loadingText?: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
    isOpen,
    onClose,
    type,
    title,
    message,
    onConfirm,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    showLoadingDots = false,
    loadingText = 'Redirecionando...'
}) => {
    if (!isOpen) return null;

    const icons = {
        success: <CheckCircle2 className="text-green-600" size={40} />,
        error: <XCircle className="text-brand-alert" size={40} />,
        confirm: <AlertTriangle className="text-amber-600" size={40} />,
        info: <Info className="text-primary" size={40} />,
    };

    const colors = {
        success: 'bg-emerald-50/50',
        error: 'bg-red-100',
        confirm: 'bg-amber-100',
        info: 'bg-blue-100',
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center transform animate-in zoom-in slide-in-from-bottom-8 duration-500 relative">
                {type !== 'confirm' && type !== 'success' && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}

                <div className={`size-20 ${colors[type]} rounded-full flex items-center justify-center mx-auto mb-6`}>
                    {icons[type]}
                </div>

                <h3 className="text-2xl font-black text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 font-medium">{message}</p>

                {type === 'confirm' && (
                    <div className="mt-8 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                if (onConfirm) onConfirm();
                                onClose();
                            }}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                        >
                            {confirmText}
                        </button>
                    </div>
                )}

                {type === 'success' && !showLoadingDots && (
                    <div className="mt-8">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-all shadow-lg shadow-green-200"
                        >
                            Ok
                        </button>
                    </div>
                )}

                {showLoadingDots && (
                    <>
                        <div className="mt-8 flex justify-center">
                            <div className="size-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s] mx-1"></div>
                            <div className="size-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s] mx-1"></div>
                            <div className="size-2 bg-primary rounded-full animate-bounce mx-1"></div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest">{loadingText}</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default FeedbackModal;

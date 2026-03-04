import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { verifyResetToken, completePasswordReset } = useAuth();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [status, setStatus] = useState<'verifying' | 'valid' | 'invalid' | 'resetting' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('');

    const token = searchParams.get('token');
    const email = searchParams.get('email');

    useEffect(() => {
        const verify = async () => {
            if (!token || !email) {
                setStatus('invalid');
                setMessage('Link de recuperação inválido ou incompleto.');
                return;
            }

            const result = await verifyResetToken(email, token);
            if (result.success) {
                setStatus('valid');
            } else {
                setStatus('invalid');
                setMessage(result.error || 'Link expirado ou inválido.');
            }
        };

        verify();
    }, [token, email, verifyResetToken]);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            setStatus('error');
            setMessage('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('As senhas não coincidem.');
            return;
        }

        setStatus('resetting');
        const result = await completePasswordReset(email!, token!, password);

        if (result.success) {
            setStatus('success');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } else {
            setStatus('error');
            setMessage(result.error || 'Erro ao redefinir senha. Tente novamente.');
        }
    };

    if (status === 'verifying') {
        return (
            <div className="min-h-screen bg-[#1c1f24] flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={40} className="text-primary animate-spin" />
                    <p className="text-slate-400 font-medium">Verificando link de recuperação...</p>
                </div>
            </div>
        );
    }

    if (status === 'invalid') {
        return (
            <div className="min-h-screen bg-[#1c1f24] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-center shadow-2xl">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ArrowLeft size={40} className="text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">Link Inválido</h2>
                    <p className="text-slate-400 mb-8">{message}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all"
                    >
                        Voltar para o Login
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-[#1c1f24] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-center shadow-2xl">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} className="text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">Senha Redefinida!</h2>
                    <p className="text-slate-400 mb-8">Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes.</p>
                    <div className="flex justify-center">
                        <Loader2 size={24} className="text-primary animate-spin" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#1c1f24] flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo or System Name */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-white tracking-tight">Novo Horizonte</h1>
                    <p className="text-primary font-medium">Redefinição de Senha</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-white mb-2">Crie sua nova senha</h2>
                        <p className="text-slate-400 text-sm">Escolha uma senha forte e segura para proteger sua conta.</p>
                    </div>

                    <form onSubmit={handleReset} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 ml-1">Nova Senha</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                    <Lock size={18} />
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 ml-1">Confirmar Senha</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                    <Lock size={18} />
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {status === 'error' && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm font-medium animate-shake">
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'resetting'}
                            className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {status === 'resetting' ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Redefinindo...
                                </>
                            ) : (
                                'Alterar Minha Senha'
                            )}
                        </button>
                    </form>
                </div>

                <button
                    onClick={() => navigate('/login')}
                    className="w-full mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors py-2"
                >
                    <ArrowLeft size={16} />
                    <span className="text-sm font-medium">Voltar para o Login</span>
                </button>
            </div>
        </div>
    );
};

export default ResetPassword;

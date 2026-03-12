import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, User } from '../contexts/AuthContext';
import { Check, X, User as UserIcon, Shield, Search, Filter, AlertCircle, Clock, Mail, Phone, Loader2, Calendar, Fingerprint, Activity } from 'lucide-react';
import FeedbackModal from '../components/FeedbackModal';

const UsersPending = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getPendingUsers, approveUser, rejectUser } = useAuth();

    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const [feedback, setFeedback] = useState<{
        isOpen: boolean;
        type: 'success' | 'error' | 'confirm' | 'info';
        title: string;
        message: string;
    }>({
        isOpen: false,
        type: 'info',
        title: '',
        message: ''
    });

    const [confirmAction, setConfirmAction] = useState<{
        userId: string;
        userName: string;
        action: 'approve' | 'reject';
    } | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredUsers(users);
        } else {
            const term = searchTerm.toLowerCase();
            setFilteredUsers(
                users.filter(user =>
                    user.name.toLowerCase().includes(term) ||
                    user.email.toLowerCase().includes(term) ||
                    (user.username && user.username.toLowerCase().includes(term))
                )
            );
        }
    }, [searchTerm, users]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await getPendingUsers();
            if (error) throw error;
            setUsers(data || []);
            setFilteredUsers(data || []);
        } catch (err) {
            console.error(err);
            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'Erro de Conexão',
                message: 'Não foi possível carregar os usuários pendentes.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleApproveClick = (userId: string, userName: string) => {
        setConfirmAction({ userId, userName, action: 'approve' });
    };

    const handleRejectClick = (userId: string, userName: string) => {
        setConfirmAction({ userId, userName, action: 'reject' });
    };

    const processAction = async () => {
        if (!confirmAction) return;
        const { userId, userName, action } = confirmAction;
        setConfirmAction(null);

        setProcessingId(userId);

        try {
            const { success, error } = action === 'approve'
                ? await approveUser(userId)
                : await rejectUser(userId);

            if (success) {
                setFeedback({
                    isOpen: true,
                    type: 'success',
                    title: action === 'approve' ? '🛡️ Acesso Liberado' : '🚫 Acesso Negado',
                    message: `O cadastro de ${userName} foi ${action === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso. O sistema enviará as credenciais via WhatsApp/E-mail.`
                });

                setUsers(prev => prev.filter(u => u.id !== userId));

                if (id === userId) {
                    navigate('/users/pending');
                }
            } else {
                throw new Error(error);
            }
        } catch (err: any) {
            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'Falha na Operação',
                message: `Erro ao processar solicitação: ${err.message || 'Erro desconhecido'}`
            });
        } finally {
            setProcessingId(null);
        }
    };

    const getDaysSince = (dateString: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
        return diff === 0 ? 'Hoje' : `Há ${diff} dias`;
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-[70vh] gap-6">
                <div className="relative">
                    <div className="size-20 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Shield className="text-primary size-8 animate-pulse" />
                    </div>
                </div>
                <div className="space-y-2 text-center">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Sincronizando Protocolos</h3>
                    <p className="text-slate-500 font-medium animate-pulse">Aguarde um momento...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
            {/* Background Decorative Gradients */}
            <div className="fixed top-0 left-0 -z-10 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] bg-blue-500/5 rounded-full blur-[90px]"></div>
            </div>

            {/* Header section with Premium Glassmorphism */}
            <header className="relative p-10 lg:p-14 rounded-[3rem] bg-white/60 backdrop-blur-2xl border border-white/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] overflow-hidden group">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-primary/10 via-transparent to-transparent rounded-full -mr-60 -mt-60 blur-3xl transition-all duration-1000 group-hover:bg-primary/20"></div>

                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                    <div className="space-y-4 text-center lg:text-left">
                        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-4">
                            <Shield size={16} className="animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-[0.2em]">Controle de Segurança</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-tight">
                            Central de <br className="hidden md:block" /><span className="text-primary italic">Aprovações</span>
                        </h1>
                        <p className="text-lg text-slate-500 font-medium max-w-lg leading-relaxed">
                            Validação de novos colaboradores e gestão de privilégios de acesso ao ecossistema <span className="text-slate-900 font-bold">Novo Horizonte CMMS</span>.
                        </p>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="relative w-full sm:w-auto overflow-hidden rounded-2xl">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={20} />
                                <input
                                    type="text"
                                    placeholder="Procurar solicitante..."
                                    className="pl-14 pr-8 py-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all w-full sm:w-80 font-bold text-slate-700 shadow-sm placeholder:text-slate-300"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-2 p-1.5 bg-slate-100/50 rounded-2xl border border-white">
                                <button className="p-3 bg-white shadow-sm rounded-xl text-primary border border-slate-100">
                                    <Activity size={20} />
                                </button>
                                <div className="px-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atividade</p>
                                    <p className="text-sm font-black text-slate-900 leading-none">{users.length} Pendentes</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white/40 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-slate-200/60 shadow-xl space-y-8">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150 animate-pulse"></div>
                        <div className="relative bg-white size-32 rounded-[2.5rem] shadow-2xl flex items-center justify-center border border-slate-100 overflow-hidden transform group-hover:rotate-12 transition-transform">
                            <Shield size={64} className="text-slate-100" />
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-slate-50 flex items-center justify-center">
                                <Check size={24} className="text-emerald-500" />
                            </div>
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Portaria Limpa!</h3>
                        <p className="text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                            Todos os acessos foram devidamente processados. Nenhuma solicitação pendente no momento.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredUsers.map((user) => (
                        <div
                            key={user.id}
                            className={`group relative bg-white/70 backdrop-blur-md rounded-[3rem] border-2 transition-all duration-700 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] hover:-translate-y-3 ${id === user.id ? 'border-primary shadow-2xl bg-white' : 'border-white hover:border-primary/20 shadow-xl'}`}
                        >
                            {/* Card Status Indicator */}
                            <div className="absolute top-8 right-8 flex items-center gap-2">
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Status</span>
                                    <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter flex items-center gap-1.5 shadow-sm">
                                        <div className="size-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                                        Análise
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 space-y-10">
                                {/* Profile Header */}
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <div className="relative group/avatar">
                                        <div className="size-24 rounded-[2rem] bg-gradient-to-br from-slate-50 to-slate-200 p-1 shadow-2xl transition-all duration-500 group-hover/avatar:rotate-6 group-hover/avatar:scale-110">
                                            <div className="w-full h-full rounded-[1.8rem] bg-white flex items-center justify-center font-black text-4xl text-slate-400 border border-slate-100 overflow-hidden">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    user.name.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-2xl border-4 border-white shadow-xl">
                                            {user.requested_role === 'admin' ? <Shield size={16} /> : <UserIcon size={16} />}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="font-black text-slate-900 text-2xl tracking-tighter group-hover:text-primary transition-colors">{user.name}</h3>
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-[11px] font-black text-slate-400 font-mono tracking-widest bg-slate-100 px-3 py-1 rounded-lg">
                                                @{user.username || 'solicitante'}
                                            </span>
                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/5 text-primary rounded-full border border-primary/10">
                                                <span className="text-[9px] font-black uppercase tracking-wider">Acesso: </span>
                                                <span className="text-[10px] font-black uppercase tracking-wider">
                                                    {user.requested_role === 'admin' ? 'Administrador de OS' : 'Usuário'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Info Panel */}
                                <div className="space-y-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-inner group-hover:shadow-md transition-all duration-500">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-slate-50 p-3 rounded-2xl text-slate-400 shadow-sm">
                                            <Mail size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.1em]">Canal Primário</p>
                                            <p className="text-sm font-bold text-slate-700 truncate">{user.email}</p>
                                        </div>
                                    </div>

                                    {user.phone && (
                                        <div className="flex items-center gap-4">
                                            <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-500 shadow-sm border border-emerald-100/30">
                                                <Phone size={18} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.1em]">WhatsApp Business</p>
                                                <p className="text-sm font-bold text-slate-700 truncate">{user.phone}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-50 p-3 rounded-2xl text-blue-500 shadow-sm">
                                            <Calendar size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.1em]">Primeiro Contato</p>
                                            <p className="text-sm font-bold text-slate-700 truncate">{getDaysSince(user.created_at)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Decision Actions */}
                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => handleRejectClick(user.id, user.name)}
                                        disabled={processingId === user.id}
                                        className="flex-1 px-5 py-5 rounded-2xl border-2 border-slate-100 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:bg-brand-alert/5 hover:text-brand-alert hover:border-brand-alert/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 group/reject"
                                    >
                                        <X size={18} className="group-hover/reject:rotate-90 transition-transform" />
                                        Negar
                                    </button>
                                    <button
                                        onClick={() => handleApproveClick(user.id, user.name)}
                                        disabled={processingId === user.id}
                                        className="flex-[2] px-5 py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-primary transition-all shadow-2xl shadow-slate-900/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 relative overflow-hidden group/approve"
                                    >
                                        {processingId === user.id ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            <>
                                                <Check size={18} className="group-hover/approve:scale-125 transition-transform" />
                                                <span>Autorizar</span>
                                            </>
                                        )}
                                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/approve:translate-y-0 transition-transform duration-300"></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Premium Interactive Modal */}
            <FeedbackModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                type="confirm"
                title={confirmAction?.action === 'approve' ? '✨ Validar Credencial de Acesso' : '⚠️ Bloquear Solicitante'}
                message={confirmAction?.action === 'approve'
                    ? `Confirmar liberação de acesso para ${confirmAction?.userName}? O sistema enviará link de login e tutorial via WhatsApp automaticamente.`
                    : `Confirmar recusa do cadastro de ${confirmAction?.userName}? Esta ação é permanente e impedirá novas tentativas de registro com este e-mail.`}
                onConfirm={processAction}
                confirmText={confirmAction?.action === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Bloqueio'}
                cancelText="Avaliar Depois"
            />

            {/* Status Response Modal */}
            <FeedbackModal
                isOpen={feedback.isOpen}
                onClose={() => setFeedback({ ...feedback, isOpen: false })}
                type={feedback.type}
                title={feedback.title}
                message={feedback.message}
            />
        </div>
    );
};

export default UsersPending;


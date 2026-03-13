import React, { useState, useEffect, useRef } from 'react';
import {
    Users,
    Search,
    Filter,
    MoreVertical,
    Shield,
    UserCheck,
    UserX,
    Settings,
    Mail,
    Phone,
    Check,
    X,
    ChevronRight,
    Loader2,
    Lock,
    Eye,
    EyeOff,
    Trash2,
    Wrench,
    Building2,
    LayoutGrid,
    Camera
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import FeedbackModal from '../components/FeedbackModal';
import { NotificationService } from '../services/NotificationService';

const UsersManagement = () => {
    const { isAdmin, resetUserPassword } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [isSaving, setIsSaving] = useState(false);

    // Password Reset state
    const [newPassword, setNewPassword] = useState('');
    const [showPasswordField, setShowPasswordField] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Modal Edit state
    const [editingUser, setEditingUser] = useState<any>(null);
    const [originalUser, setOriginalUser] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // Modal Delete state
    const [userToDelete, setUserToDelete] = useState<any>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [searchTerm, filterStatus, users]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            // Buscar usuários básicos
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('*')
                .order('name', { ascending: true });

            if (usersError) throw usersError;

            // Buscar perfis para obter os avatares (user_profiles usa o mesmo ID)
            const { data: profilesData, error: profilesError } = await supabase
                .from('user_profiles')
                .select('id, avatar');

            if (profilesError) {
                console.warn('Erro ao buscar perfis:', profilesError);
            }

            // Mesclar as fotos nos usuários
            const mergedUsers = (usersData || []).map(u => ({
                ...u,
                // Prioriza o avatar salvo na tabela user_profiles (base64), senão usa avatar_url legada da tabela users
                avatar_url: (profilesData?.find(p => p.id === u.id) as any)?.avatar || (u as any).avatar_url
            }));

            setUsers(mergedUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = [...users];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(u =>
                u.name.toLowerCase().includes(term) ||
                u.email.toLowerCase().includes(term)
            );
        }

        if (filterStatus !== 'all') {
            result = result.filter(u => u.status === filterStatus);
        }

        setFilteredUsers(result);
    };

    const handleEditUser = (user: any) => {
        setEditingUser({ ...user });
        setOriginalUser({ ...user });
        setShowEditModal(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && editingUser) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditingUser({ ...editingUser, avatar_url: reader.result as string, avatar_changed: true });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSavePermissions = async () => {
        if (!editingUser) return;

        try {
            setIsSaving(true);
            // 1. Atualizar dados básicos e permissões na tabela 'users'
            const { error: usersError } = await supabase
                .from('users')
                .update({
                    manage_equipment: editingUser.manage_equipment,
                    manage_predial: editingUser.manage_predial,
                    manage_others: editingUser.manage_others,
                    role: editingUser.role,
                    status: editingUser.status
                })
                .eq('id', editingUser.id);

            if (usersError) throw usersError;

            // 2. Atualizar avatar na tabela 'user_profiles' se houver alteração
            if (editingUser.avatar_changed) {
                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .upsert({
                        id: editingUser.id,
                        avatar: editingUser.avatar_url,
                        name: editingUser.name, // Manter nome sincronizado
                        email: editingUser.email
                    });
                
                if (profileError) console.error('Erro ao salvar avatar:', profileError);
            }

            // Lógica de Notificação: Disparar quando o status muda de algo não-ativo para 'active'
            // ou de algo não-bloqueado para 'blocked' (se original for pendente)
            if (originalUser && originalUser.status !== editingUser.status) {
                try {
                    if (editingUser.status === 'active' && originalUser.status !== 'active') {
                        console.log('Disparando notificação de aprovação para:', editingUser.email);
                        await NotificationService.notifyUserApproved({
                            id: editingUser.id,
                            name: editingUser.name,
                            email: editingUser.email,
                            phone: editingUser.phone,
                            role: editingUser.role,
                            status: editingUser.status
                        });
                    } else if (editingUser.status === 'blocked' && originalUser.status === 'pending') {
                        console.log('Disparando notificação de rejeição para:', editingUser.email);
                        await NotificationService.notifyUserRejected({
                            id: editingUser.id,
                            name: editingUser.name,
                            email: editingUser.email,
                            phone: editingUser.phone,
                            role: editingUser.role,
                            status: editingUser.status
                        });
                    }
                } catch (notifyErr) {
                    console.warn('Erro ao enviar notificação de status:', notifyErr);
                }
            }

            setFeedback({
                isOpen: true,
                type: 'success',
                title: 'Usuário Atualizado',
                message: `As permissões de ${editingUser.name} foram salvas com sucesso.`
            });

            // Refresh local list
            setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
            setShowEditModal(false);
            setOriginalUser(null);
        } catch (error) {
            console.error('Error updating user:', error);
            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'Erro ao Salvar',
                message: 'Não foi possível atualizar as permissões do usuário.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || !editingUser) return;

        try {
            setIsSaving(true);
            const { success, error } = await resetUserPassword(editingUser.id, newPassword);

            if (success) {
                // Notificar usuário sobre nova senha
                await NotificationService.notifyPasswordChanged({
                    id: editingUser.id,
                    name: editingUser.name,
                    email: editingUser.email,
                    phone: editingUser.phone,
                    role: editingUser.role,
                    status: editingUser.status
                });

                setFeedback({
                    isOpen: true,
                    type: 'success',
                    title: 'Senha Redefinida',
                    message: `A senha de ${editingUser.name} foi alterada com sucesso.`
                });
                setNewPassword('');
                setShowPasswordField(false);
            } else {
                throw new Error(error);
            }
        } catch (error: any) {
            console.error('Error resetting password:', error);
            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'Erro no Reset',
                message: 'Não foi possível redefinir a senha do usuário.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = (user: any) => {
        setUserToDelete(user);
        setShowDeleteConfirm(true);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            setIsSaving(true);
            const { error, data } = await supabase.functions.invoke('delete-user', {
                body: { userId: userToDelete.id },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            setFeedback({
                isOpen: true,
                type: 'success',
                title: 'Usuário Removido',
                message: 'O usuário foi excluído com sucesso.'
            });
        } catch (error: any) {
            console.error('Error deleting user:', error);

            let errorMessage = 'Não foi possível excluir o usuário.';
            if (error.status === 401) {
                errorMessage = 'Sua sessão expirou para esta ação sensível. Por favor, saia e entre novamente no sistema.';
            } else if (error.message?.includes('vínculos')) {
                errorMessage = 'O usuário possui vínculos com Ordens de Serviço e não pode ser removido por segurança.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'Erro ao Remover',
                message: errorMessage
            });
        } finally {
            setIsSaving(false);
            setShowDeleteConfirm(false);
            setUserToDelete(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-100 text-emerald-700';
            case 'pending': return 'bg-amber-100 text-amber-700';
            case 'blocked': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header com efeito Glassmorphism */}
            <header className="relative p-8 rounded-3xl bg-white/40 backdrop-blur-md border border-white/20 shadow-xl overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl transition-all duration-1000 group-hover:bg-primary/10"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full -ml-24 -mb-24 blur-3xl transition-all duration-1000 group-hover:bg-blue-500/10"></div>

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-primary/10 rounded-2xl">
                                <Users className="text-primary" size={32} />
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                                Gestão de Usuários
                            </h1>
                        </div>
                        <p className="text-slate-500 font-medium">Controle total sobre acessos, permissões e segurança operacional.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group/search">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/search:text-primary" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar colaborador..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-12 pr-6 py-3 bg-white/80 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all w-72 text-sm font-medium shadow-sm"
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Listagem Premium */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3 overflow-x-auto bg-slate-50/50">
                    {[
                        { id: 'all', label: 'Todos', activeClass: 'bg-slate-900 text-white shadow-slate-900/20' },
                        { id: 'active', label: 'Ativos', activeClass: 'bg-emerald-500 text-white shadow-emerald-500/20' },
                        { id: 'pending', label: 'Pendentes', activeClass: 'bg-amber-500 text-white shadow-amber-500/20' },
                        { id: 'blocked', label: 'Bloqueados', activeClass: 'bg-brand-alert text-white shadow-brand-alert/20' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id)}
                            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap shadow-sm hover:scale-105 active:scale-95 ${filterStatus === tab.id ? tab.activeClass + ' shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/80 text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5">Perfil</th>
                                <th className="px-8 py-5 text-center">Nível</th>
                                <th className="px-8 py-5 text-center">Permissões OS</th>
                                <th className="px-8 py-5 text-center">Status</th>
                                <th className="px-8 py-5 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredUsers.map((u, index) => (
                                <tr key={u.id} className="group/row hover:bg-slate-50/80 transition-all duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="size-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-slate-600 border-2 border-white shadow-inner overflow-hidden transform group-hover/row:scale-110 transition-transform duration-500">
                                                    {u.avatar_url ? (
                                                        <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        u.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className={`absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-white shadow-sm ${u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 leading-tight mb-0.5">{u.name}</p>
                                                <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                                                    <Mail size={12} className="opacity-50" /> {u.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border shadow-sm ${u.role === 'admin_root' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                            u.role === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                'bg-slate-50 text-slate-600 border-slate-100'
                                            }`}>
                                            {u.role === 'admin_root' ? 'Administrador Root' : u.role === 'admin' ? 'Administrador de OS' : 'Usuário'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center justify-center gap-3">
                                            <Wrench size={14} className={`transition-all ${u.manage_equipment ? 'text-primary' : 'text-slate-200'}`} title="Equipamentos" />
                                            <Building2 size={14} className={`transition-all ${u.manage_predial ? 'text-orange-500' : 'text-slate-200'}`} title="Predial" />
                                            <LayoutGrid size={14} className={`transition-all ${u.manage_others ? 'text-slate-500' : 'text-slate-200'}`} title="Outros" />
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm ${getStatusBadge(u.status)}`}>
                                            {u.status === 'active' ? 'Ativo' : u.status === 'pending' ? 'Pendente' : 'Bloqueado'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover/row:opacity-100 transition-opacity duration-300">
                                            <button
                                                onClick={() => handleEditUser(u)}
                                                className="p-2.5 bg-white text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl border border-slate-100 shadow-sm transition-all active:scale-90"
                                                title="Configurar Usuário"
                                            >
                                                <Settings size={20} />
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(u)}
                                                className="p-2.5 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl border border-slate-100 shadow-sm transition-all active:scale-90"
                                                title="Excluir Colaborador"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredUsers.length === 0 && (
                        <div className="p-20 text-center">
                            <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                <Search className="text-slate-300" size={32} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-1">Nenhum resultado</h3>
                            <p className="text-slate-500 font-medium">Não encontramos usuários com os filtros selecionados.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit User Modal - Redesigned Premium */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-white/20">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-5">
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="size-20 rounded-[1.5rem] bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center font-black text-white shadow-xl shadow-primary/30 border-2 border-white overflow-hidden cursor-pointer relative group"
                                >
                                    {editingUser.avatar_url ? (
                                        <img src={editingUser.avatar_url} alt={editingUser.name} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                                    ) : (
                                        <span className="text-2xl">{editingUser.name.charAt(0).toUpperCase()}</span>
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                        <Camera size={24} className="text-white" />
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={handleFileChange} 
                                    />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Configurar Acesso</h3>
                                    <p className="text-slate-500 font-bold">{editingUser.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="size-10 flex items-center justify-center rounded-full bg-white hover:bg-slate-100 text-slate-400 border border-slate-100 transition-all active:scale-90 shadow-sm">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Função Hierárquica</label>
                                    <div className="relative">
                                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <select
                                            value={editingUser.role}
                                            onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-slate-700 text-sm appearance-none shadow-inner"
                                        >
                                            <option value="user">Usuário</option>
                                            <option value="admin">Administrador de OS</option>
                                            <option value="admin_root">Administrador Root</option>
                                        </select>
                                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={16} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Situação da Conta</label>
                                    <div className="relative">
                                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 size-3 rounded-full ${editingUser.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300 shadow-sm'}`}></div>
                                        <select
                                            value={editingUser.status}
                                            onChange={e => setEditingUser({ ...editingUser, status: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-slate-700 text-sm appearance-none shadow-inner"
                                        >
                                            <option value="active">ATIVO</option>
                                            <option value="pending">PENDENTE</option>
                                            <option value="blocked">BLOQUEADO</option>
                                        </select>
                                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={16} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-black text-slate-900 tracking-tight">Permissões de Abertura (OS)</h4>
                                    <span className="text-[10px] font-black text-primary px-2 py-1 bg-primary/5 rounded-lg border border-primary/10">ÁREAS DE ATUAÇÃO</span>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { id: 'manage_equipment', label: 'Mecânica & Equipamentos', desc: 'Máquinas Industriais, Pneumática, Elétrica', icon: <Wrench size={18} />, color: 'bg-primary' },
                                        { id: 'manage_predial', label: 'Predial & Infraestrutura', desc: 'Civil, Hidráulica, Ar Condicionado', icon: <Building2 size={18} />, color: 'bg-orange-500' },
                                        { id: 'manage_others', label: 'Diversos & Serviços', desc: 'Pintura, Jardinagem, Zeladoria', icon: <LayoutGrid size={18} />, color: 'bg-slate-500' }
                                    ].map((sector) => (
                                        <label key={sector.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-200 transition-all cursor-pointer group/item">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2.5 rounded-xl ${editingUser[sector.id] ? sector.color + ' text-white shadow-lg' : 'bg-white text-slate-300 border border-slate-100'} transition-all duration-300`}>
                                                    {sector.icon}
                                                </div>
                                                <div>
                                                    <p className={`font-black text-sm transition-colors ${editingUser[sector.id] ? 'text-slate-900' : 'text-slate-400'}`}>{sector.label}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">{sector.desc}</p>
                                                </div>
                                            </div>
                                            <div className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editingUser[sector.id] ?? true}
                                                    onChange={e => setEditingUser({ ...editingUser, [sector.id]: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Segurança */}
                            <div className="p-6 bg-slate-900 rounded-3xl space-y-5 shadow-2xl shadow-slate-900/20 relative overflow-hidden group/security">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl transition-all duration-500 group-hover/security:bg-white/10"></div>

                                <div className="flex items-center justify-between relative">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/10 rounded-xl">
                                            <Lock size={18} className="text-primary" />
                                        </div>
                                        <span className="text-sm font-black text-white tracking-wide">Segurança & Redefinição</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordField(!showPasswordField)}
                                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${showPasswordField ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
                                    >
                                        {showPasswordField ? 'Cancelar' : 'Nova Senha'}
                                    </button>
                                </div>

                                {showPasswordField && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300 relative">
                                        <div className="relative group/input">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                                placeholder="Digite a nova senha segura..."
                                                className="w-full pl-5 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-sm font-bold text-white placeholder:text-slate-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleResetPassword}
                                            disabled={!newPassword || isSaving}
                                            className="w-full py-3.5 bg-primary text-white rounded-2xl text-xs font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                                            REDEFINIR SENHA AGORA
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-8 py-3.5 text-slate-500 font-black hover:bg-slate-200 rounded-2xl transition-all active:scale-95"
                            >
                                DESCARTAR
                            </button>
                            <button
                                onClick={handleSavePermissions}
                                disabled={isSaving}
                                className="px-12 py-3.5 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all shadow-xl shadow-primary/25 active:scale-95 flex items-center gap-3 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                {isSaving ? 'SALVANDO...' : 'CONFIRMAR AJUSTES'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && userToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="mx-auto size-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Excluir Usuário?</h3>
                            <p className="text-sm text-slate-500 mb-6">
                                Tem certeza que deseja excluir o usuário <strong className="text-slate-800">{userToDelete.name}</strong>? Esta ação não poderá ser desfeita.
                            </p>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isSaving}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteUser}
                                    disabled={isSaving}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                                    {isSaving ? 'Excluindo...' : 'Excluir'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

export default UsersManagement;

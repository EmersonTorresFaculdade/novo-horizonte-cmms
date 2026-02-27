import React, { useState, useEffect } from 'react';
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
    EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import FeedbackModal from '../components/FeedbackModal';

const UsersManagement = () => {
    const { isAdmin, resetUserPassword } = useAuth();
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
    const [showEditModal, setShowEditModal] = useState(false);

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
                // Prioriza o avatar do perfil, se existir, senão usa avatar_url da tabela users
                avatar_url: profilesData?.find(p => p.id === u.id)?.avatar || u.avatar_url
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
        setShowEditModal(true);
    };

    const handleSavePermissions = async () => {
        if (!editingUser) return;

        try {
            setIsSaving(true);
            const { error } = await supabase
                .from('users')
                .update({
                    manage_equipment: editingUser.manage_equipment,
                    manage_predial: editingUser.manage_predial,
                    manage_others: editingUser.manage_others,
                    role: editingUser.role,
                    status: editingUser.status
                })
                .eq('id', editingUser.id);

            if (error) throw error;

            setFeedback({
                isOpen: true,
                type: 'success',
                title: 'Usuário Atualizado',
                message: `As permissões de ${editingUser.name} foram salvas com sucesso.`
            });

            // Refresh local list
            setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
            setShowEditModal(false);
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
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Users className="text-primary" size={32} />
                        Gestão de Usuários
                    </h1>
                    <p className="text-slate-500 mt-1">Gerencie permissões, setores e acessos dos usuários do sistema.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou email..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-64 text-sm"
                        />
                    </div>
                </div>
            </header>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-4 overflow-x-auto">
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filterStatus === 'all' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilterStatus('active')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filterStatus === 'active' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Ativos
                    </button>
                    <button
                        onClick={() => setFilterStatus('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filterStatus === 'pending' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Pendentes
                    </button>
                    <button
                        onClick={() => setFilterStatus('blocked')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filterStatus === 'blocked' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Bloqueados
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Usuário</th>
                                <th className="px-6 py-4">Função</th>
                                <th className="px-6 py-4">Setores Permissionados</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 border border-slate-200 overflow-hidden">
                                                {u.avatar_url ? (
                                                    <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    u.name.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 leading-none mb-1">{u.name}</p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Mail size={12} /> {u.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-600">
                                            {u.role === 'admin_root' ? 'Admin Root' : u.role === 'admin' ? 'Admin Industrial' : 'Usuário / Solicitante'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1">
                                            {u.manage_equipment && <span className="size-2 rounded-full bg-blue-500" title="Mecânica"></span>}
                                            {u.manage_predial && <span className="size-2 rounded-full bg-orange-500" title="Predial"></span>}
                                            {u.manage_others && <span className="size-2 rounded-full bg-slate-400" title="Outros"></span>}
                                            {(!u.manage_equipment && !u.manage_predial && !u.manage_others) && <span className="text-[10px] text-slate-400 italic">Nenhum</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${getStatusBadge(u.status)}`}>
                                            {u.status === 'active' ? 'Ativo' : u.status === 'pending' ? 'Pendente' : 'Bloqueado'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleEditUser(u)}
                                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                        >
                                            <Settings size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredUsers.length === 0 && (
                        <div className="p-12 text-center text-slate-500 italic">
                            Nenhum usuário encontrado com os filtros aplicados.
                        </div>
                    )}
                </div>
            </div>

            {/* Edit User Modal */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-full bg-white flex items-center justify-center font-bold text-slate-600 border border-slate-200 overflow-hidden shadow-sm">
                                    {editingUser.avatar_url ? (
                                        <img src={editingUser.avatar_url} alt={editingUser.name} className="w-full h-full object-cover" />
                                    ) : (
                                        editingUser.name.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Configurar Usuário</h3>
                                    <p className="text-sm text-slate-500">{editingUser.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="size-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                            {/* Role & Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Função</label>
                                    <select
                                        value={editingUser.role}
                                        onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700"
                                    >
                                        <option value="user">Usuário / Solicitante</option>
                                        <option value="admin">Admin Industrial</option>
                                        <option value="admin_root">Admin Root</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Status</label>
                                    <select
                                        value={editingUser.status}
                                        onChange={e => setEditingUser({ ...editingUser, status: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700"
                                    >
                                        <option value="active">Ativo</option>
                                        <option value="pending">Pendente / Aguardando</option>
                                        <option value="blocked">Bloqueado / Inativo</option>
                                    </select>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Sector Permissions */}
                            <div>
                                <h4 className="font-bold text-slate-900 mb-1">Setores Autorizados</h4>
                                <p className="text-xs text-slate-500 mb-4">Define quais áreas este usuário pode abrirOrdens de Serviço.</p>

                                <div className="space-y-3">
                                    {[
                                        { id: 'manage_equipment', label: 'Mecânica / Equipamentos', desc: 'Permite abrir OS para máquinas industriais' },
                                        { id: 'manage_predial', label: 'Predial / Infraestrutura', desc: 'Permite abrir OS de manutenção predial' },
                                        { id: 'manage_others', label: 'Outros / Serviços', desc: 'Permite abrir OS de serviços diversos' }
                                    ].map((sector) => (
                                        <div key={sector.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">{sector.label}</p>
                                                <p className="text-[10px] text-slate-500">{sector.desc}</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editingUser[sector.id] ?? true}
                                                    onChange={e => setEditingUser({ ...editingUser, [sector.id]: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Password Reset Section */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                                        <Lock size={18} className="text-primary" />
                                        <span className="text-sm">Segurança da Conta</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordField(!showPasswordField)}
                                        className="text-[10px] font-black uppercase tracking-wider text-primary hover:underline"
                                    >
                                        {showPasswordField ? 'Cancelar' : 'Alterar Senha'}
                                    </button>
                                </div>

                                {showPasswordField && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                                placeholder="Digite a nova senha..."
                                                className="w-full pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleResetPassword}
                                            disabled={!newPassword || isSaving}
                                            className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                                        >
                                            Confirmar Nova Senha
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSavePermissions}
                                disabled={isSaving}
                                className="px-8 py-2.5 bg-primary text-white font-black rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                            </button>
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

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, User } from '../contexts/AuthContext';
import { Check, X, User as UserIcon, Shield, Search, Filter, AlertCircle, Clock } from 'lucide-react';

const UsersPending = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getPendingUsers, approveUser, rejectUser } = useAuth();

    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    // Efeito para filtrar usuários quando a busca muda
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

    // Se vier com ID na URL, focar nesse usuário (scroll ou highlight)
    useEffect(() => {
        if (id && !loading && users.length > 0) {
            // Poderíamos fazer algo específico aqui, mas por enquanto a lista já mostra todos
        }
    }, [id, loading, users]);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await getPendingUsers();

        if (error) {
            setError('Erro ao carregar usuários pendentes');
            console.error(error);
        } else {
            setUsers(data || []);
            setFilteredUsers(data || []);
        }
        setLoading(false);
    };

    const handleApprove = async (userId: string, userName: string) => {
        if (!window.confirm(`Tem certeza que deseja APROVAR o usuário ${userName}?`)) return;

        setProcessingId(userId);
        setError(null);

        const { success, error } = await approveUser(userId);

        if (success) {
            setSuccessMessage(`Usuário ${userName} aprovado com sucesso!`);
            // Remover da lista
            setUsers(prev => prev.filter(u => u.id !== userId));

            // Limpar mensagem após 3s
            setTimeout(() => setSuccessMessage(null), 3000);

            // Se estava na URL com esse ID, limpar URL
            if (id === userId) {
                navigate('/users/pending');
            }
        } else {
            setError(`Erro ao aprovar: ${error}`);
        }

        setProcessingId(null);
    };

    const handleReject = async (userId: string, userName: string) => {
        if (!window.confirm(`Tem certeza que deseja REJEITAR o usuário ${userName}?`)) return;

        setProcessingId(userId);
        setError(null);

        const { success, error } = await rejectUser(userId);

        if (success) {
            setSuccessMessage(`Usuário ${userName} rejeitado.`);
            setUsers(prev => prev.filter(u => u.id !== userId));
            setTimeout(() => setSuccessMessage(null), 3000);

            if (id === userId) {
                navigate('/users/pending');
            }
        } else {
            setError(`Erro ao rejeitar: ${error}`);
        }

        setProcessingId(null);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <UserIcon className="text-primary" />
                        Aprovação de Usuários
                    </h1>
                    <p className="text-slate-500">Gerencie as solicitações de acesso ao sistema</p>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar usuário..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 border border-red-200">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-2 border border-green-200">
                    <Check size={20} />
                    {successMessage}
                </div>
            )}

            {filteredUsers.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserIcon size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">Nenhum usuário pendente</h3>
                    <p className="text-slate-500 mt-1">Não há solicitações de acesso aguardando aprovação no momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.map((user) => (
                        <div
                            key={user.id}
                            className={`bg-white rounded-xl shadow-sm border ${id === user.id ? 'border-primary ring-1 ring-primary' : 'border-slate-200'} overflow-hidden transition-all hover:shadow-md`}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900">{user.name}</h3>
                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                <Clock size={12} />
                                                {new Date(user.created_at).toLocaleDateString('pt-BR')} às {new Date(user.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-semibold ${user.requested_role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                        {user.requested_role === 'admin' ? 'Admin' : 'Usuário'}
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6">
                                    <div className="text-sm">
                                        <span className="text-slate-500 block text-xs">Email</span>
                                        <span className="text-slate-800 font-medium">{user.email}</span>
                                    </div>
                                    {user.username && (
                                        <div className="text-sm">
                                            <span className="text-slate-500 block text-xs">Usuário</span>
                                            <span className="text-slate-800">{user.username}</span>
                                        </div>
                                    )}
                                    {user.phone && (
                                        <div className="text-sm">
                                            <span className="text-slate-500 block text-xs">WhatsApp</span>
                                            <span className="text-slate-800">{user.phone}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleReject(user.id, user.name)}
                                        disabled={processingId === user.id}
                                        className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <X size={16} />
                                        Rejeitar
                                    </button>
                                    <button
                                        onClick={() => handleApprove(user.id, user.name)}
                                        disabled={processingId === user.id}
                                        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-sm hover:shadow"
                                    >
                                        {processingId === user.id ? (
                                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <Check size={16} />
                                        )}
                                        Aprovar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UsersPending;

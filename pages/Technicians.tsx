import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Edit2, Trash2, Loader2 } from 'lucide-react';
import TechnicianModal, { TechnicianData } from '../components/TechnicianModal';
import { supabase } from '../lib/supabase';
import FeedbackModal from '../components/FeedbackModal';

interface Technician {
    id: string;
    name: string;
    specialty: string;
    contact: string;
    status: string;
    avatar: string | null;
    performance_open: number;
    performance_closed: number;
    hourly_rate?: number;
}

const Technicians = () => {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [filteredTechnicians, setFilteredTechnicians] = useState<Technician[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTechnician, setSelectedTechnician] = useState<TechnicianData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [feedback, setFeedback] = useState<{
        type: 'success' | 'error' | 'confirm' | 'info';
        title: string;
        message: string;
        onConfirm?: () => void;
    } | null>(null);
    const [stats, setStats] = useState({
        total: 0,
        available: 0,
        inField: 0,
        inactive: 0
    });

    useEffect(() => {
        loadTechnicians();
    }, []);

    useEffect(() => {
        // Filter technicians based on search
        if (searchTerm) {
            const filtered = technicians.filter(tech =>
                tech.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tech.specialty.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredTechnicians(filtered);
        } else {
            setFilteredTechnicians(technicians);
        }
    }, [searchTerm, technicians]);

    useEffect(() => {
        // Calculate stats
        const total = technicians.length;
        const available = technicians.filter(t => t.status === 'Ativo').length;
        const inField = technicians.filter(t => t.status === 'Em Campo').length;
        const inactive = technicians.filter(t => t.status === 'Inativo').length;

        setStats({ total, available, inField, inactive });
    }, [technicians]);

    const loadTechnicians = async () => {
        try {
            setIsLoading(true);

            // 1. Fetch Technicians
            const { data: techs, error: techError } = await supabase
                .from('technicians')
                .select('*')
                .order('name');

            if (techError) throw techError;

            // 2. Fetch Work Orders to calculate performance
            const { data: orders, error: orderError } = await supabase
                .from('work_orders')
                .select('technician_id, status');

            if (orderError) throw orderError;

            // 3. Merge data
            const computedTechs = (techs || []).map((tech: any) => {
                // Filter orders for this technician using ID
                const techOrders = orders?.filter((o: any) => o.technician_id === tech.id) || [];

                const openCount = techOrders.filter((o: any) => ['Pendente', 'Em Andamento', 'Em Manutenção'].includes(o.status)).length;
                const closedCount = techOrders.filter((o: any) => o.status === 'Concluído').length;

                return {
                    ...tech,
                    performance_open: openCount,
                    performance_closed: closedCount
                };
            });

            setTechnicians(computedTechs);
        } catch (error) {
            console.error('Erro ao carregar técnicos:', error);
            setFeedback({
                type: 'error',
                title: 'Erro de Carregamento',
                message: 'Não foi possível carregar a lista de técnicos.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveTechnician = async (technicianData: TechnicianData) => {
        try {
            if (technicianData.id) {
                // Update existing
                const { error } = await supabase
                    .from('technicians')
                    .update({
                        name: technicianData.name,
                        specialty: technicianData.specialty,
                        contact: technicianData.contact,
                        status: technicianData.status,
                        avatar: technicianData.avatar,
                        hourly_rate: technicianData.hourly_rate
                    })
                    .eq('id', technicianData.id);

                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase
                    .from('technicians')
                    .insert([{
                        name: technicianData.name,
                        specialty: technicianData.specialty,
                        contact: technicianData.contact,
                        status: technicianData.status,
                        avatar: technicianData.avatar,
                        performance_open: 0,
                        performance_closed: 0,
                        hourly_rate: technicianData.hourly_rate || 50
                    }]);

                if (error) throw error;
            }

            await loadTechnicians();
            setIsModalOpen(false);
            setSelectedTechnician(null);
        } catch (error) {
            console.error('Erro ao salvar técnico:', error);
            throw error;
        }
    };

    const handleDeleteTechnician = async (id: string, name: string) => {
        setFeedback({
            type: 'confirm',
            title: 'Excluir Técnico?',
            message: `Tem certeza que deseja excluir o técnico ${name}? Esta ação não pode ser desfeita.`,
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('technicians')
                        .delete()
                        .eq('id', id);

                    if (error) throw error;

                    await loadTechnicians();
                    setFeedback({
                        type: 'success',
                        title: 'Técnico Excluído',
                        message: 'O cadastro do técnico foi removido com sucesso.'
                    });
                } catch (error) {
                    console.error('Erro ao excluir técnico:', error);
                    setFeedback({
                        type: 'error',
                        title: 'Erro ao Excluir',
                        message: 'Não foi possível remover o técnico no momento.'
                    });
                }
            }
        });
    };

    const handleEditTechnician = (tech: Technician) => {
        setSelectedTechnician({
            id: tech.id,
            name: tech.name,
            specialty: tech.specialty,
            contact: tech.contact,
            status: tech.status,
            avatar: tech.avatar || '',
            hourly_rate: tech.hourly_rate
        });
        setIsModalOpen(true);
    };

    const handleNewTechnician = () => {
        setSelectedTechnician(null);
        setIsModalOpen(true);
    };

    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const getSpecialtyColor = (specialty: string) => {
        const colors: Record<string, string> = {
            'Mecânica': 'bg-blue-50 text-blue-700',
            'Elétrica': 'bg-amber-50 text-amber-700',
            'Hidráulica': 'bg-cyan-50 text-cyan-700',
            'Pneumática': 'bg-purple-50 text-purple-700',
            'Eletrônica': 'bg-green-50 text-green-700',
            'Instrumentação': 'bg-pink-50 text-pink-700',
            'Geral': 'bg-slate-50 text-slate-700'
        };
        return colors[specialty] || 'bg-slate-50 text-slate-700';
    };

    const getAvatarColor = (name: string) => {
        const colors = [
            'bg-indigo-100 text-indigo-600',
            'bg-amber-100 text-amber-600',
            'bg-green-100 text-green-600',
            'bg-pink-100 text-pink-600',
            'bg-purple-100 text-purple-600',
            'bg-cyan-100 text-cyan-600'
        ];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Gestão de Técnicos</h2>
                    <p className="text-sm text-slate-500">Gerencie a equipe de manutenção e especialidades.</p>
                </div>
                <button
                    onClick={handleNewTechnician}
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all"
                >
                    <UserPlus size={18} />
                    Novo Técnico
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500">Total</p>
                    <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500">Disponíveis</p>
                    <h3 className="text-2xl font-bold text-slate-900">{stats.available}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500">Em Campo</p>
                    <h3 className="text-2xl font-bold text-slate-900">{stats.inField}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500">Inativos</p>
                    <h3 className="text-2xl font-bold text-red-500">{stats.inactive}</h3>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Lista de Técnicos</h3>
                    <div className="relative w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou especialidade"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-full py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-primary"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={32} className="animate-spin text-primary" />
                        </div>
                    ) : filteredTechnicians.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-500">Nenhum técnico encontrado</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Técnico</th>
                                    <th className="px-6 py-4">Especialidade</th>
                                    <th className="px-6 py-4">Contato</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Performance (Chamados)</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTechnicians.map((tech) => (
                                    <tr key={tech.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            {tech.avatar ? (
                                                <img
                                                    src={tech.avatar}
                                                    alt={tech.name}
                                                    className="size-10 rounded-full object-cover border-2 border-slate-200"
                                                />
                                            ) : (
                                                <div className={`size-10 rounded-full ${getAvatarColor(tech.name)} flex items-center justify-center font-bold text-sm`}>
                                                    {getInitials(tech.name)}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-slate-900">{tech.name}</p>
                                                <p className="text-xs text-slate-400">#TEC-{tech.id.substring(0, 6).toUpperCase()}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`${getSpecialtyColor(tech.specialty)} px-2 py-1 rounded text-xs font-medium`}>
                                                {tech.specialty}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{tech.contact}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${tech.status === 'Ativo' ? 'bg-green-50 text-green-700 border border-green-100' :
                                                tech.status === 'Em Campo' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                    'bg-slate-50 text-slate-700 border border-slate-100'
                                                }`}>
                                                <span className={`size-1.5 rounded-full ${tech.status === 'Ativo' ? 'bg-green-500' :
                                                    tech.status === 'Em Campo' ? 'bg-blue-500' :
                                                        'bg-slate-500'
                                                    }`}></span>
                                                {tech.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-4">
                                                <div>
                                                    <span className="block text-xs text-slate-400 uppercase">Abertos</span>
                                                    <span className={`font-bold ${tech.performance_open > 10 ? 'text-red-600' : 'text-slate-900'}`}>
                                                        {tech.performance_open || 0}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs text-slate-400 uppercase">Concluídos</span>
                                                    <span className="font-bold text-slate-900">{tech.performance_closed || 0}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEditTechnician(tech)}
                                                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                    title="Editar técnico"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTechnician(tech.id, tech.name)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Excluir técnico"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <TechnicianModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedTechnician(null);
                }}
                onSave={handleSaveTechnician}
                technician={selectedTechnician}
            />

            {/* Feedback Modal Reutilizável */}
            {feedback && (
                <FeedbackModal
                    isOpen={!!feedback}
                    onClose={() => setFeedback(null)}
                    type={feedback.type}
                    title={feedback.title}
                    message={feedback.message}
                    onConfirm={feedback.onConfirm}
                />
            )}
        </div>
    );
};

export default Technicians;
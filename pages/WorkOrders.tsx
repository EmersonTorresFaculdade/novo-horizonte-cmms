import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Filter,
  UserX,
  Plus,
  LayoutList,
  Kanban,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Trash2,
  Pencil,
  Search,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useSearchParams } from 'react-router-dom';
import FeedbackModal from '../components/FeedbackModal';

interface WorkOrder {
  id: string;
  order_number: string;
  issue: string; // desc
  maintenance_category?: string;
  failure_type: string;
  status: string;
  priority: string;
  sector: string;
  date: string;
  created_at?: string;
  asset_id: string;
  technician_id?: string;
  assets: {
    name: string;
    model: string;
    code?: string;
  };
  technicians?: {
    name: string;
  } | null;
  requester?: {
    name: string;
  } | null;
}

const WorkOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_root';
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'maintenance' | 'waiting' | 'completed'>('all');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'confirm' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
  } | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const q = searchParams.get('search');
    console.log('DEBUG: URL Search Param changed:', q);
    if (q !== null) {
      setSearchTerm(q);
    }
  }, [searchParams]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
                *,
                failure_type,
                assets (id, name, model, code, sector),
                technicians (name),
                requester:users!requester_id (name)
            `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setOrders(data);
    } catch (error) {
      console.error('Error fetching work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    // Status filter
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'pending' && order.status === 'Pendente') ||
      (filterStatus === 'maintenance' && order.status === 'Em Manutenção') ||
      (filterStatus === 'waiting' && order.status === 'Aguardando Peça') ||
      (filterStatus === 'completed' && order.status === 'Concluído');

    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const assetsData = order.assets as any;
    const matchesSearch =
      searchTerm === '' ||
      order.order_number.toLowerCase().includes(searchLower) ||
      order.issue.toLowerCase().includes(searchLower) ||
      (order.assets?.name || '').toLowerCase().includes(searchLower) ||
      (assetsData?.code || '').toLowerCase().includes(searchLower);

    // Filter by Permission (Maintenance Category)
    const allowedCategories: string[] = [];
    if (user?.manage_equipment) allowedCategories.push('Equipamento');
    if (user?.manage_predial) allowedCategories.push('Predial');
    if (user?.manage_others) allowedCategories.push('Outros');

    // If order has no category, treat it as Equipamento (legacy or default)
    const matchesPermission = allowedCategories.includes(order.maintenance_category || 'Equipamento');

    return matchesStatus && matchesSearch && matchesPermission;
  });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Previne navegação ao clicar no delete

    setFeedback({
      type: 'confirm',
      title: 'Excluir Ordem?',
      message: 'Tem certeza que deseja excluir esta ordem de serviço? Esta ação removerá permanentemente o registro do banco de dados.',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('work_orders').delete().eq('id', id);
          if (error) throw error;

          setFeedback({
            type: 'success',
            title: 'Excluída!',
            message: 'A ordem de serviço foi removida com sucesso.'
          });
          fetchOrders(); // Recarrega lista
        } catch (error) {
          console.error('Error deleting order:', error);
          setFeedback({
            type: 'error',
            title: 'Erro ao Excluir',
            message: 'Não foi possível remover a ordem de serviço no momento.'
          });
        }
      }
    });
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'Alta': return 'bg-red-100 text-red-800 border-red-200';
      case 'Média': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Baixa': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    let colorClass = 'bg-slate-50 text-slate-600 border-slate-200';

    if (s === 'concluído' || s === 'concluido' || s === 'concluída' || s === 'concluida') {
      colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (s === 'em manutenção' || s === 'manutenção') {
      colorClass = 'bg-purple-50 text-purple-700 border-purple-200';
    } else if (s === 'aguardando peça' || s === 'aguardando') {
      colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (s === 'pendente') {
      colorClass = 'bg-orange-50 text-orange-700 border-orange-200';
    } else if (s === 'crítico' || s === 'crítica') {
      colorClass = 'bg-red-50 text-red-700 border-red-200';
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colorClass}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Ordens</h2>
          <p className="text-slate-500 max-w-2xl">Gerencie solicitações, atribua técnicos e acompanhe o status dos reparos.</p>
        </div>

        <button
          onClick={() => navigate('/work-orders/new')}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
        >
          <Plus size={18} />
          Criar Nova Solicitação
        </button>
      </div>

      {/* Filter Bar & View Toggle */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filterStatus === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Todas ({orders.length})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filterStatus === 'pending' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Pendentes ({orders.filter(o => o.status === 'Pendente').length})
            </button>
            <button
              onClick={() => setFilterStatus('maintenance')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filterStatus === 'maintenance' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Em Manutenção ({orders.filter(o => o.status === 'Em Manutenção').length})
            </button>
            <button
              onClick={() => setFilterStatus('waiting')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filterStatus === 'waiting' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Aguardando Peça ({orders.filter(o => o.status === 'Aguardando Peça').length})
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filterStatus === 'completed' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Concluídos ({orders.filter(o => o.status === 'Concluído').length})
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por OS, ativo ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm w-full md:w-64 outline-none focus:bg-white focus:border-primary transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700'}`}
              title="Visualização em Lista"
            >
              <LayoutList size={18} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700'}`}
              title="Visualização em Quadro (Kanban)"
            >
              <Kanban size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-12 text-slate-500">Carregando ordens de serviço...</div>
      ) : (
        <>
          {/* Content */}
          {viewMode === 'list' ? (
            /* LIST VIEW */
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                {filteredOrders.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                    <Info size={48} className="text-slate-300 mb-4" />
                    <p>Nenhuma ordem de serviço encontrada com este filtro.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">ID</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Categoria</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-48">Alvo</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Tipo</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Problema</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Setor</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Prioridade</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Status</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-48">Solicitante</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-48">Técnico</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-40 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} onClick={() => navigate(`/work-orders/${order.id}`)} className="group hover:bg-slate-50 transition-colors cursor-pointer">
                          <td className="p-4 text-sm font-medium text-primary">#{order.order_number}</td>
                          <td className="p-4">
                            <span className="inline-flex py-1 px-2 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                              {order.maintenance_category || 'Equipamento'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-900">{order.assets?.name || 'Geral'}</span>
                              <span className="text-xs text-slate-500">{order.assets?.model || '-'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 capitalize">
                              {order.failure_type || 'Geral'}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-slate-700">{order.issue}</td>
                          <td className="p-4 text-sm text-slate-700">{order.assets?.sector || order.sector || '-'}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(order.priority)}`}>
                              {order.priority}
                            </span>
                          </td>
                          <td className="p-4">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="p-4">
                            <span className="text-sm font-medium text-slate-700">{order.requester?.name || 'Administrador'}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                              {order.technicians ? (
                                <>
                                  <div className="size-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                                    {order.technicians.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <span>{order.technicians.name}</span>
                                </>
                              ) : (
                                <div className="flex items-center gap-1 italic text-slate-400">
                                  <UserX size={16} /> Não atribuído
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/${order.id}/edit`); }}
                                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Editar"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    onClick={(e) => handleDelete(e, order.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Excluir"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}

                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            /* KANBAN VIEW (Simplified for Real Data) */
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full">
              {['Pendente', 'Em Manutenção', 'Aguardando Peça', 'Concluído'].map(status => (
                <div key={status} className="flex flex-col h-full bg-slate-50/50 rounded-xl border border-slate-200">
                  <div className="p-3 border-b border-slate-200 bg-white rounded-t-xl flex items-center justify-between">
                    <h3 className="font-bold text-slate-700 text-sm">{status}</h3>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">
                      {filteredOrders.filter(o => o.status === status).length}
                    </span>
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[200px]">
                    {filteredOrders.filter(o => o.status === status).map(order => (
                      <div key={order.id} onClick={() => navigate(`/work-orders/${order.id}`)} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow relative group">
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-xs font-bold text-slate-400">#{order.order_number}</span>
                          {isAdmin && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-1 rounded-md shadow-sm border border-slate-100 absolute top-2 right-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/${order.id}/edit`); }}
                                className="text-slate-400 hover:text-blue-500 p-1 rounded hover:bg-blue-50"
                                title="Editar"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={(e) => handleDelete(e, order.id)}
                                className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                                title="Excluir"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mb-1 mt-1">{order.assets?.name || 'Geral'}</h4>
                        <div className="mb-2 flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {order.maintenance_category || 'Equipamento'}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {order.failure_type || 'Geral'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{order.issue}</p>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getPriorityColor(order.priority)}`}>{order.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

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

export default WorkOrders;
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
  Pencil
} from 'lucide-react';
import { IMAGES } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface WorkOrder {
  id: string;
  order_number: string;
  issue: string; // desc
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
  };
  technicians?: {
    name: string;
  } | null;
}

const WorkOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_root';
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'maintenance' | 'waiting' | 'completed'>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
                *,
                assets (name, model),
                technicians (name)
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
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return order.status === 'Pendente';
    if (filterStatus === 'maintenance') return order.status === 'Em Manutenção';
    if (filterStatus === 'waiting') return order.status === 'Aguardando Peça';
    if (filterStatus === 'completed') return order.status === 'Concluído';
    return true;
  });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Previne navegação ao clicar no delete
    if (!confirm('Tem certeza que deseja excluir esta ordem de serviço? Isso não pode ser desfeito.')) return;

    try {
      const { error } = await supabase.from('work_orders').delete().eq('id', id);
      if (error) throw error;

      alert('Ordem de serviço excluída com sucesso.');
      fetchOrders(); // Recarrega lista
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Erro ao excluir ordem de serviço.');
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'Alta': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Média': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Baixa': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: string) => {
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
    if (status === 'Concluído') colorClass = 'bg-green-100 text-green-700 border-green-200';
    if (status === 'Em Manutenção') colorClass = 'bg-blue-100 text-blue-700 border-blue-200';
    if (status === 'Aguardando Peça') colorClass = 'bg-amber-100 text-amber-700 border-amber-200';
    if (status === 'Pendente') colorClass = 'bg-orange-100 text-orange-700 border-orange-200';

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
        <div className="flex flex-col gap-2">
          <nav className="flex items-center text-sm text-slate-500 mb-1">
            <button onClick={() => navigate('/dashboard')} className="hover:text-primary">Início</button>
            <ChevronRight size={14} className="mx-1" />
            <span className="text-slate-900 font-medium">Ordens de Serviço</span>
          </nav>
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
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-48">Máquina</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Problema</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Setor</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Prioridade</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Status</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-48">Técnico</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-40 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} onClick={() => navigate(`/work-orders/${order.id}`, { state: { readOnly: true } })} className="group hover:bg-slate-50 transition-colors cursor-pointer">
                          <td className="p-4 text-sm font-medium text-primary">#{order.order_number}</td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-900">{order.assets?.name}</span>
                              <span className="text-xs text-slate-500">{order.assets?.model}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-slate-700">{order.issue}</td>
                          <td className="p-4 text-sm text-slate-700">{order.sector}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(order.priority)}`}>
                              {order.priority}
                            </span>
                          </td>
                          <td className="p-4">
                            {getStatusBadge(order.status)}
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
                                    onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/${order.id}`, { state: { readOnly: false } }); }}
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
                    {filteredOrders.filter(o => o.status === status).map(card => (
                      <div key={card.id} onClick={() => navigate(`/work-orders/${card.id}`, { state: { readOnly: true } })} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow relative group">
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-xs font-bold text-slate-400">#{card.order_number}</span>
                          {isAdmin && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-1 rounded-md shadow-sm border border-slate-100 absolute top-2 right-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/${card.id}`, { state: { readOnly: false } }); }}
                                className="text-slate-400 hover:text-blue-500 p-1 rounded hover:bg-blue-50"
                                title="Editar"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={(e) => handleDelete(e, card.id)}
                                className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                                title="Excluir"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mb-1 mt-1">{card.assets?.name}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{card.issue}</p>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getPriorityColor(card.priority)}`}>{card.priority}</span>
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
    </div>
  );
};

export default WorkOrders;
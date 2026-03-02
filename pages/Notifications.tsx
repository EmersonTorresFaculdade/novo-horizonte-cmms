import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell, Check, X, User, Shield, Search, Filter, Trash2, BellOff,
    ChevronRight, Clock, Wrench, CheckCircle2, AlertTriangle, AlertCircle,
    Info, CalendarClock, ArrowUpRight, ArrowDownRight, Settings, SlidersHorizontal, Share2, FileText, CheckCircle
} from 'lucide-react';
import { useNotifications, Notification } from '../contexts/NotificationsContext';

// Helper to extract metadata heuristically from notification text
const getNotificationMeta = (n: Notification) => {
    const text = (n.title + ' ' + (n.message || '')).toLowerCase();

    let type = 'Sistema';
    if (text.includes('corretiva') || text.includes('falha') || text.includes('quebra')) type = 'Corretiva';
    else if (text.includes('preventiva') || text.includes('inspeção')) type = 'Preventiva';
    else if (text.includes('financeiro') || text.includes('custo') || text.includes('compra')) type = 'Financeiro';
    else if (text.includes('os-') || text.includes('ordem')) type = 'Corretiva';

    let priority: 'CRÍTICA' | 'ATRASADA' | 'NORMAL' | 'INFORMATIVA' = 'INFORMATIVA';
    if (text.includes('crítica') || text.includes('alta') || text.includes('urgente') || text.includes('emergência')) priority = 'CRÍTICA';
    else if (text.includes('atrasada') || text.includes('vencida')) priority = 'ATRASADA';
    else if (type === 'Corretiva' || type === 'Preventiva' || n.type === 'work_order') priority = 'NORMAL';

    let sector = 'Geral';
    if (text.includes('produção') || text.includes('extrusora')) sector = 'Produção';
    else if (text.includes('embalagem')) sector = 'Embalagem';
    else if (text.includes('utilidades') || text.includes('compressor')) sector = 'Utilidades';

    let asset = 'N/A';
    const match = text.match(/(eq|ativo)-\d{3,4}/);
    if (match) asset = match[0].toUpperCase();

    return { type, priority, sector, asset };
};

const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'CRÍTICA': return 'bg-red-500 text-white border border-red-500';
        case 'ALTA':
        case 'ATRASADA': return 'bg-orange-500 text-white border border-orange-500';
        case 'NORMAL': return 'bg-blue-500 text-white border border-blue-500';
        default: return 'bg-slate-200 text-slate-700 border border-slate-200';
    }
};

const getPriorityBorder = (priority: string) => {
    switch (priority) {
        case 'CRÍTICA': return 'border-l-4 border-l-red-500';
        case 'ALTA':
        case 'ATRASADA': return 'border-l-4 border-l-orange-500';
        case 'NORMAL': return 'border-l-4 border-l-blue-500';
        default: return 'border-l-4 border-l-slate-400';
    }
};

const getIconForType = (type: string, priority: string) => {
    if (priority === 'CRÍTICA') return <AlertTriangle size={24} className="text-red-500" />;
    if (priority === 'ATRASADA') return <CalendarClock size={24} className="text-orange-500" />;
    if (type === 'Corretiva') return <Wrench size={24} className="text-blue-500" />;
    if (type === 'Preventiva') return <CheckCircle2 size={24} className="text-emerald-500" />;
    if (type === 'Financeiro') return <FileText size={24} className="text-slate-600" />;
    return <Info size={24} className="text-slate-400" />;
};

const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const groupByDate = (notifications: any[]) => {
    const groups: { [key: string]: any[] } = {
        'Hoje': [],
        'Ontem': [],
        'Esta Semana': [],
        'Este Mês': [],
        'Anteriores': []
    };

    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    notifications.forEach(n => {
        const d = new Date(n.created_at);
        d.setHours(0, 0, 0, 0);

        if (d.getTime() === today.getTime()) groups['Hoje'].push(n);
        else if (d.getTime() === yesterday.getTime()) groups['Ontem'].push(n);
        else if (d >= startOfWeek) groups['Esta Semana'].push(n);
        else if (d >= startOfMonth) groups['Este Mês'].push(n);
        else groups['Anteriores'].push(n);
    });

    return groups;
};


const Notifications = () => {
    const navigate = useNavigate();
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

    const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [filterPriority, setFilterPriority] = useState('ALL');
    const [filterSector, setFilterSector] = useState('ALL');
    const [sortBy, setSortBy] = useState('date');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Decorate notifications with metadata
    const decoratedNotifications = useMemo(() => {
        return notifications.map(n => ({
            ...n,
            meta: getNotificationMeta(n)
        }));
    }, [notifications]);

    // Derived Top Panel Stats
    const stats = useMemo(() => {
        const critical = decoratedNotifications.filter(n => n.meta.priority === 'CRÍTICA').length;
        const delayed = decoratedNotifications.filter(n => n.meta.priority === 'ATRASADA').length;
        const newNotifs = unreadCount;

        // Mocking "Resolvidas Hoje" based on type
        const resolvedToday = decoratedNotifications.filter(n => {
            const isToday = new Date(n.created_at).toDateString() === new Date().toDateString();
            return isToday && n.type === 'work_order_completed';
        }).length;

        // Auto Intelligence Alert
        const correctiveCount = decoratedNotifications.filter(n => n.meta.type === 'Corretiva').length;
        const total = decoratedNotifications.length;
        const showCorrectiveAlert = total > 0 && (correctiveCount / total > 0.6);

        return { critical, delayed, newNotifs, resolvedToday, showCorrectiveAlert };
    }, [decoratedNotifications, unreadCount]);

    const filtered = useMemo(() => {
        let result = decoratedNotifications.filter(n => {
            // Base filters
            if (filterStatus === 'unread' && n.is_read) return false;
            if (filterStatus === 'read' && !n.is_read) return false;

            // Search
            const searchLower = searchTerm.toLowerCase();
            if (searchTerm && !n.title.toLowerCase().includes(searchLower) && !(n.message?.toLowerCase().includes(searchLower))) return false;

            // Advanced Filters
            if (filterType !== 'ALL' && n.meta.type !== filterType) return false;
            if (filterPriority !== 'ALL' && n.meta.priority !== filterPriority) return false;
            if (filterSector !== 'ALL' && n.meta.sector !== filterSector) return false;

            return true;
        });

        // Sorting
        if (sortBy === 'priority') {
            const pLevel = { 'CRÍTICA': 1, 'ATRASADA': 2, 'NORMAL': 3, 'INFORMATIVA': 4 };
            result.sort((a, b) => pLevel[a.meta.priority] - pLevel[b.meta.priority]);
        } else if (sortBy === 'impact') {
            // Mock impact based on sector "Produção" > others
            const getImpact = (n: any) => (n.meta.sector === 'Produção' || n.meta.priority === 'CRÍTICA') ? 1 : 2;
            result.sort((a, b) => getImpact(a) - getImpact(b));
        } else {
            // Default Date
            result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        return result;
    }, [decoratedNotifications, filterStatus, searchTerm, filterType, filterPriority, filterSector, sortBy]);

    const groupedNotifications = useMemo(() => groupByDate(filtered), [filtered]);

    const handleNotificationClick = async (n: any) => {
        if (!n.is_read) await markAsRead(n.id);
        if (n.link) navigate(n.link);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6 font-['Inter']">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Central Inteligente de Alertas
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm">
                        Painel estratégico de priorização e tratamento de notificações operacionais.
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                        <Check size={16} />
                        Marcar Lidas
                    </button>
                )}
            </div>

            {/* Smart Intelligence Alert Banner */}
            {stats.showCorrectiveAlert && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-4 shadow-sm animate-pulse-slow">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="text-red-800 font-bold text-sm">Alerta de Inteligência: Alta incidência Corretiva</h4>
                        <p className="text-red-700 text-xs mt-1">Mais de 60% dos alertas recentes são originados de quebras corretivas. Recomenda-se revisão imediata do plano preventivo.</p>
                    </div>
                </div>
            )}

            {/* Top Summary Panel */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { title: 'Notificações Críticas', count: stats.critical, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', trend: '↑ 2' },
                    { title: 'Atrasadas', count: stats.delayed, icon: CalendarClock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', trend: '↓ 1' },
                    { title: 'Novas', count: stats.newNotifs, icon: Bell, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', trend: '+' + stats.newNotifs },
                    { title: 'Resolvidas Hoje', count: stats.resolvedToday, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', trend: '↑ 14%' },
                ].map((card, idx) => (
                    <div key={idx} className={`bg-white p-5 rounded-2xl border ${card.border} shadow-sm flex flex-col justify-between hover:shadow-md transition-all`}>
                        <div className="flex justify-between items-start mb-2">
                            <div className={`p-2 rounded-xl ${card.bg} ${card.color}`}>
                                <card.icon size={20} />
                            </div>
                            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{card.trend}</span>
                        </div>
                        <div>
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{card.title}</h3>
                            <p className="text-3xl font-black text-slate-900 mt-1 leading-none">{card.count}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Smart Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                        {['all', 'unread', 'read'].map(st => (
                            <button
                                key={st}
                                onClick={() => setFilterStatus(st as any)}
                                className={`px-5 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${filterStatus === st ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {st === 'all' ? 'Todas' : st === 'unread' ? 'Não Lidas' : 'Lidas'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto flex-1 md:justify-end">
                        <div className="relative w-full md:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Busca inteligente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium bg-slate-50"
                            />
                        </div>
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={`p-2 rounded-xl border transition-all ${showAdvancedFilters ? 'bg-primary border-primary text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            <SlidersHorizontal size={18} />
                        </button>
                    </div>
                </div>

                {/* Advanced Filters Expandable */}
                {showAdvancedFilters && (
                    <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo</label>
                            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full text-sm font-medium border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-primary">
                                <option value="ALL">Todos os Tipos</option>
                                <option value="Corretiva">Corretiva</option>
                                <option value="Preventiva">Preventiva</option>
                                <option value="Sistema">Sistema</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Criticidade</label>
                            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="w-full text-sm font-medium border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-primary">
                                <option value="ALL">Qualquer</option>
                                <option value="CRÍTICA">Crítica</option>
                                <option value="ATRASADA">Atrasada</option>
                                <option value="NORMAL">Normal</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Setor</label>
                            <select value={filterSector} onChange={e => setFilterSector(e.target.value)} className="w-full text-sm font-medium border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-primary">
                                <option value="ALL">Qualquer Setor</option>
                                <option value="Produção">Produção</option>
                                <option value="Embalagem">Embalagem</option>
                                <option value="Utilidades">Utilidades</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ordenar por</label>
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full text-sm font-medium border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-primary">
                                <option value="date">Data (Mais Recentes)</option>
                                <option value="priority">Prioridade (Críticas Primeiro)</option>
                                <option value="impact">Impacto Produtivo</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* List */}
            <div className="space-y-8">
                {filtered.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BellOff size={40} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Nenhum alerta localizado</h3>
                        <p className="text-slate-500 mt-1 max-w-sm mx-auto text-sm">
                            Sua caixa está limpa de acordo com os filtros selecionados.
                        </p>
                    </div>
                ) : (
                    Object.entries(groupedNotifications).map(([groupName, items]) => {
                        if (items.length === 0) return null;
                        return (
                            <div key={groupName} className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0">{groupName}</h3>
                                    <div className="h-px bg-slate-200 w-full" />
                                </div>
                                {items.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        className={`group relative bg-white rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col sm:flex-row hover:shadow-md hover:bg-slate-50/80 ${getPriorityBorder(n.meta.priority)} ${!n.is_read ? 'border-r-slate-300 border-y-slate-300 shadow-sm' : 'border-r-slate-200 border-y-slate-200'}`}
                                    >
                                        <div className="flex-1 p-4 py-3.5 flex gap-3">
                                            <div className={`flex-shrink-0 w-10 h-10 mt-0.5 rounded-xl flex items-center justify-center bg-white border border-slate-100 shadow-sm`}>
                                                {getIconForType(n.meta.type, n.meta.priority)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1">
                                                    <h4 className={`text-sm md:text-[15px] font-bold truncate ${!n.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                                                        {n.title}
                                                    </h4>
                                                    <div className="flex items-center gap-2.5 shrink-0">
                                                        <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold tracking-wide ${getPriorityColor(n.meta.priority)}`}>
                                                            {n.meta.priority}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                                                                {formatTime(n.created_at)}
                                                            </span>
                                                            {!n.is_read && <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
                                                        </div>
                                                    </div>
                                                </div>

                                                <p className="text-xs md:text-sm text-slate-500 line-clamp-2 md:line-clamp-1 mb-1.5">
                                                    {n.message}
                                                </p>

                                                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 uppercase tracking-widest truncate">
                                                    <span>{n.meta.sector}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                    <span>Ativo: {n.meta.asset}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                    <span>{n.meta.type}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hover Quick Actions (Desktop) */}
                                        <div className="hidden sm:flex items-center gap-2 px-4 bg-slate-50/50 border-l border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {n.link && (
                                                <button onClick={(e) => { e.stopPropagation(); navigate(n.link!); }} className="p-2 text-slate-400 hover:text-primary hover:bg-white rounded-lg border border-transparent hover:border-slate-200 shadow-sm transition-all" title="Abrir OS">
                                                    <Wrench size={16} />
                                                </button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 shadow-sm transition-all" title="Ocultar/Resolver">
                                                <CheckCircle2 size={16} />
                                            </button>
                                        </div>

                                        {/* Mobile Expansion Indicator */}
                                        <div className="sm:hidden absolute bottom-3 right-4 text-slate-300">
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Notifications;

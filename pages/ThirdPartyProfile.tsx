import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Edit2, Calendar as CalendarIcon, Clock, CheckCircle,
    TrendingUp, Star, Phone, Mail, Award, AlertTriangle,
    ChevronLeft, ChevronRight, Download, MoreHorizontal, User,
    Briefcase, DollarSign, Wrench, Building2
} from 'lucide-react';
import { supabase, supabaseUntyped } from '../lib/supabase';
import { STATUS_COLORS } from './Calendar';
import ThirdPartyModal, { ThirdPartyFormData } from '../components/ThirdPartyModal';
import type { ThirdPartyCompany } from '../types';

interface WorkOrder {
    id: string;
    order_number: string;
    title: string;
    description: string;
    issue?: string;
    status: string;
    priority: string;
    created_at: string;
    resolved_at?: string;
    responded_at?: string;
    date?: string;
    asset_name: string;
    location?: string;
    scheduled_start?: string;
    scheduled_end?: string;
    [key: string]: any;
}

interface CompanyRating {
    id: string;
    rating: number;
    comment?: string;
    created_at: string;
    user_id: string;
    work_order_id?: string;
}

const ThirdPartyProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [company, setCompany] = useState<ThirdPartyCompany | null>(null);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [ratings, setRatings] = useState<CompanyRating[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    useEffect(() => {
        if (id) {
            loadCompanyData();
        }
    }, [id]);

    const loadCompanyData = async () => {
        try {
            setIsLoading(true);

            // Load company basic info
            const { data: comp, error: compError } = await supabaseUntyped
                .from('third_party_companies')
                .select('*')
                .eq('id', id)
                .single();

            if (compError) throw compError;
            setCompany(comp);

            // Load work orders linked to this company
            const { data: orders, error: ordersError } = await supabaseUntyped
                .from('work_orders')
                .select(`
                    *,
                    assets (name),
                    users (name)
                `)
                .eq('third_party_company_id', id)
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            const mappedOrders = (orders || []).map(o => ({
                ...o,
                title: o.issue,
                asset_name: o.assets?.name || 'Geral'
            }));

            setWorkOrders(mappedOrders);

            // Load company ratings
            const { data: ratingsData } = await supabaseUntyped
                .from('technician_ratings')
                .select('*')
                .eq('third_party_company_id', id);
            setRatings(ratingsData || []);

        } catch (error) {
            console.error('Erro ao carregar dados da empresa:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateCompany = async (data: ThirdPartyFormData) => {
        try {
            const { error } = await supabase
                .from('third_party_companies')
                .update(data)
                .eq('id', id);

            if (error) throw error;
            await loadCompanyData();
            setIsEditModalOpen(false);
        } catch (error) {
            console.error('Erro ao atualizar empresa:', error);
            throw error;
        }
    };

    // KPIs Calculations
    const mttr = useMemo(() => {
        const resolved = workOrders.filter(o => o.status === 'Concluído' && o.resolved_at && o.created_at);
        if (resolved.length === 0) return { hours: 0, minutes: 0, label: '—' };
        const totalMs = resolved.reduce((sum, o) => {
            const diff = new Date(o.resolved_at!).getTime() - new Date(o.created_at).getTime();
            return sum + Math.max(diff, 0);
        }, 0);
        const avgMs = totalMs / resolved.length;
        const totalMinutes = Math.floor(avgMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return { hours, minutes, label: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m` };
    }, [workOrders]);

    const completedThisMonth = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        return workOrders.filter(o => {
            if (o.status !== 'Concluído') return false;
            const resolvedDate = o.resolved_at ? new Date(o.resolved_at) : new Date(o.created_at);
            return resolvedDate.getMonth() === currentMonth && resolvedDate.getFullYear() === currentYear;
        }).length;
    }, [workOrders]);

    const avgRating = useMemo(() => {
        if (ratings.length === 0) return { value: 0, count: 0 };
        const total = ratings.reduce((sum, r) => sum + r.rating, 0);
        return { value: parseFloat((total / ratings.length).toFixed(1)), count: ratings.length };
    }, [ratings]);

    const completedOrders = workOrders.filter(o => o.status === 'Concluído').length;

    const todayTasks = workOrders.filter(o => {
        const todayStr = new Date().toISOString().split('T')[0];
        const resolvedDate = o.resolved_at?.split('T')[0];
        const isActive = o.status !== 'Concluído' && o.status !== 'Cancelado';
        const wasCompletedToday = o.status === 'Concluído' && resolvedDate === todayStr;
        return isActive || wasCompletedToday;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="size-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!company) {
        return (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xl">
                <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
                <h3 className="text-xl font-black text-slate-900">Empresa não encontrada</h3>
                <button
                    onClick={() => navigate('/technicians')}
                    className="mt-6 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all"
                >
                    Voltar para Lista
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-[320px] shrink-0 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center">
                        <div className="relative mb-6">
                            <div className="size-32 rounded-3xl bg-slate-100 flex items-center justify-center ring-4 ring-slate-100 shadow-lg">
                                <Building2 size={64} className="text-slate-300" />
                            </div>
                            <div className={`absolute -bottom-2 -right-2 size-6 rounded-full border-4 border-white ${company.status === 'Ativo' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        </div>

                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{company.name}</h2>
                        <p className="text-blue-600 font-bold text-sm mb-2">{company.specialty}</p>
                        <p className="text-slate-400 text-xs font-semibold mb-6">CNPJ: {company.cnpj || '—'}</p>

                        <div className="flex flex-col w-full gap-3">
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Edit2 size={16} />
                                Editar Parceiro
                            </button>
                        </div>

                        <hr className="w-full border-slate-100 my-8" />

                        <div className="w-full space-y-4">
                            <div className="flex items-center gap-3 text-left">
                                <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                                    <User size={18} className="text-slate-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contato</p>
                                    <p className="text-sm font-bold text-slate-700 truncate">{company.contact_name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-left">
                                <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                                    <Mail size={18} className="text-slate-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                                    <p className="text-sm font-bold text-slate-700 truncate">{company.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-left">
                                <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                                    <Phone size={18} className="text-slate-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone</p>
                                    <p className="text-sm font-bold text-slate-700">{company.phone}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-sm">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">MTTR (Média de Resolução)</p>
                                <h4 className="text-lg font-black text-slate-900">{mttr.label}</h4>
                                <p className="text-[10px] text-slate-400 font-semibold">{completedOrders} OS concluída{completedOrders !== 1 ? 's' : ''}</p>
                            </div>
                            <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Clock size={20} className="text-blue-600" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-sm">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Concluídas no Mês</p>
                                <h4 className="text-lg font-black text-slate-900">{completedThisMonth}</h4>
                                <p className="text-[10px] text-slate-400 font-semibold">{months[new Date().getMonth()]} {new Date().getFullYear()}</p>
                            </div>
                            <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                <CheckCircle size={20} className="text-emerald-600" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-sm">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avaliação do Cliente</p>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-black text-slate-900">{avgRating.count > 0 ? avgRating.value : '—'}</h4>
                                    <div className="flex text-amber-400">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star
                                                key={star}
                                                size={14}
                                                fill={star <= Math.round(avgRating.value) ? 'currentColor' : 'none'}
                                                className={star <= Math.round(avgRating.value) ? '' : 'opacity-30'}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 font-semibold">{avgRating.count} avaliação{avgRating.count !== 1 ? 'ões' : ''}</p>
                            </div>
                            <div className="size-10 rounded-xl bg-amber-50 flex items-center justify-center">
                                <Star size={20} className="text-amber-500" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 space-y-8">
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-200/50">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                    <CalendarIcon size={20} className="text-blue-600" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900">Cronograma de Atendimentos</h3>
                            </div>

                            <div className="flex items-center gap-4 bg-slate-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setSelectedMonth(prev => prev === 0 ? 11 : prev - 1)}
                                    className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-900 shadow-sm"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-xs font-black text-slate-900 uppercase tracking-widest min-w-[120px] text-center">
                                    {months[selectedMonth]} {selectedYear}
                                </span>
                                <button
                                    onClick={() => setSelectedMonth(prev => prev === 11 ? 0 : prev + 1)}
                                    className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-900 shadow-sm"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="border border-slate-100 rounded-3xl overflow-visible shadow-inner-white">
                            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                    <div key={day} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 auto-rows-[100px]">
                                {(() => {
                                    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
                                    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                                    const days = [];

                                    for (let i = 0; i < firstDay; i++) {
                                        days.push(<div key={`empty-${i}`} className="p-3 border-r border-b border-slate-50 bg-slate-50/30"></div>);
                                    }

                                    for (let d = 1; d <= daysInMonth; d++) {
                                        const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                        const dayOrders = workOrders.filter(o =>
                                            o.scheduled_start?.startsWith(dateStr) ||
                                            (o.created_at?.startsWith(dateStr) && !o.scheduled_start)
                                        );

                                        days.push(
                                            <div key={d} className="p-3 border-r border-b border-slate-50 relative group/cell hover:bg-slate-50/50 transition-all">
                                                <span className={`text-xs font-bold ${new Date().toISOString().startsWith(dateStr)
                                                    ? 'size-6 flex items-center justify-center bg-blue-600 text-white rounded-lg -mt-1 -ml-1'
                                                    : 'text-slate-400'
                                                    }`}>
                                                    {d}
                                                </span>
                                                <div className="mt-2 space-y-1 text-left">
                                                    {dayOrders.map(order => {
                                                        const colors = STATUS_COLORS[order.status] || STATUS_COLORS['Pendente'];
                                                        return (
                                                            <div
                                                                key={order.id}
                                                                className={`h-4 ${colors.bgColor} ${colors.borderColor} border rounded-md flex items-center px-1.5 overflow-visible cursor-pointer hover:brightness-95 transition-all relative group/badge`}
                                                                onClick={() => navigate(`/work-orders/${order.id}`)}
                                                            >
                                                                <span className={`text-[8px] font-black ${colors.color} truncate uppercase`}>
                                                                    #{order.order_number}
                                                                </span>
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 opacity-0 invisible group-hover/badge:opacity-100 group-hover/badge:visible transition-all duration-200 z-50 pointer-events-none">
                                                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2.5 h-2.5 bg-white border-r border-b border-slate-200"></div>
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-[10px] font-black text-blue-600 uppercase">#{order.order_number}</span>
                                                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${colors.bgColor} ${colors.color} ${colors.borderColor} border`}>{order.status}</span>
                                                                    </div>
                                                                    <p className="text-xs font-bold text-slate-800 mb-2 line-clamp-2">{order.title || order.issue || 'Sem título'}</p>
                                                                    <div className="space-y-1">
                                                                        {order.asset_name && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Wrench size={10} className="text-slate-400 shrink-0" />
                                                                                <span className="text-[10px] text-slate-500 truncate">{order.asset_name}</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex items-center gap-1.5">
                                                                            <CalendarIcon size={10} className="text-slate-400 shrink-0" />
                                                                            <span className="text-[10px] text-slate-500">{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }

                                    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
                                    for (let i = firstDay + daysInMonth; i < totalCells; i++) {
                                        days.push(<div key={`empty-end-${i}`} className="p-3 border-r border-b border-slate-50 bg-slate-50/30"></div>);
                                    }

                                    return days;
                                })()}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                    <Clock size={20} className="text-indigo-600" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900">Ordens de Serviço Ativas</h3>
                            </div>
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest italic">{todayTasks.length} Pendentes</span>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {todayTasks.slice(0, 5).map(order => (
                                <div
                                    key={order.id}
                                    className={`bg-white rounded-2xl border p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:border-blue-300 transition-all cursor-pointer group ${order.status === 'Concluído' ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}
                                    onClick={() => navigate(`/work-orders/${order.id}`)}
                                >
                                    <div className="flex gap-4 min-w-0">
                                        <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${order.status === 'Concluído' ? 'bg-emerald-100 text-emerald-600' :
                                            order.priority === 'Alta' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                                            }`}>
                                            {order.status === 'Concluído' ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1 text-left">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{order.order_number}</span>
                                                {(() => {
                                                    const statusColors = STATUS_COLORS[order.status] || STATUS_COLORS['Pendente'];
                                                    return (
                                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${statusColors.bgColor} ${statusColors.color}`}>
                                                            {order.status}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <h4 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate text-left">{order.title}</h4>
                                            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                <Wrench size={12} /> {order.asset_name || 'Geral'} • <Clock size={12} /> {new Date(order.created_at).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>

                                    <button className="px-5 py-2.5 bg-slate-50 group-hover:bg-blue-600 text-slate-400 group-hover:text-white border border-slate-200 group-hover:border-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap">
                                        Ver Detalhes
                                    </button>
                                </div>
                            ))}

                            {todayTasks.length === 0 && (
                                <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                                    <CheckCircle size={40} className="mx-auto text-slate-300 mb-3" />
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhuma tarefa pendente</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ThirdPartyModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleUpdateCompany}
                company={company}
            />
        </div>
    );
};

export default ThirdPartyProfile;

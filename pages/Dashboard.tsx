import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Box,
  ShieldCheck,
  AlertTriangle,
  Clock,
  PlusCircle,
  Star,
  Phone,
  Mail
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// --- Interfaces ---
interface TechnicianPerf {
  name: string;
  closed: number;
  open: number;
}

interface MachineDowntime {
  name: string;
  value: number;
  color: string;
}

interface TimelineEvent {
  machine: string;
  date: string;
  waitTime: number;
  execTime: number;
  orderNumber?: string;
  label?: string;
}

interface StrategicKPIs {
  availability: number;
  partsCost: number;
  laborCost: number;
  backlog: number;
  preventiveRatio: number;
}

interface DashboardKPIs {
  executive: StrategicKPIs;
  industrial: StrategicKPIs & { openCount: number };
  predial: StrategicKPIs & { openCount: number };
  others: StrategicKPIs & { openCount: number };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_root';
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'geral' | 'industrial' | 'predial' | 'outros'>('geral');
  const [kpis, setKpis] = useState<DashboardKPIs>({
    executive: { availability: 100, partsCost: 0, laborCost: 0, backlog: 0, preventiveRatio: 0 },
    industrial: { availability: 0, partsCost: 0, laborCost: 0, backlog: 0, preventiveRatio: 0, openCount: 0 },
    predial: { availability: 0, partsCost: 0, laborCost: 0, backlog: 0, preventiveRatio: 0, openCount: 0 },
    others: { availability: 0, partsCost: 0, laborCost: 0, backlog: 0, preventiveRatio: 0, openCount: 0 }
  });

  const [technicianData, setTechnicianData] = useState<TechnicianPerf[]>([]);
  const [indTechnicianData, setIndTechnicianData] = useState<TechnicianPerf[]>([]);
  const [preTechnicianData, setPreTechnicianData] = useState<TechnicianPerf[]>([]);
  const [otrTechnicianData, setOtrTechnicianData] = useState<TechnicianPerf[]>([]);

  const [downtimeData, setDowntimeData] = useState<MachineDowntime[]>([]);
  const [indDowntimeData, setIndDowntimeData] = useState<MachineDowntime[]>([]);
  const [preDowntimeData, setPreDowntimeData] = useState<MachineDowntime[]>([]);
  const [otrDowntimeData, setOtrDowntimeData] = useState<MachineDowntime[]>([]);

  const [timelineData, setTimelineData] = useState<TimelineEvent[]>([]);
  const [indTimelineData, setIndTimelineData] = useState<TimelineEvent[]>([]);
  const [preTimelineData, setPreTimelineData] = useState<TimelineEvent[]>([]);
  const [otrTimelineData, setOtrTimelineData] = useState<TimelineEvent[]>([]);

  const [otrTotalDowntime, setOtrTotalDowntime] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [allOpenOrders, setAllOpenOrders] = useState<any[]>([]);
  const [totalDowntime, setTotalDowntime] = useState(0);
  const [indTotalDowntime, setIndTotalDowntime] = useState(0);
  const [preTotalDowntime, setPreTotalDowntime] = useState(0);
  const [supportAdmins, setSupportAdmins] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: assetsData }, { data: allOrders }] = await Promise.all([
        supabase.from('assets').select('*'),
        supabase.from('work_orders')
          .select(`
            *,
            assets (*),
            technicians (name),
            third_party_companies (name)
          `)
          .gte('created_at', sixMonthsAgo)
          .order('date', { ascending: false })
      ]);

      if (!allOrders) return;
      let rawOrders = (allOrders as any[]) || [];
      const assets = (assetsData as any[]) || [];
      const assetMap = assets.reduce((acc, a) => ({ ...acc, [a.id]: a }), {});

      // --- Strict Filtering ---
      let filteredOrders = rawOrders;
      const isAdminRoot = user?.role === 'admin_root';
      const isCommonAdmin = user?.role === 'admin';

      const managedCats: string[] = [];
      if (user?.manage_equipment) managedCats.push('Equipamento', 'MÁQUINA');
      if (user?.manage_predial) managedCats.push('Predial', 'PREDIAL');
      if (user?.manage_others) managedCats.push('Outros', 'OUTROS');

      if (isAdminRoot) {
        filteredOrders = rawOrders;
      } else if (isCommonAdmin) {
        // Admin common (regional) sees ALL OS in their managed categories
        filteredOrders = rawOrders.filter(o =>
          managedCats.some(c => c.toUpperCase() === (o.maintenance_category || 'Equipamento').toUpperCase())
        );
      } else {
        // Common User sees ONLY THEIR OWN OS in their managed categories
        filteredOrders = rawOrders.filter(o =>
          o.requester_id === user?.id &&
          managedCats.some(c => c.toUpperCase() === (o.maintenance_category || 'Equipamento').toUpperCase())
        );
      }
      setOrders(filteredOrders);

      // --- KPI Calculations ---
      const calculateStats = (targetOrders: any[], periodHours: number, assetCount: number) => {
        const closed = targetOrders.filter(o => o.status === 'Concluído');
        const totRepair = closed.reduce((acc, o) => acc + (Number(o.repair_hours) || 0), 0);
        const mttr = closed.length > 0 ? totRepair / closed.length : 0;

        const downtime = targetOrders.reduce((acc, o) => {
          const start = new Date(o.created_at).getTime();
          const end = o.status === 'Concluído' ? new Date(o.resolved_at || o.updated_at).getTime() : Date.now();
          return acc + Math.max(Number(o.downtime_hours) || 0, (end - start) / 3600000);
        }, 0);

        const corrective = targetOrders.filter(o => (o.maintenance_type || '').toLowerCase().includes('corretiva'));
        const partsCost = targetOrders.reduce((acc, o) => acc + (Number(o.parts_cost) || 0), 0);
        const laborCost = targetOrders.reduce((acc, o) => acc + (o.third_party_company_id ? (Number(o.hourly_rate) || 0) * (Number(o.repair_hours) || 1) : 0), 0);
        const availability = assetCount > 0 ? ((periodHours * assetCount - downtime) / (periodHours * assetCount)) * 100 : 100;

        return { mttr, downtime, availability, partsCost, laborCost, correctiveCount: corrective.length };
      };

      const timeWindow = 30 * 24;
      const indOrders = filteredOrders.filter(o => (o.maintenance_category || '').toUpperCase() === 'MÁQUINA');
      const preOrders = filteredOrders.filter(o => (o.maintenance_category || '').toUpperCase() === 'PREDIAL');
      const otrOrders = filteredOrders.filter(o => (o.maintenance_category || '').toUpperCase() === 'OUTROS');

      const indStats = calculateStats(indOrders, timeWindow, assets.filter(a => a.categoria === 'MÁQUINA').length || 1);
      const preStats = calculateStats(preOrders, timeWindow, assets.filter(a => a.categoria === 'PREDIAL').length || 1);
      const otrStats = calculateStats(otrOrders, timeWindow, 1);

      setKpis({
        executive: {
          availability: (indStats.availability + preStats.availability + otrStats.availability) / 3,
          partsCost: indStats.partsCost + preStats.partsCost + otrStats.partsCost,
          laborCost: indStats.laborCost + preStats.laborCost + otrStats.laborCost,
          backlog: filteredOrders.filter(o => o.status !== 'Concluído').length,
          preventiveRatio: 85 // Mock or calculate
        },
        industrial: { ...indStats, backlog: indOrders.filter(o => o.status !== 'Concluído').length, preventiveRatio: 90, openCount: indOrders.filter(o => o.status !== 'Concluído').length },
        predial: { ...preStats, backlog: preOrders.filter(o => o.status !== 'Concluído').length, preventiveRatio: 80, openCount: preOrders.filter(o => o.status !== 'Concluído').length },
        others: { ...otrStats, backlog: otrOrders.filter(o => o.status !== 'Concluído').length, preventiveRatio: 70, openCount: otrOrders.filter(o => o.status !== 'Concluído').length }
      });

      setAllOpenOrders(filteredOrders.filter(o => o.status !== 'Concluído'));

      // --- Downtime & Timeline Logic ---
      const getDowntimeData = (ordersList: any[]) => {
        const map: Record<string, number> = {};
        ordersList.forEach(o => {
          const name = o.assets?.name || 'Desconhecido';
          map[name] = (map[name] || 0) + (Number(o.downtime_hours) || 0);
        });
        return Object.entries(map).map(([name, value], i) => ({
          name, value, color: ['#ef4444', '#f97316', '#3b82f6', '#10b981', '#6366f1'][i % 5]
        })).sort((a, b) => b.value - a.value).slice(0, 5);
      };

      setDowntimeData(getDowntimeData(filteredOrders));
      setIndDowntimeData(getDowntimeData(indOrders));
      setPreDowntimeData(getDowntimeData(preOrders));

      const getTimelineData = (ordersList: any[]) => {
        return ordersList.slice(0, 5).map(o => ({
          machine: o.assets?.name || '?',
          date: new Date(o.date).toLocaleDateString('pt-BR'),
          waitTime: Number(o.response_hours) || 2,
          execTime: Number(o.repair_hours) || 4,
          orderNumber: o.order_number,
          label: `#${o.order_number} ${o.assets?.name}`.substring(0, 20)
        }));
      };
      setTimelineData(getTimelineData(filteredOrders));
      setIndTimelineData(getTimelineData(indOrders));
      setPreTimelineData(getTimelineData(preOrders));

      // --- Technician Performance ---
      const getTechPerf = (ordersList: any[]) => {
        const map: Record<string, number> = {};
        ordersList.filter(o => o.status === 'Concluído').forEach(o => {
          const name = o.technicians?.name || o.third_party_companies?.name || 'Externo';
          map[name] = (map[name] || 0) + 1;
        });
        return Object.entries(map).map(([name, closed]) => ({ name, closed, open: 0 }))
          .sort((a, b) => b.closed - a.closed).slice(0, 5);
      };
      setTechnicianData(getTechPerf(filteredOrders));
      setIndTechnicianData(getTechPerf(indOrders));
      setPreTechnicianData(getTechPerf(preOrders));

      // --- Support Admins Fetch ---
      const { data: adminList } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin')
        .eq('status', 'active');

      if (adminList) {
        // Filter admins that match user's categories
        const matchingAdmins = adminList.filter(adm => {
          if (user?.manage_equipment && adm.manage_equipment) return true;
          if (user?.manage_predial && adm.manage_predial) return true;
          if (user?.manage_others && adm.manage_others) return true;
          return false;
        });
        setSupportAdmins(matchingAdmins);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold animate-pulse text-sm tracking-widest uppercase">Sincronizando Dados...</p>
      </div>
    );
  }

  // --- View Selection ---
  let viewKPIs = kpis.executive;
  let viewTechs = technicianData;
  let viewDowntime = downtimeData;
  let viewTimeline = timelineData;
  let viewOrders = allOpenOrders;
  let viewTitle = "Ordens de Serviço Abertas";

  if (activeTab === 'industrial') {
    viewKPIs = kpis.industrial as any;
    viewTechs = indTechnicianData;
    viewDowntime = indDowntimeData;
    viewTimeline = indTimelineData;
    viewOrders = allOpenOrders.filter(o => o.maintenance_category === 'MÁQUINA');
    viewTitle = "OS Abertas - Máquinas";
  } else if (activeTab === 'predial') {
    viewKPIs = kpis.predial as any;
    viewTechs = preTechnicianData;
    viewDowntime = preDowntimeData;
    viewTimeline = preTimelineData;
    viewOrders = allOpenOrders.filter(o => o.maintenance_category === 'PREDIAL');
    viewTitle = "OS Abertas - Predial";
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
            {isAdmin ? 'Controle de Manutenção' : 'Central de Serviços'}
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            {isAdmin ? 'Visão estratégica da planta.' : 'Acompanhe suas solicitações e suporte.'}
          </p>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistema</span>
            <div className="flex items-center gap-1.5">
              <span className="size-2 bg-primary rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black text-slate-700 uppercase">Online</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-100"></div>
          <div className="text-right">
            <p className="text-xs font-black text-slate-900">{new Date().toLocaleDateString('pt-BR')}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase">Sincronizado</p>
          </div>
        </div>
      </div>

      {!isAdmin ? (
        /* ================= SERVICE HUB (USER) ================= */
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-dark to-slate-900 rounded-3xl p-8 text-white shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Activity size={180} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                <h2 className="text-4xl font-black tracking-tight mb-3 italic">Olá, {user?.name?.split(' ')[0] || 'Abençoado'}!</h2>
                <p className="text-slate-300 text-lg max-w-md font-medium leading-relaxed">
                  Como podemos ajudar com a sua manutenção hoje?
                </p>
              </div>
              <button
                onClick={() => navigate('/work-orders/new')}
                className="bg-primary hover:bg-primary-hover text-slate-900 px-10 py-5 rounded-2xl font-black text-xl shadow-xl transition-all flex items-center gap-4 group"
              >
                <PlusCircle size={28} className="group-hover:rotate-90 transition-transform duration-500" />
                ABRIR CHAMADO
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* LAST ORDER TRACKER */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="text-primary" size={24} />
                    Última Solicitação
                  </h3>
                  {orders[0] && (
                    <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                      OS #{orders[0].order_number}
                    </span>
                  )}
                </div>

                {orders[0] ? (
                  <div className="space-y-8">
                    <div className="flex items-center gap-6">
                      <div className="size-20 bg-slate-50 rounded-2xl flex items-center justify-center text-primary shadow-inner border border-slate-100 transition-colors">
                        <Activity size={36} />
                      </div>
                      <div className="flex-1">
                        <p className="text-3xl font-black text-slate-900 leading-tight">{orders[0].assets?.name}</p>
                        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">
                          {orders[0].maintenance_category} • {orders[0].maintenance_type}
                        </p>
                      </div>
                      <span className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest border-2 ${orders[0].status === 'Aberto' ? 'border-orange-200 text-orange-600 bg-orange-50' :
                        orders[0].status === 'Em Manutenção' ? 'border-blue-200 text-blue-600 bg-blue-50 animate-pulse' :
                          'border-emerald-200 text-emerald-600 bg-emerald-50'
                        }`}>
                        {orders[0].status}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">
                        <span>Abertura</span>
                        <span>Equipe Notificada</span>
                        <span>Em Reparo</span>
                        <span>Finalizado</span>
                      </div>
                      <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-1 flex items-center shadow-inner ring-4 ring-slate-50">
                        <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-lg ${orders[0].status === 'Concluído' ? 'w-full bg-emerald-500' :
                          orders[0].status === 'Em Manutenção' ? 'w-[75%] bg-blue-500' :
                            'w-[25%] bg-orange-500'
                          }`}></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 flex flex-col items-center opacity-50">
                    <Box size={40} className="text-slate-300 mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Nenhuma solicitação ativa</p>
                  </div>
                )}
              </div>

              {/* QUICK STATS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-8 group hover:border-orange-200 transition-all">
                  <div className="size-20 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 shadow-sm">
                    <AlertTriangle size={36} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Meus Chamados</h4>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter">
                      {orders.filter(o => o.status !== 'Concluído').length}
                      <span className="text-sm font-bold text-slate-400 ml-2 uppercase tracking-normal">Abertos</span>
                    </p>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-8 group hover:border-emerald-200 transition-all">
                  <div className="size-20 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                    <ShieldCheck size={36} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">MTTR Médio</h4>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter">
                      {viewKPIs.mttr?.toFixed(1) || '0.8'}<span className="text-sm font-bold text-slate-400 ml-1">h</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* PERFORMANCE */}
              <div className="bg-gradient-to-br from-indigo-600 to-blue-800 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <Star size={180} />
                </div>
                <h3 className="text-xl font-black mb-1">Dica de Hoje</h3>
                <p className="text-blue-100 text-sm font-medium mb-8 leading-relaxed">Sempre anexe uma foto do componente para acelerar o diagnóstico técnico.</p>
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10">
                  <ShieldCheck size={16} className="text-emerald-400" /> Sistema Seguro
                </div>
              </div>

              {/* CONTACTS */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-8 border-b border-slate-100 pb-4">Suporte Direto</h4>
                <div className="space-y-6">
                  {supportAdmins.length > 0 ? (
                    supportAdmins.map((adm, idx) => (
                      <div key={adm.id} className="space-y-6 pt-4 first:pt-0 border-t first:border-0 border-slate-50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-md">
                            {adm.name}
                          </span>
                        </div>
                        {adm.phone && (
                          <a href={`https://wa.me/${adm.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-5 group cursor-pointer no-underline">
                            <div className="size-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                              <Phone size={24} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</p>
                              <p className="text-sm font-black text-slate-700">{adm.phone}</p>
                            </div>
                          </a>
                        )}
                        <a href={`mailto:${adm.email}`} className="flex items-center gap-5 group cursor-pointer no-underline">
                          <div className="size-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                            <Mail size={24} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                            <p className="text-sm font-black text-slate-700">{adm.email}</p>
                          </div>
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 opacity-50">
                      <p className="text-xs font-bold text-slate-400">Nenhum gestor ativo para suas categorias.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Atendimentos Recentes</h3>
              <button onClick={() => navigate('/work-orders')} className="text-primary font-black text-xs uppercase tracking-widest hover:underline">Ver Todos →</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 border-b border-slate-100 uppercase tracking-widest">OS #</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 border-b border-slate-100 uppercase tracking-widest">Ativo / Máquina</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 border-b border-slate-100 uppercase tracking-widest text-center">Status</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 border-b border-slate-100 uppercase tracking-widest text-right">Abertura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {orders.slice(0, 5).map(o => (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/work-orders/${o.id}`)}>
                      <td className="px-8 py-6 font-black text-primary">#{o.order_number}</td>
                      <td className="px-8 py-6">
                        <p className="text-slate-900 font-black">{o.assets?.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase">{o.maintenance_category}</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${o.status === 'Concluído' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                          }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right text-slate-400 font-mono text-xs">{new Date(o.date).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ================= ADMIN DASHBOARD ================= */
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 p-1 bg-slate-100/50 rounded-xl border border-slate-200 self-start">
            {[
              { id: 'geral', label: 'Visão Executiva', icon: <ShieldCheck size={16} /> },
              { id: 'industrial', label: 'Máquinas', icon: <Activity size={16} /> },
              { id: 'predial', label: 'Predial', icon: <ShieldCheck size={16} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-bold uppercase transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPIItem title="Disponibilidade" value={`${viewKPIs.availability.toFixed(1)}%`} sub={viewKPIs.availability > 90 ? 'ÓTIMO' : 'RISCO'} icon={<Activity size={40} />} color={viewKPIs.availability > 90 ? 'text-primary' : 'text-red-500'} />
            <KPIItem title="Custo Peças" value={`R$ ${viewKPIs.partsCost.toLocaleString()}`} sub="Acumulado Mês" icon={<Box size={40} />} />
            <KPIItem title="Mão de Obra" value={`R$ ${viewKPIs.laborCost.toLocaleString()}`} sub="Terceiros/Horas" icon={<ShieldCheck size={40} />} />
            <KPIItem title="Backlog" value={viewKPIs.backlog} sub="OS Abertas" icon={<AlertTriangle size={40} />} color="text-orange-600" />
            <KPIItem title="Eficiência" value={`${viewKPIs.preventiveRatio}%`} sub="Preventivas" icon={<Activity size={40} />} color="text-primary" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6"><AlertCircle className="text-red-500" size={20} /> Horas Paradas</h3>
              <div className="space-y-4">
                {viewDowntime.map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-slate-700">{item.name}</span>
                      <span className="font-black text-slate-900">{item.value}h</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(item.value, 100)}%`, backgroundColor: item.color }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6"><Activity className="text-primary" size={20} /> Espera vs Execução</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={viewTimeline} layout="vertical">
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <Tooltip />
                    <Bar dataKey="waitTime" stackId="a" fill="#f97316" radius={[4, 0, 0, 4]} barSize={12} />
                    <Bar dataKey="execTime" stackId="a" fill="#00df82" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{viewTitle}</h3>
              <button onClick={() => navigate('/work-orders')} className="text-primary font-bold text-sm">Ver todas →</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 font-black text-slate-400 uppercase">OS #</th>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase">Ativo</th>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-center">Status</th>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-right">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewOrders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/work-orders/${o.id}`)}>
                      <td className="px-6 py-4 font-black text-primary">#{o.order_number}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{o.assets?.name}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${o.status === 'Aberto' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400">{new Date(o.date).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Helper Components ---
const KPIItem = ({ title, value, sub, icon, color = "text-slate-900" }: any) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">{icon}</div>
    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
    <h3 className={`text-2xl font-black tracking-tighter ${color}`}>{value}</h3>
    <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase">{sub}</p>
  </div>
);

export default Dashboard;
import React, { useEffect, useState, useCallback } from 'react';
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
  Mail,
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  ArrowUpRight,
  Wrench,
  Timer,
  CheckCircle2,
  CircleDot,
  FileText,
  Download,
  CalendarDays,
  Shield,
  BookOpen,
  FileSearch,
  LifeBuoy
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend } from 'recharts';
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
  [key: string]: any;
}

interface DashboardKPIs {
  executive: StrategicKPIs;
  industrial: StrategicKPIs & { openCount: number };
  predial: StrategicKPIs & { openCount: number };
  others: StrategicKPIs & { openCount: number };
}

interface PredictedFailure {
  assetId: string;
  assetName: string;
  category: string;
  predictedDate: string;
  daysRemaining: number;
  urgency: 'low' | 'medium' | 'high';
}

// --- Helpers ---
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const getGreetingEmoji = () => {
  const h = new Date().getHours();
  if (h < 12) return '☀️';
  if (h < 18) return '🌤️';
  return '🌙';
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_root';
  const isAdminRoot = user?.role === 'admin_root';

  // Define default tab based on permissions
  const getDefaultTab = () => {
    if (isAdminRoot) return 'geral';
    if (user?.manage_equipment) return 'industrial';
    if (user?.manage_predial) return 'predial';
    return 'geral';
  };

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'geral' | 'industrial' | 'predial' | 'outros'>(getDefaultTab());
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
  const [predictedFailures, setPredictedFailures] = useState<PredictedFailure[]>([]);

  // Category Matching Helper - Normalizes text for comparison (no accents, uppercase)
  const isCategory = useCallback((val: string, type: 'IND' | 'PRE' | 'OTR') => {
    const norm = (val || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
    if (type === 'IND') return ['EQUIPAMENTO', 'MAQUINA', 'INDUSTRIAL', 'MECANICA'].includes(norm);
    if (type === 'PRE') return ['PREDIAL', 'INFRAESTRUTURA', 'PREDIO'].includes(norm);
    if (type === 'OTR') return norm === 'OUTROS';
    return false;
  }, []);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

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
      // Filtramos globalmente OS Canceladas ou com flag de exclusão (se houvesse)
      let rawOrders = (allOrders as any[] || []).filter(o => o.status !== 'Cancelado');
      const assets = (assetsData as any[]) || [];
      const assetMap = assets.reduce((acc, a) => ({ ...acc, [a.id]: a }), {});

      // --- Strict Filtering ---
      let filteredOrders = rawOrders;
      const isAdminRoot = user?.role === 'admin_root';
      const isCommonAdmin = user?.role === 'admin';

      if (isAdminRoot) {
        filteredOrders = rawOrders;
      } else {
        filteredOrders = rawOrders.filter(o => {
          const cat = o.maintenance_category || 'Equipamento';
          const canManageEquip = user?.manage_equipment && isCategory(cat, 'IND');
          const canManagePred = user?.manage_predial && isCategory(cat, 'PRE');
          const canManageOthers = user?.manage_others && isCategory(cat, 'OTR');

          if (isCommonAdmin) return canManageEquip || canManagePred || canManageOthers;

          // Technical User (Technician/Requester)
          return o.requester_id === user?.id && (canManageEquip || canManagePred || canManageOthers);
        });
      }
      setOrders(filteredOrders);

      // --- KPI Calculations ---
      const calculateStats = (targetOrders: any[], periodHours: number, assetCount: number) => {
        const closed = targetOrders.filter(o => o.status === 'Concluído');
        const totRepair = closed.reduce((acc, o) => acc + (Number(o.repair_hours) || 0), 0);
        const mttr = closed.length > 0 ? totRepair / closed.length : 0;

        const downtime = targetOrders.reduce((acc, o) => {
          const manualHours = Number(o.downtime_hours);
          if (manualHours > 0) return acc + manualHours;

          // Se a OS está aberta (independente de ser Corretiva ou Preventiva), consideramos a máquina parada
          const isPending = !['Concluído', 'Cancelado'].includes(o.status);

          if (isPending) {
            const start = new Date(o.created_at).getTime();
            const now = Date.now();
            return acc + Math.max(0, (now - start) / 3600000);
          }
          return acc;
        }, 0);

        const corrective = targetOrders.filter(o => (o.maintenance_type || '').toLowerCase().includes('corretiva'));
        const preventive = targetOrders.filter(o => (o.maintenance_type || '').toLowerCase().includes('preventiva'));

        const partsCost = targetOrders.reduce((acc, o) => acc + (Number(o.parts_cost) || Number(o.manual_parts_cost) || 0), 0);
        const laborCost = targetOrders.reduce((acc, o) => {
          return acc + (Number(o.labor_cost) || 0);
        }, 0);

        const availability = assetCount > 0 ? Math.max(0, Math.min(100, ((periodHours * assetCount - downtime) / (periodHours * assetCount)) * 100)) : 100;
        const preventiveRatio = targetOrders.length > 0 ? Math.round((preventive.length / targetOrders.length) * 100) : 0;

        return { mttr, downtime, availability, partsCost, laborCost, correctiveCount: corrective.length, preventiveRatio };
      };

      const timeWindow = 30 * 24;
      const kpiCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime();

      // Para os KPIs (Custo, Disponibilidade, MTTR), usamos apenas dados dos últimos 30 dias
      const indOrdersKpi = filteredOrders.filter(o => isCategory(o.maintenance_category, 'IND') && new Date(o.created_at).getTime() > kpiCutoff);
      const preOrdersKpi = filteredOrders.filter(o => isCategory(o.maintenance_category, 'PRE') && new Date(o.created_at).getTime() > kpiCutoff);
      const otrOrdersKpi = filteredOrders.filter(o => isCategory(o.maintenance_category, 'OTR') && new Date(o.created_at).getTime() > kpiCutoff);

      // Mas para a lista total e gráficos de histórico, usamos tudo (6 meses)
      const indOrdersAll = filteredOrders.filter(o => isCategory(o.maintenance_category, 'IND'));
      const preOrdersAll = filteredOrders.filter(o => isCategory(o.maintenance_category, 'PRE'));
      const otrOrdersAll = filteredOrders.filter(o => isCategory(o.maintenance_category, 'OTR'));

      const indAssetCount = assets.filter(a => isCategory(a.category, 'IND')).length || 1;
      const preAssetCount = assets.filter(a => isCategory(a.category, 'PRE')).length || 1;

      const indStats = calculateStats(indOrdersKpi, timeWindow, indAssetCount);
      const preStats = calculateStats(preOrdersKpi, timeWindow, preAssetCount);
      const otrStats = calculateStats(otrOrdersKpi, timeWindow, 1);

      setKpis({
        executive: {
          availability: (indStats.availability + preStats.availability + otrStats.availability) / 3,
          partsCost: indStats.partsCost + preStats.partsCost + otrStats.partsCost,
          laborCost: indStats.laborCost + preStats.laborCost + otrStats.laborCost,
          backlog: filteredOrders.filter(o => o.status !== 'Concluído').length,
          preventiveRatio: Math.round((indStats.preventiveRatio + preStats.preventiveRatio) / 2)
        },
        industrial: { ...indStats, backlog: indOrdersAll.filter(o => o.status !== 'Concluído').length, openCount: indOrdersAll.filter(o => o.status !== 'Concluído').length },
        predial: { ...preStats, backlog: preOrdersAll.filter(o => o.status !== 'Concluído').length, openCount: preOrdersAll.filter(o => o.status !== 'Concluído').length },
        others: { ...otrStats, backlog: otrOrdersAll.filter(o => o.status !== 'Concluído').length, openCount: otrOrdersAll.filter(o => o.status !== 'Concluído').length }
      });

      setAllOpenOrders(filteredOrders.filter(o => o.status !== 'Concluído'));

      // --- Downtime & Timeline Logic (Usa o histórico completo de 6 meses para contexto) ---
      const getDowntimeData = (ordersList: any[]) => {
        const now = Date.now();
        const map: Record<string, number> = {};
        ordersList.forEach(o => {
          const name = o.assets?.name || 'Desconhecido';
          let hours = Number(o.downtime_hours) || 0;

          const isPending = !['Concluído', 'Cancelado'].includes(o.status);

          // Se estiver aberta, calculamos o tempo real independente do tipo
          if (hours === 0 && isPending) {
            const start = new Date(o.created_at).getTime();
            hours = Math.max(0, (now - start) / 3600000);
          }

          map[name] = (map[name] || 0) + hours;
        });
        const colors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6'];
        return Object.entries(map)
          .map(([name, value], i) => ({
            name, value: Number(value.toFixed(1)), color: colors[i % colors.length]
          }))
          .filter(item => item.value > 0.1) // Só mostra impactos relevantes
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
      };

      setDowntimeData(getDowntimeData(filteredOrders.filter(o => o.status !== 'Concluído')));
      setIndDowntimeData(getDowntimeData(indOrdersAll.filter(o => o.status !== 'Concluído')));
      setPreDowntimeData(getDowntimeData(preOrdersAll.filter(o => o.status !== 'Concluído')));

      const getTimelineData = (ordersList: any[]) => {
        const now = Date.now();
        // Focamos apenas nas OS que ainda estão em processamento ou aguardando
        const activeOrders = ordersList.filter(o => !['Concluído', 'Cancelado'].includes(o.status));

        return activeOrders.slice(0, 5).map(o => {
          const start = new Date(o.created_at || o.date).getTime();
          const resp = o.responded_at ? new Date(o.responded_at).getTime() : null;
          const solved = o.resolved_at ? new Date(o.resolved_at).getTime() : null;

          let waitTime = 0;
          let execTime = 0;

          if (resp) {
            waitTime = Math.max(0.1, (resp - start) / 3600000);
            if (solved) {
              execTime = Math.max(0.1, (solved - resp) / 3600000);
            } else if (o.status === 'Em Manutenção') {
              execTime = Math.max(0.1, (now - resp) / 3600000);
            }
          } else {
            // Se ainda não foi respondida, todo o tempo é espera
            waitTime = Math.max(0.1, (now - start) / 3600000);
          }

          return {
            machine: o.assets?.name || '?',
            date: new Date(o.date).toLocaleDateString('pt-BR'),
            waitTime: Number(o.response_hours) || waitTime,
            execTime: Number(o.repair_hours) || execTime,
            orderNumber: o.order_number,
            label: `#${o.order_number} ${o.assets?.name}`.substring(0, 20)
          };
        });
      };
      setTimelineData(getTimelineData(filteredOrders));
      setIndTimelineData(getTimelineData(indOrdersAll));
      setPreTimelineData(getTimelineData(preOrdersAll));

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
      setIndTechnicianData(getTechPerf(indOrdersAll));
      setPreTechnicianData(getTechPerf(preOrdersAll));

      // --- Support Admins Fetch ---
      const { data: adminList } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin')
        .eq('status', 'active');

      if (adminList) {
        const matchingAdmins = adminList.filter(adm => {
          if (user?.manage_equipment && adm.manage_equipment) return true;
          if (user?.manage_predial && adm.manage_predial) return true;
          if (user?.manage_others && adm.manage_others) return true;
          return false;
        });
        setSupportAdmins(matchingAdmins);
      }

      // --- Predictive Analysis Logic ---
      const predictions: PredictedFailure[] = [];
      const correctiveOrders = rawOrders.filter(o =>
        (o.maintenance_type || '').toLowerCase().includes('corretiva') &&
        o.status === 'Concluído'
      );

      const assetsWithOrders = Array.from(new Set(correctiveOrders.map(o => o.asset_id)));

      assetsWithOrders.forEach(aid => {
        const assetOrders = correctiveOrders
          .filter(o => o.asset_id === aid)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (assetOrders.length >= 2) {
          let totalInterval = 0;
          for (let i = 1; i < assetOrders.length; i++) {
            totalInterval += new Date(assetOrders[i].date).getTime() - new Date(assetOrders[i - 1].date).getTime();
          }
          const avgInterval = totalInterval / (assetOrders.length - 1);
          const lastOrderDate = new Date(assetOrders[assetOrders.length - 1].date).getTime();
          const nextPredictedDate = lastOrderDate + avgInterval;

          const daysRemaining = Math.ceil((nextPredictedDate - Date.now()) / (1000 * 60 * 60 * 24));

          if (daysRemaining <= 10 && daysRemaining > -30) {
            predictions.push({
              assetId: aid,
              assetName: assetOrders[0].assets?.name || 'Desconhecido',
              category: assetOrders[0].maintenance_category,
              predictedDate: new Date(nextPredictedDate).toLocaleDateString('pt-BR'),
              daysRemaining,
              urgency: daysRemaining <= 3 ? 'high' : daysRemaining <= 7 ? 'medium' : 'low'
            });
          }
        }
      });

      setPredictedFailures(predictions.sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 4));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="relative">
          <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap size={20} className="text-primary animate-pulse" />
          </div>
        </div>
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
    viewOrders = allOpenOrders.filter(o => isCategory(o.maintenance_category, 'IND'));
    viewTitle = "OS Abertas - Máquinas";
  } else if (activeTab === 'predial') {
    viewKPIs = kpis.predial as any;
    viewTechs = preTechnicianData;
    viewDowntime = preDowntimeData;
    viewTimeline = preTimelineData;
    viewOrders = allOpenOrders.filter(o => isCategory(o.maintenance_category, 'PRE'));
    viewTitle = "OS Abertas - Predial";
  }

  // Filter Predicted Failures by Active Tab
  const viewPredictions = predictedFailures.filter(fail => {
    if (activeTab === 'industrial') return isCategory(fail.category, 'IND');
    if (activeTab === 'predial') return isCategory(fail.category, 'PRE');
    return true; // Visão Executiva shows all
  });

  const totalCost = viewKPIs.partsCost + viewKPIs.laborCost;

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">{getGreetingEmoji()}</span>
            <div className="flex flex-col">
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                {`${getGreeting()}, ${user?.name?.split(' ')[0] || 'Usuário'}`}
              </h1>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1 pl-0.5">
                {user?.role === 'admin_root' ? 'Admin Root' :
                  user?.role === 'admin' ? 'Administrador de OS' :
                    'Usuário / Solicitante'}
              </span>
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium pl-10">
            {isAdmin ? 'Sua visão estratégica da planta em tempo real.' : 'Acompanhe suas solicitações e suporte.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => navigate('/reports')}
              className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 hover:shadow-md active:scale-[0.97]"
            >
              <FileText size={16} />
              Relatórios
            </button>
          )}
          <div className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistema</span>
              <div className="flex items-center gap-1.5">
                <span className="size-2 bg-primary rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black text-slate-700 uppercase">Online</span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200/60"></div>
            <div className="text-right">
              <p className="text-xs font-black text-slate-900">{new Date().toLocaleDateString('pt-BR')}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Sincronizado</p>
            </div>
          </div>
        </div>
      </div>

      {!isAdmin ? (
        /* ================= SERVICE HUB (USER) ================= */
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* HERO CARD — Glassmorphism */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-10 text-white shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent"></div>
            <div className="absolute top-0 right-0 p-8 opacity-[0.07] pointer-events-none">
              <Activity size={220} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                <p className="text-primary font-black text-sm uppercase tracking-widest mb-2">{getGreeting()} {getGreetingEmoji()}</p>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-3">{user?.name?.split(' ')[0] || 'Abençoado'}!</h2>
                <p className="text-slate-400 text-lg max-w-md font-medium leading-relaxed">
                  Como podemos ajudar com a sua manutenção hoje?
                </p>
              </div>
              <button
                onClick={() => navigate('/work-orders/new')}
                className="bg-primary hover:bg-primary-hover text-slate-900 px-10 py-5 rounded-2xl font-black text-xl shadow-xl hover:shadow-primary/25 transition-all flex items-center gap-4 group hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlusCircle size={28} className="group-hover:rotate-90 transition-transform duration-500" />
                ABRIR CHAMADO
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* LAST ORDER TRACKER */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
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
                      <div className="size-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center text-primary shadow-inner border border-primary/10 transition-colors">
                        <Activity size={36} />
                      </div>
                      <div className="flex-1">
                        <p className="text-3xl font-black text-slate-900 leading-tight">{orders[0].assets?.name}</p>
                        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">
                          {orders[0].maintenance_category} • {orders[0].maintenance_type}
                        </p>
                      </div>
                      <StatusBadge status={orders[0].status} />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">
                        <span>Abertura</span>
                        <span>Equipe Notificada</span>
                        <span>Em Reparo</span>
                        <span>Finalizado</span>
                      </div>
                      <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-1 flex items-center shadow-inner ring-4 ring-slate-50">
                        <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-lg ${orders[0].status === 'Concluído' ? 'w-full bg-gradient-to-r from-emerald-400 to-emerald-500' :
                          orders[0].status === 'Em Manutenção' ? 'w-[75%] bg-gradient-to-r from-blue-400 to-blue-500' :
                            'w-[25%] bg-gradient-to-r from-orange-400 to-orange-500'
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
                <QuickStatCard
                  icon={<AlertTriangle size={32} />}
                  iconBg="bg-orange-50"
                  iconColor="text-orange-500"
                  hoverBorder="hover:border-orange-200"
                  title="Meus Chamados"
                  value={orders.filter(o => o.status !== 'Concluído').length}
                  suffix="Abertos"
                />
                <QuickStatCard
                  icon={<Timer size={32} />}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-500"
                  hoverBorder="hover:border-emerald-200"
                  title="MTTR Médio"
                  value={viewKPIs.mttr?.toFixed(1) || '0.8'}
                  suffix="h"
                />
              </div>
            </div>

            <div className="space-y-8">
              {/* TIP OF THE DAY */}
              <div className="bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-800 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
                <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <Star size={180} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-black mb-1">Dica de Hoje</h3>
                  <p className="text-blue-100 text-sm font-medium mb-8 leading-relaxed">Sempre anexe uma foto do componente para acelerar o diagnóstico técnico.</p>
                  <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10">
                    <ShieldCheck size={16} className="text-emerald-400" /> Sistema Seguro
                  </div>
                </div>
              </div>

              {/* CONTACTS */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-8 border-b border-slate-100 pb-4">Suporte Direto</h4>
                <div className="space-y-6">
                  {supportAdmins.length > 0 ? (
                    supportAdmins.map((adm) => (
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

              {/* KNOWLEDGE CENTER */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <BookOpen size={120} />
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-8 border-b border-slate-100 pb-4">Centro de Excelência</h4>
                <div className="grid grid-cols-2 gap-4">
                  <button className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-primary/5 hover:border-primary/20 transition-all group">
                    <BookOpen size={32} className="text-primary mb-3 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Manuais</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-primary/5 hover:border-primary/20 transition-all group">
                    <FileSearch size={32} className="text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">POPs</span>
                  </button>
                  <button className="col-span-2 flex items-center justify-center gap-4 p-5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-md group">
                    <LifeBuoy size={24} className="text-primary group-hover:rotate-45 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest">Base de Conhecimento FAQ</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RECENT ORDERS TABLE */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Atendimentos Recentes</h3>
              <button onClick={() => navigate('/work-orders')} className="text-primary font-black text-xs uppercase tracking-widest hover:underline flex items-center gap-1">
                Ver Todos <ArrowUpRight size={14} />
              </button>
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
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => navigate(`/work-orders/${o.id}`)}>
                      <td className="px-8 py-6 font-black text-primary">#{o.order_number}</td>
                      <td className="px-8 py-6">
                        <p className="text-slate-900 font-black">{o.assets?.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase">{o.maintenance_category}</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <StatusBadge status={o.status} />
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
          {/* TABS — Role Based Filtering */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/60 backdrop-blur-sm rounded-2xl border border-slate-200/80 self-start">
            {[
              { id: 'geral', label: 'Visão Executiva', icon: <BarChart3 size={16} />, visible: isAdminRoot },
              { id: 'industrial', label: 'Máquinas', icon: <Wrench size={16} />, visible: isAdminRoot || user?.manage_equipment },
              { id: 'predial', label: 'Predial', icon: <ShieldCheck size={16} />, visible: isAdminRoot || user?.manage_predial }
            ].filter(t => t.visible).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold uppercase transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* SUMMARY STRIP — Vibrant Pro Edition */}
          <div className="bg-gradient-to-r from-emerald-600 via-primary to-emerald-500 rounded-[2rem] p-5 flex flex-wrap items-center justify-between gap-4 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="size-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 backdrop-blur-sm group-hover:scale-110 transition-transform">
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest opacity-80">Painel de Controle</p>
                <p className="text-sm font-bold text-white leading-tight">
                  <span className="text-white font-black">{(viewKPIs as any).openCount || viewKPIs.backlog}</span> OS abertas •
                  <span className="text-white font-black ml-1">R$ {totalCost.toLocaleString()}</span> acumulado no mês
                </p>
              </div>
            </div>

            <div className="flex items-center gap-8 pr-4 relative z-10">
              <div className="text-right">
                <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest leading-none mb-1 opacity-70">Disponibilidade</p>
                <p className="text-xl font-black text-white leading-none">{(viewKPIs as any).availability?.toFixed(1) || '88'}%</p>
              </div>
              <div className="h-10 w-px bg-white/20"></div>
              <div className="text-right">
                <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest leading-none mb-1 opacity-70">Preventivas</p>
                <p className="text-xl font-black text-white leading-none">{(viewKPIs as any).prevCompliance?.toFixed(0) || '85'}%</p>
              </div>
            </div>
          </div>

          {/* KPI CARDS — Premium */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard
              title="Disponibilidade"
              value={`${viewKPIs.availability.toFixed(1)}%`}
              sub={`${viewKPIs.availability > 90 ? 'ÓTIMO' : viewKPIs.availability > 75 ? 'ATENÇÃO' : 'CRÍTICO'} • 30 DIAS`}
              icon={<Activity size={36} />}
              trend={viewKPIs.availability > 90 ? 'up' : 'down'}
              accentColor={viewKPIs.availability > 90 ? 'emerald' : viewKPIs.availability > 75 ? 'orange' : 'red'}
            />
            <KPICard
              title="Custo Peças"
              value={`R$ ${viewKPIs.partsCost.toLocaleString()}`}
              sub="Acumulado Mês"
              icon={<Box size={36} />}
              accentColor="blue"
            />
            <KPICard
              title="Mão de Obra"
              value={`R$ ${viewKPIs.laborCost.toLocaleString()}`}
              sub="Terceiros • Mês"
              icon={<Wrench size={36} />}
              accentColor="violet"
            />
            <KPICard
              title="Backlog"
              value={viewKPIs.backlog}
              sub="OS Abertas"
              icon={<AlertTriangle size={36} />}
              trend={viewKPIs.backlog > 10 ? 'down' : 'up'}
              accentColor="orange"
            />
            <KPICard
              title="Eficiência"
              value={`${viewKPIs.preventiveRatio}%`}
              sub="Preventivas • Mês"
              icon={<CheckCircle2 size={36} />}
              trend="up"
              accentColor="emerald"
            />
          </div>

          {/* CHARTS */}
          {/* PREDICTIVE ANALYSIS WIDGET */}
          {isAdmin && viewPredictions.length > 0 && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white border border-slate-700 shadow-xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <Shield size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black flex items-center gap-2">
                      <Zap className="text-primary" size={20} /> Análise Preditiva IA
                    </h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Tendência de falhas baseada no histórico</p>
                  </div>
                  <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20">Ativo</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {viewPredictions.map(fail => (
                    <div key={fail.assetId} className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all group/item">
                      <div className="flex justify-between items-start mb-3">
                        <div className={`size-8 rounded-lg flex items-center justify-center ${fail.urgency === 'high' ? 'bg-red-500/20 text-red-400' :
                          fail.urgency === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-primary/20 text-primary'
                          }`}>
                          <AlertTriangle size={16} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${fail.urgency === 'high' ? 'bg-red-500 text-white' :
                          fail.urgency === 'medium' ? 'bg-amber-500 text-white' :
                            'bg-primary text-slate-900'
                          }`}>
                          {fail.daysRemaining <= 0 ? 'ATRASO' : `${fail.daysRemaining} DIAS`}
                        </span>
                      </div>
                      <p className="text-sm font-black truncate">{fail.assetName}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold mt-1 tracking-wider">{fail.category}</p>
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Previsão</span>
                        <span className="text-[11px] font-bold text-white">{fail.predictedDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* DOWNTIME */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="text-red-500" size={20} /> Horas Paradas
                </h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg">Top 5</span>
              </div>
              <div className="space-y-4">
                {viewDowntime.length > 0 ? viewDowntime.map((item, i) => {
                  const maxVal = Math.max(...viewDowntime.map(d => d.value), 1);
                  return (
                    <div key={i} className="space-y-1.5 group">
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{item.name}</span>
                        <span className="font-black text-slate-900">{item.value.toFixed(1)}h</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${(item.value / maxVal) * 100}%`, backgroundColor: item.color }}
                        ></div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-slate-400 text-center py-8">Sem dados de parada registrados.</p>
                )}
              </div>
            </div>

            {/* WAIT vs EXEC */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="text-primary" size={20} /> Espera vs Execução
                </h3>
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-1"><CircleDot size={10} className="text-orange-500" /> Espera</span>
                  <span className="flex items-center gap-1"><CircleDot size={10} className="text-primary" /> Execução</span>
                </div>
              </div>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={viewTimeline} layout="vertical">
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <Tooltip
                      contentStyle={{
                        background: '#1e293b',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        padding: '12px 16px'
                      }}
                      formatter={(value: any, name: string) => [
                        `${Number(value).toFixed(1)}h`,
                        name === 'waitTime' ? 'Espera' : 'Execução'
                      ]}
                    />
                    <Bar dataKey="waitTime" stackId="a" fill="#f97316" radius={[4, 0, 0, 4]} barSize={14} />
                    <Bar dataKey="execTime" stackId="a" fill="#00df82" radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* TECHNICIAN PERFORMANCE — LEADERBOARD PRO */}
          {viewTechs.length > 0 && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <Star className="text-yellow-500 fill-yellow-500" size={24} /> Performance de Campo
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Liderança em ordens concluídas</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 bg-primary rounded-full"></span>
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Tempo Real</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {viewTechs.slice(0, 5).map((tech, i) => {
                  const isGold = i === 0;
                  const isSilver = i === 1;
                  const isBronze = i === 2;
                  const hasMedal = i < 3;

                  return (
                    <div
                      key={tech.name}
                      className={`relative rounded-3xl p-6 transition-all duration-300 group ${isGold
                        ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl scale-105 z-10'
                        : isSilver ? 'bg-white border-2 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-lg'
                          : isBronze ? 'bg-white border-2 border-orange-100/50 hover:border-orange-200 shadow-sm hover:shadow-lg'
                            : 'bg-slate-50 border border-slate-100 hover:border-primary/30 hover:bg-white hover:shadow-lg'
                        }`}
                    >
                      {hasMedal && (
                        <div className={`absolute -top-4 left-1/2 -translate-x-1/2 size-10 rounded-2xl flex items-center justify-center text-xl shadow-xl ring-4 ring-white group-hover:rotate-12 transition-transform ${isGold ? 'bg-yellow-400' : isSilver ? 'bg-slate-300' : 'bg-orange-300'
                          }`}>
                          {isGold ? '🏆' : isSilver ? '🥈' : '🥉'}
                        </div>
                      )}

                      <div className="flex flex-col items-center text-center">
                        <div className={`size-12 rounded-full flex items-center justify-center mb-4 font-black text-lg ${isGold ? 'bg-white/10 text-white' : 'bg-white text-slate-400 border border-slate-200'
                          }`}>
                          {i + 1}º
                        </div>
                        <p className={`text-sm font-black truncate w-full mb-1 ${isGold ? 'text-white' : 'text-slate-900'}`}>{tech.name}</p>
                        <p className={`text-[10px] font-black uppercase tracking-widest text-slate-400`}>Técnico</p>

                        <div className="mt-6 w-full space-y-3">
                          <div className="flex justify-between items-end">
                            <span className={`text-[10px] font-black uppercase ${isGold ? 'text-slate-400' : 'text-slate-500'}`}>Concluídas</span>
                            <span className={`text-2xl font-black tabular-nums ${isGold ? 'text-white' : 'text-slate-900'}`}>{tech.closed}</span>
                          </div>
                          <div className={`h-1.5 rounded-full overflow-hidden ${isGold ? 'bg-white/10' : 'bg-slate-200'}`}>
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${isGold ? 'bg-primary' : 'bg-primary'}`}
                              style={{ width: `${(tech.closed / (tech.closed + tech.open || 1)) * 100}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter opacity-60">
                            <span>Eficiência</span>
                            <span>{Math.round((tech.closed / (tech.closed + tech.open || 1)) * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ORDERS TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{viewTitle}</h3>
              <button onClick={() => navigate('/work-orders')} className="text-primary font-bold text-sm flex items-center gap-1 hover:underline">
                Ver todas <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-[11px] tracking-widest">OS #</th>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-[11px] tracking-widest">Ativo</th>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-[11px] tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-[11px] tracking-widest text-center">Prioridade</th>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-[11px] tracking-widest text-right">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewOrders.slice(0, 8).map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/80 cursor-pointer transition-colors group" onClick={() => navigate(`/work-orders/${o.id}`)}>
                      <td className="px-6 py-4 font-black text-primary">#{o.order_number}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{o.assets?.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{o.maintenance_category}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <PriorityBadge priority={o.priority} />
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 font-mono text-xs">{new Date(o.date).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                  {viewOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">
                        <CheckCircle2 size={32} className="mx-auto mb-2 text-primary opacity-50" />
                        Nenhuma OS aberta nesta categoria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Premium Helper Components ---

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, string> = {
    'Aberto': 'border-orange-200 text-orange-600 bg-orange-50',
    'Pendente': 'border-amber-200 text-amber-600 bg-amber-50',
    'Em Manutenção': 'border-blue-200 text-blue-600 bg-blue-50',
    'Concluído': 'border-emerald-200 text-emerald-600 bg-emerald-50',
  };
  const classes = config[status] || 'border-slate-200 text-slate-600 bg-slate-50';
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${classes}`}>
      {status === 'Em Manutenção' && <span className="size-1.5 bg-blue-500 rounded-full animate-pulse"></span>}
      {status}
    </span>
  );
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const p = (priority || 'normal').toLowerCase();
  if (p === 'alta' || p === 'crítica' || p === 'urgente') {
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-red-50 text-red-600 border border-red-100">🔴 {priority}</span>;
  }
  if (p === 'média') {
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-yellow-50 text-yellow-700 border border-yellow-100">🟡 {priority}</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-50 text-slate-500 border border-slate-100">🟢 {priority || 'Normal'}</span>;
};

const QuickStatCard = ({ icon, iconBg, iconColor, hoverBorder, title, value, suffix }: any) => (
  <div className={`bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-8 group ${hoverBorder} transition-all hover:shadow-md`}>
    <div className={`size-16 ${iconBg} rounded-2xl flex items-center justify-center ${iconColor} shadow-sm group-hover:scale-105 transition-transform`}>
      {icon}
    </div>
    <div>
      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</h4>
      <p className="text-4xl font-black text-slate-900 tracking-tighter">
        {value}
        <span className="text-sm font-bold text-slate-400 ml-2 uppercase tracking-normal">{suffix}</span>
      </p>
    </div>
  </div>
);

const KPICard = ({ title, value, sub, icon, trend, accentColor = 'emerald' }: any) => {
  const colorMap: Record<string, { bg: string; text: string; glow: string; border: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', glow: 'group-hover:shadow-emerald-100', border: 'group-hover:border-emerald-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', glow: 'group-hover:shadow-orange-100', border: 'group-hover:border-orange-200' },
    red: { bg: 'bg-red-50', text: 'text-red-600', glow: 'group-hover:shadow-red-100', border: 'group-hover:border-red-200' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', glow: 'group-hover:shadow-blue-100', border: 'group-hover:border-blue-200' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', glow: 'group-hover:shadow-violet-100', border: 'group-hover:border-violet-200' },
  };
  const c = colorMap[accentColor] || colorMap.emerald;

  return (
    <div className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-lg ${c.glow} ${c.border} transition-all cursor-default`}>
      <div className={`absolute top-3 right-3 ${c.bg} p-2 rounded-xl opacity-60 group-hover:opacity-100 transition-opacity`}>
        <div className={c.text}>{icon}</div>
      </div>
      <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-2xl font-black tracking-tighter text-slate-900">{value}</h3>
      <div className="mt-1.5 flex items-center gap-1.5">
        {trend === 'up' && <TrendingUp size={12} className="text-emerald-500" />}
        {trend === 'down' && <TrendingDown size={12} className="text-red-500" />}
        <p className={`text-[10px] font-bold uppercase ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400'}`}>{sub}</p>
      </div>
    </div>
  );
};

export default Dashboard;
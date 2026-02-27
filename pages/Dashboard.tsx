import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Timer,
  TrendingDown,
  TrendingUp,
  Activity,
  AlertCircle,
  Ban,
  Box,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Interfaces for chart data
interface TechnicianPerf {
  name: string;
  closed: number;
  open: number; // For future use
}

interface MachineDowntime {
  name: string;
  value: number;
  color: string;
}

interface TimelineEvent {
  machine: string;
  date: string;
  waitTime: number; // Mapping downtime_hours to waitTime for viz
  execTime: number; // Mapping repair_hours to execTime
}

interface WorkOrder {
  id: string;
  order_number: string;
  asset_name: string;
  issue: string; // Changed from description to issue
  status: string;
  technician_name: string;
  requester_name: string;
  date: string;
  maintenance_category?: string;
}

interface StrategicKPIs {
  availability: number;
  totalCost: number;
  partsCost: number;
  laborCost: number;
  backlog: number;
  preventiveRatio: number; // %
}

interface CategoryKPIs {
  availability: number;
  mtbf: number;
  mttr: number;
  downtime: number;
  cost: number;
  partsCost: number;
  laborCost: number;
  criticalAssets: { name: string; impact: number }[];
}

interface DashboardKPIs {
  executive: StrategicKPIs;
  industrial: CategoryKPIs & { openCount: number };
  predial: CategoryKPIs & { openCount: number };
  others: CategoryKPIs & { openCount: number };
}

// Table Helper Component
const WorkOrderTable = ({ orders }: { orders: any[] }) => {
  if (orders.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 italic bg-white rounded-xl">
        Nenhuma ordem de serviço aberta encontrada.
      </div>
    );
  }

  return (
    <table className="w-full text-left text-sm text-slate-600">
      <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
        <tr>
          <th className="px-6 py-4">ID</th>
          <th className="px-6 py-4">Alvo</th>
          <th className="px-6 py-4">Tipo</th>
          <th className="px-6 py-4">Status</th>
          <th className="px-6 py-4 text-right">Data</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {orders.map(order => (
          <tr key={order.id} className="hover:bg-slate-50 transition-colors">
            <td className="px-6 py-4 font-mono text-slate-500">#{order.order_number}</td>
            <td className="px-6 py-4 font-medium text-slate-900">{order.asset_name}</td>
            <td className="px-6 py-4">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                {order.maintenance_type}
              </span>
            </td>
            <td className="px-6 py-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${order.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700' :
                order.status === 'Em Manutenção' ? 'bg-blue-100 text-blue-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                {order.status}
              </span>
            </td>
            <td className="px-6 py-4 text-right text-slate-500">{order.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_root';
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'geral' | 'industrial' | 'predial' | 'outros'>('geral');
  const [kpis, setKpis] = useState<DashboardKPIs>({
    executive: { availability: 100, totalCost: 0, partsCost: 0, laborCost: 0, backlog: 0, preventiveRatio: 0 },
    industrial: { availability: 0, mtbf: 0, mttr: 0, downtime: 0, cost: 0, partsCost: 0, laborCost: 0, criticalAssets: [], openCount: 0 },
    predial: { availability: 0, mtbf: 0, mttr: 0, downtime: 0, cost: 0, partsCost: 0, laborCost: 0, criticalAssets: [], openCount: 0 },
    others: { availability: 0, mtbf: 0, mttr: 0, downtime: 0, cost: 0, partsCost: 0, laborCost: 0, criticalAssets: [], openCount: 0 }
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

  const [recentOrders, setRecentOrders] = useState<WorkOrder[]>([]);
  const [allOpenOrders, setAllOpenOrders] = useState<WorkOrder[]>([]);
  const [totalDowntime, setTotalDowntime] = useState(0);
  const [indTotalDowntime, setIndTotalDowntime] = useState(0);
  const [preTotalDowntime, setPreTotalDowntime] = useState(0);
  const [otrTotalDowntime, setOtrTotalDowntime] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Set default tab for non-admins if they land on 'geral'
  useEffect(() => {
    if (!loading && user && !isAdmin && activeTab === 'geral') {
      if (user.manage_equipment) setActiveTab('industrial');
      else if (user.manage_predial) setActiveTab('predial');
      else if (user.manage_others) setActiveTab('outros');
    }
  }, [user, loading, isAdmin, activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Assets and Work Orders (6 months for trends)
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: assetsData }, { data: allOrders }] = await Promise.all([
        supabase.from('assets').select('*'),
        supabase.from('work_orders')
          .select(`
            *,
            assets (*),
            technicians (name),
            third_party_companies (name),
            requester:users!requester_id (name)
          `)
          .gte('created_at', sixMonthsAgo)
          .order('date', { ascending: false })
      ]);

      if (!allOrders) return;
      const orders = (allOrders as any[]) || [];
      const assets = (assetsData as any[]) || [];

      // Create a lookup for asset data
      const assetMap = assets.reduce((acc, a) => ({ ...acc, [a.id]: a }), {});

      // Separate orders by period for trend analysis
      const recentOrdersRaw = orders.filter(o => o.created_at >= thirtyDaysAgo);
      const prevMonthOrders = orders.filter(o => o.created_at < thirtyDaysAgo && o.created_at >= new Date(Date.now() - 60 * 24 * 60 * 1000).toISOString());

      // Use active orders to estimate 'Machines under stress' instead of fetching all assets
      const urgentOrders = orders.filter(o =>
        (o.status?.toLowerCase() === 'pendente' || o.status?.toLowerCase() === 'em manutenção') &&
        (o.priority === 'Urgente' || o.priority === 'Alta')
      );

      // --- Core Calculation Logic for 3.0 ---
      const calculateStats = (targetOrders: any[], periodHours: number, assetCount: number) => {
        const closed = targetOrders.filter(o => o.status === 'Concluído');
        const attended = targetOrders.filter(o => o.responded_at || Number(o.response_hours) > 0);

        // MTTR
        const totRepair = closed.reduce((acc, o) => acc + (Number(o.repair_hours) || 0), 0);
        const mttr = closed.length > 0 ? totRepair / closed.length : 0;

        // MTTA
        const totResp = attended.reduce((acc, o) => {
          const stored = Number(o.response_hours) || 0;
          if (stored > 0) return acc + stored;
          if (o.created_at && o.responded_at) return acc + (new Date(o.responded_at).getTime() - new Date(o.created_at).getTime()) / 3600000;
          return acc;
        }, 0);
        const mtta = attended.length > 0 ? totResp / attended.length : 0;

        // Downtime
        const downtime = targetOrders.reduce((acc, o) => {
          const start = new Date(o.created_at).getTime();
          const end = o.status === 'Concluído' ? new Date(o.resolved_at || o.updated_at).getTime() : Date.now();
          return acc + Math.max(Number(o.downtime_hours) || 0, (end - start) / 3600000);
        }, 0);

        // MTBF
        const corrective = targetOrders.filter(o => o.maintenance_type?.toLowerCase() === 'corretiva' || o.type?.toLowerCase() === 'corretiva');
        const opHours = (periodHours * assetCount) - downtime;
        const mtbf = corrective.length > 0 ? opHours / corrective.length : periodHours;

        // Cost
        const laborCost = targetOrders.reduce((acc, o) => acc + (o.third_party_company_id ? (Number(o.hourly_rate) || 0) : 0), 0);
        const partsCost = targetOrders.reduce((acc, o) => acc + (Number(o.parts_cost) || 0), 0);
        const cost = laborCost + partsCost;

        // Availability
        const availability = assetCount > 0 ? ((periodHours * assetCount - downtime) / (periodHours * assetCount)) * 100 : 100;

        return { mttr, mtta, mtbf, downtime, availability, cost, partsCost, laborCost, correctiveCount: corrective.length };
      };

      const timeWindow = 30 * 24;
      const isInd = (cat: string) => {
        const c = cat?.toLowerCase().trim() || '';
        return c === 'máquina' || c === 'equipamento' || c === 'maquina';
      };
      const isPre = (cat: string) => (cat?.toLowerCase().trim() || '') === 'predial';

      const indAssets = assets.filter(a => isInd(a.categoria));
      const preAssets = assets.filter(a => isPre(a.categoria));
      const otrAssets = assets.filter(a => !isInd(a.categoria) && !isPre(a.categoria));

      const getOrderStandardCategory = (o: any) => {
        const cat = (assetMap[o.asset_id]?.categoria || o.maintenance_category || '').toLowerCase().trim();
        const type = ((o.failure_type || o.type || o.maintenance_type || '') as string).toLowerCase().trim();
        if (isInd(cat) || type.includes('mecanica') || type.includes('maquina')) return 'MÁQUINA';
        if (isPre(cat) || type.includes('predial') || type.includes('preditivo') || type.includes('preditiva')) return 'PREDIAL';
        return 'OUTROS';
      };

      const indOrders = recentOrdersRaw.filter(o => getOrderStandardCategory(o) === 'MÁQUINA');
      const preOrders = recentOrdersRaw.filter(o => getOrderStandardCategory(o) === 'PREDIAL');
      const otrOrders = recentOrdersRaw.filter(o => getOrderStandardCategory(o) === 'OUTROS');

      const indStats = calculateStats(indOrders, timeWindow, indAssets.length || 1);
      const preStats = calculateStats(preOrders, timeWindow, preAssets.length || 1);
      const otrStats = calculateStats(otrOrders, timeWindow, otrAssets.length || 1);

      // Strategic
      const executive: StrategicKPIs = {
        availability: (indStats.availability + preStats.availability + otrStats.availability) / 3,
        totalCost: indStats.cost + preStats.cost + otrStats.cost,
        partsCost: indStats.partsCost + preStats.partsCost + otrStats.partsCost,
        laborCost: indStats.laborCost + preStats.laborCost + otrStats.laborCost,
        backlog: orders.filter(o => o.status !== 'Concluído').length,
        preventiveRatio: recentOrdersRaw.length > 0
          ? (recentOrdersRaw.filter(o => o.maintenance_category === 'PREVENTIVA' || o.maintenance_type?.toLowerCase() === 'preventiva').length / recentOrdersRaw.length) * 100
          : 0
      };

      const openIndCount = orders.filter(o => o.status !== 'Concluído' && getOrderStandardCategory(o) === 'MÁQUINA').length;
      const openPreCount = orders.filter(o => o.status !== 'Concluído' && getOrderStandardCategory(o) === 'PREDIAL').length;
      const openOtrCount = orders.filter(o => o.status !== 'Concluído' && getOrderStandardCategory(o) === 'OUTROS').length;

      const getPrevRatio = (targetOrders: any[]) => {
        if (targetOrders.length === 0) return 0;
        return (targetOrders.filter(o => o.maintenance_type?.toLowerCase() === 'preventiva').length / targetOrders.length) * 100;
      };

      setKpis({
        executive,
        industrial: { ...indStats, criticalAssets: [], openCount: openIndCount, preventiveRatio: getPrevRatio(indOrders) },
        predial: { ...preStats, criticalAssets: [], openCount: openPreCount, preventiveRatio: getPrevRatio(preOrders) },
        others: { ...otrStats, criticalAssets: [], openCount: openOtrCount, preventiveRatio: getPrevRatio(otrOrders) }
      } as any);

      const formattedOrders = orders.map(o => {
        const cat = assetMap[o.asset_id]?.categoria || o.maintenance_category || '';
        const rawType = (o.failure_type || o.type || o.maintenance_type || 'N/A').trim().toLowerCase();

        // 2. Map Maintenance Types (Mecanica -> Máquinas, Outro -> Outros)
        let displayType = 'Outros';
        if (rawType.includes('mecanica') || rawType === 'maquinas' || isInd(cat)) {
          displayType = 'Máquinas';
        } else if (rawType.includes('predial') || rawType.includes('preditivo') || rawType.includes('preditiva') || isPre(cat)) {
          displayType = 'Predial';
        }

        // 1. Map Categories (Industrial/Equipment to MÁQUINA)
        let displayCat = cat.trim().toUpperCase();
        if (displayCat === 'EQUIPAMENTO' || displayType === 'Máquinas') displayCat = 'MÁQUINA';
        if (!displayCat || displayCat === 'OUTRO') displayCat = 'OUTROS';

        return {
          id: o.id,
          order_number: o.order_number,
          maintenance_category: displayCat,
          maintenance_type: displayType,
          asset_id: o.asset_id,
          asset_name: assetMap[o.asset_id]?.name || 'N/A',
          status: o.status,
          date: new Date(o.date).toLocaleDateString('pt-BR')
        };
      });

      setAllOpenOrders(formattedOrders.filter(o => o.status !== 'Concluído'));
      setRecentOrders(formattedOrders.slice(0, 10));

      // Constants for other parts of the function
      const closedOrders = recentOrdersRaw.filter(o => o.status === 'Concluído');
      const openOrders = recentOrdersRaw.filter(o => o.status === 'Pendente');
      const totalDowntimeVal = indStats.downtime + preStats.downtime;

      // 2. Fetch Technicians & Third Party Companies
      const [{ data: techs }, { data: companies }] = await Promise.all([
        supabase.from('technicians').select('id, name'),
        supabase.from('third_party_companies').select('id, name')
      ]);

      // 3. Calculate Perf (Both internal and external)
      if (techs || companies) {
        const executors = [...(techs || []), ...(companies || [])];

        const calculatePerf = (targetClosed: any[], targetOpen: any[]) => {
          const closedMap: Record<string, number> = {};
          const openMap: Record<string, number> = {};
          targetClosed.forEach(o => {
            const id = o.technician_id || o.third_party_company_id;
            if (id) closedMap[id] = (closedMap[id] || 0) + 1;
          });
          targetOpen.forEach(o => {
            const id = o.technician_id || o.third_party_company_id;
            if (id) openMap[id] = (openMap[id] || 0) + 1;
          });
          return executors.map(e => ({
            name: e.name,
            closed: closedMap[e.id] || 0,
            open: openMap[e.id] || 0
          })).sort((a, b) => b.closed - a.closed).slice(0, 5);
        };

        setTechnicianData(calculatePerf(closedOrders, openOrders));
        setIndTechnicianData(calculatePerf(closedOrders.filter(o => getOrderStandardCategory(o) === 'MÁQUINA'), openOrders.filter(o => getOrderStandardCategory(o) === 'MÁQUINA')));
        setPreTechnicianData(calculatePerf(closedOrders.filter(o => getOrderStandardCategory(o) === 'PREDIAL'), openOrders.filter(o => getOrderStandardCategory(o) === 'PREDIAL')));
        setOtrTechnicianData(calculatePerf(closedOrders.filter(o => getOrderStandardCategory(o) === 'OUTROS'), openOrders.filter(o => getOrderStandardCategory(o) === 'OUTROS')));
      }

      // 4. Chart Data - Downtime per Machine
      const machineDowntimeMap: Record<string, { val: number, cat: string }> = {};

      orders.forEach(order => {
        const machineName = order.assets?.name || 'Desconhecido';
        const cat = getOrderStandardCategory(order);
        let customDowntime = Number(order.downtime_hours) || 0;

        if (order.status?.toLowerCase() !== 'concluído' && order.status?.toLowerCase() !== 'cancelado') {
          const start = new Date(order.created_at || order.date).getTime();
          customDowntime = Math.max(Number(order.downtime_hours) || 0.1, (new Date().getTime() - start) / (1000 * 60 * 60));
        }

        if (customDowntime > 0) {
          if (!machineDowntimeMap[machineName]) machineDowntimeMap[machineName] = { val: 0, cat };
          machineDowntimeMap[machineName].val += customDowntime;
        }
      });

      const getDowntimeChart = (filterCat?: string) => {
        const data = Object.entries(machineDowntimeMap)
          .filter(([_, data]) => !filterCat || data.cat === filterCat)
          .map(([name, data], index) => {
            const colors = ['#d9534f', '#f97316', '#f59e0b', '#11d473', '#0d1620', '#64748b'];
            return {
              name,
              value: Number(data.val.toFixed(1)),
              color: colors[index % colors.length]
            };
          })
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
        return data.length > 0 ? data : [{ name: 'Sem dados', value: 0, color: '#CBD5E1' }];
      };

      setDowntimeData(getDowntimeChart());
      setIndDowntimeData(getDowntimeChart('MÁQUINA'));
      setPreDowntimeData(getDowntimeChart('PREDIAL'));
      setOtrDowntimeData(getDowntimeChart('OUTROS'));

      setTotalDowntime(totalDowntimeVal);
      setIndTotalDowntime(indStats.downtime);
      setPreTotalDowntime(preStats.downtime);
      setOtrTotalDowntime(otrStats.downtime);

      const getTimeline = (filterCat?: string) => {
        return orders
          .filter(o => o.status?.toLowerCase() !== 'cancelado')
          .filter(o => !filterCat || getOrderStandardCategory(o) === filterCat)
          .slice(0, 5)
          .map(order => {
            let waitTime = 0;
            let execTime = 0;
            const createdDate = order.created_at ? new Date(order.created_at) : new Date(order.date);
            const now = new Date();

            if (order.status === 'Concluído') {
              waitTime = Number(order.response_hours) || Math.max(0, (Number(order.downtime_hours) || 0) - (Number(order.repair_hours) || 0));
              execTime = Number(order.repair_hours) || 0;
            } else if (order.status === 'Em Manutenção') {
              const waitEnd = order.updated_at ? new Date(order.updated_at).getTime() : now.getTime();
              waitTime = Number(order.response_hours) || Math.max(0, (waitEnd - createdDate.getTime()) / (1000 * 60 * 60));
              const totalDowntimeSoFar = Math.max(0, (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60));
              execTime = Math.max(0, totalDowntimeSoFar - waitTime);
            } else {
              waitTime = Math.max(Number(order.downtime_hours) || 0.1, (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60));
              execTime = 0;
            }

            return {
              orderNumber: order.order_number || 'N/A',
              machine: order.assets?.name || 'Máquina',
              label: `#${order.order_number || '??'} ${order.assets?.name || ''}`.substring(0, 20),
              date: createdDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
              waitTime: Number(waitTime.toFixed(1)),
              execTime: Number(execTime.toFixed(1))
            };
          });
      };

      setTimelineData(getTimeline());
      setIndTimelineData(getTimeline('MÁQUINA'));
      setPreTimelineData(getTimeline('PREDIAL'));
      setOtrTimelineData(getTimeline('OUTROS'));

      // Map Recent Orders Table
      const tableData = recentOrdersRaw.slice(0, 10).map(order => ({
        id: order.id,
        order_number: order.order_number || `OS-${order.id.substring(0, 4).toUpperCase()}`,
        asset_name: order.assets?.name || 'Geral',
        maintenance_category: order.maintenance_category || 'Equipamento',
        issue: order.issue || 'Sem descrição',
        status: order.status || 'Pendente',
        technician_name: order.technicians?.name || 'Não atribuído',
        requester_name: (order as any).requester?.name || 'Administrador',
        date: new Date(order.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      }));
      setRecentOrders(tableData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper for Status Badge Color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'concluído': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'em manutenção': return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'aguardando peça': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'pendente': return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'crítico': return 'bg-red-50 text-red-700 border border-red-200';
      default: return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  // Helper for Technician Avatar Color
  const getAvatarInfo = (name: string) => {
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    // Simple hash for color consistency
    const colorIndex = name.charCodeAt(0) % 5;
    const colors = ['bg-emerald-100 text-emerald-700', 'bg-slate-100 text-slate-700', 'bg-green-100 text-green-700', 'bg-amber-100 text-amber-700', 'bg-emerald-50 text-emerald-600'];
    return { initials, color: colors[colorIndex] || colors[0] };
  };

  // Custom tooltips
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-semibold text-slate-900 mb-2">{payload[0].payload.name}</p>
          <p className="text-sm text-slate-600">
            Concluídos: <span className="font-bold">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomTimelineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { waitTime, execTime, machine, orderNumber, date } = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-800 backdrop-blur-md bg-opacity-95">
          <div className="flex items-center gap-2 mb-2 border-b border-slate-700 pb-2">
            <span className="bg-primary px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter text-slate-900">OS #{orderNumber}</span>
            <span className="text-xs font-bold text-slate-200">{machine}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center gap-6">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tempo de Espera</span>
              <span className="text-sm font-black text-orange-400">{waitTime}h</span>
            </div>
            <div className="flex justify-between items-center gap-6">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tempo de Reparo</span>
              <span className="text-sm font-black text-primary">{execTime}h</span>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-500 font-medium italic border-t border-slate-700 pt-1 text-right">Abertura: {date}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Carregando dados...</div>;
  }
  return (
    <div className="flex flex-col gap-6">
      {/* Header with Title and System Status */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-slate-500 text-sm">Visão estratégica e análise preditiva de manutenção.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 h-14">
            <div className="flex flex-col items-end pr-3 border-r border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1.5">Status Sistema</span>
              <div className="flex items-center gap-2">
                <span className="size-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(17,212,115,0.4)]"></span>
                <span className="text-xs font-bold text-slate-700 uppercase">Online</span>
              </div>
            </div>
            <div className="flex flex-col items-end px-1">
              <span className="text-xs font-bold text-slate-900 uppercase">
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
              <span className="text-[10px] font-medium text-slate-400 uppercase leading-none">Última Sincronia</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100/50 rounded-xl border border-slate-200 self-start">
        {[
          { id: 'geral', label: 'Visão Executiva', icon: <ShieldCheck size={16} />, show: isAdmin },
          { id: 'industrial', label: 'Máquinas', icon: <Activity size={16} />, show: isAdmin || user?.manage_equipment },
          { id: 'predial', label: 'Predial', icon: <ShieldCheck size={16} />, show: isAdmin || user?.manage_predial },
          { id: 'outros', label: 'Outros', icon: <Box size={16} />, show: isAdmin || user?.manage_others },
        ].filter(t => t.show).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === tab.id
              ? 'bg-white text-primary shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* CONDITIONAL RENDERING BY TAB */}
      {/* CONDITIONAL RENDERING BY TAB */}
      {(() => {
        let viewKPIs = kpis.executive;
        let viewTechs = technicianData;
        let viewDowntime = downtimeData;
        let viewTotalDowntime = totalDowntime;
        let viewTimeline = timelineData;
        let viewOrders = allOpenOrders;
        let viewTitle = "Backlog Geral de Manutenção (Todas as OS Abertas)";

        if (activeTab === 'industrial') {
          viewKPIs = kpis.industrial as any;
          viewTechs = indTechnicianData;
          viewDowntime = indDowntimeData;
          viewTotalDowntime = indTotalDowntime;
          viewTimeline = indTimelineData;
          viewOrders = allOpenOrders.filter(o => o.maintenance_category === 'MÁQUINA');
          viewTitle = "Ordens de Serviço Abertas - Máquinas";
        } else if (activeTab === 'predial') {
          viewKPIs = kpis.predial as any;
          viewTechs = preTechnicianData;
          viewDowntime = preDowntimeData;
          viewTotalDowntime = preTotalDowntime;
          viewTimeline = preTimelineData;
          viewOrders = allOpenOrders.filter(o => o.maintenance_category === 'PREDIAL');
          viewTitle = "Ordens de Serviço Abertas - Predial";
        } else if (activeTab === 'outros') {
          viewKPIs = kpis.others as any;
          viewTechs = otrTechnicianData;
          viewDowntime = otrDowntimeData;
          viewTotalDowntime = otrTotalDowntime;
          viewTimeline = otrTimelineData;
          viewOrders = allOpenOrders.filter(o => o.maintenance_category === 'OUTROS');
          viewTitle = "Ordens de Serviço Abertas - Outros";
        }

        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Activity size={80} />
                </div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Disponibilidade</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{viewKPIs.availability.toFixed(1)}%</h3>
                <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${viewKPIs.availability > 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {viewKPIs.availability < 90 && <AlertCircle size={10} />}
                  {viewKPIs.availability > 90 ? 'ÓTIMO' : 'ALTO RISCO'}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Box size={80} />
                </div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Custo Peças (Mês)</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">R$ {viewKPIs.partsCost?.toLocaleString('pt-BR')}</h3>
                <div className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Peças e Materiais</div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <ShieldCheck size={80} />
                </div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Mão de Obra (Mês)</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">R$ {viewKPIs.laborCost?.toLocaleString('pt-BR')}</h3>
                <div className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Serviços Terceiros</div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Backlog Atual</p>
                <h3 className="text-3xl font-black text-orange-600 tracking-tighter">{(viewKPIs as any).backlog || (viewKPIs as any).openCount} <span className="text-sm font-bold text-slate-400">OS</span></h3>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 bg-slate-100 flex-1 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min((((viewKPIs as any).backlog || (viewKPIs as any).openCount) / 20) * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Preventiva vs Corretiva</p>
                <h3 className="text-3xl font-black text-primary tracking-tighter">{(viewKPIs as any).preventiveRatio.toFixed(0)} <span className="text-sm font-bold text-slate-400">%</span></h3>
                <div className={`mt-2 text-[10px] font-bold ${(viewKPIs as any).preventiveRatio > 40 ? 'text-emerald-500' : 'text-orange-500'}`}>
                  {(viewKPIs as any).preventiveRatio > 40 ? 'META ATINGIDA' : 'NECESSÁRIO AJUSTE'}
                </div>
              </div>
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Horas Paradas por Ativo */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <AlertCircle className="text-brand-alert" size={20} />
                      Horas Paradas {activeTab === 'geral' ? '' : `(${activeTab})`}
                    </h3>
                    <p className="text-sm text-slate-500">Tempo de inatividade acumulado</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {viewDowntime.slice(0, 5).map((item, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-700">{item.name}</span>
                        <span className="text-slate-900 font-bold">{item.value}h</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min((item.value / 50) * 100, 100)}%`, backgroundColor: item.color }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-sm text-slate-500">Total de Horas Paradas</span>
                  <span className="text-xl font-black text-brand-alert">{viewTotalDowntime.toFixed(1)}h</span>
                </div>
              </div>

              {/* Desempenho Técnico */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="text-green-500" size={20} />
                    Desempenho Técnico
                  </h3>
                  <p className="text-sm text-slate-500">Chamados concluídos no contexto</p>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={viewTechs} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} width={100} />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="closed" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} name="Chamados Concluídos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-sm text-slate-500">Média por Técnico</span>
                  <span className="text-xl font-black text-green-500">
                    {(viewTechs.reduce((acc, curr) => acc + curr.closed, 0) / (viewTechs.length || 1)).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline Chart */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="text-primary" size={20} />
                    Espera vs Execução {activeTab === 'geral' ? '' : `(${activeTab})`}
                  </h3>
                  <p className="text-sm text-slate-500">Cronologia dos últimos atendimentos</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1">
                    <span className="size-3 rounded-full bg-orange-500"></span> Horas Paradas
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="size-3 rounded-full bg-primary"></span> Horas Reparo
                  </div>
                </div>
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={viewTimeline} layout="vertical" barGap={0} barCategoryGap="40%">
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={140}
                      tick={{ fontSize: 11, fill: '#475569', fontWeight: '800' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTimelineTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="waitTime" stackId="a" fill="#f97316" radius={[4, 0, 0, 4]} barSize={14} name="Espera" />
                    <Bar dataKey="execTime" stackId="a" fill="var(--primary-color)" radius={[0, 4, 4, 0]} barSize={14} name="Execução" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mt-6">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">{viewTitle}</h3>
                <Link to="/work-orders" className="text-sm font-medium text-primary hover:text-green-600 transition-colors">Ver Todas</Link>
              </div>
              <div className="overflow-x-auto">
                <WorkOrderTable orders={viewOrders} />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default Dashboard;
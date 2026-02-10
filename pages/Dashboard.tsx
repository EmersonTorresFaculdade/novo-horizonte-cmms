import React, { useEffect, useState } from 'react';
import {
  Timer,
  TrendingDown,
  TrendingUp,
  Activity,
  AlertCircle,
  Ban,
  MoreVertical
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';

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
  asset_name: string;
  issue: string; // Changed from description to issue
  status: string;
  technician_name: string;
  date: string;
}

interface DashboardKPIs {
  mttr: string;
  mtbf: string;
  openTickets: number;
  urgentTickets: number;
  downtimeRate: string;
  totalDowntime: number;
  avgWait: number;
  avgExecution: number;
  completedTickets: number;
  maintenanceTickets: number;
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<DashboardKPIs>({
    mttr: '0h 0m',
    mtbf: '0h',
    openTickets: 0,
    urgentTickets: 0,
    downtimeRate: '0%',
    totalDowntime: 0,
    avgWait: 0,
    avgExecution: 0,
    completedTickets: 0,
    maintenanceTickets: 0
  });
  const [technicianData, setTechnicianData] = useState<TechnicianPerf[]>([]);
  const [downtimeData, setDowntimeData] = useState<MachineDowntime[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineEvent[]>([]);
  const [recentOrders, setRecentOrders] = useState<WorkOrder[]>([]);
  const [totalDowntime, setTotalDowntime] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Fetch All Work Orders (for accurate stats)
      const { data: allOrders, error: orderError } = await supabase
        .from('work_orders')
        .select(`
          *,
          assets (name, sector),
          technicians (name)
        `)
        .order('date', { ascending: false });

      if (orderError) throw orderError;

      const orders = allOrders || [];

      // --- Calculate KPIs ---
      const totalOrders = orders.length;
      const closedOrders = orders.filter(o => o.status === 'Concluído');
      const openOrders = orders.filter(o => o.status === 'Pendente');

      // 1. Counts
      const openCount = openOrders.length;
      const urgentCount = openOrders.filter(o => ['Alta', 'Crítica', 'Crítico'].includes(o.priority)).length;

      const maintenanceOrders = orders.filter(o => o.status === 'Em Manutenção');
      const maintenanceCount = maintenanceOrders.length;
      const completedCount = closedOrders.length;

      // 2. MTTR (Mean Time To Repair) - Average repair_hours
      const totalRepairHours = closedOrders.reduce((acc, o) => acc + (Number(o.repair_hours) || 0), 0);
      const avgRepairHours = closedOrders.length > 0 ? totalRepairHours / closedOrders.length : 0;
      const mttrH = Math.floor(avgRepairHours);
      const mttrM = Math.round((avgRepairHours - mttrH) * 60);

      // 3. Total Downtime & Average Wait
      const totalDowntimeVal = orders.reduce((acc, o) => acc + (Number(o.downtime_hours) || 0), 0);

      // Approx Wait = Downtime - Repair (simplified)
      const totalWait = Math.max(0, totalDowntimeVal - totalRepairHours);
      const avgWaitVal = closedOrders.length > 0 ? totalWait / closedOrders.length : 0;

      // 4. MTBF (Simplified: Total Time Window / Failures)
      const timeWindowHours = 30 * 24; // 30 days
      const mtbfVal = totalOrders > 0 ? (timeWindowHours * 5) / totalOrders : 0;

      // 5. Downtime Rate
      const downtimeRateVal = (totalDowntimeVal / (timeWindowHours * 10)) * 100;

      setKpis({
        mttr: `${mttrH}h ${mttrM}m`,
        mtbf: `${Math.round(mtbfVal)}h`,
        openTickets: openCount,
        urgentTickets: urgentCount,
        downtimeRate: `${downtimeRateVal.toFixed(1)}%`,
        totalDowntime: Number(totalDowntimeVal.toFixed(1)),
        avgWait: Number(avgWaitVal.toFixed(1)),
        avgExecution: Number(avgRepairHours.toFixed(1)),
        completedTickets: completedCount,
        maintenanceTickets: maintenanceCount
      });

      // 2. Fetch Technicians
      const { data: techs, error: techError } = await supabase
        .from('technicians')
        .select('id, name');

      if (techError) throw techError;

      // 3. Calculate Tech Performance
      if (techs) {
        const closedCountMap: Record<string, number> = {};
        closedOrders.forEach(order => {
          if (order.technician_id) {
            closedCountMap[order.technician_id] = (closedCountMap[order.technician_id] || 0) + 1;
          }
        });

        const sortedTechs = techs.map(t => ({
          name: t.name,
          closed: closedCountMap[t.id] || 0,
          open: 0
        })).sort((a, b) => b.closed - a.closed);

        setTechnicianData(sortedTechs);
      }

      // 4. Chart Data
      // 4. Chart Data - Downtime per Machine
      const machineDowntimeMap: Record<string, number> = {};

      orders.forEach(order => {
        const machineName = order.assets?.name || 'Desconhecido';
        const hours = Number(order.downtime_hours) || 0;
        if (hours > 0) {
          machineDowntimeMap[machineName] = (machineDowntimeMap[machineName] || 0) + hours;
        }
      });

      const downtimeChartData = Object.entries(machineDowntimeMap)
        .map(([name, value], index) => {
          const colors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#3b82f6'];
          return {
            name,
            value,
            color: colors[index % colors.length]
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      if (downtimeChartData.length === 0) {
        downtimeChartData.push({ name: 'Sem dados', value: 0, color: '#CBD5E1' });
      }

      setDowntimeData(downtimeChartData);
      setTotalDowntime(totalDowntimeVal);

      // Map Timeline Data - Wait vs Execution
      // Filter for orders that have meaningful time data
      const validTimelineOrders = orders
        .filter(o => (Number(o.downtime_hours) > 0 || Number(o.repair_hours) > 0))
        .slice(0, 5);

      const timeline = validTimelineOrders.map(order => {
        const downtime = Number(order.downtime_hours) || 0;
        const repair = Number(order.repair_hours) || 0;
        // Wait Time = Total Downtime - Repair Time
        // Ensure we don't get negative values if data is inconsistent
        const waitTime = Math.max(0, downtime - repair);

        return {
          machine: order.assets?.name || 'Máquina',
          date: new Date(order.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          waitTime: Number(waitTime.toFixed(1)),
          execTime: Number(repair.toFixed(1))
        };
      });
      setTimelineData(timeline);

      // Map Recent Orders Table
      const tableData = orders.slice(0, 10).map(order => ({
        id: order.id.substring(0, 8).toUpperCase(),
        asset_name: order.assets?.name || 'Desconhecido',
        issue: order.issue || 'Sem descrição',
        status: order.status || 'Pendente',
        technician_name: order.technicians?.name || 'Não atribuído',
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
      case 'concluído': return 'bg-green-100 text-green-700';
      case 'em manutenção': return 'bg-blue-100 text-blue-700';
      case 'aguardando peça': return 'bg-amber-100 text-amber-700';
      case 'pendente': return 'bg-orange-100 text-orange-700';
      case 'crítico': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Helper for Technician Avatar Color
  const getAvatarInfo = (name: string) => {
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    // Simple hash for color consistency
    const colorIndex = name.charCodeAt(0) % 5;
    const colors = ['bg-indigo-100 text-indigo-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-amber-100 text-amber-700', 'bg-purple-100 text-purple-700'];
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
      return (
        <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-semibold text-slate-900 mb-2">{payload[0].payload.machine} ({payload[0].payload.date})</p>
          <p className="text-sm text-orange-600">
            Horas Paradas: <span className="font-bold">{payload[0].payload.waitTime}h</span>
          </p>
          <p className="text-sm text-blue-600">
            Horas Reparo: <span className="font-bold">{payload[0].payload.execTime}h</span>
          </p>
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
      {/* KPI Section - Updated Layout to 3 columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-2">

        {/* Chamados Pendentes (Abertos) */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <AlertCircle size={24} />
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">Chamados Pendentes</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{kpis.openTickets}</h3>
            {kpis.urgentTickets > 0 && (
              <span className="text-sm font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                {kpis.urgentTickets} Urgentes
              </span>
            )}
          </div>
        </div>

        {/* Chamados em Manutenção */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Activity size={24} />
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">Em Manutenção</p>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{kpis.maintenanceTickets}</h3>
        </div>

        {/* Chamados Concluídos */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-green-500">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <Activity size={24} />
            </div>
            <span className="flex items-center text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
              Total
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">Chamados Concluídos</p>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{kpis.completedTickets}</h3>
        </div>

        {/* MTTR */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Timer size={24} />
            </div>
            <span className="flex items-center text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
              <TrendingDown size={14} className="mr-1" />
              -5%
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">MTTR (Tempo de Reparo)</p>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{kpis.mttr}</h3>
        </div>

        {/* MTBF */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Activity size={24} />
            </div>
            <span className="flex items-center text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
              <TrendingUp size={14} className="mr-1" />
              +8%
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">MTBF (Intervalo Falhas)</p>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{kpis.mtbf}</h3>
        </div>

        {/* Downtime */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <Ban size={24} />
            </div>
            <span className="flex items-center text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">
              +0.5%
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">Taxa de Parada</p>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{kpis.downtimeRate}</h3>
        </div>
      </div>

      {/* Additional KPIs - Time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
        {/* Horas Paradas */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-red-500">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <AlertCircle size={24} />
            </div>
            <span className="text-xs text-slate-500">Abertura até Conclusão</span>
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">Horas Paradas</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-red-600 tracking-tight">{kpis.totalDowntime}h</h3>
            <span className="text-sm text-slate-400">Média: {kpis.totalDowntime}h</span>
          </div>
        </div>

        {/* Média Espera */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <Timer size={24} />
            </div>
            <span className="text-xs text-slate-500">Abertura → Início</span>
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">Média Espera</p>
          <h3 className="text-3xl font-bold text-orange-600 tracking-tight">{kpis.avgWait}h</h3>
        </div>

        {/* Média Execução */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Activity size={24} />
            </div>
            <span className="text-xs text-slate-500">Início → Conclusão</span>
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">Média Execução</p>
          <h3 className="text-3xl font-bold text-blue-600 tracking-tight">{kpis.avgExecution}h</h3>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Horas Paradas por Máquina */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="text-red-500" size={20} />
                Horas Paradas por Máquina
              </h3>
              <p className="text-sm text-slate-500">Tempo de inatividade acumulado (baseado em ordens reais)</p>
            </div>
          </div>
          <div className="space-y-4">
            {downtimeData.slice(0, 5).map((item, index) => (
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
            <span className="text-xl font-black text-red-500">{totalDowntime.toFixed(1)}h</span>
          </div>
        </div>

        {/* Desempenho Técnico */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="text-green-500" size={20} />
              Desempenho Técnico
            </h3>
            <p className="text-sm text-slate-500">Chamados concluídos (Histórico Total)</p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={technicianData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
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
              {(technicianData.reduce((acc, curr) => acc + curr.closed, 0) / (technicianData.length || 1)).toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="text-primary" size={20} />
              Linha do Tempo: Espera vs Execução
            </h3>
            <p className="text-sm text-slate-500">Cronologia dos últimos atendimentos (Data - Máquina)</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1">
              <span className="size-3 rounded-full bg-orange-500"></span> Horas Paradas
            </div>
            <div className="flex items-center gap-1">
              <span className="size-3 rounded-full bg-blue-500"></span> Horas Reparo
            </div>
          </div>
        </div>
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData} layout="vertical" barGap={0} barCategoryGap="20%">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="date" width={100} hide />
              <Tooltip content={<CustomTimelineTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="waitTime" stackId="a" fill="#f97316" radius={[4, 0, 0, 4]} barSize={20} />
              <Bar dataKey="execTime" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {timelineData.reduce((acc, curr) => acc + curr.waitTime, 0).toFixed(1)}h
            </div>
            <div className="text-xs text-slate-500 mt-1">Total Tempo de Espera</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {timelineData.reduce((acc, curr) => acc + curr.execTime, 0).toFixed(1)}h
            </div>
            <div className="text-xs text-slate-500 mt-1">Total Tempo de Execução</div>
          </div>
        </div>
      </div>

      {/* Recent Work Orders */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Ordens de Serviço Recentes</h3>
          <a href="#" className="text-sm font-medium text-primary hover:text-green-600">Ver Todas</a>
        </div>
        <div className="overflow-x-auto">
          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-500 italic">
              Nenhuma ordem de serviço encontrada. Cadastre novas ordens para vê-las aqui.
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Ativo</th>
                  <th className="px-6 py-4">Problema</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Técnico</th>
                  <th className="px-6 py-4 text-right">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map(order => {
                  const { initials, color } = getAvatarInfo(order.technician_name);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-500">#OS-{order.id}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{order.asset_name}</td>
                      <td className="px-6 py-4">{order.issue}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        {order.technician_name !== 'Não atribuído' ? (
                          <>
                            <div className={`size-6 rounded-full ${color} flex items-center justify-center text-[10px] font-bold`}>
                              {initials}
                            </div>
                            <span>{order.technician_name}</span>
                          </>
                        ) : (
                          <>
                            <div className="size-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                              --
                            </div>
                            <span className="italic text-slate-400">Não atribuído</span>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500">{order.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
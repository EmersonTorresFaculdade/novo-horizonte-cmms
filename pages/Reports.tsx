import React, { useState, useEffect, useRef } from 'react';
import {
    Activity,
    CheckCircle,
    BarChart3,
    Clock,
    DollarSign,
    AlertTriangle,
    ThumbsUp,
    Printer,
    FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Basic Error Boundary
class ErrorBoundary extends React.Component<any, any> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("Reports Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 bg-red-50 text-red-800 rounded-lg border border-red-200">
                    <h2 className="text-xl font-bold mb-2">Algo deu errado no relatório</h2>
                    <p className="font-mono text-sm bg-white p-4 rounded border border-red-100 overflow-auto">
                        {this.state.error && this.state.error.toString()}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Recarregar Página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

const ReportsContent = () => {
    const [period, setPeriod] = useState('month');
    const [loading, setLoading] = useState(true);
    const reportRef = useRef<HTMLDivElement>(null);

    const [stats, setStats] = useState({
        totalWorkOrders: 0,
        completedWorkOrders: 0,
        pendingWorkOrders: 0,
        urgentWorkOrders: 0,
        totalTechnicians: 0,
        activeTechnicians: 0,
        totalAssets: 0,
        criticalAssets: 0,
        inventoryValue: 0,
        mttr: 0,
        mtbf: 0,
        reliability: 0,
        totalDowntime: 0,
        estimatedLaborCost: 0,
        totalMaintenanceCost: 0
    });

    const [chartData, setChartData] = useState({
        status: [] as any[],
        priority: [] as any[],
        assetsStatus: [] as any[],
        technicianPerformance: [] as any[],
        topProblematicAssets: [] as any[]
    });

    useEffect(() => {
        loadStats();
    }, [period]);

    const getDateRange = () => {
        const now = new Date();
        let startDate = new Date();

        switch (period) {
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'quarter':
                startDate.setMonth(now.getMonth() - 3);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setMonth(now.getMonth() - 1);
        }
        return startDate;
    };

    const loadStats = async () => {
        try {
            setLoading(true);
            const startDate = getDateRange();
            const startISO = startDate.toISOString();

            // Fetch filtered data
            const { data: workOrders, error: woError } = await supabase
                .from('work_orders')
                .select('*')
                .gte('created_at', startISO);

            const { data: technicians, error: techError } = await supabase.from('technicians').select('*');
            const { data: assets, error: assetError } = await supabase.from('assets').select('*');
            const { data: inventory, error: invError } = await supabase.from('inventory_items').select('*');

            if (woError) console.error("WO Error", woError);
            if (techError) console.error("Tech Error", techError);
            if (assetError) console.error("Asset Error", assetError);
            if (invError) console.error("Inv Error", invError);

            const woData = workOrders || [];
            const techData = technicians || [];
            const assetData = assets || [];
            const invData = inventory || [];

            // --- Basic KPIs ---
            const totalWO = woData.length;
            const completedWO = woData.filter(wo => wo.status === 'Concluído');
            const pendingWO = woData.filter(wo => ['Pendente', 'Em Andamento'].includes(wo.status)).length;
            const urgentWO = woData.filter(wo => wo.priority === 'Alta').length;

            const totalAssets = assetData.length;
            const criticalAssets = assetData.filter(a => a.status === 'Crítico' || a.status === 'Parado').length;
            const inventoryVal = invData.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unit_value)), 0);

            // --- Advanced Analytics ---
            const totalRepairHours = completedWO.reduce((acc, wo) => acc + (Number(wo.repair_hours) || 0), 0);
            const mttr = completedWO.length > 0 ? (totalRepairHours / completedWO.length).toFixed(1) : 0;

            const periodDays = Math.max(1, Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 3600 * 24)));
            const totalDowntimeHours = woData.reduce((acc, wo) => acc + (Number(wo.downtime_hours) || 0), 0);
            const totalPossibleTime = periodDays * 24 * (totalAssets || 1);
            const operationalTime = Math.max(0, totalPossibleTime - totalDowntimeHours);
            const failureCount = woData.length;
            const mtbf = failureCount > 0 ? (operationalTime / failureCount).toFixed(1) : operationalTime.toFixed(1);

            const reliability = totalPossibleTime > 0 ? ((operationalTime / totalPossibleTime) * 100).toFixed(1) : 100;

            // Labor Cost Calculation (Per Work Order)
            const laborCost = completedWO.reduce((acc, wo) => {
                const hours = Number(wo.repair_hours) || 0;
                const rate = Number(wo.hourly_rate) || 50; // Fallback to 50 if null
                return acc + (hours * rate);
            }, 0);

            const partsCostEst = woData.reduce((acc, wo) => {
                if (wo.priority === 'Baixa') return acc + 50;
                if (wo.priority === 'Média') return acc + 100;
                if (wo.priority === 'Alta') return acc + 300;
                return acc + 500;
            }, 0);

            const totalCost = laborCost + partsCostEst;

            setStats({
                totalWorkOrders: totalWO,
                completedWorkOrders: completedWO.length,
                pendingWorkOrders: pendingWO,
                urgentWorkOrders: urgentWO,
                totalTechnicians: techData.length,
                activeTechnicians: techData.filter(t => t.status === 'Ativo').length,
                totalAssets: totalAssets,
                criticalAssets: criticalAssets,
                inventoryValue: inventoryVal,
                mttr: Number(mttr),
                mtbf: Number(mtbf),
                reliability: Number(reliability),
                totalDowntime: totalDowntimeHours,
                estimatedLaborCost: laborCost,
                totalMaintenanceCost: totalCost
            });

            // --- Chart Data ---
            const statusCount = woData.reduce((acc: any, curr) => {
                acc[curr.status] = (acc[curr.status] || 0) + 1;
                return acc;
            }, {});
            const statusData = Object.keys(statusCount).map(key => ({ name: key, value: statusCount[key] }));

            const priorityCount = woData.reduce((acc: any, curr) => {
                acc[curr.priority] = (acc[curr.priority] || 0) + 1;
                return acc;
            }, {});
            const priorityData = Object.keys(priorityCount).map(key => ({ name: key, value: priorityCount[key] }));

            const assetStatusCount = assetData.reduce((acc: any, curr) => {
                acc[curr.status] = (acc[curr.status] || 0) + 1;
                return acc;
            }, {});
            const assetStatusData = Object.keys(assetStatusCount).map(key => ({ name: key, value: assetStatusCount[key] }));

            const techPerformance = techData.map(tech => {
                const completedCount = woData.filter(wo => wo.technician_id === tech.id && wo.status === 'Concluído').length;
                return { name: tech.name, completed: completedCount };
            }).sort((a, b) => b.completed - a.completed).slice(0, 5);

            const assetDowntimeMap: { [key: string]: number } = {};
            woData.forEach(wo => {
                if (wo.asset_id && wo.downtime_hours) {
                    assetDowntimeMap[wo.asset_id] = (assetDowntimeMap[wo.asset_id] || 0) + Number(wo.downtime_hours);
                }
            });

            const problematicAssets = Object.entries(assetDowntimeMap)
                .map(([id, hours]) => {
                    const asset = assetData.find(a => a.id === id);
                    return {
                        name: asset ? asset.name : 'Desconhecido',
                        hours: hours,
                        id: id
                    };
                })
                .sort((a, b) => b.hours - a.hours)
                .slice(0, 5);

            setChartData({
                status: statusData,
                priority: priorityData,
                assetsStatus: assetStatusData,
                technicianPerformance: techPerformance,
                topProblematicAssets: problematicAssets
            });

        } catch (error) {
            console.error('Erro ao carregar relatório:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = async () => {
        if (!reportRef.current) return;

        try {
            const canvas = await html2canvas(reportRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`relatorio_pcm_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro ao gerar PDF: ' + error);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header (Screen Only) */}
            <div className="flex flex-col gap-2 print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Relatórios Gerenciais (PCM)</h2>
                        <p className="text-slate-500 max-w-2xl">Análise avançada de confiabilidade, custos e performance.</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary bg-white shadow-sm"
                        >
                            <option value="week">Últimos 7 Dias</option>
                            <option value="month">Último Mês</option>
                            <option value="quarter">Último Trimestre</option>
                            <option value="year">Último Ano</option>
                        </select>
                        <button
                            onClick={handleExportPDF}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-md transition-all"
                        >
                            <Printer size={16} />
                            Exportar PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Container (PDF Target) */}
            <div ref={reportRef} className="bg-slate-50 p-8 min-h-screen">
                <div className="mb-8 flex justify-between items-center border-b pb-4 border-slate-200">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Relatório de PCM</h1>
                        <p className="text-sm text-slate-500">
                            Planejamento e Controle de Manutenção • {period === 'week' ? 'Semanal' : period === 'month' ? 'Mensal' : period === 'quarter' ? 'Trimestral' : 'Anual'}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">Novo Horizonte CMMS</p>
                        <p className="text-xs text-slate-500">Emitido em: {new Date().toLocaleDateString()} às {new Date().toLocaleTimeString()}</p>
                    </div>
                </div>

                {/* 1. Executive Summary KPIs */}
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-primary" /> Indicadores Chave de Performance (KPIs)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10"><Clock size={40} /></div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">MTTR (Médio Reparo)</p>
                        <h3 className="text-2xl font-black text-slate-900">{stats.mttr} <span className="text-sm font-normal text-slate-500">horas</span></h3>
                        <p className="text-xs text-green-600 mt-2 font-medium">Meta: &lt; 2.0h</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10"><CheckCircle size={40} /></div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">MTBF (Confiabilidade)</p>
                        <h3 className="text-2xl font-black text-slate-900">{stats.mtbf} <span className="text-sm font-normal text-slate-500">horas</span></h3>
                        <p className="text-xs text-blue-600 mt-2 font-medium">Entre falhas</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10"><ThumbsUp size={40} /></div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Disponibilidade</p>
                        <h3 className="text-2xl font-black text-slate-900">{stats.reliability}%</h3>
                        <p className="text-xs text-slate-500 mt-2">Tempo Operacional</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10"><DollarSign size={40} /></div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Custo Total Est.</p>
                        <h3 className="text-2xl font-black text-slate-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.totalMaintenanceCost)}
                        </h3>
                        <div className="text-xs text-slate-500 mt-2 flex justify-between">
                            <span>MO: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.estimatedLaborCost)}</span>
                        </div>
                    </div>
                </div>

                {/* 2. Charts Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Status Pie Chart */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase">Distribuição de Status</h4>
                        <div className="h-60">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie
                                        data={chartData.status}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={70}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                    >
                                        {chartData.status.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Problematic Assets */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase flex items-center gap-2">
                            <AlertTriangle size={16} className="text-amber-500" /> Top 5 Ativos com Mais Paradas
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2">Ativo</th>
                                        <th className="px-4 py-2 text-right">Horas Paradas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {chartData.topProblematicAssets.length > 0 ? (
                                        chartData.topProblematicAssets.map((asset, index) => (
                                            <tr key={index} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                                <td className="px-4 py-3 font-medium text-slate-900">{asset.name}</td>
                                                <td className="px-4 py-3 text-right font-bold text-red-600">{asset.hours}h</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={2} className="px-4 py-8 text-center text-slate-400">
                                                Nenhum dado de parada registrado no período.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Tech Performance */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase">Produtividade Técnica</h4>
                        <div className="h-60">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={chartData.technicianPerformance}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="completed" fill="#00C49F" radius={[0, 4, 4, 0]} barSize={20} name="OS Concluídas" label={{ position: 'right' }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Cost Breakdown estimated */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                        <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase">Estimativa de Custos</h4>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600">Mão de Obra (Realizado)</span>
                                    <span className="font-bold text-slate-900">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.estimatedLaborCost)}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full"
                                        style={{ width: `${stats.totalMaintenanceCost > 0 ? (stats.estimatedLaborCost / stats.totalMaintenanceCost) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600">Peças & Materiais (Estimado)</span>
                                    <span className="font-bold text-slate-900">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalMaintenanceCost - stats.estimatedLaborCost)}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div
                                        className="bg-amber-500 h-2 rounded-full"
                                        style={{ width: `${stats.totalMaintenanceCost > 0 ? ((stats.totalMaintenanceCost - stats.estimatedLaborCost) / stats.totalMaintenanceCost) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div className="pt-4 mt-2 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-900">Custo Total</span>
                                <span className="text-xl font-black text-slate-900">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalMaintenanceCost)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Analysis */}
                <div className="bg-slate-100 p-6 rounded-xl border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-800 mb-2 uppercase flex items-center gap-2">
                        <FileText size={16} /> Insights Automatizados
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed text-justify">
                        O sistema registrou uma confiabilidade de <strong>{stats.reliability}%</strong> no período selecionado.
                        O tempo médio para reparo (MTTR) atual é de <strong>{stats.mttr} horas</strong>, indicando a eficiência da equipe técnica na resolução de falhas.
                        {stats.criticalAssets > 0
                            ? ` Atenção especial é recomendada para ${stats.criticalAssets} ativos que se encontram em estado crítico.`
                            : ' Todos os ativos monitorados estão operando dentro dos parâmetros de normalidade.'}
                        Financeiramente, estima-se que <strong>{((stats.estimatedLaborCost / stats.totalMaintenanceCost) * 100 || 0).toFixed(0)}%</strong> dos custos operacionais sejam derivados de mão de obra direta.
                    </p>
                </div>
            </div>
        </div>
    );
}

const Reports = () => {
    return (
        <ErrorBoundary>
            <ReportsContent />
        </ErrorBoundary>
    );
};

export default Reports;

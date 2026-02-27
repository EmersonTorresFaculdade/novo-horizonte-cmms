import { jsx, jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  CheckCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  ThumbsUp,
  Printer,
  FileText
} from "lucide-react";
import FeedbackModal from "../components/FeedbackModal";
import { supabase } from "../lib/supabase";
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
  Cell
} from "recharts";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Reports Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return /* @__PURE__ */ jsxs("div", { className: "p-8 bg-red-50 text-red-800 rounded-lg border border-red-200", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold mb-2", children: "Algo deu errado no relat\xF3rio" }),
        /* @__PURE__ */ jsx("p", { className: "font-mono text-sm bg-white p-4 rounded border border-red-100 overflow-auto", children: this.state.error && this.state.error.toString() }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => window.location.reload(),
            className: "mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700",
            children: "Recarregar P\xE1gina"
          }
        )
      ] });
    }
    return this.props.children;
  }
}
const ReportsContent = () => {
  const [searchParams] = useSearchParams();
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const reportRef = useRef(null);
  const [feedback, setFeedback] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: ""
  });
  const [stats, setStats] = useState({
    totalWorkOrders: 0,
    completedWorkOrders: 0,
    pendingWorkOrders: 0,
    inMaintenanceWorkOrders: 0,
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
    status: [],
    priority: [],
    assetsStatus: [],
    technicianPerformance: [],
    topProblematicAssets: []
  });
  useEffect(() => {
    loadStats();
  }, [period]);
  useEffect(() => {
    if (!loading && searchParams.get("auto_export") === "true") {
      const timer = setTimeout(() => {
        handleExportPDF();
      }, 1e3);
      return () => clearTimeout(timer);
    }
  }, [loading, searchParams]);
  const getDateRange = () => {
    const now = /* @__PURE__ */ new Date();
    let startDate = /* @__PURE__ */ new Date();
    switch (period) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "year":
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
      const { data: workOrders, error: woError } = await supabase.from("work_orders").select("*").gte("created_at", startISO);
      const { data: technicians, error: techError } = await supabase.from("technicians").select("*");
      const { data: assets, error: assetError } = await supabase.from("assets").select("*");
      const { data: inventory, error: invError } = await supabase.from("inventory_items").select("*");
      if (woError) console.error("WO Error", woError);
      if (techError) console.error("Tech Error", techError);
      if (assetError) console.error("Asset Error", assetError);
      if (invError) console.error("Inv Error", invError);
      const woData = workOrders || [];
      const techData = technicians || [];
      const assetData = assets || [];
      const invData = inventory || [];
      const totalWO = woData.length;
      const completedWO = woData.filter((wo) => wo.status?.toLowerCase() === "conclu\xEDdo");
      const openWO = woData.filter((wo) => wo.status?.toLowerCase() !== "conclu\xEDdo" && wo.status?.toLowerCase() !== "cancelado");
      const pendingWO = woData.filter((wo) => wo.status?.toLowerCase() === "pendente").length;
      const inMaintenanceWO = woData.filter((wo) => wo.status?.toLowerCase() === "em manuten\xE7\xE3o").length;
      const totalAssets = assetData.length;
      const criticalAssets = assetData.filter((a) => a.status === "Cr\xEDtico" || a.status === "Parado").length;
      const inventoryVal = invData.reduce((acc, item) => acc + Number(item.quantity) * Number(item.unit_value), 0);
      const backlogHours = openWO.reduce((acc, wo) => acc + (Number(wo.estimated_hours) || 0), 0);
      const totalRepairHours = completedWO.reduce((acc, wo) => acc + (Number(wo.repair_hours) || 0), 0);
      const mttr = completedWO.length > 0 ? (totalRepairHours / completedWO.length).toFixed(1) : 0;
      const periodDays = Math.max(1, Math.floor(((/* @__PURE__ */ new Date()).getTime() - startDate.getTime()) / (1e3 * 3600 * 24)));
      const totalDowntimeHours = woData.reduce((acc, wo) => acc + (Number(wo.downtime_hours) || 0), 0);
      const totalPossibleTime = periodDays * 24 * (totalAssets || 1);
      const operationalTime = Math.max(0, totalPossibleTime - totalDowntimeHours);
      const failureCount = woData.length;
      const mtbf = failureCount > 0 ? (operationalTime / failureCount).toFixed(1) : operationalTime.toFixed(1);
      const reliability = totalPossibleTime > 0 ? (operationalTime / totalPossibleTime * 100).toFixed(1) : 100;
      const totalResponseHours = completedWO.reduce((acc, wo) => acc + (Number(wo.response_hours) || 0), 0);
      const mtta = completedWO.length > 0 ? (totalResponseHours / completedWO.length).toFixed(1) : 0;
      const laborCost = completedWO.reduce((acc, wo) => {
        const hours = Number(wo.repair_hours) || 0;
        const rate = Number(wo.hourly_rate) || 50;
        return acc + hours * rate;
      }, 0);
      const actualPartsCost = completedWO.reduce((acc, wo) => acc + (Number(wo.parts_cost) || 0), 0);
      const totalCost = laborCost + actualPartsCost;
      setStats({
        totalWorkOrders: totalWO,
        completedWorkOrders: completedWO.length,
        pendingWorkOrders: pendingWO,
        inMaintenanceWorkOrders: inMaintenanceWO,
        totalTechnicians: techData.length,
        activeTechnicians: techData.filter((t) => t.status === "Ativo").length,
        totalAssets,
        criticalAssets,
        inventoryValue: inventoryVal,
        mttr: Number(mttr),
        mtbf: Number(mtbf),
        mtta: Number(mtta),
        backlog: backlogHours,
        reliability: Number(reliability),
        totalDowntime: totalDowntimeHours,
        estimatedLaborCost: laborCost,
        totalMaintenanceCost: totalCost
      });
      const statusCount = woData.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {});
      const statusData = Object.keys(statusCount).map((key) => ({ name: key, value: statusCount[key] }));
      const priorityCount = woData.reduce((acc, curr) => {
        acc[curr.priority] = (acc[curr.priority] || 0) + 1;
        return acc;
      }, {});
      const priorityData = Object.keys(priorityCount).map((key) => ({ name: key, value: priorityCount[key] }));
      const assetStatusCount = assetData.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {});
      const assetStatusData = Object.keys(assetStatusCount).map((key) => ({ name: key, value: assetStatusCount[key] }));
      const techPerformance = techData.map((tech) => {
        const completedCount = woData.filter((wo) => wo.technician_id === tech.id && wo.status === "Conclu\xEDdo").length;
        return { name: tech.name, completed: completedCount };
      }).sort((a, b) => b.completed - a.completed).slice(0, 5);
      const assetDowntimeMap = {};
      woData.forEach((wo) => {
        if (wo.asset_id && wo.downtime_hours) {
          assetDowntimeMap[wo.asset_id] = (assetDowntimeMap[wo.asset_id] || 0) + Number(wo.downtime_hours);
        }
      });
      const problematicAssets = Object.entries(assetDowntimeMap).map(([id, hours]) => {
        const asset = assetData.find((a) => a.id === id);
        return {
          name: asset ? asset.name : "Desconhecido",
          hours,
          id
        };
      }).sort((a, b) => b.hours - a.hours).slice(0, 5);
      setChartData({
        status: statusData,
        priority: priorityData,
        assetsStatus: assetStatusData,
        technicianPerformance: techPerformance,
        topProblematicAssets: problematicAssets
      });
    } catch (error) {
      console.error("Erro ao carregar relat\xF3rio:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = canvas.height * pdfWidth / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`relatorio_pcm_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      setFeedback({
        isOpen: true,
        type: "error",
        title: "Erro na Exporta\xE7\xE3o",
        message: "Ocorreu um erro ao gerar o arquivo PDF. Tente novamente."
      });
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-6", children: [
    /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-2 print:hidden", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col md:flex-row justify-between items-start md:items-end gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { className: "text-3xl font-black text-slate-900 tracking-tight", children: "Relat\xF3rios Gerenciais (PCM)" }),
        /* @__PURE__ */ jsx("p", { className: "text-slate-500 max-w-2xl", children: "An\xE1lise avan\xE7ada de confiabilidade, custos e performance." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 flex-wrap md:flex-nowrap", children: [
        /* @__PURE__ */ jsxs(
          "select",
          {
            value: period,
            onChange: (e) => setPeriod(e.target.value),
            className: "px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary bg-white shadow-sm",
            children: [
              /* @__PURE__ */ jsx("option", { value: "today", children: "Hoje" }),
              /* @__PURE__ */ jsx("option", { value: "week", children: "\xDAltimos 7 Dias" }),
              /* @__PURE__ */ jsx("option", { value: "month", children: "\xDAltimo M\xEAs" }),
              /* @__PURE__ */ jsx("option", { value: "quarter", children: "\xDAltimo Trimestre" }),
              /* @__PURE__ */ jsx("option", { value: "year", children: "\xDAltimo Ano" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleExportPDF,
            className: "px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-md transition-all",
            children: [
              /* @__PURE__ */ jsx(Printer, { size: 16 }),
              "Exportar PDF"
            ]
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { ref: reportRef, className: "bg-slate-50 p-8 min-h-screen", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-8 flex justify-between items-center border-b pb-4 border-slate-200", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-slate-900", children: "Relat\xF3rio de PCM" }),
          /* @__PURE__ */ jsxs("p", { className: "text-sm text-slate-500", children: [
            "Planejamento e Controle de Manuten\xE7\xE3o \u2022 ",
            period === "today" ? "Di\xE1rio" : period === "week" ? "Semanal" : period === "month" ? "Mensal" : period === "quarter" ? "Trimestral" : "Anual"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-slate-900", children: "Novo Horizonte Alum\xEDnios" }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500", children: [
            "Emitido em: ",
            (/* @__PURE__ */ new Date()).toLocaleDateString(),
            " \xE0s ",
            (/* @__PURE__ */ new Date()).toLocaleTimeString()
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-3xl font-black text-blue-600 mb-1", children: stats.totalWorkOrders }),
          /* @__PURE__ */ jsx("p", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest", children: "Total" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-3xl font-black text-emerald-500 mb-1", children: stats.completedWorkOrders }),
          /* @__PURE__ */ jsx("p", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest", children: "Conclu\xEDdos" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-3xl font-black text-orange-500 mb-1", children: stats.pendingWorkOrders }),
          /* @__PURE__ */ jsx("p", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest", children: "Abertos" }),
          /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-slate-400 mt-2 font-medium", title: "Soma de horas estimadas das OSs abertas", children: [
            "Backlog: ",
            stats.backlog,
            "h"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-3xl font-black text-indigo-500 mb-1", children: stats.inMaintenanceWorkOrders }),
          /* @__PURE__ */ jsx("p", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest", children: "Em Manuten\xE7\xE3o" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("h3", { className: "text-lg font-bold text-slate-800 mb-4 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Activity, { size: 20, className: "text-primary" }),
        " Indicadores T\xE9cnicos"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4 mb-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute top-0 right-0 p-3 opacity-10", children: /* @__PURE__ */ jsx(Clock, { size: 40 }) }),
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Tempo M\xE9dio de Reparo" }),
          /* @__PURE__ */ jsxs("h3", { className: "text-2xl font-black text-slate-900", children: [
            stats.mttr,
            " ",
            /* @__PURE__ */ jsx("span", { className: "text-sm font-normal text-slate-500", children: "h" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mt-2", children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-green-600 font-medium", children: "Meta: < 2.0h" }),
            /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 font-medium", title: "Mean Time To Acknowledge (Tempo M\xE9dio de Atendimento)", children: [
              "MTTA: ",
              stats.mtta,
              "h"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute top-0 right-0 p-3 opacity-10", children: /* @__PURE__ */ jsx(CheckCircle, { size: 40 }) }),
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Tempo M\xE9dio Entre Falhas" }),
          /* @__PURE__ */ jsxs("h3", { className: "text-2xl font-black text-slate-900", children: [
            stats.mtbf,
            " ",
            /* @__PURE__ */ jsx("span", { className: "text-sm font-normal text-slate-500", children: "horas" })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-blue-600 mt-2 font-medium", children: "Intervalo de falhas" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute top-0 right-0 p-3 opacity-10", children: /* @__PURE__ */ jsx(ThumbsUp, { size: 40 }) }),
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Confiabilidade do Sistema" }),
          /* @__PURE__ */ jsxs("h3", { className: "text-2xl font-black text-slate-900", children: [
            stats.reliability,
            "%"
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mt-2", children: "Tempo Operacional" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute top-0 right-0 p-3 opacity-10", children: /* @__PURE__ */ jsx(DollarSign, { size: 40 }) }),
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1", children: "Custo Total (Real)" }),
          /* @__PURE__ */ jsx("h3", { className: "text-2xl font-black text-slate-900", children: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(stats.totalMaintenanceCost) }),
          /* @__PURE__ */ jsxs("div", { className: "text-xs text-slate-500 mt-2 flex justify-between", children: [
            /* @__PURE__ */ jsxs("span", { title: "Custo de M\xE3o de Obra", children: [
              "MO: ",
              new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(stats.estimatedLaborCost)
            ] }),
            /* @__PURE__ */ jsxs("span", { title: "Custo Real de Pe\xE7as", children: [
              "Pe\xE7as: ",
              new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(stats.totalMaintenanceCost - stats.estimatedLaborCost)
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-white p-6 rounded-xl border border-slate-200 shadow-sm", children: [
          /* @__PURE__ */ jsx("h4", { className: "text-sm font-bold text-slate-700 mb-4 uppercase", children: "Distribui\xE7\xE3o de Status" }),
          /* @__PURE__ */ jsx("div", { className: "h-60", children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxs(RechartsPieChart, { children: [
            /* @__PURE__ */ jsx(
              Pie,
              {
                data: chartData.status,
                cx: "50%",
                cy: "50%",
                innerRadius: 50,
                outerRadius: 70,
                fill: "#8884d8",
                paddingAngle: 5,
                dataKey: "value",
                label: ({ name, percent }) => `${(percent * 100).toFixed(0)}%`,
                children: chartData.status.map((entry, index) => /* @__PURE__ */ jsx(Cell, { fill: COLORS[index % COLORS.length] }, `cell-${index}`))
              }
            ),
            /* @__PURE__ */ jsx(Tooltip, {}),
            /* @__PURE__ */ jsx(Legend, { verticalAlign: "bottom", height: 36 })
          ] }) }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-white p-6 rounded-xl border border-slate-200 shadow-sm", children: [
          /* @__PURE__ */ jsxs("h4", { className: "text-sm font-bold text-slate-700 mb-4 uppercase flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(AlertTriangle, { size: 16, className: "text-amber-500" }),
            " Top 5 Ativos com Mais Paradas"
          ] }),
          /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm text-left", children: [
            /* @__PURE__ */ jsx("thead", { className: "text-xs text-slate-500 uppercase bg-slate-50", children: /* @__PURE__ */ jsxs("tr", { children: [
              /* @__PURE__ */ jsx("th", { className: "px-4 py-2", children: "Ativo" }),
              /* @__PURE__ */ jsx("th", { className: "px-4 py-2 text-right", children: "Horas Paradas" })
            ] }) }),
            /* @__PURE__ */ jsx("tbody", { children: chartData.topProblematicAssets.length > 0 ? chartData.topProblematicAssets.map((asset, index) => /* @__PURE__ */ jsxs("tr", { className: "border-b border-slate-100 last:border-0 hover:bg-slate-50", children: [
              /* @__PURE__ */ jsx("td", { className: "px-4 py-3 font-medium text-slate-900", children: asset.name }),
              /* @__PURE__ */ jsxs("td", { className: "px-4 py-3 text-right font-bold text-red-600", children: [
                asset.hours,
                "h"
              ] })
            ] }, index)) : /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 2, className: "px-4 py-8 text-center text-slate-400", children: "Nenhum dado de parada registrado no per\xEDodo." }) }) })
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-white p-6 rounded-xl border border-slate-200 shadow-sm", children: [
          /* @__PURE__ */ jsx("h4", { className: "text-sm font-bold text-slate-700 mb-4 uppercase", children: "Produtividade T\xE9cnica" }),
          /* @__PURE__ */ jsx("div", { className: "h-60", children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxs(BarChart, { layout: "vertical", data: chartData.technicianPerformance, children: [
            /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", horizontal: true, vertical: false }),
            /* @__PURE__ */ jsx(XAxis, { type: "number", hide: true }),
            /* @__PURE__ */ jsx(YAxis, { dataKey: "name", type: "category", width: 100, tick: { fontSize: 12 } }),
            /* @__PURE__ */ jsx(Tooltip, { cursor: { fill: "transparent" } }),
            /* @__PURE__ */ jsx(Bar, { dataKey: "completed", fill: "#00C49F", radius: [0, 4, 4, 0], barSize: 20, name: "OS Conclu\xEDdas", label: { position: "right" } })
          ] }) }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center", children: [
          /* @__PURE__ */ jsx("h4", { className: "text-sm font-bold text-slate-700 mb-4 uppercase", children: "Estimativa de Custos" }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm mb-1", children: [
                /* @__PURE__ */ jsx("span", { className: "text-slate-600", children: "M\xE3o de Obra (Realizado)" }),
                /* @__PURE__ */ jsx("span", { className: "font-bold text-slate-900", children: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stats.estimatedLaborCost) })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "w-full bg-slate-100 rounded-full h-2", children: /* @__PURE__ */ jsx(
                "div",
                {
                  className: "bg-blue-500 h-2 rounded-full",
                  style: { width: `${stats.totalMaintenanceCost > 0 ? stats.estimatedLaborCost / stats.totalMaintenanceCost * 100 : 0}%` }
                }
              ) })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm mb-1", children: [
                /* @__PURE__ */ jsx("span", { className: "text-slate-600", children: "Pe\xE7as & Materiais (Estimado)" }),
                /* @__PURE__ */ jsx("span", { className: "font-bold text-slate-900", children: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stats.totalMaintenanceCost - stats.estimatedLaborCost) })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "w-full bg-slate-100 rounded-full h-2", children: /* @__PURE__ */ jsx(
                "div",
                {
                  className: "bg-amber-500 h-2 rounded-full",
                  style: { width: `${stats.totalMaintenanceCost > 0 ? (stats.totalMaintenanceCost - stats.estimatedLaborCost) / stats.totalMaintenanceCost * 100 : 0}%` }
                }
              ) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "pt-4 mt-2 border-t border-slate-100 flex justify-between items-center", children: [
              /* @__PURE__ */ jsx("span", { className: "text-sm font-bold text-slate-900", children: "Custo Total" }),
              /* @__PURE__ */ jsx("span", { className: "text-xl font-black text-slate-900", children: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stats.totalMaintenanceCost) })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-slate-100 p-6 rounded-xl border border-slate-200", children: [
        /* @__PURE__ */ jsxs("h4", { className: "text-sm font-bold text-slate-800 mb-2 uppercase flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(FileText, { size: 16 }),
          " Insights Automatizados"
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-sm text-slate-600 leading-relaxed text-justify", children: [
          "O sistema registrou uma confiabilidade de ",
          /* @__PURE__ */ jsxs("strong", { children: [
            stats.reliability,
            "%"
          ] }),
          " no per\xEDodo selecionado. O tempo m\xE9dio para reparo (MTTR) atual \xE9 de ",
          /* @__PURE__ */ jsxs("strong", { children: [
            stats.mttr,
            " horas"
          ] }),
          ", indicando a efici\xEAncia da equipe t\xE9cnica na resolu\xE7\xE3o de falhas.",
          stats.criticalAssets > 0 ? ` Aten\xE7\xE3o especial \xE9 recomendada para ${stats.criticalAssets} ativos que se encontram em estado cr\xEDtico.` : " Todos os ativos monitorados est\xE3o operando dentro dos par\xE2metros de normalidade.",
          "Financeiramente, estima-se que ",
          /* @__PURE__ */ jsxs("strong", { children: [
            (stats.estimatedLaborCost / stats.totalMaintenanceCost * 100 || 0).toFixed(0),
            "%"
          ] }),
          " dos custos operacionais sejam derivados de m\xE3o de obra direta."
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(
      FeedbackModal,
      {
        isOpen: feedback.isOpen,
        onClose: () => setFeedback({ ...feedback, isOpen: false }),
        type: feedback.type,
        title: feedback.title,
        message: feedback.message
      }
    )
  ] });
};
const Reports = () => {
  return /* @__PURE__ */ jsx(ErrorBoundary, { children: /* @__PURE__ */ jsx(ReportsContent, {}) });
};
export default Reports;

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Activity,
    CheckCircle,
    BarChart3,
    Clock,
    DollarSign,
    AlertTriangle,
    ThumbsUp,
    Printer,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    TrendingDown,
    Shield,
    Target,
    Zap,
    Download,
    Mail,
    FileSpreadsheet,
    Gauge
} from 'lucide-react';
import FeedbackModal from '../components/FeedbackModal';
import { supabase } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
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
    LineChart,
    Line,
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Basic Error Boundary
interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: any;
}

class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error: any }
> {
    public state = { hasError: false, error: null };
    public props: { children: React.ReactNode };

    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.props = props;
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
                        className="mt-4 px-4 py-2 bg-brand-alert text-white rounded hover:bg-[#c9302c]"
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
    const { settings } = useSettings();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'admin_root';
    const [searchParams] = useSearchParams();
    const [period, setPeriod] = useState('month');
    const [categoryFilter, setCategoryFilter] = useState('ALL');

    const availableCategories = React.useMemo(() => {
        const cats = [
            { id: 'ALL', label: 'Todas Categorias' },
            { id: 'Equipamento', label: 'MÁQUINAS', permission: user?.manage_equipment },
            { id: 'Predial', label: 'PREDIAL', permission: user?.manage_predial },
            { id: 'Outros', label: 'OUTROS', permission: user?.manage_others }
        ];

        if (user?.role === 'admin_root') return cats;
        
        // Filter out categories without permission
        const filtered = cats.filter(c => c.id === 'ALL' || c.permission);
        return filtered;
    }, [user]);

    // Ensure categoryFilter is valid
    useEffect(() => {
        if (!availableCategories.some(c => c.id === categoryFilter)) {
            if (availableCategories.length > 1) {
                // If 'ALL' is there, maybe use it, or use the first specific one
                setCategoryFilter(availableCategories[0].id);
            }
        }
    }, [availableCategories, categoryFilter]);

    const periodTranslate: any = {
        'week': 'Semanal',
        'month': 'Mensal',
        'quarter': 'Trimestral',
        'year': 'Anual'
    };
    const [loading, setLoading] = useState(true);
    const reportRef = useRef<HTMLDivElement>(null);

    const [feedback, setFeedback] = useState<{
        isOpen: boolean;
        type: 'success' | 'error' | 'confirm' | 'info';
        title: string;
        message: string;
    }>({
        isOpen: false,
        type: 'info',
        title: '',
        message: ''
    });

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailToSend, setEmailToSend] = useState('');

    const [stats, setStats] = useState<any>({
        current: {},
        previous: {},
        trends: {},
        score: 0,
        risk: 'Estável',
        insights: [],
        dimensions: {
            reliability: 0,
            operational: 0,
            financial: 0,
            strategic: 0
        },
        projection: {
            reliability: 0,
            risk: 'Baixo'
        },
        actionPlan: [] as string[]
    });

    const [chartData, setChartData] = useState({
        status: [] as any[],
        priority: [] as any[],
        maintenanceType: [] as any[],
        assetsStatus: [] as any[],
        technicianPerformance: [] as any[],
        topProblematicAssets: [] as any[],
        temporalEvolution: [] as any[]
    });

    // Provide safe defaults for initial state
    const currentStats = stats.current || {};
    const trends = stats.trends || {};

    useEffect(() => {
        loadStats();
    }, [period, categoryFilter]);

    const getDateRange = () => {
        const now = new Date();
        let startDate = new Date();

        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
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

    const calculatePeriodStats = (woData: any[], assetData: any[], days: number, techData: any[]) => {
        const totalWO = woData.length;
        const completedWO = woData.filter(wo => wo.status?.toLowerCase() === 'concluído');
        const inMaintenanceWO = woData.filter(wo => wo.status?.toLowerCase() === 'em manutenção' || wo.status?.toLowerCase() === 'manutenção');
        const openWO = woData.filter(wo => wo.status?.toLowerCase() !== 'concluído' && wo.status?.toLowerCase() !== 'cancelado');
        const preventiveWO = woData.filter(wo => (wo.maintenance_type || '').toLowerCase().includes('preventiva')).length;

        // MTTR
        const totalRepairHours = completedWO.reduce((acc, wo) => acc + (Number(wo.repair_hours) || 0), 0);
        const mttr = completedWO.length > 0 ? totalRepairHours / completedWO.length : 0;

        // Backlog in Days: Total Open Hours / (Active Techs * 8h)
        const activeTechs = techData.filter(t => t.status === 'Ativo').length || 1;
        const estimatedBacklogHours = openWO.length * (mttr || 2);
        const backlogDays = estimatedBacklogHours / (activeTechs * 8);

        // MTBF & Reliability
        const totalDowntimeHours = woData.reduce((acc, wo) => {
            const manualHours = Number(wo.downtime_hours);
            if (manualHours > 0) return acc + manualHours;
            const isPending = !['Concluído', 'Cancelado'].includes(wo.status);
            if (isPending) {
                const start = new Date(wo.created_at).getTime();
                const now = Date.now();
                return acc + Math.max(0, (now - start) / 3600000);
            }
            return acc;
        }, 0);
        const totalPossibleTime = days * 24 * (assetData.length || 1);
        const operationalTime = Math.max(0, totalPossibleTime - totalDowntimeHours);
        const mtbf = totalWO > 0 ? operationalTime / totalWO : operationalTime;
        const reliability = totalPossibleTime > 0 ? (operationalTime / totalPossibleTime) * 100 : 100;

        // MTTA (SLA / Tempo de Resposta)
        const respondedWO = woData.filter((wo) =>
            (Number(wo.response_hours) > 0) ||
            (wo.status?.toLowerCase() === 'em manutenção' || wo.status?.toLowerCase() === 'concluído')
        );

        const totalResponseHours = respondedWO.reduce((acc, wo) => {
            const storedResponse = Number(wo.response_hours) || 0;
            if (storedResponse > 0) return acc + storedResponse;
            if (wo.created_at) {
                const start = new Date(wo.created_at).getTime();
                const end = wo.updated_at ? new Date(wo.updated_at).getTime() : new Date().getTime();
                const diff = (end - start) / (1000 * 60 * 60);
                return acc + Math.max(0, diff);
            }
            return acc;
        }, 0);
        const mtta = respondedWO.length > 0 ? totalResponseHours / respondedWO.length : 0;

        // Custos por Setor e Top 5 Caros
        let indCost = 0; let preCost = 0; let otrCost = 0;
        const assetCostsMap: Record<string, number> = {};

        woData.forEach(wo => {
            const lc = Number(wo.labor_cost) || 0;
            const pc = (Number(wo.parts_cost) || 0) + (Number(wo.manual_parts_cost) || 0);
            const tc = lc + pc;

            const cat = (wo.maintenance_category || '').toUpperCase();
            if (['MÁQUINAS', 'EQUIPAMENTOS', 'INDUSTRIAL', 'EQUIPAMENTO'].includes(cat)) indCost += tc;
            else if (cat === 'PREDIAL') preCost += tc;
            else otrCost += tc;

            if (wo.asset_id) {
                assetCostsMap[wo.asset_id] = (assetCostsMap[wo.asset_id] || 0) + tc;
            }
        });

        const topExpensiveAssets = Object.entries(assetCostsMap)
            .map(([id, cost]) => {
                const asset = assetData.find((a: any) => a.id === id);
                return { name: asset ? asset.name : 'Desconhecido', cost, id };
            })
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 5);

        // Costs
        const laborCost = woData.reduce((acc, wo) => acc + (Number(wo.labor_cost) || 0), 0);
        const partsCost = woData.reduce((acc, wo) => acc + (Number(wo.parts_cost) || Number(wo.manual_parts_cost) || 0), 0);
        const totalCost = laborCost + partsCost;

        return {
            totalWO,
            completedWO: completedWO.length,
            openWO: openWO.length,
            inMaintenanceWO: inMaintenanceWO.length,
            backlogDays,
            preventiveRatio: totalWO > 0 ? (preventiveWO / totalWO) * 100 : 0,
            correctiveRatio: totalWO > 0 ? ((totalWO - preventiveWO) / totalWO) * 100 : 0,
            mttr,
            mtta,
            mtbf,
            reliability,
            laborCost,
            partsCost,
            totalCost,
            indCost,
            preCost,
            otrCost,
            topExpensiveAssets,
            avgCostPerAsset: assetData.length > 0 ? totalCost / assetData.length : 0
        };
    };

    const generateExecutivePDF = async (forBase64 = false): Promise<jsPDF | string> => {
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);

            // Helpers & Constants
            const pxToMm = (px: number) => px * 0.264583;
            const BLUE_INSTITUTIONAL = [30, 58, 138];
            const TEXT_DARK = [15, 23, 42];
            const TEXT_GRAY = [100, 116, 139];
            const BORDER_LIGHT = [226, 232, 240];

            const captureChart = async (id: string) => {
                const el = document.getElementById(id);
                if (!el) return null;
                const canvas = await html2canvas(el, {
                    scale: 1.5,
                    useCORS: true,
                    backgroundColor: '#ffffff'
                });
                return canvas.toDataURL('image/jpeg', 0.8);
            };

            const loadLogo = async (url: string): Promise<string | null> => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.onload = () => {
                        const canvas = document.createElement("canvas");
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext("2d");
                        ctx?.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL("image/png"));
                    };
                    img.onerror = () => resolve(null);
                    img.src = url;
                });
            };

            const logoBase64 = settings.companyLogo ? await loadLogo(settings.companyLogo) : null;

            // PAGE WRAPPERS (Header & Footer)
            const drawInstitutionalHeader = () => {
                const bannerH = 75; // Banner principal da capa
                pdf.setFillColor(15, 23, 42); // Slate 900
                pdf.rect(0, 0, pageWidth, bannerH, 'F');

                // Lado Esquerdo: Logo e Nome da Empresa
                if (logoBase64) {
                    const logoW = 45; // Ampliada em 25% do original (35 -> ~44)
                    const logoH = 18;
                    pdf.addImage(logoBase64, 'PNG', margin, 15, logoW, logoH, undefined, 'FAST');
                }

                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(28);
                pdf.setFont('helvetica', 'bold');
                pdf.text('INDICADORES', margin, 48);
                pdf.text('ESTRATÉGICOS', margin, 60);

                pdf.setFontSize(12);
                pdf.setTextColor(245, 158, 11); // Amber 500
                pdf.text(`Análise: ${periodTranslate[period] || period.toUpperCase()}`, margin, 70);

                // Lado Direito: Metadados Institucionais (Vertical)
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'normal');
                const metaX = pageWidth - margin;
                pdf.text(`${settings.companyName?.toUpperCase() || 'NOVO HORIZONTE'}`, metaX, 15, { align: 'right' });
                pdf.text(`UNIDADE: MATRIZ OPERACIONAL`, metaX, 20, { align: 'right' });
                pdf.text(`EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}`, metaX, 25, { align: 'right' });
            };

            const drawInstitutionalFooter = (pagenum: number, total: number) => {
                pdf.setDrawColor(BORDER_LIGHT[0], BORDER_LIGHT[1], BORDER_LIGHT[2]);
                pdf.setLineWidth(0.3);
                pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

                pdf.setFontSize(8);
                pdf.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
                pdf.setFont('helvetica', 'normal');
                pdf.text(settings.companyName?.toUpperCase() || 'NOVO HORIZONTE', margin, pageHeight - 10);
                pdf.text(`Relatório Gerencial de PCM - Página ${pagenum} de ${total}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            };

            const drawSmallHeader = () => {
                const headerH = 18;
                pdf.setFillColor(15, 23, 42); // Slate 900 (Mesma cor da capa)
                pdf.rect(0, 0, pageWidth, headerH, 'F');

                if (logoBase64) {
                    const logoW = 32;
                    const logoH = 12;
                    pdf.addImage(logoBase64, 'PNG', margin, 3, logoW, logoH, undefined, 'FAST');
                    pdf.setTextColor(255, 255, 255);
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(settings.companyName?.toUpperCase() || 'NOVO HORIZONTE', margin + 38, 11);
                } else {
                    pdf.setTextColor(255, 255, 255);
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(settings.companyName?.toUpperCase() || 'NOVO HORIZONTE', margin, 11);
                }

                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'normal');
                pdf.text(`ANÁLISE: ${periodTranslate[period] || period.toUpperCase()}`, pageWidth - margin, 11, { align: 'right' });
            };

            const drawPageTitle = (title: string, subtitle: string, yStart = 90) => {
                pdf.setFontSize(22);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
                pdf.text(title.toUpperCase(), margin, yStart);

                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
                pdf.text(subtitle, margin, yStart + 8); // Aumentado distanciamento do subtítulo
                return yStart + 22; // Aumentado distanciamento para o próximo elemento
            };

            const drawSectionHeader = (text: string, y: number) => {
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
                pdf.text(text.toUpperCase(), margin, y);
                pdf.setDrawColor(BLUE_INSTITUTIONAL[0], BLUE_INSTITUTIONAL[1], BLUE_INSTITUTIONAL[2]);
                pdf.setLineWidth(0.5);
                pdf.line(margin, y + 2, margin + 20, y + 2);
                return y + 10;
            };

            const drawContentCard = (x: number, y: number, w: number, h: number, fill = [255, 255, 255]) => {
                pdf.setDrawColor(BORDER_LIGHT[0], BORDER_LIGHT[1], BORDER_LIGHT[2]);
                pdf.setFillColor(fill[0], fill[1], fill[2]);
                pdf.roundedRect(x, y, w, h, 2, 2, 'FD');
            };

            // --- PAGE 1: COVER & SUMMARY ---
            drawInstitutionalHeader();
            let currentY = 95;

            // Score Global Central Card
            const scoreH = 50;
            const riskColors: any = {
                'Crítico': { bg: [254, 242, 242], text: [185, 28, 28], label: 'RISCO CRÍTICO' },
                'Atenção': { bg: [255, 251, 235], text: [180, 83, 9], label: 'ALERTA / ATENÇÃO' },
                'Estável': { bg: [240, 253, 244], text: [21, 128, 61], label: 'OPERAÇÃO ESTÁVEL' }
            };
            const theme = riskColors[stats.risk] || riskColors['Estável'];

            drawContentCard(margin, currentY, contentWidth, scoreH, theme.bg);

            pdf.setFontSize(36);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
            pdf.text(stats.score.toFixed(1), margin + 15, currentY + 25);

            pdf.setFontSize(10);
            pdf.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
            pdf.text('SCORE DE PERFORMANCE GLOBAL', margin + 15, currentY + 32);

            pdf.setFontSize(14);
            pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
            pdf.text(theme.label, pageWidth - margin - 15, currentY + 22, { align: 'right' });

            pdf.setFontSize(9);
            pdf.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);

            const cleanText = stats.insights[0]?.text || 'Análise baseada em indicadores técnicos, financeiros e cumprimento de metas.';
            const splitDesc = pdf.splitTextToSize(cleanText, (contentWidth / 2) - 30);

            splitDesc.forEach((line: string, i: number) => {
                // Aumentado Y start de 30 para 34, e line height de 4 para 5
                pdf.text(line, pageWidth - margin - 15, currentY + 34 + (i * 5), { align: 'right' });
            });

            currentY += scoreH + 20; // Mais respiro antes do próximo grid

            // Simple 5-column KPI Grid on Page 1
            const kpiW = (contentWidth - 12) / 5;
            const summaryKpis = [
                { l: 'Total OS', v: stats.current.totalWO, c: [30, 58, 138] },
                { l: 'Concluídas', v: stats.current.completedWO, c: [16, 185, 129] },
                { l: 'Abertas', v: stats.current.openWO - (stats.current.inMaintenanceWO || 0), c: [245, 158, 11] },
                { l: 'Manutenção', v: stats.current.inMaintenanceWO || 0, c: [139, 92, 246] },
                { l: 'Confiabilidade', v: `${stats.current.reliability?.toFixed(1)}%`, c: [79, 70, 229] }
            ];

            summaryKpis.forEach((k, i) => {
                const x = margin + (i * (kpiW + 3));
                drawContentCard(x, currentY, kpiW, 25);
                pdf.setFontSize(7);
                pdf.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
                pdf.text(k.l.toUpperCase(), x + kpiW / 2, currentY + 8, { align: 'center' });
                pdf.setFontSize(14);
                pdf.setTextColor(k.c[0], k.c[1], k.c[2]);
                pdf.setFont('helvetica', 'bold');
                pdf.text(String(k.v), x + kpiW / 2, currentY + 18, { align: 'center' });
            });

            currentY += 40;
            currentY = drawSectionHeader('Análise de Dimensões Estratégicas', currentY);
            const dimW = (contentWidth - 10) / 2;
            const dims = [
                { label: 'Confiabilidade Técnica', val: stats.dimensions.reliability },
                { label: 'Eficiência Operacional', val: stats.dimensions.operational },
                { label: 'Saúde Financeira', val: stats.dimensions.financial },
                { label: 'Alinhamento PCM', val: stats.dimensions.strategic }
            ];

            dims.forEach((d, i) => {
                const ix = i % 2;
                const iy = Math.floor(i / 2);
                const x = margin + (ix * (dimW + 10));
                const y = currentY + (iy * 25);
                drawContentCard(x, y, dimW, 20);
                pdf.setFontSize(9);
                pdf.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
                pdf.text(d.label, x + 5, y + 8);
                pdf.setFontSize(12);
                pdf.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
                pdf.text(`${d.val.toFixed(1)}%`, x + dimW - 5, y + 13, { align: 'right' });
                pdf.setFillColor(241, 245, 249);
                pdf.rect(x + 5, y + 15, dimW - 10, 1.5, 'F');
                pdf.setFillColor(BLUE_INSTITUTIONAL[0], BLUE_INSTITUTIONAL[1], BLUE_INSTITUTIONAL[2]);
                pdf.rect(x + 5, y + 15, ((dimW - 10) * d.val) / 100, 1.5, 'F');
            });

            drawInstitutionalFooter(1, 4);

            // --- PAGE 2: CHARTS & ANALYTICS ---
            pdf.addPage();
            drawSmallHeader();
            let p2Y = 32;
            p2Y = drawPageTitle('Análise de Tendências', 'Visão Detalhada de Evolução e Desempenho', p2Y);

            p2Y = drawSectionHeader('Evolução das Ordens de Serviço', p2Y);
            const evolutionImg = await captureChart('evolution-chart');
            if (evolutionImg) {
                pdf.addImage(evolutionImg, 'JPEG', margin, p2Y, contentWidth, 60);
                p2Y += 70;
            }

            const chartCols = (contentWidth - 10) / 2;
            p2Y = drawSectionHeader('Distribuição de Categorias e Ativos', p2Y);
            const categoryImg = await captureChart('category-chart');
            const assetsImg = await captureChart('assets-chart');
            if (categoryImg) pdf.addImage(categoryImg, 'JPEG', margin, p2Y, chartCols, 50);
            if (assetsImg) pdf.addImage(assetsImg, 'JPEG', margin + chartCols + 10, p2Y, chartCols, 50);

            p2Y += 65;
            p2Y = drawSectionHeader('Ativos Críticos (Downtime)', p2Y);
            const barImg = await captureChart('bar-chart-assets');
            if (barImg) pdf.addImage(barImg, 'JPEG', margin, p2Y, contentWidth, 50);

            drawInstitutionalFooter(2, 4);

            // --- PAGE 3: FINANCIAL & TECH KPIs ---
            pdf.addPage();
            drawSmallHeader();
            let p3Y = 32;
            p3Y = drawPageTitle('Gestão Técnica e Financeira', 'Eficiência de Custos e Prazos', p3Y);

            p3Y = drawSectionHeader('Resumo de Custos do Período', p3Y);
            const costs = [
                { l: 'Investimento Total Bruto', v: stats.current.totalCost },
                { l: 'Custo Industrial (Máquinas)', v: stats.current.indCost || 0 },
                { l: 'Custo Predial (Infra)', v: stats.current.preCost || 0 },
                { l: 'Média de Custo por Ativo', v: stats.current.avgCostPerAsset }
            ];

            costs.forEach((c, i) => {
                const y = p3Y + (i * 12);
                pdf.setFontSize(10);
                pdf.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
                pdf.text(c.l, margin + 5, y + 7);
                pdf.text(c.v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), pageWidth - margin - 5, y + 7, { align: 'right' });
                pdf.setDrawColor(BORDER_LIGHT[0], BORDER_LIGHT[1], BORDER_LIGHT[2]);
                pdf.line(margin, y + 12, pageWidth - margin, y + 12);
            });
            p3Y += 60;

            p3Y = drawSectionHeader('KPIs Técnicos de Manutenção', p3Y);
            const techKpis = [
                { l: 'MTTR (Tempo Reparo)', v: `${stats.current.mttr?.toFixed(1)}h`, d: 'Média Reparo' },
                { l: 'SLA / MTTA (Tempo Resposta)', v: `${stats.current.mtta?.toFixed(1)}h`, d: 'Média Resposta' },
                { l: 'MTBF (Entre Falhas)', v: `${stats.current.mtbf?.toFixed(1)}h`, d: 'Intervalo Médio' },
                { l: 'Taxa Preventiva', v: `${stats.current.preventiveRatio?.toFixed(1)}%`, d: 'Ideal > 80%' }
            ];

            techKpis.forEach((k, i) => {
                const ix = i % 2;
                const iy = Math.floor(i / 2);
                const x = margin + (ix * (dimW + 10));
                const y = p3Y + (iy * 30);
                drawContentCard(x, y, dimW, 25);
                pdf.setFontSize(9);
                pdf.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
                pdf.text(k.l, x + 5, y + 8);
                pdf.setFontSize(16);
                pdf.setTextColor(BLUE_INSTITUTIONAL[0], BLUE_INSTITUTIONAL[1], BLUE_INSTITUTIONAL[2]);
                pdf.text(k.v, x + 5, y + 18);
                pdf.setFontSize(8);
                pdf.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
                pdf.text(k.d, x + dimW - 5, y + 18, { align: 'right' });
            });

            p3Y += 75;
            p3Y = drawSectionHeader('Top 5 Equipamentos Mais Custosos no Período', p3Y);

            if (stats.current.topExpensiveAssets && stats.current.topExpensiveAssets.length > 0) {
                stats.current.topExpensiveAssets.forEach((asset: any, i: number) => {
                    const y = p3Y + (i * 12);
                    pdf.setFontSize(10);
                    pdf.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
                    pdf.text(`${i + 1}. ${asset.name}`, margin + 5, y + 7);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(asset.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), pageWidth - margin - 5, y + 7, { align: 'right' });
                    pdf.setFont('helvetica', 'normal');
                    pdf.setDrawColor(BORDER_LIGHT[0], BORDER_LIGHT[1], BORDER_LIGHT[2]);
                    pdf.line(margin, y + 12, pageWidth - margin, y + 12);
                });
            } else {
                pdf.setFontSize(10);
                pdf.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
                pdf.text("Sem custos diretos alocados por equipamento no período.", margin + 5, p3Y + 7);
            }

            drawInstitutionalFooter(3, 4);

            // --- PAGE 4: PLANO DE AÇÃO ---
            pdf.addPage();
            drawSmallHeader();
            let p4Y = 32;
            p4Y = drawPageTitle('Estratégia e Plano de Ação', 'Direcionamento Operacional Próximo Ciclo', p4Y);

            p4Y = drawSectionHeader('Diagnóstico de Inteligência (PCM)', p4Y);
            const insightText = stats.insights.map((i: any) => i.text).join('\n\n');
            pdf.setFontSize(10);
            pdf.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
            const splitInsight = pdf.splitTextToSize(insightText, contentWidth - 10);
            drawContentCard(margin, p4Y, contentWidth, (splitInsight.length * 6) + 10, [248, 250, 252]);
            pdf.text(splitInsight, margin + 5, p4Y + 10);

            p4Y += (splitInsight.length * 6) + 25;
            p4Y = drawSectionHeader('Ações Recomendadas', p4Y);

            stats.actionPlan.forEach((action: string, i: number) => {
                const text = `${i + 1}. ${action}`;
                const splitAction = pdf.splitTextToSize(text, contentWidth - 15);
                const h = (splitAction.length * 6) + 5;
                drawContentCard(margin, p4Y, contentWidth, h);
                pdf.text(splitAction, margin + 5, p4Y + 8);
                p4Y += h + 5;
            });

            drawInstitutionalFooter(4, 4);

            if (forBase64) return pdf.output('datauristring').split(',')[1];
            return pdf;
        } catch (error) {
            console.error('PDF Generation Error:', error);
            throw error;
        }
    };

    const handleExportPDF = async () => {
        setFeedback({ isOpen: true, type: 'info', title: 'Gerando Relatório PCM Executivo', message: 'Compilando inteligência de dados... Aguarde.' });
        try {
            const pdf = await generateExecutivePDF() as jsPDF;
            pdf.save(`NH_CMMS_Relatorio_Executivo_${periodTranslate[period]}_${new Date().toISOString().split('T')[0]}.pdf`);
            setFeedback({ isOpen: true, type: 'success', title: 'Relatório Gerado!', message: 'O arquivo PDF foi baixado com sucesso.' });
        } catch (error) {
            setFeedback({ isOpen: true, type: 'error', title: 'Falha na Geração', message: 'Houve um problema ao gerar o PDF.' });
        }
    };


    const handleSendToBoard = async () => {
        if (!emailToSend || !emailToSend.includes('@')) {
            setFeedback({ isOpen: true, type: 'error', title: 'E-mail Inválido', message: 'Por favor, insira um e-mail válido.' });
            return;
        }

        setIsEmailModalOpen(false);
        setFeedback({
            isOpen: true,
            type: 'info',
            title: 'Enviando Relatório',
            message: 'Preparando e enviando relatório... Aguarde.'
        });

        try {
            // Generate PDF as base64 for attachment
            const pdfBase64 = await generateExecutivePDF(true) as string;

            const { data, error } = await supabase.functions.invoke('send-notification', {
                body: {
                    event: 'executive_report_manual',
                    company: settings.companyName,
                    customEmail: emailToSend,
                    pdf_attachment: pdfBase64,
                    reportData: {
                        period: periodTranslate[period] || period.toUpperCase(),
                        company_name: settings.companyName,
                        score: stats.score.toFixed(1),
                        risk: stats.risk,
                        reliability: stats.current.reliability?.toFixed(1),
                        backlog: stats.current.backlogDays?.toFixed(1),
                        mttr: stats.current.mttr?.toFixed(1),
                        mtbf: stats.current.mtbf?.toFixed(1),
                        totalWO: stats.current.totalWO,
                        completedWO: stats.current.completedWO,
                        openWO: stats.current.openWO,
                        preventiveRatio: stats.current.preventiveRatio?.toFixed(1),
                        totalCost: stats.current.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                        dimensions: stats.dimensions,
                        projection: stats.projection,
                        insights: stats.insights,
                        actionPlan: stats.actionPlan,
                        category: categoryFilter === 'ALL' ? 'Todas' : categoryFilter,
                        company_logo: settings.companyLogo,
                        timestamp: new Date().toISOString()
                    }
                }
            });

            if (error) throw error;
            if (data?.success === false) throw new Error(data.message || 'Erro reportado pelo servidor de integração.');

            setFeedback({
                isOpen: true,
                type: 'success',
                title: 'Relatório Enviado com Sucesso',
                message: 'O documento foi transmitido para o e-mail informado e deve chegar em instantes.'
            });
        } catch (error: any) {
            console.error('Send error:', error);
            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'Falha no Envio',
                message: `Não foi possível enviar o relatório: ${error.message || 'Verifique sua conexão e configurações de e-mail.'}`
            });
        }
    };



    const loadStats = async () => {
        try {
            setLoading(true);
            const endDate = new Date();
            const startDate = getDateRange();

            // Calculate previous period
            const diff = endDate.getTime() - startDate.getTime();
            const prevStartDate = new Date(startDate.getTime() - diff);

            // Fetch current entries
            let queryCurrent: any = supabase.from('work_orders').select('*');
            let queryPrevious: any = supabase.from('work_orders').select('*');

            const startISO = startDate.toISOString();
            const prevStartISO = prevStartDate.toISOString();

            queryCurrent = queryCurrent.gte('created_at', startISO);
            queryPrevious = queryPrevious.gte('created_at', prevStartISO).lt('created_at', startISO);

            if (categoryFilter !== 'ALL') {
                queryCurrent = queryCurrent.eq('maintenance_category', categoryFilter);
                queryPrevious = queryPrevious.eq('maintenance_category', categoryFilter);
            }

            const { data: woCurrent } = await (queryCurrent as any);
            const { data: woPrevious } = await (queryPrevious as any);
            const { data: assetsRaw } = await supabase.from('assets').select('*');
            const { data: techniciansRaw } = await supabase.from('technicians').select('*');

            // Filter globally canceled/ignored orders
            const currentRaw = (woCurrent as any[] || []).filter(wo => wo.status !== 'Cancelado');
            const prevRaw = (woPrevious as any[] || []).filter(wo => wo.status !== 'Cancelado');

            // --- Strict Filtering based on User Roles ---
            const isAdminRoot = user?.role === 'admin_root';
            const isCommonAdmin = user?.role === 'admin';

            const filterOrderByRole = (raw: any[]) => {
                if (isAdminRoot) return raw;
                return raw.filter(o => {
                    const cat = o.maintenance_category || 'Equipamento';
                    const isInd = ['MÁQUINAS', 'EQUIPAMENTOS', 'INDUSTRIAL', 'EQUIPAMENTO', 'MAQUINA'].includes(cat.toUpperCase());
                    const isPre = cat.toUpperCase() === 'PREDIAL';
                    const isOtr = !isInd && !isPre;

                    const canManageEquip = user?.manage_equipment && isInd;
                    const canManagePred = user?.manage_predial && isPre;
                    const canManageOthers = user?.manage_others && isOtr;

                    if (isCommonAdmin) return canManageEquip || canManagePred || canManageOthers;
                    return o.requester_id === user?.id && (canManageEquip || canManagePred || canManageOthers);
                });
            };

            const filterAssetsByRole = (rawArr: any[]) => {
                if (isAdminRoot) return rawArr;
                return rawArr.filter(a => {
                    const cat = (a.category || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
                    const isInd = ['MÁQUINAS', 'EQUIPAMENTOS', 'INDUSTRIAL', 'EQUIPAMENTO', 'MAQUINA'].includes(cat);
                    const isPre = cat === 'PREDIAL';
                    const isOtr = !isInd && !isPre;

                    if (user?.manage_equipment && isInd) return true;
                    if (user?.manage_predial && isPre) return true;
                    if (user?.manage_others && isOtr) return true;
                    return false;
                });
            };

            const filterTechsByRole = (rawArr: any[]) => {
                if (isAdminRoot) return rawArr;
                return rawArr.filter(t => {
                    const spec = (t.specialty || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                    if (user?.manage_equipment && (spec === 'maquinas' || spec === 'máquinas')) return true;
                    if (user?.manage_predial && spec === 'predial') return true;
                    if (user?.manage_others && spec === 'outros') return true;
                    return false;
                });
            };

            const currentData = filterOrderByRole(currentRaw);
            const prevData = filterOrderByRole(prevRaw);
            const assetData = filterAssetsByRole(assetsRaw || []);
            const techData = filterTechsByRole(techniciansRaw || []);

            const days = Math.ceil(diff / (1000 * 3600 * 24));

            const currentStats = calculatePeriodStats(currentData, assetData, days, techData);
            const prevStats = calculatePeriodStats(prevData, assetData, days, techData);

            // Calculate Trends (variation %)
            const calculateTrend = (curr: number, prev: number) => {
                if (prev === 0) return curr > 0 ? 100 : 0;
                return ((curr - prev) / prev) * 100;
            };

            const trends = {
                totalWO: calculateTrend(currentStats.totalWO, prevStats.totalWO),
                completedWO: calculateTrend(currentStats.completedWO, prevStats.completedWO),
                mttr: calculateTrend(currentStats.mttr, prevStats.mttr),
                mtbf: calculateTrend(currentStats.mtbf, prevStats.mtbf),
                reliability: currentStats.reliability - prevStats.reliability,
                totalCost: calculateTrend(currentStats.totalCost, prevStats.totalCost)
            };

            // 4. Dimensional Scoring
            const dimReliability = Math.max(0, Math.min(100, (currentStats.reliability * 0.7 + (currentStats.mtbf > 100 ? 100 : currentStats.mtbf) * 0.3)));
            const dimOperational = Math.max(0, Math.min(100, 100 - (currentStats.backlogDays * 10) - (currentStats.mttr * 5)));
            const dimFinancial = Math.max(0, Math.min(100, 100 - (trends.totalCost > 0 ? trends.totalCost : 0)));
            const dimStrategic = Math.max(0, Math.min(100, currentStats.preventiveRatio));

            const totalScore = (dimReliability * 0.4) + (dimOperational * 0.3) + (dimFinancial * 0.2) + (dimStrategic * 0.1);

            let risk = 'Estável';
            if (totalScore < 60 || currentStats.correctiveRatio > 50) risk = 'Crítico';
            else if (totalScore < 75 || currentStats.mttr > 4) risk = 'Atenção';

            // 5. Automatic Insights & Action Plan
            const insights = [];
            const actionPlan = [];

            if (trends.totalCost > 15) {
                insights.push({ type: 'warning', text: `Aumento de ${trends.totalCost.toFixed(1)}% nos custos em relação ao período anterior.` });
                actionPlan.push("Rever contratos de terceiros e gastos com peças críticas.");
            }
            if (currentStats.correctiveRatio > 40) {
                insights.push({ type: 'danger', text: "Alta incidência de corretivas. Sugerimos revisão imediata do plano preventivo." });
                actionPlan.push("Identificar os 3 ativos com mais corretivas e aplicar análise de causa raiz (RCA).");
            }
            if (currentStats.reliability > 95) {
                insights.push({ type: 'success', text: "Excelência operacional: Confiabilidade acima de 95% mantida." });
            } else {
                actionPlan.push("Auditar check-lists de manutenção preventiva para garantir conformidade.");
            }
            if (currentStats.mttr > prevStats.mttr) {
                insights.push({ type: 'warning', text: "Tempo de reparo (MTTR) em tendência de alta. Possível gargalo técnico." });
                actionPlan.push("Realizar treinamento técnico específico para as falhas recorrentes identificadas.");
            }
            if (currentStats.backlogDays > 5) {
                actionPlan.push("Avaliar necessidade de horas extras ou contratação temporária para reduzir backlog.");
            }

            if (insights.length === 0) {
                insights.push({ type: 'success', text: "Operação rodando dentro da plena normalidade. Nenhum alerta crítico detectado pela inteligência." });
            }
            if (actionPlan.length === 0) {
                actionPlan.push("Manter as rotinas atuais do plano de manutenção preventiva.");
            }

            // 6. Projections
            const projection = {
                reliability: currentStats.reliability + (trends.reliability * 0.2), // Simple linear projection
                risk: (risk === 'Crítico' || trends.reliability < -5) ? 'Alto' : 'Moderado'
            };

            setStats({
                current: currentStats,
                previous: prevStats,
                trends,
                score: totalScore,
                risk,
                insights,
                dimensions: {
                    reliability: dimReliability,
                    operational: dimOperational,
                    financial: dimFinancial,
                    strategic: dimStrategic
                },
                projection,
                actionPlan
            });

            // Preparation for daily aggregates
            const dailyMap: any = {};
            currentData.forEach(wo => {
                const day = new Date(wo.created_at).toLocaleDateString();
                dailyMap[day] = (dailyMap[day] || 0) + 1;
            });
            const temporalEvolution = Object.entries(dailyMap).map(([name, total]) => ({ name, total }));

            // Prepare Chart Data
            const statusCount: any = {};
            currentData.forEach(wo => statusCount[wo.status] = (statusCount[wo.status] || 0) + 1);

            const problematicAssets = Object.entries(currentData.reduce((acc: any, wo) => {
                if (wo.asset_id) {
                    let dh = Number(wo.downtime_hours) || 0;
                    if (dh === 0 && !['Concluído', 'Cancelado'].includes(wo.status)) {
                        const start = new Date(wo.created_at).getTime();
                        dh = Math.max(0, (Date.now() - start) / 3600000);
                    }
                    if (dh > 0) acc[wo.asset_id] = (acc[wo.asset_id] || 0) + dh;
                }
                return acc;
            }, {})).map(([id, hours]) => ({
                name: (assetData as any[]).find((a: any) => a.id === id)?.name || 'Outro',
                hours: Number((hours as number).toFixed(1))
            })).sort((a: any, b: any) => b.hours - a.hours).slice(0, 10);

            setChartData({
                status: Object.entries(statusCount).map(([name, value]) => ({ name, value })),
                priority: [], // Simplify for brevity, can rebuild if needed
                maintenanceType: [
                    { name: 'Corretiva', value: currentData.filter((wo: any) => (wo.maintenance_type || '').toLowerCase().includes('corretiva')).length },
                    { name: 'Predial', value: currentData.filter((wo: any) => (wo.maintenance_category || '').toLowerCase().includes('predial')).length },
                    { name: 'Preventiva', value: currentData.filter((wo: any) => (wo.maintenance_type || '').toLowerCase().includes('preventiva')).length }
                ],
                assetsStatus: [],
                technicianPerformance: techData.map(t => ({
                        name: t.name,
                        completed: currentData.filter(wo => wo.technician_id === t.id && wo.status === 'Concluído').length
                    })).sort((a, b) => b.completed - a.completed).slice(0, 5),
                topProblematicAssets: problematicAssets,
                temporalEvolution
            });

        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const TrendIndicator = ({ value, label, isReverse = false }: { value: number, label: string, isReverse?: boolean }) => {
        const isPositive = value > 0;
        const colorClass = (isPositive && !isReverse) || (!isPositive && isReverse) ? 'text-emerald-500' : 'text-rose-500';
        return (
            <div className={`flex items-center gap-1 text-[10px] font-bold ${colorClass}`}>
                {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(value).toFixed(1)}% {label}
            </div>
        );
    };

    const KPICard = ({ title, value, trend, unit = '', isReverse = false, icon: Icon, meta }: any) => (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                <Icon size={80} />
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] mb-1 group-hover:text-primary transition-colors">{title}</p>
            <div className="flex items-baseline gap-1">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter group-hover:scale-[1.02] origin-left transition-transform">{value}</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{unit}</span>
            </div>
            <div className="mt-4 flex justify-between items-center pt-4 border-t border-slate-50">
                <TrendIndicator value={trend} label="" isReverse={isReverse} />
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter bg-slate-50 px-2 py-1 rounded">{meta}</span>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
            {/* 1. Header Estratégico */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 print:hidden">
                <div className="flex items-center gap-4 group cursor-default">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-105 transition-all duration-500">
                        <Activity size={24} className="group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none mb-1 uppercase">
                            Relatórios Estratégicos
                        </h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Gestão de Ativos • PCM Industrial</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-center">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-100 border-none rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 ring-primary/20"
                    >
                        {availableCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                    </select>

                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        {['week', 'month', 'quarter', 'year'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {p === 'week' ? 'Semanal' : p === 'month' ? 'Mensal' : p === 'quarter' ? 'Trimestral' : 'Anual'}
                            </button>
                        ))}
                    </div>
                    <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden md:block" />
                    <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                        <Download size={14} /> Baixar Relatório
                    </button>
                    <button
                        onClick={() => setIsEmailModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all font-bold"
                    >
                        <Mail size={14} /> ENVIAR RELATÓRIO
                    </button>
                </div>
            </div>

            {/* 2. KPIs Linha Principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard title="Confiabilidade" value={stats.current.reliability?.toFixed(1)} unit="%" trend={stats.trends.reliability} meta="Meta > 95%" icon={Shield} />
                <KPICard title="Disponibilidade" value="98.2" unit="%" trend={-0.4} meta="Meta > 90%" icon={Zap} isReverse={true} />
                <KPICard title="Backlog" value={stats.current.backlogDays?.toFixed(1)} unit="dias" trend={0} meta="Meta < 5d" icon={Clock} isReverse={true} />
                <KPICard title="MTTR" value={stats.current.mttr?.toFixed(1)} unit="horas" trend={stats.trends.mttr} meta="Meta < 2.0h" icon={Clock} isReverse={true} />
                <KPICard title="Investimento" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.current.totalCost)} trend={stats.trends.totalCost} meta="Budget OK" icon={DollarSign} isReverse={true} />
            </div>

            {/* 3. Dashboard Grid Content */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full min-w-0">

                {/* Score & Risk Analysis (4 cols) */}
                <div className="md:col-span-4 space-y-6 w-full min-w-0">
                    <div id="score-gauge" className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Performance Score</h4>

                        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie
                                        data={[
                                            { value: stats.score },
                                            { value: 100 - stats.score }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        startAngle={180}
                                        endAngle={0}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={0}
                                        dataKey="value"
                                        isAnimationActive={false}
                                    >
                                        <Cell fill={stats.score > 85 ? '#10b981' : stats.score > 70 ? '#f59e0b' : '#ef4444'} />
                                        <Cell fill="#f1f5f9" />
                                    </Pie>
                                </RechartsPieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                                <span className="text-5xl font-black text-slate-900 tracking-tighter">{stats.score.toFixed(0)}</span>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${stats.score > 85 ? 'text-emerald-500' : 'text-orange-500'}`}>
                                    {stats.score > 85 ? 'Excelente' : 'Atenção'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-4">
                            <div className={`p-4 rounded-xl border ${stats.risk === 'Estável' ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}>
                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Status Geral</p>
                                <p className={`text-sm font-black uppercase ${stats.risk === 'Estável' ? 'text-emerald-600' : 'text-orange-600'}`}>{stats.risk}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-left">
                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Risco Futuro</p>
                                <p className="text-sm font-black text-slate-900 uppercase">BAIXO</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Target size={14} className="text-primary" /> Metas Operacionais
                        </h4>
                        <div className="space-y-4">
                            {[
                                { label: 'Preventiva vs Corretiva', val: stats.current.preventiveRatio, target: 80, color: 'bg-primary' },
                                { label: 'Cumprimento de SLA', val: 94, target: 95, color: 'bg-emerald-500' },
                                { label: 'Disponibilidade de Planta', val: 98, target: 90, color: 'bg-indigo-500' }
                            ].map((row, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-[10px] font-bold mb-1 uppercase tracking-tight">
                                        <span className="text-slate-600">{row.label}</span>
                                        <span className="text-slate-900">{(row.val || 0).toFixed(0)}% / {row.target}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${row.color}`} style={{ width: `${Math.min(100, (row.val / row.target) * 100)}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content (8 cols) */}
                <div className="md:col-span-8 space-y-6 w-full min-w-0">
                    {/* Temporal Evolution */}
                    <div id="evolution-chart" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6 px-1">Evolução de Ordens de Serviço</h4>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData.temporalEvolution}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="total" stroke="#137fec" strokeWidth={3} dot={{ r: 4, fill: '#137fec' }} activeDot={{ r: 6 }} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    {/* Charts Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div id="category-chart" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6">Distribuição por Categoria</h4>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie
                                            data={chartData.maintenanceType}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={8}
                                            dataKey="value"
                                            isAnimationActive={false}
                                        >
                                            {chartData.maintenanceType.map((_, index) => (
                                                <Cell key={index} fill={['#10b981', '#f59e0b', '#3b82f6'][index % 3]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div id="assets-chart" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6 px-1">Ativos Críticos (Downtime)</h4>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.topProblematicAssets} layout="vertical" margin={{ left: 30, right: 30 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9, fontWeight: 700, fill: '#334155' }} />
                                        <Tooltip />
                                        <Bar dataKey="hours" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={12} label={{ position: 'right', fontSize: 10, fontWeight: 900 }} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Insights Automatizados */}
                    <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Activity size={120} className="text-primary" />
                        </div>
                        <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                            <Zap size={14} /> Insights da Inteligência Operacional
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stats.insights.map((insight: any, i: number) => (
                                <div key={i} className="flex gap-3 items-start p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-all">
                                    <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${insight.type === 'danger' ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : insight.type === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'}`} />
                                    <p className="text-xs font-medium text-slate-300 leading-relaxed">{insight.text}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap gap-4">
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                                <span className="text-[9px] font-black text-slate-400 uppercase">Tendência Financeira</span>
                                <span className={`text-[10px] font-black ${stats.trends.totalCost > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{stats.trends.totalCost > 0 ? 'ALTA' : 'QUEDA'}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                                <span className="text-[9px] font-black text-slate-400 uppercase">Urgência PCM</span>
                                <span className="text-[10px] font-black text-amber-400">MODERADA</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* 4. Footer Financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                        <Download size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Custo Peças</p>
                        <h4 className="text-xl font-black text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.current.partsCost)}</h4>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                        <Shield size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mão de Obra Terc.</p>
                        <h4 className="text-xl font-black text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.current.laborCost)}</h4>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Média por Ativo</p>
                        <h4 className="text-xl font-black text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.current.avgCostPerAsset)}</h4>
                    </div>
                </div>
            </div>

            {isEmailModalOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Enviar Relatório</h2>
                        <p className="text-sm text-slate-500 mb-4">Insira os e-mails que receberão o relatório executivo (separados por vírgula).</p>
                        <input
                            type="text"
                            value={emailToSend}
                            onChange={(e) => setEmailToSend(e.target.value)}
                            placeholder="exemplo@email.com"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all mb-6"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsEmailModalOpen(false)}
                                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSendToBoard}
                                className="px-6 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/30"
                            >
                                <Mail size={16} /> Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Target for PDF Generation (Refactor later for multi-page) */}
            <div className="hidden">
                <div ref={reportRef}>
                    {/* PDF Contents - Professional multi-page structure */}
                    <div className="p-16 bg-white min-h-[297mm]">
                        <center>
                            <Shield size={64} color="#137fec" />
                            <h1 className="text-4xl font-black mt-8">RELATÓRIO ESTRATÉGICO DE PCM</h1>
                            <p className="text-xl text-slate-500 uppercase tracking-[0.4em] mt-4">Gestão de Manutenção Inteligente</p>
                            <div className="mt-40 border-t pt-8 w-64">
                                <p className="text-sm font-bold">RELATÓRIO PDF EXECUTIVO</p>
                                <p className="text-xs text-slate-400 mt-2">Período: {period.toUpperCase()}</p>
                                <p className="text-xs text-slate-400">Responsável: PCM ENGINE</p>
                            </div>
                        </center>
                    </div>
                </div>
            </div>

            <FeedbackModal
                isOpen={feedback.isOpen}
                onClose={() => setFeedback({ ...feedback, isOpen: false })}
                type={feedback.type}
                title={feedback.title}
                message={feedback.message}
            />
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

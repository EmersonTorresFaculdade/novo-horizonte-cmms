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
    const [searchParams] = useSearchParams();
    const [period, setPeriod] = useState('month');
    const [categoryFilter, setCategoryFilter] = useState('ALL');

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
        const openWO = woData.filter(wo => wo.status?.toLowerCase() !== 'concluído' && wo.status?.toLowerCase() !== 'cancelado');
        const preventiveWO = woData.filter(wo => wo.maintenance_category === 'PREVENTIVA').length;

        // MTTR
        const totalRepairHours = completedWO.reduce((acc, wo) => acc + (Number(wo.repair_hours) || 0), 0);
        const mttr = completedWO.length > 0 ? totalRepairHours / completedWO.length : 0;

        // Backlog in Days: Total Open Hours / (Active Techs * 8h)
        const activeTechs = techData.filter(t => t.status === 'Ativo').length || 1;
        const estimatedBacklogHours = openWO.length * (mttr || 2);
        const backlogDays = estimatedBacklogHours / (activeTechs * 8);

        // MTBF & Reliability
        const totalDowntimeHours = woData.reduce((acc, wo) => acc + (Number(wo.downtime_hours) || 0), 0);
        const totalPossibleTime = days * 24 * (assetData.length || 1);
        const operationalTime = Math.max(0, totalPossibleTime - totalDowntimeHours);
        const mtbf = totalWO > 0 ? operationalTime / totalWO : operationalTime;
        const reliability = totalPossibleTime > 0 ? (operationalTime / totalPossibleTime) * 100 : 100;

        // Costs
        const laborCost = woData.reduce((acc, wo) => acc + (wo.third_party_company_id ? (Number(wo.hourly_rate) || 0) : 0), 0);
        const partsCost = woData.reduce((acc, wo) => acc + (Number(wo.parts_cost) || 0), 0);
        const totalCost = laborCost + partsCost;

        return {
            totalWO,
            completedWO: completedWO.length,
            openWO: openWO.length,
            backlogDays,
            preventiveRatio: totalWO > 0 ? (preventiveWO / totalWO) * 100 : 0,
            correctiveRatio: totalWO > 0 ? ((totalWO - preventiveWO) / totalWO) * 100 : 0,
            mttr,
            mtbf,
            reliability,
            laborCost,
            partsCost,
            totalCost,
            avgCostPerAsset: assetData.length > 0 ? totalCost / assetData.length : 0
        };
    };

    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setFeedback({ isOpen: true, type: 'info', title: 'Gerando Relatório PCM Executivo', message: 'Compilando inteligência de dados e análise preditiva... Isso pode levar alguns segundos.' });

        await new Promise(resolve => setTimeout(resolve, 3000));

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);

            // Layout Tokens (based on user request)
            const ptsToMm = (pts: number) => pts * 0.3527;
            const sizeTitle = 24;      // pt
            const sizeSubtitle = 18;   // pt
            const sizeSection = 15;    // pt
            const sizeNormal = 11;     // pt
            const sizeKPI = 32;        // pt
            const spacingSection = 32; // mm (actually user said 32px, which is ~8.5mm, but 32mm is too big. User meant px. 32px is ~8.5mm)
            const pxToMm = (px: number) => px * 0.264583;

            const gapS = pxToMm(32); // ~8.5mm
            const gapM = pxToMm(16); // ~4.2mm
            const gapInner = pxToMm(20);

            // Helper for rounded cards
            const drawCard = (x: number, y: number, w: number, h: number) => {
                pdf.setDrawColor(226, 232, 240);
                pdf.setFillColor(255, 255, 255);
                pdf.roundedRect(x, y, w, h, 2, 2, 'FD');
                // Subtle shadow effect (line)
                pdf.setDrawColor(241, 245, 249);
                pdf.line(x + 1, y + h + 0.5, x + w - 1, y + h + 0.5);
            };

            const header = (title: string, subtitle?: string) => {
                pdf.setFillColor(15, 23, 42); // Navy Blue
                pdf.rect(0, 0, pageWidth, 55, 'F');

                // Main Title - Separated from Subtitle
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(sizeTitle);
                pdf.setFont('helvetica', 'bold');

                // Auto line break for long titles
                const splitTitle = pdf.splitTextToSize(title.toUpperCase(), contentWidth);
                pdf.text(splitTitle, margin, 35);

                if (subtitle) {
                    const titleHeight = splitTitle.length * sizeTitle * 0.3527;
                    pdf.setFontSize(sizeSubtitle);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(241, 158, 11); // Gold for emphasis
                    pdf.text(subtitle, margin, 35 + titleHeight + 2);
                }
            };

            const footer = (pageNum: number) => {
                pdf.setFontSize(8);
                pdf.setTextColor(148, 163, 184);
                pdf.text(`${settings.companyName} • Gestão de Ativos Inteligente`, margin, pageHeight - 12);
                pdf.text(`Página ${pageNum}`, pageWidth - margin - 15, pageHeight - 12);
                pdf.text(`Documento Gerencial Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, pageHeight - 8);
            };

            const sectionHeader = (text: string, y: number) => {
                pdf.setFontSize(sizeSection);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(15, 23, 42);

                // Allow line break for long section titles
                const splitSecText = pdf.splitTextToSize(text.toUpperCase(), contentWidth);
                pdf.text(splitSecText, margin, y);

                const secHeight = splitSecText.length * sizeSection * 0.3527;
                pdf.setDrawColor(241, 158, 11);
                pdf.setLineWidth(0.8);
                pdf.line(margin, y + secHeight + 1, margin + 25, y + secHeight + 1);
                pdf.setLineWidth(0.2);
                return y + secHeight + 5; // Return ending Y
            };

            // PAGE 1: COVER & EXECUTIVE SUMMARY
            header('RESUMO EXECUTIVO DO PCM', `Período: ${periodTranslate[period]}`);

            // Score Dashboard Summary Card
            let currentY = 65;
            drawCard(margin, currentY, contentWidth, 55);

            pdf.setFontSize(sizeNormal);
            pdf.setTextColor(100, 116, 139);
            pdf.setFont('helvetica', 'bold');
            pdf.text('SCORE GLOBAL DE PERFORMANCE (PCM)', pageWidth / 2, currentY + 12, { align: 'center' });

            pdf.setFontSize(sizeKPI);
            pdf.setTextColor(15, 23, 42);
            pdf.text(stats.score.toFixed(1), pageWidth / 2, currentY + 30, { align: 'center' });

            // Status Badge Centralized
            const riskColor = stats.risk === 'Crítico' ? [239, 68, 68] : stats.risk === 'Atenção' ? [245, 158, 11] : [16, 185, 129];
            pdf.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
            const badgeW = 40;
            pdf.roundedRect(pageWidth / 2 - badgeW / 2, currentY + 38, badgeW, 8, 1, 1, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(10);
            pdf.text(`STATUS: ${stats.risk.toUpperCase()}`, pageWidth / 2, currentY + 43.5, { align: 'center' });

            currentY += 55 + gapS; // Spacing after card

            // Dimension Scores - Grid 2x2
            currentY = sectionHeader('SCORE POR DIMENSÃO', currentY);

            const dims = [
                { label: 'Confiabilidade de Ativos', value: stats.dimensions.reliability, desc: 'Saúde e disponibilidade física dos equipamentos.' },
                { label: 'Eficiência Operacional', value: stats.dimensions.operational, desc: 'Cumprimento de prazos e fluxo de trabalho.' },
                { label: 'Saúde Financeira', value: stats.dimensions.financial, desc: 'Controle de custos e ROI da manutenção.' },
                { label: 'Alinhamento Estratégico', value: stats.dimensions.strategic, desc: 'Foco em ativos críticos e mitigação de falhas.' }
            ];

            const colW = (contentWidth - 10) / 2;
            dims.forEach((d, i) => {
                const row = Math.floor(i / 2);
                const col = i % 2;
                const x = margin + (col * (colW + 10));
                const y = currentY + 5 + (row * 35);

                drawCard(x, y, colW, 30);
                pdf.setFontSize(10);
                pdf.setTextColor(30, 41, 59);
                pdf.setFont('helvetica', 'bold');
                pdf.text(d.label, x + 5, y + 8);

                // Progress Bar
                pdf.setFillColor(241, 245, 249);
                pdf.rect(x + 5, y + 12, colW - 10, 4, 'F');
                pdf.setFillColor(15, 23, 42);
                pdf.rect(x + 5, y + 12, ((colW - 10) * d.value) / 100, 4, 'F');

                pdf.setFontSize(10);
                pdf.text(`${d.value.toFixed(1)}%`, x + colW - 5, y + 8, { align: 'right' });

                pdf.setFontSize(sizeNormal - 2);
                pdf.setTextColor(100, 116, 139);
                pdf.setFont('helvetica', 'normal');
                const splitDesc = pdf.splitTextToSize(d.desc, colW - 10);
                pdf.text(splitDesc, x + 5, y + 22);
            });

            footer(1);

            // PAGE 2: STRATEGIC INDICATORS
            pdf.addPage();
            header('INDICADORES ESTRATÉGICOS', 'Análise de Tendência e Volume');

            let p2Y = 65;
            p2Y = sectionHeader('EVOLUÇÃO TEMPORAL DE ATIVIDADES', p2Y);
            const evolutionElement = document.getElementById('evolution-chart');
            if (evolutionElement) {
                const canvas = await html2canvas(evolutionElement, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, p2Y + 2, contentWidth, 70);
            }

            pdf.setFontSize(9);
            pdf.setTextColor(100, 116, 139);
            pdf.setFont('helvetica', 'italic');
            pdf.text('Interpretação: Volume total de atividades no período filtrado. Flutuações indicam sazonalidade.', margin, p2Y + 76);

            p2Y += 85 + gapS;

            // Grid 2 Columns for detailed charts
            p2Y = sectionHeader('DISTRIBUIÇÃO POR CATEGORIA E CRITICIDADE', p2Y);

            const categoryElement = document.getElementById('category-chart');
            if (categoryElement) {
                const canvas = await html2canvas(categoryElement, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, p2Y + 2, (contentWidth / 2) - 5, 60);
            }

            // Technical Analysis Text
            const analysisX = margin + (contentWidth / 2) + 5;
            drawCard(analysisX, p2Y + 2, (contentWidth / 2) - 5, 60);
            pdf.setFontSize(11);
            pdf.setTextColor(15, 23, 42);
            pdf.setFont('helvetica', 'bold');
            pdf.text('ANÁLISE DE TENDÊNCIA:', analysisX + 5, p2Y + 10);

            pdf.setFontSize(sizeNormal);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(51, 65, 85);
            const ratioText = stats.current.preventiveRatio > 70
                ? 'Equilíbrio saudável entre preventivas e corretivas.'
                : 'Atenção: Volume de corretivas acima do ideal.';

            const analysisLines = [
                `• Ratio Preventiva: ${stats.current.preventiveRatio.toFixed(1)}%`,
                `• Ratio Corretiva: ${stats.current.correctiveRatio.toFixed(1)}%`,
                '',
                pdf.splitTextToSize(ratioText, (contentWidth / 2) - 15)
            ].flat();
            pdf.text(analysisLines, analysisX + 5, p2Y + 18);

            footer(2);

            // PAGE 3: ASSETS & FINANCIAL
            pdf.addPage();
            header('ANÁLISE DE ATIVOS E FINANÇAS', 'Foco em Criticidade e Custos');

            let p3Y = 65;
            p3Y = sectionHeader('TOP 10 ATIVOS CRÍTICOS (INDISPONIBILIDADE)', p3Y);
            const assetsElement = document.getElementById('assets-chart');
            if (assetsElement) {
                const canvas = await html2canvas(assetsElement, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, p3Y + 2, contentWidth, 75);
            }

            pdf.setFontSize(9);
            pdf.setTextColor(100, 116, 139);
            pdf.text('Legenda: Ativos organizados pelo total de horas de indisponibilidade acumulado.', margin, p3Y + 82);

            p3Y += 92 + gapS;
            p3Y = sectionHeader('CONTROLE FINANCEIRO E INVESTIMENTOS', p3Y);

            const financialData = [
                ['Total Bruto Investido', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.current.totalCost)],
                ['Mão de Obra e Terceiros', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.current.laborCost)],
                ['Peças, Insumos e Materiais', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.current.partsCost)],
                ['Custo Médio por Ativo', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.current.avgCostPerAsset)]
            ];

            financialData.forEach((row, i) => {
                const yPos = p3Y + 10 + (i * 12);
                pdf.setFontSize(sizeNormal);
                pdf.setTextColor(30, 41, 59);
                pdf.setFont('helvetica', i === 0 ? 'bold' : 'normal');
                pdf.text(row[0], margin + 5, yPos);

                pdf.setFont('helvetica', 'bold');
                pdf.text(row[1], pageWidth - margin - 5, yPos, { align: 'right' });

                pdf.setDrawColor(241, 245, 249);
                pdf.line(margin, yPos + 4, pageWidth - margin, yPos + 4);
            });

            footer(3);

            // PAGE 4: PROJECTION & ACTION PLAN
            pdf.addPage();
            header('RISCO, PROJEÇÃO E PLANO DE AÇÃO', 'Diretrizes para o Próximo Ciclo');

            let p4Y = 65;
            p4Y = sectionHeader('PROJEÇÃO E TENDÊNCIA FUTURA', p4Y);

            drawCard(margin, p4Y + 5, contentWidth, 45);

            pdf.setFontSize(11);
            pdf.setTextColor(100, 116, 139);
            pdf.setFont('helvetica', 'bold');
            pdf.text('CONFIABILIDADE ESTIMADA (PRÓXIMO CICLO)', margin + 10, p4Y + 16);

            pdf.setFontSize(sizeKPI);
            pdf.setTextColor(15, 23, 42);
            pdf.text(`${stats.projection.reliability.toFixed(1)}%`, margin + 10, p4Y + 36);

            // Risk Highlight Box
            pdf.setFillColor(241, 245, 249);
            pdf.roundedRect(pageWidth - margin - 75, p4Y + 15, 65, 25, 1, 1, 'F');
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(9);
            pdf.text('RISCO ESTIMADO:', pageWidth - margin - 42.5, p4Y + 23, { align: 'center' });

            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            const pRiskColor = stats.projection.risk === 'Crítico' ? [239, 68, 68] : [15, 23, 42];
            pdf.setTextColor(pRiskColor[0], pRiskColor[1], pRiskColor[2]);
            pdf.text(stats.projection.risk.toUpperCase(), pageWidth - margin - 42.5, p4Y + 33, { align: 'center' });

            p4Y += 55 + gapS;
            p4Y = sectionHeader('PLANO DE AÇÃO AUTOMÁTICO ( PCM )', p4Y);

            let actionItemY = p4Y + 5;
            stats.actionPlan.forEach((action: string, i: number) => {
                const splitAction = pdf.splitTextToSize(`${i + 1}. ${action}`, contentWidth - 20);

                pdf.setFillColor(248, 250, 252);
                const blockH = (splitAction.length * 5) + 8;

                // Keep-together logic simple check
                if (actionItemY + blockH > pageHeight - 70) {
                    pdf.addPage();
                    header('PLANO DE AÇÃO (CONT.)', 'Continuação das recomendações');
                    actionItemY = 65;
                }

                pdf.roundedRect(margin, actionItemY, contentWidth, blockH, 1, 1, 'F');

                pdf.setFontSize(sizeNormal);
                pdf.setTextColor(51, 65, 85);
                pdf.setFont('helvetica', 'normal');
                pdf.text(splitAction, margin + 5, actionItemY + 7);

                actionItemY += blockH + gapM;
            });

            // Signing area - Well spaced
            const signY = pageHeight - 60;
            pdf.setDrawColor(203, 213, 225);
            pdf.line(margin + 20, signY, margin + 80, signY);
            pdf.line(pageWidth - margin - 80, signY, pageWidth - margin - 20, signY);

            pdf.setFontSize(9);
            pdf.setTextColor(100, 116, 139);
            pdf.text('Responsável PCM', margin + 50, signY + 5, { align: 'center' });
            pdf.text('Diretoria Industrial', pageWidth - margin - 50, signY + 5, { align: 'center' });

            footer(4);

            pdf.save(`NH_CMMS_Relatorio_Executivo_${periodTranslate[period]}_${new Date().toISOString().split('T')[0]}.pdf`);
            setFeedback({ isOpen: true, type: 'success', title: 'Relatório Gerado!', message: 'O arquivo PDF foi baixado com sucesso.' });
        } catch (error) {
            console.error('PDF Error:', error);
            setFeedback({ isOpen: true, type: 'error', title: 'Falha na Geração', message: 'Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.' });
        }
    };


    const handleSendToBoard = async () => {
        setFeedback({
            isOpen: true,
            type: 'info',
            title: 'Enviando ao Board',
            message: 'Iniciando canal de comunicação estratégica... Aguarde.'
        });

        try {
            const { data, error } = await supabase.functions.invoke('send-notification', {
                body: {
                    event: 'executive_report_manual',
                    company: settings.companyName,
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
                        timestamp: new Date().toISOString()
                    }
                }
            });

            if (error) throw error;
            if (data?.success === false) throw new Error(data.message || 'Erro reportado pelo servidor de integração.');

            setFeedback({
                isOpen: true,
                type: 'success',
                title: 'Canal Executivo Ativado',
                message: 'O relatório foi transmitido com sucesso para a diretoria.'
            });
        } catch (error: any) {
            console.error('Send error:', error);
            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'Falha na Transmissão',
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
            const { data: assets } = await supabase.from('assets').select('*');
            const { data: technicians } = await supabase.from('technicians').select('*');

            const currentData = woCurrent || [];
            const prevData = woPrevious || [];
            const assetData = assets || [];
            const techData = technicians || [];

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
                if (wo.asset_id) acc[wo.asset_id] = (acc[wo.asset_id] || 0) + (Number(wo.downtime_hours) || 0);
                return acc;
            }, {})).map(([id, hours]) => ({
                name: (assetData as any[]).find((a: any) => a.id === id)?.name || 'Outro',
                hours
            })).sort((a: any, b: any) => b.hours - a.hours).slice(0, 10);

            setChartData({
                status: Object.entries(statusCount).map(([name, value]) => ({ name, value })),
                priority: [], // Simplify for brevity, can rebuild if needed
                maintenanceType: [
                    { name: 'Preventiva', value: currentData.filter((wo: any) => wo.maintenance_category === 'PREVENTIVA').length },
                    { name: 'Corretiva', value: currentData.filter((wo: any) => wo.maintenance_category === 'CORRETIVA').length },
                    { name: 'Predial', value: currentData.filter((wo: any) => wo.maintenance_category === 'PREDIAL').length }
                ],
                assetsStatus: [],
                technicianPerformance: technicians?.map(t => ({
                    name: t.name,
                    completed: currentData.filter(wo => wo.technician_id === t.id && wo.status === 'Concluído').length
                })).sort((a, b) => b.completed - a.completed).slice(0, 5) || [],
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
                        <option value="ALL">Todas Categorias</option>
                        <option value="INDUSTRIAL">MÁQUINAS</option>
                        <option value="PREDIAL">PREDIAL</option>
                        <option value="OUTROS">OUTROS</option>
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
                        onClick={handleSendToBoard}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                        <Mail size={14} /> Enviar Diretoria
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
                                    <XAxis dataKey="name" hide />
                                    <YAxis hide />
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
                                                <Cell key={index} fill={['#3b82f6', '#10b981', '#f59e0b'][index % 3]} />
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
                                    <BarChart data={chartData.topProblematicAssets} layout="vertical">
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" hide />
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

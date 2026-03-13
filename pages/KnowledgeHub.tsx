import React, { useState } from 'react';
import { 
    BookOpen, 
    FileSearch, 
    LifeBuoy, 
    ChevronRight, 
    Download, 
    Search, 
    ArrowLeft,
    FileText,
    ExternalLink,
    HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const KnowledgeHub = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<'all' | 'manuals' | 'pops' | 'faq'>('all');

    const manuals = [
        { id: '1', title: 'Manual de Operação - Compressor Atlas Copco', category: 'Equipamentos', type: 'PDF', size: '2.4 MB' },
        { id: '2', title: 'Guia de Manutenção Preventiva - Elevadores', category: 'Predial', type: 'PDF', size: '1.8 MB' },
        { id: '3', title: 'Manual do Usuário - Sistema CMMS', category: 'Sistema', type: 'PDF', size: '4.2 MB' },
    ];

    const pops = [
        { id: '1', title: 'POP 001 - Bloqueio de Energias Perigosas (LOTO)', category: 'Segurança', version: 'v2.1' },
        { id: '2', title: 'POP 015 - Limpeza de Reservatórios de Água', category: 'Hidráulica', version: 'v1.0' },
        { id: '3', title: 'POP 008 - Inspeção de Painéis Elétricos', category: 'Elétrica', version: 'v3.2' },
    ];

    const faqs = [
        { question: 'Como abrir uma Ordem de Serviço?', answer: 'Vá ao dashboard inicial e clique no botão grande "ABRIR CHAMADO". Preencha os detalhes, anexe uma foto e salve.' },
        { question: 'Como alterar minha senha?', answer: 'Acesse seu Perfil no menu lateral, clique em "Configurações da Conta" e selecione "Alterar Senha".' },
        { question: 'O que fazer em caso de vazamento crítico?', answer: 'Abra um chamado com prioridade "Emergência" imediatamente e entre em contato com o suporte direto via WhatsApp.' },
    ];

    return (
        <div className="flex flex-col gap-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <button 
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-bold text-sm mb-4"
                    >
                        <ArrowLeft size={16} />
                        Voltar
                    </button>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Centro de Excelência</h2>
                    <p className="text-slate-500 mt-1 font-medium">Sua base centralizada de conhecimento e normas técnicas.</p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text"
                        placeholder="Pesquisar manuais, POPs ou FAQ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl self-start">
                <button 
                    onClick={() => setActiveCategory('all')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeCategory === 'all' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Tudo
                </button>
                <button 
                    onClick={() => setActiveCategory('manuals')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeCategory === 'manuals' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Manuais
                </button>
                <button 
                    onClick={() => setActiveCategory('pops')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeCategory === 'pops' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    POPs
                </button>
                <button 
                    onClick={() => setActiveCategory('faq')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeCategory === 'faq' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    FAQ
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {(activeCategory === 'all' || activeCategory === 'manuals') && (
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <BookOpen className="text-primary" size={24} />
                                Manuais Técnicos
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {manuals.map(manual => (
                                    <div key={manual.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-primary/30 hover:shadow-md transition-all group cursor-pointer">
                                        <div className="flex items-start gap-4">
                                            <div className="size-12 rounded-xl bg-slate-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                <FileText size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900 leading-tight group-hover:text-primary transition-colors">{manual.title}</h4>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{manual.category}</span>
                                                    <span className="text-[10px] font-black text-primary px-2 py-0.5 bg-primary/10 rounded-md">{manual.type}</span>
                                                </div>
                                            </div>
                                            <Download size={18} className="text-slate-300 group-hover:text-primary" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {(activeCategory === 'all' || activeCategory === 'pops') && (
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <FileSearch className="text-blue-500" size={24} />
                                POPs (Procedimentos Operacionais)
                            </h3>
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Título do Procedimento</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">S setor</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Versão</th>
                                            <th className="px-6 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {pops.map(pop => (
                                            <tr key={pop.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{pop.title}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-medium text-slate-500">{pop.category}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-2 py-1 bg-slate-100 rounded-md text-[10px] font-bold text-slate-600">{pop.version}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <ExternalLink size={16} className="text-slate-300 group-hover:text-blue-500" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {(activeCategory === 'all' || activeCategory === 'faq') && (
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <LifeBuoy className="text-emerald-500" size={24} />
                                Base de Conhecimento FAQ
                            </h3>
                            <div className="space-y-4">
                                {faqs.map((faq, i) => (
                                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 hover:shadow-md transition-shadow">
                                        <div className="flex items-start gap-4">
                                            <div className="size-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                                <HelpCircle size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 mb-2">{faq.question}</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Sidebar area */}
                <div className="space-y-8">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <LifeBuoy size={120} />
                        </div>
                        <h4 className="text-xl font-black mb-4 relative z-10">Precisa de Ajuda Técnica?</h4>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed relative z-10">
                            Caso não encontre o que precisa, nossa equipe técnica está disponível para suporte remoto.
                        </p>
                        <button 
                            onClick={() => navigate('/dashboard')}
                            className="w-full py-4 bg-primary text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 relative z-10"
                        >
                            Falar com Suporte
                        </button>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Downloads Recentes</h4>
                        <div className="space-y-6">
                            {[1, 2].map(i => (
                                <div key={i} className="flex items-center gap-4 group cursor-pointer">
                                    <div className="size-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                        <Download size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-700 truncate group-hover:text-primary transition-colors">Norma_NR10_Eletrica.pdf</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Há 2 dias</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KnowledgeHub;

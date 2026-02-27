import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, Search, UserPlus, MoreVertical, Star, Clock,
    Calendar as CalendarIcon, Filter, Download, Mail, Phone,
    MapPin, Shield, Zap, ChevronRight, Award, TrendingUp,
    ExternalLink, Edit2, Trash2, Building2, Wrench, User,
    ChevronLeft, Loader2
} from 'lucide-react';
import { supabase, supabaseUntyped } from '../lib/supabase';
import { Technician, ThirdPartyCompany } from '../types';
import TechnicianModal from '../components/TechnicianModal';
import ThirdPartyModal from '../components/ThirdPartyModal';
import FeedbackModal from '../components/FeedbackModal';
import { useNavigate } from 'react-router-dom';

const Technicians: React.FC = () => {
    const navigate = useNavigate();
    const [mainTab, setMainTab] = useState<'internos' | 'terceirizados'>('internos');
    const [activeTab, setActiveTab] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [thirdPartyCompanies, setThirdPartyCompanies] = useState<ThirdPartyCompany[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isThirdPartyModalOpen, setIsThirdPartyModalOpen] = useState(false);
    const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
    const [selectedThirdParty, setSelectedThirdParty] = useState<ThirdPartyCompany | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; title: string; message: string; onConfirm?: () => void } | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                loadTechnicians(),
                loadThirdParties()
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadTechnicians = async () => {
        const { data: techs, error } = await supabase
            .from('technicians')
            .select('*')
            .order('name');

        if (error) throw error;

        // Load all work orders to calculate performance and status
        const { data: workOrders, error: woError } = await supabaseUntyped
            .from('work_orders')
            .select('technician_id, status');

        if (woError) throw woError;

        const enrichedTechs = (techs || []).map(tech => {
            const techOrders = workOrders?.filter(wo => wo.technician_id === tech.id) || [];
            const completedOrders = techOrders.filter(wo => wo.status === 'Concluído').length;
            const openOrders = techOrders.filter(wo => wo.status !== 'Concluído' && wo.status !== 'Cancelado').length;
            const hasActiveOrder = techOrders.some(wo => wo.status === 'Em Progresso');

            return {
                ...tech,
                status: (tech.status === 'Ativo' && hasActiveOrder) ? 'Em Campo' : tech.status,
                open_orders: openOrders,
                completed_orders: completedOrders
            };
        });

        setTechnicians(enrichedTechs as any);
    };

    const loadThirdParties = async () => {
        const { data: companies, error: companiesError } = await supabase
            .from('third_party_companies')
            .select('*')
            .order('name');

        if (companiesError) throw companiesError;

        const { data: workOrders, error: woError } = await supabaseUntyped
            .from('work_orders')
            .select('third_party_company_id, status');

        if (woError) throw woError;

        const enrichedCompanies = (companies || []).map(company => {
            const companyOrders = workOrders?.filter(wo => wo.third_party_company_id === company.id) || [];
            const completedOrders = companyOrders.filter(wo => wo.status === 'Concluído').length;
            const openOrders = companyOrders.filter(wo => wo.status !== 'Concluído' && wo.status !== 'Cancelado').length;
            const hasActiveOrder = companyOrders.some(wo => wo.status === 'Em Progresso');

            return {
                ...company,
                status: (company.status === 'Ativo' && hasActiveOrder) ? 'Em Campo' : company.status,
                open_orders: openOrders,
                completed_orders: completedOrders
            };
        });

        setThirdPartyCompanies(enrichedCompanies as any);
    };

    const handleNewTechnician = () => {
        setSelectedTechnician(null);
        setIsModalOpen(true);
    };

    const handleEditTechnician = (tech: Technician) => {
        setSelectedTechnician(tech);
        setIsModalOpen(true);
    };

    const handleSaveTechnician = async (techData: any) => {
        try {
            // Sanitizar dados para o banco (remover campos virtuais e metadados)
            const { open_orders, completed_orders, id, created_at, updated_at, ...dataToSave } = techData;

            // Se o status for 'Em Campo', salvar como 'Ativo' no banco
            if (dataToSave.status === 'Em Campo') {
                dataToSave.status = 'Ativo';
            }

            if (selectedTechnician) {
                const { error } = await supabase
                    .from('technicians')
                    .update(dataToSave)
                    .eq('id', selectedTechnician.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('technicians')
                    .insert([dataToSave]);
                if (error) throw error;
            }
            setIsModalOpen(false);
            loadTechnicians();
            setFeedback({
                type: 'success',
                title: 'Sucesso!',
                message: `Técnico ${selectedTechnician ? 'atualizado' : 'cadastrado'} com sucesso.`
            });
        } catch (error: any) {
            setFeedback({
                type: 'error',
                title: 'Erro',
                message: error.message || 'Erro ao salvar técnico.'
            });
        }
    };

    const handleDeleteTechnician = async (id: string, name: string) => {
        setFeedback({
            type: 'info',
            title: 'Confirmar Exclusão',
            message: `Tem certeza que deseja excluir o técnico ${name}?`,
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('technicians')
                        .delete()
                        .eq('id', id);
                    if (error) throw error;
                    loadTechnicians();
                    setFeedback({
                        type: 'success',
                        title: 'Excluído',
                        message: 'Técnico removido com sucesso.'
                    });
                } catch (error: any) {
                    setFeedback({
                        type: 'error',
                        title: 'Erro',
                        message: 'Não foi possível excluir o técnico. Verifique se existem registros vinculados.'
                    });
                }
            }
        });
    };

    const handleNewThirdParty = () => {
        setSelectedThirdParty(null);
        setIsThirdPartyModalOpen(true);
    };

    const handleEditThirdParty = (company: ThirdPartyCompany) => {
        setSelectedThirdParty(company);
        setIsThirdPartyModalOpen(true);
    };

    const handleSaveThirdParty = async (companyData: any) => {
        console.log('Technicians: handleSaveThirdParty INITIAL input:', companyData);
        try {
            // Sanitizar dados para o banco (remover campos virtuais e metadados)
            const { open_orders, completed_orders, id, created_at, updated_at, ...dataToSave } = companyData;
            console.log('Technicians: handleSaveThirdParty AFTER sanitization:', dataToSave);

            // Se o status for 'Em Campo', salvar como 'Ativo' no banco
            if (dataToSave.status === 'Em Campo') {
                dataToSave.status = 'Ativo';
            }

            const targetId = companyData.id || (selectedThirdParty ? selectedThirdParty.id : null);

            if (targetId) {
                console.log('Technicians: Updating company with ID:', targetId, dataToSave);
                const { data, error } = await supabase
                    .from('third_party_companies')
                    .update(dataToSave)
                    .eq('id', targetId)
                    .select();

                console.log('Technicians: Supabase update response data:', data);
                console.log('Technicians: Supabase update response error:', error);

                if (error) {
                    console.error('Erro no update do Supabase:', error);
                    throw error;
                }

                if (!data || data.length === 0) {
                    console.warn('Technicians: No rows updated. ID mismatch or RLS issue?');
                }
            } else {
                console.log('Technicians: Inserting nova empresa:', dataToSave);
                const { error } = await supabase
                    .from('third_party_companies')
                    .insert([dataToSave]);
                if (error) {
                    console.error('Erro no insert do Supabase:', error);
                    throw error;
                }
            }
            setIsThirdPartyModalOpen(false);
            loadThirdParties();
            setFeedback({
                type: 'success',
                title: 'Sucesso!',
                message: `Empresa ${selectedThirdParty ? 'atualizada' : 'cadastrada'} com sucesso.`
            });
        } catch (error: any) {
            setFeedback({
                type: 'error',
                title: 'Erro',
                message: error.message || 'Erro ao salvar empresa.'
            });
        }
    };

    const handleDeleteThirdParty = async (id: string, name: string) => {
        setFeedback({
            type: 'info',
            title: 'Confirmar Exclusão',
            message: `Tem certeza que deseja excluir a empresa ${name}?`,
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('third_party_companies')
                        .delete()
                        .eq('id', id);
                    if (error) throw error;
                    loadThirdParties();
                    setFeedback({
                        type: 'success',
                        title: 'Excluído',
                        message: 'Empresa removida com sucesso.'
                    });
                } catch (error: any) {
                    setFeedback({
                        type: 'error',
                        title: 'Erro',
                        message: 'Não foi possível excluir a empresa. Verifique se existem registros vinculados.'
                    });
                }
            }
        });
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const getAvatarColor = (name: string) => {
        const colors = [
            { bg: 'rgba(17, 212, 115, 0.1)', text: 'var(--primary-color)' },
            { bg: '#F5F3FF', text: '#7C3AED' },
            { bg: '#ECFDF5', text: '#059669' },
            { bg: '#FFF7ED', text: '#EA580C' },
            { bg: '#FFF1F2', text: '#E11D48' },
        ];
        const index = name.length % colors.length;
        return colors[index];
    };

    const filteredTechnicians = useMemo(() => {
        return technicians.filter(tech => {
            const safeName = tech.name || '';
            const safeSpecialty = tech.specialty || '';
            const searchLower = searchTerm.toLowerCase();

            const matchesSearch = safeName.toLowerCase().includes(searchLower) ||
                safeSpecialty.toLowerCase().includes(searchLower);

            const matchesTab = activeTab === 'Todos' || tech.specialty === activeTab;

            return matchesSearch && matchesTab;
        });
    }, [technicians, searchTerm, activeTab]);

    const filteredThirdParties = useMemo(() => {
        return thirdPartyCompanies.filter(company => {
            const safeName = company.name || '';
            const safeContact = company.contact_name || '';
            const safeSpecialty = company.specialty || '';
            const searchLower = searchTerm.toLowerCase();

            const matchesSearch = safeName.toLowerCase().includes(searchLower) ||
                safeContact.toLowerCase().includes(searchLower) ||
                safeSpecialty.toLowerCase().includes(searchLower);

            const matchesTab = activeTab === 'Todos' || company.specialty === activeTab;

            return matchesSearch && matchesTab;
        });
    }, [thirdPartyCompanies, searchTerm, activeTab]);

    const topPerformers = useMemo(() => {
        return [...technicians]
            .sort((a, b) => (b.completed_orders || 0) - (a.completed_orders || 0))
            .slice(0, 5);
    }, [technicians]);

    const topCompanies = useMemo(() => {
        return [...thirdPartyCompanies]
            .sort((a, b) => (b.completed_orders || 0) - (a.completed_orders || 0))
            .slice(0, 5);
    }, [thirdPartyCompanies]);

    const getPerformancePercentage = (entity: any) => {
        const total = (entity.completed_orders || 0) + (entity.open_orders || 0);
        if (total === 0) return 0;
        return Math.round((entity.completed_orders || 0) / total * 100);
    };

    const paginatedTechnicians = filteredTechnicians.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalPages = Math.ceil(filteredTechnicians.length / itemsPerPage);

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px' }}>
            {/* Main Tabs */}
            <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid #E2E8F0', marginBottom: 28 }}>
                <button
                    onClick={() => { setMainTab('internos'); setActiveTab('Todos'); setCurrentPage(1); }}
                    style={{
                        paddingBottom: 12, fontSize: '1rem', fontWeight: 600, border: 'none', background: 'none',
                        color: mainTab === 'internos' ? 'var(--primary-color)' : '#64748B', cursor: 'pointer', position: 'relative'
                    }}
                >
                    Equipe Interna
                    {mainTab === 'internos' && <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: 'var(--primary-color)' }} />}
                </button>
                <button
                    onClick={() => { setMainTab('terceirizados'); setActiveTab('Todos'); setCurrentPage(1); }}
                    style={{
                        paddingBottom: 12, fontSize: '1rem', fontWeight: 600, border: 'none', background: 'none',
                        color: mainTab === 'terceirizados' ? 'var(--primary-color)' : '#64748B', cursor: 'pointer', position: 'relative'
                    }}
                >
                    Parceiros de Terceiros
                    {mainTab === 'terceirizados' && <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: 'var(--primary-color)' }} />}
                </button>
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
                {/* Left Content Area */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {mainTab === 'internos' ? (
                        <>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                                        Corpo Técnico
                                    </h2>
                                    <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: 4 }}>
                                        Gerencie sua equipe, escalas e performance.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div style={{ position: 'relative', width: 280 }}>
                                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                        <input
                                            type="text"
                                            placeholder="Buscar por nome, especialidade..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, fontSize: '0.875rem', border: '1px solid #E2E8F0', borderRadius: 10, outline: 'none', background: '#FFFFFF', color: '#334155' }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleNewTechnician}
                                        className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
                                    >
                                        <UserPlus size={18} />
                                        Novo Técnico
                                    </button>
                                </div>
                            </div>

                            {/* Specialty Filter */}
                            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                                {['Todos', 'Máquinas', 'Predial', 'Outros', 'Geral'].map(specialty => (
                                    <button
                                        key={specialty}
                                        onClick={() => setActiveTab(specialty)}
                                        style={{
                                            padding: '6px 16px', borderRadius: 20, fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', transition: 'all 0.2s',
                                            border: `1px solid ${activeTab === specialty ? 'var(--primary-color)' : '#E2E8F0'}`,
                                            background: activeTab === specialty ? 'rgba(17, 212, 115, 0.1)' : '#FFFFFF',
                                            color: activeTab === specialty ? 'var(--primary-color)' : '#64748B'
                                        }}
                                    >
                                        {specialty}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                                {paginatedTechnicians.map(tech => {
                                    const avColor = getAvatarColor(tech.name);
                                    return (
                                        <div key={tech.id} style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, position: 'relative', transition: 'all 0.3s', display: 'flex', flexDirection: 'column' }} className="hover:shadow-md hover:border-primary-light/30 group">
                                            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', items: 'center', gap: 8 }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: 6,
                                                    fontSize: '0.625rem',
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    background: tech.status === 'Ativo' ? '#ECFDF5' : tech.status === 'Em Campo' ? 'rgba(17, 212, 115, 0.1)' : '#FEF2F2',
                                                    color: tech.status === 'Ativo' ? '#059669' : tech.status === 'Em Campo' ? 'var(--primary-color)' : '#EF4444',
                                                    border: `1px solid ${tech.status === 'Ativo' ? '#D1FAE5' : tech.status === 'Em Campo' ? 'rgba(17, 212, 115, 0.2)' : '#FEE2E2'}`
                                                }}>
                                                    {tech.status}
                                                </span>
                                                <button onClick={() => handleEditTechnician(tech)} style={{ padding: 6, color: '#94A3B8', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer' }} className="hover:bg-slate-50 hover:text-primary">
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                                                {tech.avatar ? (
                                                    <img src={tech.avatar} alt={tech.name} style={{ width: 56, height: 56, borderRadius: 16, objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
                                                ) : (
                                                    <div style={{ width: 56, height: 56, borderRadius: 16, background: avColor.bg, color: avColor.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.25rem', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                        {getInitials(tech.name)}
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>{tech.name}</h3>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#F1F5F9', color: '#475569', borderRadius: 6, fontSize: '0.6875rem', fontWeight: 600, marginTop: 4 }}>
                                                        <Wrench size={10} />
                                                        {tech.specialty}
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                                <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: 12 }}>
                                                    <p style={{ margin: 0, fontSize: '0.625rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Concluídas</p>
                                                    <p style={{ margin: '2px 0 0', fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>{tech.completed_orders || 0}</p>
                                                </div>
                                                <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: 12 }}>
                                                    <p style={{ margin: 0, fontSize: '0.625rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Em Aberto</p>
                                                    <p style={{ margin: '2px 0 0', fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary-color)' }}>{tech.open_orders || 0}</p>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8125rem', color: '#64748B' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Phone size={14} style={{ color: '#94A3B8' }} />
                                                    {tech.phone}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Clock size={14} style={{ color: '#94A3B8' }} />
                                                    {tech.on_night_shift ? 'Disponível para Plantão' : 'Horário Comercial'}
                                                </div>
                                            </div>

                                            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F1F5F9', display: 'flex', gap: 8 }}>
                                                <button onClick={() => navigate(`/technicians/${tech.id}`)} style={{ flex: 1, padding: '8px', borderRadius: 10, background: '#F1F5F9', color: '#475569', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} className="hover:bg-primary-dark hover:text-white">
                                                    Ver Perfil
                                                    <ExternalLink size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteTechnician(tech.id, tech.name)} style={{ padding: '8px', borderRadius: 10, background: '#FEF2F2', color: '#EF4444', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }} className="hover:bg-brand-alert hover:text-white">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                                <p style={{ fontSize: '0.875rem', color: '#94A3B8' }}>
                                    Mostrando <b>{paginatedTechnicians.length}</b> de <b>{filteredTechnicians.length}</b> técnicos
                                </p>
                                {totalPages > 1 && (
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: currentPage === 1 ? '#CBD5E1' : '#475569', cursor: currentPage === 1 ? 'default' : 'pointer', display: 'flex', transition: 'all 0.2s' }}
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        {[...Array(totalPages)].map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentPage(i + 1)}
                                                style={{ minWidth: 32, height: 32, borderRadius: 8, border: '1px solid', borderColor: currentPage === i + 1 ? 'var(--primary-color)' : '#E2E8F0', background: currentPage === i + 1 ? 'var(--primary-color)' : '#fff', color: currentPage === i + 1 ? '#fff' : '#475569', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: currentPage === totalPages ? '#CBD5E1' : '#475569', cursor: currentPage === totalPages ? 'default' : 'pointer', display: 'flex', transition: 'all 0.2s' }}
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                                        Empresas Parceiras
                                    </h2>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div style={{ position: 'relative', width: 280 }}>
                                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                        <input
                                            type="text"
                                            placeholder="Buscar empresa, contato ou especialidade..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, fontSize: '0.875rem', border: '1px solid #E2E8F0', borderRadius: 10, outline: 'none', background: '#FFFFFF', color: '#334155' }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleNewThirdParty}
                                        className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
                                    >
                                        <Building2 size={18} />
                                        Nova Empresa
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                                {['Todos', 'Máquinas', 'Predial', 'Outros', 'Geral'].map(specialty => (
                                    <button
                                        key={specialty}
                                        onClick={() => setActiveTab(specialty)}
                                        style={{ padding: '6px 16px', borderRadius: 20, fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', transition: 'all 0.2s', border: `1px solid ${activeTab === specialty ? 'var(--primary-color)' : '#E2E8F0'}`, background: activeTab === specialty ? 'rgba(17, 212, 115, 0.1)' : '#FFFFFF', color: activeTab === specialty ? 'var(--primary-color)' : '#64748B' }}
                                    >
                                        {specialty}
                                    </button>
                                ))}
                            </div>

                            {isLoading ? (
                                <div className="flex justify-center items-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                                    {filteredThirdParties.length > 0 ? (
                                        filteredThirdParties.map(company => {
                                            return (
                                                <div key={company.id} style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, position: 'relative', transition: 'all 0.3s', display: 'flex', flexDirection: 'column' }} className="hover:shadow-md hover:border-primary-light/30 group">
                                                    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{
                                                            padding: '4px 8px',
                                                            borderRadius: 6,
                                                            fontSize: '0.625rem',
                                                            fontWeight: 700,
                                                            textTransform: 'uppercase',
                                                            background: company.status === 'Ativo' ? '#ECFDF5' : company.status === 'Em Campo' ? 'rgba(17, 212, 115, 0.1)' : '#FEF2F2',
                                                            color: company.status === 'Ativo' ? '#059669' : company.status === 'Em Campo' ? 'var(--primary-color)' : '#EF4444',
                                                            border: `1px solid ${company.status === 'Ativo' ? '#D1FAE5' : company.status === 'Em Campo' ? 'rgba(17, 212, 115, 0.2)' : '#FEE2E2'}`
                                                        }}>
                                                            {company.status}
                                                        </span>
                                                        <button onClick={() => handleEditThirdParty(company)} style={{ padding: 6, color: '#94A3B8', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer' }} className="hover:bg-slate-50 hover:text-primary">
                                                            <Edit2 size={16} />
                                                        </button>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                                                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-50 text-slate-600 border border-slate-100 shadow-sm overflow-hidden">
                                                            {company.logo_url ? (
                                                                <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Building2 size={24} />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>{company.name}</h3>
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#F1F5F9', color: '#475569', borderRadius: 6, fontSize: '0.6875rem', fontWeight: 600, marginTop: 4 }}>
                                                                <Wrench size={10} />
                                                                {company.specialty}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                                        <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: 12 }}>
                                                            <p style={{ margin: 0, fontSize: '0.625rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Concluídas</p>
                                                            <p style={{ margin: '2px 0 0', fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>{company.completed_orders || 0}</p>
                                                        </div>
                                                        <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: 12 }}>
                                                            <p style={{ margin: 0, fontSize: '0.625rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Em Aberto</p>
                                                            <p style={{ margin: '2px 0 0', fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary-color)' }}>{company.open_orders || 0}</p>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8125rem', color: '#64748B' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <User size={14} style={{ color: '#94A3B8' }} />
                                                            {company.contact_name}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <Phone size={14} style={{ color: '#94A3B8' }} />
                                                            {company.phone}
                                                        </div>
                                                    </div>

                                                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F1F5F9', display: 'flex', gap: 8 }}>
                                                        <button onClick={() => navigate(`/parceiros/${company.id}`)} style={{ flex: 1, padding: '8px', borderRadius: 10, background: '#F1F5F9', color: '#475569', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} className="hover:bg-primary-dark hover:text-white">
                                                            Ver Perfil
                                                            <ExternalLink size={14} />
                                                        </button>
                                                        <button onClick={() => handleDeleteThirdParty(company.id, company.name)} style={{ padding: '8px', borderRadius: 10, background: '#FEF2F2', color: '#EF4444', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }} className="hover:bg-brand-alert hover:text-white">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center', color: '#64748B', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0' }}>
                                            <Building2 size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                                            <p style={{ fontSize: '0.875rem' }}>Nenhuma empresa parceira encontrada.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Right Sidebar */}
                <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }} className="hidden xl:flex">
                    {mainTab === 'internos' ? (
                        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #F1F5F9', padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h4 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                    Escala do Dia
                                </h4>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#F8FAFC', borderRadius: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(17, 212, 115, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Clock size={16} style={{ color: 'var(--primary-color)' }} />
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A' }}>Turno Matutino</p>
                                        <p style={{ margin: 0, fontSize: '0.6875rem', color: '#94A3B8' }}>
                                            {technicians.filter(t => t.status === 'Ativo' || t.status === 'Em Campo').length} técnicos escalados hoje
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#F8FAFC', borderRadius: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Star size={16} style={{ color: '#F59E0B' }} />
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A' }}>Plantão Noturno</p>
                                        <p style={{ margin: 0, fontSize: '0.6875rem', color: '#94A3B8' }}>
                                            {technicians.filter(t => t.on_night_shift).length} técnicos de sobreaviso
                                        </p>
                                    </div>
                                </div>

                                {technicians.filter(t => t.on_night_shift).length > 0 && (
                                    <div style={{ marginTop: 4 }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 4 }}>
                                            {technicians.filter(t => t.on_night_shift).map(t => {
                                                const avColor = getAvatarColor(t.name);
                                                return t.avatar ? (
                                                    <img key={t.id} src={t.avatar} alt={t.name} title={t.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                                                ) : (
                                                    <div key={t.id} title={t.name} style={{ width: 28, height: 28, borderRadius: '50%', background: avColor.bg, color: avColor.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.625rem', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                                        {getInitials(t.name)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #F1F5F9', padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                        Parceiros Ativos
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.6875rem', color: '#94A3B8' }}>{thirdPartyCompanies.length} empresas cadastradas</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #F1F5F9', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                            <h4 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                Top Performance {mainTab === 'terceirizados' ? 'Empresas' : 'Técnicos'}
                            </h4>
                            <span style={{ fontSize: '0.75rem' }}>⚡</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {(mainTab === 'terceirizados' ? topCompanies : topPerformers).map((entity, idx) => {
                                const name = (entity as any).name;
                                const avatarColor = getAvatarColor(name);
                                const perfPercent = getPerformancePercentage(entity);
                                const isCompany = mainTab === 'terceirizados';

                                return (
                                    <div key={entity.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: idx === 0 ? '#FFFBEB' : 'transparent', cursor: 'pointer' }}
                                        onClick={() => navigate(isCompany ? `/parceiros/${entity.id}` : `/technicians/${entity.id}`)}
                                    >
                                        {isCompany ? (
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E2E8F0' }}>
                                                <Building2 size={16} />
                                            </div>
                                        ) : (entity as any).avatar ? (
                                            <img src={(entity as any).avatar} alt={name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor.bg, color: avatarColor.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>
                                                {getInitials(name)}
                                            </div>
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {name}
                                            </p>
                                            <p style={{ margin: 0, fontSize: '0.6875rem', color: '#94A3B8' }}>
                                                {perfPercent}% de SLA atendido
                                            </p>
                                        </div>
                                        {idx === 0 && <span style={{ fontSize: '1rem' }}>🥇</span>}
                                        {idx === 1 && <span style={{ fontSize: '1rem' }}>🥈</span>}
                                        {idx === 2 && <span style={{ fontSize: '1rem' }}>🥉</span>}
                                    </div>
                                );
                            })}

                            {(mainTab === 'terceirizados' ? topCompanies : topPerformers).length === 0 && (
                                <p style={{ fontSize: '0.8125rem', color: '#94A3B8', textAlign: 'center', padding: 12 }}>Sem dados ainda</p>
                            )}
                        </div>

                        <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(17, 212, 115, 0.05)', borderRadius: 10, border: '1px solid rgba(17, 212, 115, 0.2)' }}>
                            <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 600, color: 'var(--primary-color)' }}>Dica do Sistema</p>
                            <p style={{ margin: '4px 0 0', fontSize: '0.6875rem', color: '#64748B', lineHeight: 1.4 }}>
                                {mainTab === 'terceirizados' ? 'Acompanhe a avaliação dos seus parceiros para garantir a qualidade do serviço.' : 'Técnicos com SLA acima de 90% podem ser elegíveis para bonificação este mês.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <TechnicianModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedTechnician(null);
                }}
                onSave={handleSaveTechnician}
                technician={selectedTechnician}
            />

            <ThirdPartyModal
                isOpen={isThirdPartyModalOpen}
                onClose={() => {
                    setIsThirdPartyModalOpen(false);
                    setSelectedThirdParty(null);
                }}
                onSave={handleSaveThirdParty}
                company={selectedThirdParty}
            />

            {feedback && (
                <FeedbackModal
                    isOpen={!!feedback}
                    onClose={() => setFeedback(null)}
                    type={feedback.type}
                    title={feedback.title}
                    message={feedback.message}
                    onConfirm={feedback.onConfirm}
                />
            )}
        </div>
    );
};

export default Technicians;
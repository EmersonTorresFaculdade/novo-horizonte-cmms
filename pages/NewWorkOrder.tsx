import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  X,
  Save,
  AlertTriangle,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronRight,
  UploadCloud,
  User,
  MapPin,
  AlertOctagon,
  Loader2,
  MoreHorizontal,
  Info,
  Settings,
  Wrench,
  Building2,
  Box,
  Image,
  Trash2,
  Zap,
  Hash,
  FileText,
  Mail
} from 'lucide-react';
import { supabase, supabaseUntyped } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { IMAGES } from '../constants';
import { NotificationService } from '../services/NotificationService';
import FeedbackModal from '../components/FeedbackModal';

interface Asset {
  id: string;
  name: string;
  code: string;
  sector: string;
  category: string;
}

const NewWorkOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'confirm' | 'info';
    title: string;
    message: string;
    showLoading?: boolean;
  } | null>(null);

  // Data State
  const [assets, setAssets] = useState<Asset[]>([]);

  // Form State
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [priority, setPriority] = useState<'Baixa' | 'Média' | 'Alta' | 'Crítica'>('Média');
  const [maintenanceType, setMaintenanceType] = useState<'Corretiva' | 'Preventiva'>('Corretiva');
  const [maintenanceCategory, setMaintenanceCategory] = useState<'Equipamento' | 'Predial' | 'Outros'>('Equipamento');

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  // Quick Asset Registration State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAssetData, setQuickAssetData] = useState({
    name: '',
    sector: '',
    image_url: ''
  });
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [isAssetSelectorOpen, setIsAssetSelectorOpen] = useState(false);

  const fetchAssets = async () => {
    try {
      const { data: assetsData, error } = await supabaseUntyped.from('assets').select('id, name, code, sector, category');
      if (error) throw error;
      if (assetsData) setAssets(assetsData as Asset[]);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const generateAutoCode = async (category: string) => {
    const prefix = category === 'Máquina' ? 'MAQ-' : category === 'Predial' ? 'PRE-' : 'OUT-';

    const { data: existingAssets, error } = await supabase
      .from('assets')
      .select('code')
      .ilike('code', `${prefix}%`);

    if (error || !existingAssets || existingAssets.length === 0) {
      return `${prefix}001`;
    }

    const numbers = existingAssets
      .map(a => {
        const parts = a.code.split('-');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
      })
      .filter(n => !isNaN(n));

    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!issueDescription) {
        setFeedback({
          type: 'error',
          title: 'Campos Obrigatórios',
          message: 'Por favor, descreva detalhadamente o problema.'
        });
        setLoading(false);
        return;
      }

      if (maintenanceCategory !== 'Outros' && !selectedAssetId) {
        setFeedback({
          type: 'error',
          title: 'Campos Obrigatórios',
          message: `Por favor, selecione um item da categoria ${maintenanceCategory}.`
        });
        setLoading(false);
        return;
      }

      const asset = assets.find(a => a.id === selectedAssetId);

      const payload = {
        asset_id: maintenanceCategory !== 'Outros' ? selectedAssetId : null,
        maintenance_category: maintenanceCategory,
        technician_id: null,
        priority: priority,
        status: 'Aberto',
        issue: issueDescription,
        failure_type: 'Geral',
        sector: asset?.sector || 'Geral',
        date: new Date().toISOString(),
        requester_id: user?.id,
        maintenance_type: maintenanceType,
        estimated_hours: 0,
        downtime_hours: 0,
        parts_cost: 0,
        response_hours: 0,
        photos: uploadedFiles.map(f => f.url)
      };

      const { data: newOrder, error } = await supabaseUntyped
        .from('work_orders')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      if (newOrder) {
        // Registrar atividade inicial
        const actorName = user?.name || 'Administrador';
        await supabaseUntyped.from('work_order_activities').insert({
          work_order_id: newOrder.id,
          user_id: user?.id,
          user_name: actorName,
          activity_type: 'creation',
          description: 'criou o chamado'
        });

        await NotificationService.notifyWorkOrderCreated({
          id: newOrder.id,
          title: `Nova OS: ${newOrder.order_number}`,
          description: issueDescription,
          priority: priority,
          status: 'Aberto',
          assetId: selectedAssetId || undefined,
          locationId: '',
          assignedTo: null,
          requesterId: user?.id
        });
      }

      setFeedback({
        type: 'success',
        title: 'Chamado Aberto!',
        message: 'Sua solicitação de manutenção foi registrada com sucesso.',
        showLoading: true
      });

      setTimeout(() => {
        navigate('/work-orders');
      }, 2500);

    } catch (error: any) {
      console.error('Error creating work order:', error);
      setFeedback({
        type: 'error',
        title: 'Erro ao Abrir Chamado',
        message: error.message || 'Ocorreu um erro ao tentar registrar o chamado no sistema.'
      });
    } finally {
      setLoading(false);
    }
  };

  const categoryIcons = [
    { id: 'Equipamento', icon: Settings, label: 'Máquinas', bg: 'bg-emerald-50/50', border: 'border-primary/30', text: 'text-slate-900', iconColor: 'text-primary', permission: 'manage_equipment' },
    { id: 'Predial', icon: Building2, label: 'Predial', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-900', iconColor: 'text-primary', permission: 'manage_predial' },
    { id: 'Outros', icon: Box, label: 'Outros', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-900', iconColor: 'text-primary', permission: 'manage_others' }
  ].filter(cat => {
    // Verifica permissão específica do perfil (incluindo administradores)
    const permKey = cat.permission as keyof typeof user;
    return user ? !!user[permKey] : true;
  });

  // Ajustar categoria inicial se a padrão (Equipamento) não estiver disponível
  useEffect(() => {
    if (categoryIcons.length > 0 && !categoryIcons.find(c => c.id === maintenanceCategory)) {
      setMaintenanceCategory(categoryIcons[0].id as any);
    }
  }, [categoryIcons]);

  const handleQuickAddAsset = async () => {
    if (!quickAssetData.name || !quickAssetData.sector) {
      setFeedback({
        type: 'error',
        title: 'Campos Incompletos',
        message: 'Preencha Nome e Setor para cadastrar o novo ativo.'
      });
      return;
    }

    try {
      setLoading(true);
      const dbCategory = maintenanceCategory === 'Predial' ? 'Predial' :
        maintenanceCategory === 'Equipamento' ? 'Máquina' : 'Outros';
      const autoCode = await generateAutoCode(dbCategory);

      const { data, error } = await supabase
        .from('assets')
        .insert([{
          name: quickAssetData.name,
          code: autoCode,
          sector: quickAssetData.sector,
          category: dbCategory,
          status: 'Operacional',
          image_url: quickAssetData.image_url || null,
          model: '',
          manufacturer: ''
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchAssets();
      setSelectedAssetId(data.id);
      setShowQuickAdd(false);
      setQuickAssetData({ name: '', sector: '', image_url: '' });

      setFeedback({
        type: 'success',
        title: 'Ativo Cadastrado',
        message: `O novo ativo foi registrado com o código ${autoCode} e selecionado.`
      });
    } catch (error: any) {
      console.error('Error adding asset:', error);
      setFeedback({
        type: 'error',
        title: 'Erro no Cadastro',
        message: error.message || 'Não foi possível cadastrar o ativo agora.'
      });
    } finally {
      setLoading(false);
    }
  };

  const priorities = [
    { id: 'Baixa', label: 'Baixa', icon: CheckCircle2, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', iconColor: 'text-emerald-500' },
    { id: 'Média', label: 'Média', icon: AlertTriangle, bg: 'bg-emerald-50/50', border: 'border-primary-light/20', text: 'text-blue-700', iconColor: 'text-primary' },
    { id: 'Alta', label: 'Alta', icon: AlertTriangle, bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', iconColor: 'text-orange-500' },
    { id: 'Crítica', label: 'Emergência', icon: AlertOctagon, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', iconColor: 'text-brand-alert' },
  ];

  const filteredAssets = assets
    .filter(asset => {
      if (maintenanceCategory === 'Equipamento') return asset.category === 'Máquina';
      if (maintenanceCategory === 'Predial') return asset.category === 'Predial';
      if (maintenanceCategory === 'Outros') return asset.category === 'Outros';
      return false;
    })
    .filter(asset =>
      asset.name.toLowerCase().includes(assetSearchTerm.toLowerCase()) ||
      asset.code.toLowerCase().includes(assetSearchTerm.toLowerCase())
    );

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  return (
    <div className="flex flex-col gap-10 max-w-6xl mx-auto pb-20 pt-4 px-4 sm:px-6 animate-in fade-in duration-700">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-10 md:p-14 text-white shadow-2xl shadow-black/20">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Zap size={180} className="rotate-12" />
        </div>
        <div className="absolute -bottom-24 -left-24 size-64 bg-primary/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate('/work-orders')}
              className="group size-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all border border-white/10 backdrop-blur-sm"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              Protocolo de Assistência
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Abertura de <span className="text-primary italic">Novo Chamado</span>
          </h2>
          <p className="text-slate-400 text-base md:text-lg font-medium leading-relaxed max-w-lg">
            Garantimos a continuidade da sua operação. Preencha os detalhes técnicos para um atendimento preciso e profissional.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Main Form Area */}
        <div className="lg:col-span-8 space-y-10">

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden group/card transition-all hover:shadow-md">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/20">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-4">
                <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                  <User size={20} strokeWidth={2.5} />
                </div>
                Identificação do Solicitante
              </h3>
            </div>

            <div className="p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative group transition-all">
                  <div className="absolute inset-0 bg-primary/5 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center gap-5 px-6 py-5 bg-slate-50/50 rounded-[2rem] border border-slate-200/50 hover:border-primary/30 hover:bg-white transition-all h-[100px] hover:shadow-lg hover:shadow-black/[0.02]">
                    <div className="size-16 bg-slate-900 border-2 border-white rounded-2xl flex items-center justify-center text-white font-black text-xl overflow-hidden shadow-xl shadow-black/10 shrink-0 transform group-hover:scale-105 transition-transform duration-500">
                      {profile.avatar && profile.avatar !== IMAGES.profileCarlos ? (
                        <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        (profile.name || 'A')[0]
                      )}
                    </div>
                    <div className="flex flex-col justify-center overflow-hidden">
                      <p className="text-base font-black text-slate-900 leading-tight truncate">{profile.name}</p>
                    </div>
                  </div>
                </div>

                <div className="relative group transition-all">
                  <div className="absolute inset-0 bg-primary/5 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center gap-5 px-6 py-5 bg-slate-50/50 rounded-[2rem] border border-slate-200/50 hover:border-primary/30 hover:bg-white transition-all h-[100px] hover:shadow-lg hover:shadow-black/[0.02]">
                    <div className="size-16 bg-primary/10 border-2 border-white rounded-2xl flex items-center justify-center text-primary shadow-inner shrink-0 transform group-hover:scale-105 transition-transform duration-500">
                      <Mail size={28} strokeWidth={2} />
                    </div>
                    <div className="flex flex-col justify-center overflow-hidden">
                      <p className="text-sm font-bold text-slate-600 truncate">{profile.email || user?.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Localização & Ativo */}
          <div className={`bg-white rounded-[2.5rem] shadow-sm border border-slate-200 group/card transition-all hover:shadow-md ${!isAssetSelectorOpen ? 'overflow-hidden' : 'z-[50]'}`}>
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/20">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-4">
                <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                  <MapPin size={20} strokeWidth={2.5} />
                </div>
                Localização & Ativo
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="text-[10px] font-black text-primary hover:text-slate-900 flex items-center gap-2 transition-all bg-primary/10 px-4 py-2.5 rounded-full border border-primary/20 shadow-sm hover:shadow-black/10 active:scale-95"
              >
                {showQuickAdd ? <X size={12} /> : <Plus size={12} />}
                {showQuickAdd ? 'CANCELAR' : 'CADASTRAR NOVO ATIVO'}
              </button>
            </div>

            <div className="p-10 space-y-8">
              {!showQuickAdd ? (
                <div className="space-y-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Vínculo do Chamado <span className="text-brand-alert">*</span></label>
                  <div className={`relative ${isAssetSelectorOpen ? 'z-[100]' : ''}`}>
                    <button
                      type="button"
                      onClick={() => setIsAssetSelectorOpen(!isAssetSelectorOpen)}
                      className="w-full px-8 py-6 bg-white border-2 border-slate-100 rounded-[1.5rem] text-sm outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold flex items-center justify-between cursor-pointer group/btn"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`size-10 rounded-xl flex items-center justify-center transition-all ${selectedAssetId ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20 scale-110' : 'bg-slate-100 text-slate-400'}`}>
                          <Box size={20} />
                        </div>
                        <div className="text-left">
                          <span className={`block text-sm font-black ${selectedAssetId ? 'text-slate-900' : 'text-slate-400'}`}>
                            {selectedAsset ? selectedAsset.name : 'Selecione o equipamento...'}
                          </span>
                          {selectedAsset && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              Código Interno: {selectedAsset.code}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronDown size={22} className={`text-slate-300 transition-transform duration-500 ${isAssetSelectorOpen ? 'rotate-180 text-primary' : ''}`} />
                    </button>

                    {isAssetSelectorOpen && (
                      <div className="absolute z-[100] w-full mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl shadow-black/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 ring-1 ring-slate-900/5">
                        <div className="p-4 border-b border-slate-100 bg-white">
                          <div className="relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Filtre por nome, código ou setor..."
                              value={assetSearchTerm}
                              onChange={(e) => setAssetSearchTerm(e.target.value)}
                              autoFocus
                              className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary/40 font-bold transition-all"
                            />
                          </div>
                        </div>
                        <div className="max-h-[320px] overflow-y-auto p-2 space-y-1">
                          {filteredAssets.length > 0 ? (
                            filteredAssets.map(asset => (
                              <button
                                type="button"
                                key={asset.id}
                                onClick={() => {
                                  setSelectedAssetId(asset.id);
                                  setIsAssetSelectorOpen(false);
                                  setAssetSearchTerm('');
                                }}
                                className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-200 group/item ${selectedAssetId === asset.id ? 'bg-primary text-slate-900 shadow-md' : 'hover:bg-slate-50 text-slate-700'}`}
                              >
                                <div className={`text-sm font-black uppercase tracking-tight mb-1 ${selectedAssetId === asset.id ? 'text-slate-900' : 'text-slate-900'}`}>{asset.name}</div>
                                <div className={`text-[10px] font-bold uppercase tracking-[0.1em] flex items-center gap-3 ${selectedAssetId === asset.id ? 'text-slate-600' : 'text-slate-400'}`}>
                                  <span className="flex items-center gap-1.5"><Hash size={12} /> {asset.code}</span>
                                  <span className="opacity-30">|</span>
                                  <span className="flex items-center gap-1.5"><MapPin size={12} /> {asset.sector}</span>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="py-12 text-center">
                              <Box size={40} className="mx-auto text-slate-200 mb-4 opacity-50" />
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nenhum ativo localizado</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-primary/5 border-2 border-primary/20 rounded-[2.5rem] p-10 space-y-8 animate-in zoom-in-95 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificação do Ativo</label>
                      <input
                        type="text"
                        placeholder="Ex: Torno CNC Mazak"
                        value={quickAssetData.name}
                        onChange={(e) => setQuickAssetData({ ...quickAssetData, name: e.target.value })}
                        className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 font-bold transition-all"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Localização Técnica</label>
                      <input
                        type="text"
                        placeholder="Ex: Usinagem - Galpão 02"
                        value={quickAssetData.sector}
                        onChange={(e) => setQuickAssetData({ ...quickAssetData, sector: e.target.value })}
                        className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 font-bold transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Documentação Fotográfica (URL)</label>
                    <input
                      type="text"
                      placeholder="https://cloud.com/maquina.jpg"
                      value={quickAssetData.image_url}
                      onChange={(e) => setQuickAssetData({ ...quickAssetData, image_url: e.target.value })}
                      className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 font-bold transition-all"
                    />
                  </div>
                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={handleQuickAddAsset}
                      disabled={loading}
                      className="px-10 py-5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.25em] rounded-2xl hover:bg-black transition-all flex items-center gap-3 shadow-xl shadow-black/20 disabled:opacity-50"
                    >
                      {loading ? <Loader2 size={18} className="animate-spin text-primary" /> : <Save size={18} className="text-primary" />}
                      Efetivar Cadastro
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Escopo & Evidências */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden group/card transition-all hover:shadow-md">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/20">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-4">
                <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                  <FileText size={20} strokeWidth={2.5} />
                </div>
                Escopo Técnico & Evidências
              </h3>
            </div>

            <div className="p-10 space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Descrição Detalhada do Incidente <span className="text-brand-alert">*</span></label>
                <textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="w-full px-8 py-6 bg-slate-50/30 border-2 border-slate-100 rounded-[1.5rem] text-base outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary/30 resize-none transition-all font-bold min-h-[220px] placeholder:text-slate-300 italic leading-relaxed"
                  placeholder="Seja o mais específico possível: o que aconteceu? Houve ruídos, vibrações ou paradas bruscas? O equipamento está inoperante?"
                ></textarea>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Registro Fotográfico (Max 4)</label>
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{uploadedFiles.length}/4 Arquivos</span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    setUploading(true);
                    try {
                      for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const ext = file.name.split('.').pop();
                        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                        const filePath = `work-orders/${fileName}`;
                        const { error: uploadError } = await supabase.storage
                          .from('evidencias')
                          .upload(filePath, file);
                        if (uploadError) throw uploadError;
                        const { data: urlData } = supabase.storage
                          .from('evidencias')
                          .getPublicUrl(filePath);
                        setUploadedFiles(prev => [...prev, { name: file.name, url: urlData.publicUrl }]);
                      }
                    } catch (err: any) {
                      setFeedback({
                        type: 'error',
                        title: 'Erro no Upload',
                        message: err.message || 'Falha ao processar imagens.'
                      });
                    } finally {
                      setUploading(false);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }
                  }}
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadedFiles.length >= 4 || uploading}
                    className="aspect-square border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:bg-primary/5 hover:border-primary/40 transition-all cursor-pointer group/upload disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <Loader2 size={24} className="animate-spin text-primary" />
                    ) : (
                      <>
                        <div className="size-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover/upload:bg-white group-hover/upload:text-primary transition-all shadow-sm">
                          <UploadCloud size={24} />
                        </div>
                        <div className="text-center">
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover/upload:text-primary">Anexar</span>
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover/upload:text-primary">Evidências</span>
                        </div>
                      </>
                    )}
                  </button>

                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="relative aspect-square rounded-[2rem] overflow-hidden border-2 border-slate-100 group/thumb shadow-sm hover:shadow-xl transition-all duration-500">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover/thumb:scale-125"
                      />
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] opacity-0 group-hover/thumb:opacity-100 transition-all flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="size-12 bg-red-500 text-white rounded-full hover:bg-red-600 hover:scale-110 transition-all shadow-2xl flex items-center justify-center"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {[...Array(Math.max(0, 3 - uploadedFiles.length))].map((_, i) => (
                    <div key={`empty-${i}`} className="hidden sm:block aspect-square bg-slate-50/50 border-2 border-slate-100/50 rounded-[2rem]"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Modalidade de Atendimento */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden group/card transition-all hover:shadow-md">
            <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/20">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-4">
                <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                  <Wrench size={20} strokeWidth={2.5} />
                </div>
                Configuração de Atendimento
              </h3>
            </div>
            <div className="p-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {['Corretiva', 'Preventiva'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMaintenanceType(type as any)}
                    className={`relative p-8 rounded-[2rem] border-2 transition-all group/type overflow-hidden flex flex-col items-center justify-center gap-4 ${maintenanceType === type
                      ? 'bg-slate-900 border-slate-900 text-white shadow-2xl shadow-black/20 scale-[1.02]'
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    <div className={`size-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${maintenanceType === type ? 'bg-primary text-slate-900 shadow-lg' : 'bg-slate-50 text-slate-300 group-hover/type:bg-white'}`}>
                      {type === 'Corretiva' ? <Zap size={28} strokeWidth={2.5} /> : <Settings size={28} strokeWidth={2.5} />}
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.3em]">{type}</span>
                    {maintenanceType === type && (
                      <div className="absolute top-4 right-4 text-primary">
                        <CheckCircle2 size={18} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Controls Area */}
        <div className="lg:col-span-4 space-y-10">

          {/* Section: Categoria */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 space-y-10 transition-all hover:shadow-md">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Modalidade Técnica</h3>
            <div className="grid grid-cols-1 gap-4">
              {categoryIcons.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setMaintenanceCategory(cat.id as any);
                    if (cat.id !== 'Equipamento') setSelectedAssetId('');
                  }}
                  className={`relative flex items-center gap-5 p-5 rounded-[2rem] border-2 transition-all group/cat ${maintenanceCategory === cat.id
                    ? `${cat.bg} ${cat.border} ${cat.text} shadow-xl shadow-black/5 ring-4 ring-primary/5`
                    : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-500'
                    }`}
                >
                  <div className={`size-12 rounded-xl flex items-center justify-center transition-all duration-500 ${maintenanceCategory === cat.id ? 'bg-primary text-slate-900 shadow-lg' : 'bg-slate-50 text-slate-400 group-hover/cat:bg-white'}`}>
                    <cat.icon size={22} strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                    <span className={`block text-[11px] font-black uppercase tracking-[0.15em] ${maintenanceCategory === cat.id ? 'text-slate-900' : 'text-slate-400'}`}>{cat.label}</span>
                  </div>
                  {maintenanceCategory === cat.id && (
                    <div className="absolute top-4 right-5">
                      <div className="size-1.5 bg-primary rounded-full animate-pulse"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Prioridade */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 space-y-8 transition-all hover:shadow-md">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Grau de Urgência</h3>
            <div className="space-y-4">
              {priorities.map(p => {
                const isSelected = priority === p.id;
                const bgColor = isSelected ? p.bg : 'bg-white hover:bg-slate-50';
                const borderColor = isSelected ? p.border : 'border-slate-100';
                const textColor = isSelected ? p.text : 'text-slate-600';

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id as any)}
                    className={`w-full flex items-center justify-between p-5 border-2 rounded-2xl transition-all duration-300 ${bgColor} ${borderColor} group/prio ${isSelected ? 'shadow-lg shadow-black/5 scale-[1.02]' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`size-12 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-white shadow-md' : 'bg-slate-50 text-slate-300 group-hover/prio:bg-white'}`}>
                        <p.icon size={22} className={isSelected ? p.iconColor : 'text-slate-400'} />
                      </div>
                      <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${textColor}`}>
                        {p.label}
                      </span>
                    </div>
                    {isSelected && (
                      <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${p.iconColor} bg-white shadow-sm border ${p.border}`}>
                        Ativo
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 space-y-5">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-slate-900 text-xs font-black uppercase tracking-[0.3em] py-8 rounded-[2.5rem] flex items-center justify-center gap-4 transition-all shadow-[0_20px_50px_rgba(0,223,130,0.2)] hover:shadow-[0_25px_60px_rgba(0,223,130,0.3)] disabled:opacity-50 active:scale-[0.97] group border-4 border-white/50"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : (
                <div className="relative">
                  <Zap size={22} className="group-hover:scale-125 transition-transform duration-500 fill-slate-900/10" />
                  <div className="absolute inset-0 size-full bg-white blur-lg opacity-0 group-hover:opacity-40 transition-opacity"></div>
                </div>
              )}
              ENVIAR ORDEM DE SERVIÇO
            </button>
            <button
              type="button"
              onClick={() => navigate('/work-orders')}
              className="w-full py-5 text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] hover:text-red-500 transition-colors flex items-center justify-center gap-2 group/cancel"
            >
              <X size={14} className="group-hover:rotate-90 transition-transform duration-500" />
              Descartar Solicitação
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <FeedbackModal
          isOpen={!!feedback}
          onClose={() => setFeedback(null)}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          showLoading={feedback.showLoading}
        />
      )}
    </div>
  );
};

export default NewWorkOrder;
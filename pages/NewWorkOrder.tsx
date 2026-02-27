import React, { useState, useEffect } from 'react';
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
  Box
} from 'lucide-react';
import { supabase, supabaseUntyped } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
  const [failureType, setFailureType] = useState('mecanica');
  const [maintenanceType, setMaintenanceType] = useState<'Preventiva' | 'Corretiva' | 'Preditiva'>('Corretiva');
  const [maintenanceCategory, setMaintenanceCategory] = useState<'Equipamento' | 'Predial' | 'Outros'>('Equipamento');

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
        status: 'Pendente',
        issue: issueDescription,
        failure_type: failureType,
        sector: asset?.sector || 'Geral',
        date: new Date().toISOString(),
        requester_id: user?.id,
        maintenance_type: maintenanceType,
        estimated_hours: 0,
        downtime_hours: 0,
        parts_cost: 0,
        response_hours: 0
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
          status: 'Pendente',
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
    { id: 'Equipamento', icon: Settings, label: 'Máquinas', bg: 'bg-emerald-50/50', border: 'border-primary-light/30', text: 'text-blue-900', iconColor: 'text-primary', permission: 'manage_equipment' },
    { id: 'Predial', icon: Building2, label: 'Predial', bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-900', iconColor: 'text-indigo-600', permission: 'manage_predial' },
    { id: 'Outros', icon: Box, label: 'Outros', bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-900', iconColor: 'text-slate-600', permission: 'manage_others' }
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
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-2">
        <div className="flex-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Formulário de Abertura de Chamado</h2>
          <p className="text-slate-500 text-sm mt-1">
            Envie um novo chamado para problemas de manutenção. Preencha todos os detalhes com atenção.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50/50 text-blue-700 rounded-full border border-primary-light/10/50">
          <Info size={14} />
          <span className="text-xs font-bold uppercase tracking-wide">Status: Será Pendente</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-6">
              <div className="p-1.5 bg-slate-100 rounded-md text-slate-500">
                <User size={16} />
              </div>
              Informações do Solicitante
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-tight">Nome Completo</label>
                <input
                  type="text"
                  readOnly
                  value={user?.name || 'Administrador Root'}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-sm text-slate-600 outline-none font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-tight">E-mail Corporativo</label>
                <input
                  type="text"
                  readOnly
                  value={user?.email || 'ti@novohorizonte.com'}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-sm text-slate-600 outline-none font-medium"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-6">
              <div className="p-1.5 bg-slate-100 rounded-md text-slate-500">
                <MapPin size={16} />
              </div>
              Detalhes do Local
            </h3>

            <div className="space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Ativo vinculado a {maintenanceCategory === 'Equipamento' ? 'Máquina' : maintenanceCategory === 'Predial' ? 'Predial' : 'Geral'} <span className="text-brand-alert">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickAdd(!showQuickAdd)}
                    className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1 transition-colors"
                  >
                    {showQuickAdd ? <X size={14} /> : <Plus size={14} />}
                    {showQuickAdd ? 'Cancelar' : 'Cadastrar Novo'}
                  </button>
                </div>

                {!showQuickAdd ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsAssetSelectorOpen(!isAssetSelectorOpen)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span className={selectedAssetId ? 'text-slate-900' : 'text-slate-400'}>
                        {selectedAsset ? `${selectedAsset.name} [${selectedAsset.code}]` : 'Selecione um ativo...'}
                      </span>
                      <ChevronDown size={18} className={`text-slate-400 transition-transform ${isAssetSelectorOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isAssetSelectorOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                          <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Pesquisar por nome ou código..."
                              value={assetSearchTerm}
                              onChange={(e) => setAssetSearchTerm(e.target.value)}
                              autoFocus
                              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-primary"
                            />
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
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
                                className={`w-full text-left px-4 py-3 text-sm border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${selectedAssetId === asset.id ? 'bg-primary/5 text-primary font-bold' : 'text-slate-700'}`}
                              >
                                <div className="font-bold text-slate-800 uppercase tracking-tight">{asset.name}</div>
                                <div className="text-xs text-slate-500 font-medium">{asset.code} • {asset.sector}</div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-8 text-center text-slate-500 text-xs">
                              Nenhum ativo encontrado
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-inner">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome do Ativo</label>
                        <input
                          type="text"
                          placeholder="Ex: Ar Condicionado Sala 10"
                          value={quickAssetData.name}
                          onChange={(e) => setQuickAssetData({ ...quickAssetData, name: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Local / Setor</label>
                        <input
                          type="text"
                          placeholder="Ex: Sala TI, Ferramentaria"
                          value={quickAssetData.sector}
                          onChange={(e) => setQuickAssetData({ ...quickAssetData, sector: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Imagem do Ativo (URL)</label>
                      <input
                        type="text"
                        placeholder="https://exemplo.com/imagem.jpg"
                        value={quickAssetData.image_url}
                        onChange={(e) => setQuickAssetData({ ...quickAssetData, image_url: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary transition-all"
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleQuickAddAsset}
                        disabled={loading}
                        className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition-all flex items-center gap-2 shadow-md shadow-primary/10 disabled:opacity-50"
                      >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        SALVAR E SELECIONAR ATIVO
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-tight">Descrição do Problema <span className="text-brand-alert">*</span></label>
              <textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                className="w-full p-4 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none transition-all font-medium"
                rows={4}
                placeholder="Descreva o problema com o máximo de detalhes possível..."
              ></textarea>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-tight">Evidências / Fotos</label>
              <div className="border border-dashed border-slate-300 rounded-lg p-6 flex items-center justify-center gap-4 hover:bg-slate-50/50 transition-colors cursor-pointer group">
                <div className="p-2.5 bg-slate-100 rounded-md text-slate-500 group-hover:bg-slate-200 transition-colors">
                  <UploadCloud size={20} />
                </div>
                <div className="text-sm font-medium text-slate-700">Fazer upload de arquivo</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-6">
              <div className="p-1.5 bg-slate-100 rounded-md text-slate-500">
                <Wrench size={16} />
              </div>
              Tipo de Serviço
            </h3>

            <div className="flex flex-wrap gap-3">
              {['Corretiva', 'Preventiva', 'Preditiva'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMaintenanceType(type as any)}
                  className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${maintenanceType === type
                    ? 'bg-[#0a2540] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >
                  {type === 'Preditiva' ? 'Inspeção' : type}
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-1.5 max-w-sm">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-tight">Classificação da Falha</label>
              <select
                value={failureType}
                onChange={(e) => setFailureType(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary focus:bg-white transition-all font-medium"
              >
                <option value="mecanica">Máquinas</option>
                <option value="eletrica">Elétrica</option>
                <option value="hidraulica">Hidráulica</option>
                <option value="outro">Geral</option>
              </select>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Tipo de Manutenção</h3>
            <div className="grid grid-cols-2 gap-3">
              {categoryIcons.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setMaintenanceCategory(cat.id as any);
                    if (cat.id !== 'Equipamento') setSelectedAssetId('');
                  }}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all group ${maintenanceCategory === cat.id
                    ? `${cat.bg} ${cat.border} ${cat.text}`
                    : 'bg-white border-transparent hover:border-slate-100 hover:bg-slate-50 text-slate-500'
                    }`}
                >
                  <cat.icon size={24} strokeWidth={1.5} className={`mb-3 transition-colors ${maintenanceCategory === cat.id ? cat.iconColor : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span className={`text-[11px] font-bold ${maintenanceCategory === cat.id ? cat.text : 'text-slate-500'}`}>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Prioridade</h3>
            <div className="space-y-1">
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
                    className={`w-full flex items-center justify-between p-3.5 border rounded-lg transition-all ${bgColor} ${borderColor}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-4 rounded-full border-2 flex items-center justify-center ${isSelected ? p.iconColor.replace('text-', 'border-') : 'border-slate-300'
                        }`}>
                        {isSelected && <div className={`size-2 rounded-full ${p.iconColor.replace('text-', 'bg-')}`}></div>}
                      </div>
                      <span className={`text-sm font-semibold ${textColor}`}>
                        {p.label}
                      </span>
                    </div>
                    {p.id === 'Média' ? (
                      <span className={`font-bold text-lg leading-none ${isSelected ? p.iconColor : 'text-slate-300'}`}>-</span>
                    ) : (
                      <p.icon size={16} className={isSelected ? p.iconColor : 'text-slate-300'} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full bg-[#0a2540] hover:bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md ${loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <ChevronRight size={20} />}
              ABRIR CHAMADO
            </button>
            <button
              type="button"
              onClick={() => navigate('/work-orders')}
              disabled={loading}
              className="w-full mt-3 py-3 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors"
            >
              Cancelar
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
import React, { useState, useEffect } from 'react';
import { QrCode, Search, Filter, Edit, Save, Plus, ScanLine, X, Camera, Trash2, Loader2, RefreshCw, Wrench, Building2, Zap, Car, Monitor, MoreHorizontal, LayoutDashboard, Box } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FeedbackModal from '../components/FeedbackModal';
import { useAuth } from '../contexts/AuthContext';

interface Asset {
  id: string;
  code: string;
  name: string;
  sector: string;
  manufacturer: string;
  model: string;
  status: string;
  category: string;
  image_url?: string;
}

const Assets = () => {
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Visão Geral');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sector: '',
    category: 'Máquina',
    image_url: ''
  });

  // Atualiza a categoria padrão se o usuário não tiver acesso à categoria atual
  useEffect(() => {
    if (user && !editingId) {
      setFormData(prev => {
        if (
          (prev.category === 'Máquina' && !user.manage_equipment) ||
          (prev.category === 'Predial' && !user.manage_predial) ||
          (prev.category === 'Outros' && !user.manage_others)
        ) {
          const defaultCat = user.manage_equipment ? 'Máquina'
            : user.manage_predial ? 'Predial'
              : user.manage_others ? 'Outros'
                : 'Máquina';
          return { ...prev, category: defaultCat };
        }
        return prev;
      });
    }
  }, [user, editingId]);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'confirm' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
  } | null>(null);



  const formRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      // Busca ativos e ordens de serviço ativas em paralelo
      const [assetsRes, woRes] = await Promise.all([
        supabase.from('assets').select('*').order('name'),
        supabase.from('work_orders')
          .select('asset_id, status, priority')
          .not('status', 'in', '("Concluída", "Cancelada")')
      ]);

      if (assetsRes.error) throw assetsRes.error;

      const activeWOs = woRes.data || [];
      const assetsWithStatus = (assetsRes.data || []).map(asset => {
        const activeWO = activeWOs.find(wo => wo.asset_id === asset.id);
        return {
          ...asset,
          // Se tiver OS ativa, o status vem da OS, senão é Operacional
          status: activeWO ? activeWO.status : 'Operacional',
          active_priority: activeWO?.priority
        };
      });

      setAssets(assetsWithStatus);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setFormData({
      name: asset.name,
      sector: asset.sector,
      category: asset.category || 'Máquina',
      image_url: asset.image_url || ''
    });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      name: '',
      sector: '',
      category: 'Máquina',
      image_url: ''
    });
  };

  const generateAutoCode = async (category: string) => {
    const prefix = category === 'Máquina' ? 'MAQ-' : category === 'Predial' ? 'PRE-' : 'OUT-';

    // Buscar todos os ativos da categoria para encontrar o maior número sequencial
    const { data: existingAssets, error } = await supabase
      .from('assets')
      .select('code')
      .ilike('code', `${prefix}%`);

    if (error) {
      console.error('Erro ao buscar códigos existentes:', error);
      return `${prefix}001`;
    }

    if (!existingAssets || existingAssets.length === 0) {
      return `${prefix}001`;
    }

    // Extrair números, filtrar válidos e encontrar o máximo
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
    try {
      if (editingId) {
        // Update existing asset
        const currentAsset = assets.find(a => a.id === editingId);

        // Comparação robusta (ignora espaços extras e diferença de maiúsculas/minúsculas)
        const normalize = (cat: string) => (cat || '').trim().toLowerCase();
        const categoryChanged = currentAsset && normalize(currentAsset.category) !== normalize(formData.category);

        let updateData: any = {
          name: formData.name,
          sector: formData.sector,
          category: formData.category,
          model: '', // Campo não visível mas obrigatório no DB
          manufacturer: '', // Campo não visível no DB
          image_url: formData.image_url || null
        };

        if (categoryChanged) {
          const newCode = await generateAutoCode(formData.category);
          updateData.code = newCode;
        }

        const { error } = await supabase
          .from('assets')
          .update(updateData)
          .eq('id', editingId);

        if (error) throw error;
        setFeedback({
          type: 'success',
          title: 'Ativo Atualizado',
          message: 'Os dados do ativo foram atualizados com sucesso.'
        });
      } else {
        // Create new asset with automatic code
        const autoCode = await generateAutoCode(formData.category);

        const { error } = await supabase
          .from('assets')
          .insert([{
            code: autoCode,
            name: formData.name,
            sector: formData.sector,
            category: formData.category,
            status: 'Operacional',
            model: '', // Campo não visível mas obrigatório no DB
            manufacturer: '', // Campo não visível no DB
            image_url: formData.image_url || null
          }]);

        if (error) throw error;
        setFeedback({
          type: 'success',
          title: 'Ativo Cadastrado',
          message: `O novo ativo foi registrado com o código ${autoCode}.`
        });
      }

      handleCancelEdit(); // Reset form
      fetchAssets();
    } catch (error) {
      console.error('Error saving asset:', error);
      setFeedback({
        type: 'error',
        title: 'Erro ao Salvar',
        message: 'Não foi possível salvar as informações do ativo.'
      });
    }
  };

  const handleDelete = async (id: string) => {
    setFeedback({
      type: 'confirm',
      title: 'Excluir Máquina?',
      message: 'Tem certeza que deseja excluir esta máquina? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('assets').delete().eq('id', id);
          if (error) throw error;
          fetchAssets();
          setFeedback({
            type: 'success',
            title: 'Excluída!',
            message: 'Máquina removida do sistema com sucesso.'
          });
        } catch (error: any) {
          console.error('Error deleting asset:', error);
          if (error.code === '23503') {
            setFeedback({
              type: 'error',
              title: 'Ação Bloqueada',
              message: 'Não é possível excluir esta máquina pois ela possui Ordens de Serviço vinculadas.'
            });
          } else {
            setFeedback({
              type: 'error',
              title: 'Erro ao Excluir',
              message: 'Ocorreu um erro ao tentar remover a máquina.'
            });
          }
        }
      }
    });
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.code.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesCategory = false;
    if (activeCategory === 'Visão Geral') {
      const allowedCategories: string[] = [];
      if (user?.manage_equipment) allowedCategories.push('Máquina');
      if (user?.manage_predial) allowedCategories.push('Predial');
      if (user?.manage_others) allowedCategories.push('Outros');

      // Se não tiver nenhuma role específica, mostra Máquina como fallback (comportamento legado)
      if (allowedCategories.length === 0) allowedCategories.push('Máquina');

      matchesCategory = allowedCategories.includes(asset.category) || (allowedCategories.length === 0 && asset.category === 'Máquina');
    } else {
      matchesCategory = asset.category === activeCategory;
    }

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-6 relative">
      {/* QR Code Modal Simulation */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setIsScanning(false)}
            className="absolute top-6 right-6 text-white hover:text-red-500 transition-colors"
          >
            <X size={32} />
          </button>

          <h2 className="text-white text-xl font-bold mb-8">Escanear QR Code da Máquina</h2>

          <div className="relative size-72 sm:size-96 rounded-3xl overflow-hidden border-4 border-primary shadow-[0_0_50px_rgba(17,212,115,0.5)] bg-slate-900 flex items-center justify-center">
            {/* Camera Overlay UI */}
            <div className="absolute inset-0 z-10 opacity-50">
              <div className="w-full h-1 bg-primary/50 absolute top-10 animate-bounce"></div>
            </div>

            <div className="text-center p-6">
              <Camera size={48} className="text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-sm">Aponte a câmera para o código QR fixado no equipamento.</p>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() => setIsScanning(false)}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-medium transition-all"
            >
              Digitar Código
            </button>
            <button
              onClick={() => {
                setFeedback({
                  type: 'success',
                  title: 'QR Code Detectado',
                  message: 'Simulação: Máquina identificada com sucesso!'
                });
                setIsScanning(false);
              }}
              className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/30 transition-all flex items-center gap-2"
            >
              <ScanLine size={20} />
              Simular Detecção
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestão de Ativos</h2>
          <p className="text-sm text-slate-500">Gerencie máquinas, prédios, frota e infraestrutura.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchAssets}
            className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 border border-slate-200 transition-all"
            title="Atualizar Lista"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setIsScanning(true)}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all"
          >
            <QrCode size={18} className="text-primary" />
            Escanear Máquina
          </button>
        </div>
      </div>

      {/* Form */}
      <div ref={formRef} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{editingId ? 'Editar Ativo' : 'Novo Ativo'}</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {editingId ? 'Atualize os dados do ativo abaixo.' : 'Preencha os dados abaixo para cadastrar um novo ativo no sistema.'}
            </p>
          </div>
          <div className="text-primary bg-primary/10 p-2 rounded-lg">
            {editingId ? <Edit size={20} /> : <Plus size={20} />}
          </div>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Nome do Ativo</label>
              <input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-10 px-3 outline-none border"
                placeholder="Ex: Torno CNC, Ar Condicionado, Compressor"
                type="text"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-10 px-3 outline-none border"
                required
              >
                {user?.manage_equipment && <option value="Máquina">Máquina</option>}
                {user?.manage_predial && <option value="Predial">Predial</option>}
                {user?.manage_others && <option value="Outros">Outros</option>}
                {(!user?.manage_equipment && !user?.manage_predial && !user?.manage_others) && <option value="Máquina">Máquina</option>}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Local / Setor</label>
              <input
                value={formData.sector}
                onChange={(e) => handleChange('sector', e.target.value)}
                className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-10 px-3 outline-none border"
                placeholder="Ex: Sala TI, Ferramentaria, Produção"
                type="text"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Imagem do Ativo (URL)</label>
              <input
                value={formData.image_url}
                onChange={(e) => handleChange('image_url', e.target.value)}
                className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-10 px-3 outline-none border"
                placeholder="https://exemplo.com/imagem.jpg"
                type="url"
              />
            </div>

            <div className="lg:col-span-4 flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
              {editingId ? (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancelar Edição
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setFormData({
                    name: '',
                    sector: '',
                    category: user?.manage_equipment ? 'Máquina' : user?.manage_predial ? 'Predial' : user?.manage_others ? 'Outros' : 'Máquina',
                    image_url: ''
                  })}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Limpar
                </button>
              )}
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg flex items-center gap-2">
                <Save size={18} />
                {editingId ? 'Atualizar Ativo' : 'Salvar Ativo'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Tabs / Filter categories */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'Visão Geral', label: 'Visão Geral', icon: LayoutDashboard, show: true },
          { id: 'Máquina', label: 'Máquinas', icon: Wrench, show: !!user?.manage_equipment },
          { id: 'Predial', label: 'Predial', icon: Building2, show: !!user?.manage_predial },
          { id: 'Outros', label: 'Outros', icon: Box, show: !!user?.manage_others },
        ].filter(t => t.show !== false).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeCategory === tab.id
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            {activeCategory === tab.id ? <tab.icon size={16} /> : <tab.icon size={16} className="text-slate-400" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900">Ativos no Sistema</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin text-primary" />
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center p-8 text-slate-500">Nenhum ativo encontrado nesta categoria.</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">CÓDIGO</th>
                  <th className="px-6 py-3">NOME</th>
                  <th className="px-6 py-3">Setor</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-900">{asset.code}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {asset.image_url ? (
                          <img
                            src={asset.image_url}
                            alt={asset.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                            {asset.category === 'Máquina' ? <Wrench size={18} /> :
                              asset.category === 'Predial' ? <Building2 size={18} /> :
                                <MoreHorizontal size={18} />}
                          </div>
                        )}
                        <span className="font-medium text-slate-700">{asset.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{asset.sector}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold shadow-sm ${asset.status === 'Operacional' || asset.status === 'Ativo' ? 'bg-green-100 text-green-700' :
                        asset.status === 'Em Manutenção' || asset.status === 'Parada' ? 'bg-amber-100 text-amber-700' :
                          asset.status === 'Crítico' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleEdit(asset)} className="text-slate-400 hover:text-blue-600 mr-2" title="Editar">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDelete(asset.id)} className="text-slate-400 hover:text-red-600" title="Excluir">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Feedback Modal Reutilizável */}
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

export default Assets;
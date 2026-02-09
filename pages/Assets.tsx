import React, { useState, useEffect } from 'react';
import { QrCode, Search, Filter, Edit, Save, Plus, ScanLine, X, Camera, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Asset {
  id: string;
  code: string;
  name: string;
  sector: string;
  manufacturer: string;
  model: string;
  status: string;
}

const Assets = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    sector: '',
    manufacturer: '',
    model: '',
    status: 'Operacional'
  });

  /* Edit State */
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('name');

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Simplified input handler for cleaner code
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setFormData({
      code: asset.code,
      name: asset.name,
      sector: asset.sector,
      manufacturer: asset.manufacturer,
      model: asset.model,
      status: asset.status
    });
    // Scroll to form
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      code: '',
      name: '',
      sector: '',
      manufacturer: '',
      model: '',
      status: 'Operacional'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        console.log('Updating asset:', editingId, formData);
        // Update existing asset
        const { data, error } = await supabase
          .from('assets')
          .update({
            code: formData.code,
            name: formData.name,
            sector: formData.sector,
            manufacturer: formData.manufacturer,
            model: formData.model,
            status: formData.status
          })
          .eq('id', editingId)
          .select();

        console.log('Update result:', data, error);

        if (error) throw error;
        alert('Máquina atualizada com sucesso!');
      } else {
        // Create new asset
        const { error } = await supabase
          .from('assets')
          .insert([{
            code: formData.code,
            name: formData.name,
            sector: formData.sector,
            manufacturer: formData.manufacturer,
            model: formData.model,
            status: formData.status
          }]);

        if (error) throw error;
        alert('Máquina cadastrada com sucesso!');
      }

      handleCancelEdit(); // Reset form
      fetchAssets();
    } catch (error) {
      console.error('Error saving asset:', error);
      alert('Erro ao salvar máquina.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta máquina?')) return;

    try {
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if (error) throw error;
      fetchAssets();
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      if (error.code === '23503') {
        alert('Não é possível excluir esta máquina pois ela possui Ordens de Serviço vinculadas.');
      } else {
        alert('Erro ao excluir máquina: ' + error.message);
      }
    }
  };

  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                alert("Máquina simulada detectada!");
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
          <h2 className="text-2xl font-bold text-slate-900">Cadastro de Máquinas</h2>
          <p className="text-sm text-slate-500">Gerencie o parque industrial e ativos.</p>
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
            <h3 className="text-base font-semibold text-slate-900">{editingId ? 'Editar Máquina' : 'Nova Máquina'}</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {editingId ? 'Atualize os dados do equipamento abaixo.' : 'Preencha os dados abaixo para cadastrar um novo equipamento.'}
            </p>
          </div>
          <div className="text-primary bg-primary/10 p-2 rounded-lg">
            {editingId ? <Edit size={20} /> : <Plus size={20} />}
          </div>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Código</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <QrCode size={18} />
                </div>
                <input
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  className="pl-10 block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-10 outline-none border px-3"
                  placeholder="EX: MQ-001"
                  type="text"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 lg:col-span-2">
              <label className="text-sm font-medium text-slate-700">Nome da Máquina</label>
              <input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-10 px-3 outline-none border"
                placeholder="Ex: Torno CNC 2000"
                type="text"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Setor</label>
              <select
                value={formData.sector}
                onChange={(e) => handleChange('sector', e.target.value)}
                className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-10 px-3 outline-none border"
                required
              >
                <option value="" disabled>Selecione um setor</option>
                <option value="Produção">Produção</option>
                <option value="Manutenção">Manutenção</option>
                <option value="Logística">Logística</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Fabricante</label>
              <input
                value={formData.manufacturer}
                onChange={(e) => handleChange('manufacturer', e.target.value)}
                className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-10 px-3 outline-none border"
                placeholder="Ex: Siemens"
                type="text"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Modelo</label>
              <input
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-10 px-3 outline-none border"
                placeholder="Ex: S7-1200"
                type="text"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Status Inicial</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-10 px-3 outline-none border"
                disabled={!!editingId} // Disable manual status edit if editing, let the trigger handle it? Actually user might want to manually set it for downtime not related to WO. But the trigger will override it if there's a WO. Let's keep it enabled but warn? Or just enable it. The trigger fires on Work Order changes, not Asset changes, unless we add a trigger on Assets too. But the requirement is about Sync. Let's keep it enabled.
              >
                <option value="Operacional">Operacional</option>
                <option value="Parada">Parada</option>
                <option value="Em Manutenção">Em Manutenção</option>
              </select>
            </div>

            <div className="lg:col-span-3 flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancelar Edição
                </button>
              )}
              {!editingId && (
                <button type="button" onClick={() => setFormData({ code: '', name: '', sector: '', manufacturer: '', model: '', status: 'Operacional' })} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
              )}
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg flex items-center gap-2">
                <Save size={18} />
                {editingId ? 'Atualizar Máquina' : 'Salvar Máquina'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900">Máquinas Cadastradas</h3>
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
            <button className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50">
              <Filter size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin text-primary" />
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center p-8 text-slate-500">Nenhuma máquina encontrada.</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">Código</th>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">Setor</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{asset.code}</td>
                    <td className="px-6 py-4">{asset.name}</td>
                    <td className="px-6 py-4">{asset.sector}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${asset.status === 'Operacional' ? 'bg-green-100 text-green-800' :
                        asset.status === 'Parada' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
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
    </div>
  );
};

export default Assets;
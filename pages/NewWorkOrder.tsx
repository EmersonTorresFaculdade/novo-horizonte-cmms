import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, UploadCloud, AlertTriangle, CheckCircle2, Info, User, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../services/NotificationService';
import FeedbackModal from '../components/FeedbackModal';

interface Asset {
  id: string;
  name: string;
  max_sector?: string;
  sector: string;
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
  const [priority, setPriority] = useState<'Baixa' | 'Média' | 'Alta'>('Média');
  const [failureType, setFailureType] = useState('mecanica');
  const [maintenanceType, setMaintenanceType] = useState<'Preventiva' | 'Corretiva' | 'Preditiva'>('Corretiva');

  useEffect(() => {
    const fetchData = async () => {
      const { data: assetsData } = await supabase.from('assets').select('id, name, sector');


      if (assetsData) setAssets(assetsData);
      if (assetsData) setAssets(assetsData);
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!selectedAssetId || !issueDescription) {
        setFeedback({
          type: 'error',
          title: 'Campos Obrigatórios',
          message: 'Por favor, selecione um equipamento e descreva detalhadamente o problema.'
        });
        setLoading(false);
        return;
      }

      const asset = assets.find(a => a.id === selectedAssetId);
      // O número da OS agora é gerado automaticamente pelo banco de dados (Trigger: tr_generate_order_number)

      const payload = {
        asset_id: selectedAssetId,
        technician_id: null,
        priority: priority, // Sends 'Baixa', 'Média', or 'Alta'
        status: 'Pendente',
        issue: issueDescription, // Apenas a descrição limpa
        failure_type: failureType, // Novo campo
        sector: asset?.sector || 'Geral',
        date: new Date().toISOString(),
        requester_id: user?.id,
        maintenance_type: maintenanceType,
        estimated_hours: 0,
        downtime_hours: 0,
        parts_cost: 0,
        response_hours: 0
      };

      console.log('Enviando payload:', payload);

      const { data: newOrder, error } = await supabase
        .from('work_orders')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Trigger Notification
      if (newOrder) {
        await NotificationService.notifyWorkOrderCreated({
          id: newOrder.id,
          title: `Nova OS: ${newOrder.order_number}`,
          description: issueDescription,
          priority: priority,
          status: 'Pendente',
          assetId: selectedAssetId,
          locationId: '', // Todo: fetch location if needed
          assignedTo: null,
          requesterId: user?.id
        });
      }

      // Mostra o modal de sucesso com visual premium
      setFeedback({
        type: 'success',
        title: 'Chamado Aberto!',
        message: 'Sua solicitação de manutenção foi registrada com sucesso.',
        showLoading: true
      });

      // Redireciona após 2.5 segundos
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

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col gap-2 mb-2">
        <nav className="flex items-center text-sm text-slate-500 mb-1">
          <button onClick={() => navigate('/dashboard')} className="hover:text-primary">Início</button>
          <ChevronRight size={14} className="mx-1" />
          <button onClick={() => navigate('/work-orders')} className="hover:text-primary">Chamados</button>
          <ChevronRight size={14} className="mx-1" />
          <span className="text-slate-900 font-medium">Novo Chamado</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Novo Chamado</h2>
        <p className="text-slate-500">
          Preencha os detalhes abaixo para solicitar manutenção corretiva ou preventiva.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <div className="flex justify-end mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wide">
            <Info size={14} /> Status: Será Pendente
          </span>
        </div>

        <form className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900">Equipamento / Máquina <span className="text-red-500">*</span></label>
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              >
                <option value="" disabled>Selecione o equipamento...</option>
                {assets.map(asset => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} - {asset.sector}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900">Tipo de Falha / Serviço</label>
              <select
                value={failureType}
                onChange={(e) => setFailureType(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              >
                <option value="mecanica">Mecânica</option>
                <option value="eletrica">Elétrica</option>
                <option value="hidraulica">Hidráulica</option>
                <option value="software">Software / Painel</option>
                <option value="outro">Outro / Preventiva</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900">Classe de Manutenção</label>
              <select
                value={maintenanceType}
                onChange={(e) => setMaintenanceType(e.target.value as any)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              >
                <option value="Corretiva">Corretiva (Quebra/Falha)</option>
                <option value="Preventiva">Preventiva (Agendada)</option>
                <option value="Preditiva">Preditiva (Inspeção/Medição)</option>
              </select>
            </div>

          </div>




          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900">Nível de Prioridade <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setPriority('Baixa')}
                className={`cursor-pointer rounded-xl border-2 p-4 flex items-center gap-3 transition-all ${priority === 'Baixa' ? 'border-green-500 bg-green-50' : 'border-slate-100 hover:border-slate-300'}`}
              >
                <div className={`p-2 rounded-full ${priority === 'Baixa' ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <Info size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Baixa</p>
                  <p className="text-xs text-slate-500">Não urgente</p>
                </div>
                {priority === 'Baixa' && <CheckCircle2 size={20} className="ml-auto text-green-500" />}
              </div>

              <div
                onClick={() => setPriority('Média')}
                className={`cursor-pointer rounded-xl border-2 p-4 flex items-center gap-3 transition-all ${priority === 'Média' ? 'border-yellow-500 bg-yellow-50' : 'border-slate-100 hover:border-slate-300'}`}
              >
                <div className={`p-2 rounded-full ${priority === 'Média' ? 'bg-yellow-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Média</p>
                  <p className="text-xs text-slate-500">Atenção necessária</p>
                </div>
                {priority === 'Média' && <CheckCircle2 size={20} className="ml-auto text-yellow-500" />}
              </div>

              <div
                onClick={() => setPriority('Alta')}
                className={`cursor-pointer rounded-xl border-2 p-4 flex items-center gap-3 transition-all ${priority === 'Alta' ? 'border-red-500 bg-red-50' : 'border-slate-100 hover:border-slate-300'}`}
              >
                <div className={`p-2 rounded-full ${priority === 'Alta' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Alta</p>
                  <p className="text-xs text-slate-500">Parada de produção</p>
                </div>
                {priority === 'Alta' && <CheckCircle2 size={20} className="ml-auto text-red-500" />}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900">Descrição do Problema <span className="text-red-500">*</span></label>
            <p className="text-xs text-slate-500 mb-2">Descreva o que aconteceu, ruídos estranhos, mensagens de erro ou qualquer observação relevante.</p>
            <textarea
              rows={4}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
              placeholder="Ex: A máquina parou de repente durante o ciclo de acabamento e apresentou o erro #404 no painel. Percebi um cheiro de queimado..."
            ></textarea>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900">Evidências / Fotos (Opcional)</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="p-4 bg-slate-100 rounded-full text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-all mb-3">
                <UploadCloud size={32} />
              </div>
              <p className="text-sm font-medium text-primary">Clique para enviar <span className="text-slate-500 font-normal">ou arraste e solte</span></p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, GIF até 10MB</p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/work-orders')}
              className="px-6 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20 flex items-center gap-2 transition-all ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <div className="rotate-90">
                <div className="-rotate-90">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              {loading ? 'Abrindo...' : 'Abrir Chamado'}
            </button>
          </div>
        </form>
      </div>

      {/* Feedback Modal Reutilizável */}
      {feedback && (
        <FeedbackModal
          isOpen={!!feedback}
          onClose={() => setFeedback(null)}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          showLoadingDots={feedback.showLoading}
        />
      )}
    </div>
  );
};

export default NewWorkOrder;
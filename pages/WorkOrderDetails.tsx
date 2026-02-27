import React, { useState, useEffect, useCallback } from 'react';
import {
   useNavigate, useParams, useLocation
} from 'react-router-dom';
import {
   ChevronRight,
   MapPin,
   AlertOctagon,
   Save,
   Settings,
   Plus,
   Trash2,
   Package,
   User,
   Pencil,
   AlertTriangle,
   Clock,
   CheckCircle2,
   Play,
   Share2,
   LogOut,
   Calendar,
   Activity,
   LineChart,
   Building2,
   Wrench,
   FileText,
   History,
   Timer,
   Zap,
   Loader2,
   Search,
   X,
   Star,
   RotateCcw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, supabaseUntyped } from '../lib/supabase';
import { NotificationService } from '../services/NotificationService';
import FeedbackModal from '../components/FeedbackModal';
import { SearchableSelect } from '../components/SearchableSelect';

interface WorkOrder {
   id: string;
   order_number: string;
   issue: string; // Descrição limpa
   failure_type: string; // Novo campo
   technical_report?: string; // Novo campo
   status: string;
   priority: string;
   hourly_rate?: number;
   created_at: string;
   updated_at: string;
   asset_id?: string;
   third_party_company_id?: string | null;
   maintenance_category?: string;
   technician_id: string | null;
   requester_id: string | null;
   assets: {
      name: string;
      sector: string;
      model: string;
      manufacturer: string;
      code?: string;
      warranty_expires_at?: string;
   };
   technicians: {
      name: string;
   } | null;
   third_party_companies?: {
      name: string;
   } | null;
   requester?: {
      name: string;
      role: string;
   } | null;
   response_hours?: number;
   repair_hours?: number;
   downtime_hours?: number;
   estimated_hours?: number;
   maintenance_type?: string;
   parts_cost?: number;
   responded_at?: string;
   resolved_at?: string;
}

interface Technician {
   id: string;
   name: string;
   hourly_rate?: number;
   specialty?: string;
   is_third_party?: boolean;
   avatar?: string | null;
}

interface InventoryItem {
   id: string;
   name: string;
   quantity: number;
   unit_value: number;
}

interface WorkOrderPart {
   id: string;
   item_id: string;
   quantity: number;
   inventory_items: {
      name: string;
      unit_value: number;
   };
}

const WorkOrderDetails = () => {
   const { id } = useParams();
   const navigate = useNavigate();
   const location = useLocation();
   const { user } = useAuth();
   console.log('DEBUG: WorkOrderDetails Rendered - Version 15:00');
   console.log('DEBUG: User Auth State:', user);
   const isAdmin = user?.role === 'admin' || user?.role === 'admin_root';

   // Determine mode based on URL
   const isEditing = location.pathname.endsWith('/edit');

   const [loading, setLoading] = useState(true);
   const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
   const [technicians, setTechnicians] = useState<Technician[]>([]);

   // Parts
   const [availableParts, setAvailableParts] = useState<InventoryItem[]>([]);
   const [usedParts, setUsedParts] = useState<WorkOrderPart[]>([]);
   const [selectedPartId, setSelectedPartId] = useState('');
   const [partQuantity, setPartQuantity] = useState(1);

   // Form State
   const [status, setStatus] = useState('');
   const [selectedTechId, setSelectedTechId] = useState('');
   const [report, setReport] = useState('');
   const [hourlyRate, setHourlyRate] = useState<number>(0);

   // Helpers para tempos individuais da OS
   const formatDuration = (ms: number) => {
      if (ms <= 0) return "—";
      const totalMinutes = Math.floor(ms / 60000);
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;
      if (days > 0) return `${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
   };

   // Tempo de Resposta: created_at -> responded_at
   const responseTime = (() => {
      if (!workOrder?.created_at) return { label: "—", ms: 0 };
      const start = new Date(workOrder.created_at).getTime();
      const end = workOrder?.responded_at ? new Date(workOrder.responded_at).getTime() : new Date().getTime();
      const ms = Math.max(0, end - start);
      return { label: formatDuration(ms), ms, pending: !workOrder?.responded_at };
   })();

   // Tempo de Resolução: responded_at -> resolved_at
   const resolutionTime = (() => {
      if (!workOrder?.responded_at) return { label: "—", ms: 0, pending: true };
      const start = new Date(workOrder.responded_at).getTime();
      const end = workOrder?.resolved_at ? new Date(workOrder.resolved_at).getTime() : new Date().getTime();
      const ms = Math.max(0, end - start);
      return { label: formatDuration(ms), ms, pending: !workOrder?.resolved_at };
   })();

   // Edit Fields (Admin)
   const [editIssue, setEditIssue] = useState('');
   const [editPriority, setEditPriority] = useState('');
   const [editFailureType, setEditFailureType] = useState('');
   const [editMaintenanceCategory, setEditMaintenanceCategory] = useState('');
   const [editMaintenanceType, setEditMaintenanceType] = useState('Corretiva');

   // Atividades e Comentários
   interface WorkOrderActivity {
      id: string;
      activity_type: string;
      description: string;
      user_name: string;
      created_at: string;
   }
   const [activities, setActivities] = useState<WorkOrderActivity[]>([]);
   const [newComment, setNewComment] = useState('');

   // Rating
   const [techRating, setTechRating] = useState(0);
   const [techRatingComment, setTechRatingComment] = useState('');
   const [existingRating, setExistingRating] = useState<any>(null);
   const [ratingHover, setRatingHover] = useState(0);
   const [ratingSaving, setRatingSaving] = useState(false);

   const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
   const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

   const fetchActivities = useCallback(async () => {
      if (!id) return;
      try {
         const res = await fetch(
            `${SUPABASE_URL}/rest/v1/work_order_activities?work_order_id=eq.${id}&order=created_at.desc`,
            {
               headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                  'Content-Type': 'application/json'
               }
            }
         );
         const data = await res.json();
         console.log('DEBUG: Activities fetched via REST:', data);
         if (Array.isArray(data)) {
            setActivities(data as WorkOrderActivity[]);
         } else {
            console.error('DEBUG: Unexpected fetch response:', data);
         }
      } catch (err) {
         console.error('FETCH ACTIVITIES ERROR:', err);
      }
   }, [id]);

   const logActivity = async (type: string, description: string) => {
      if (!id) return;
      try {
         const actorName = user?.name || 'Administrador';
         console.log('DEBUG: logActivity called -', type, description, 'by', actorName);

         const res = await fetch(
            `${SUPABASE_URL}/rest/v1/work_order_activities`,
            {
               method: 'POST',
               headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation'
               },
               body: JSON.stringify({
                  work_order_id: id,
                  user_id: user?.id || null,
                  user_name: actorName,
                  activity_type: type,
                  description: description
               })
            }
         );

         const data = await res.json();
         if (res.ok) {
            console.log('DEBUG: Activity logged successfully:', data);
            fetchActivities();
         } else {
            console.error('SUPABASE LOG ACTIVITY ERROR:', data);
         }
      } catch (error) {
         console.error('Error logging activity:', error);
      }
   };
   const [showAddPart, setShowAddPart] = useState(false);
   const [partSearch, setPartSearch] = useState('');

   const filteredParts = availableParts.filter(p => {
      const search = partSearch.toLowerCase().trim();
      return (p.name || '').toLowerCase().includes(search) ||
         (p.code || '').toLowerCase().includes(search);
   });

   // Auto-seleção do primeiro resultado da busca
   useEffect(() => {
      const search = partSearch.toLowerCase().trim();
      if (search && filteredParts.length > 0) {
         const isStillValid = filteredParts.some(p => p.id === selectedPartId);
         if (!isStillValid) {
            setSelectedPartId(filteredParts[0].id);
         }
      }
   }, [partSearch, filteredParts, selectedPartId]);

   // Novas métricas de PCM
   const [partsCost, setPartsCost] = useState<number>(0);

   const [saving, setSaving] = useState(false);
   const [feedback, setFeedback] = useState<{
      type: 'success' | 'error' | 'confirm' | 'info';
      title: string;
      message: string;
      onConfirm?: () => void;
      showLoading?: boolean;
   } | null>(null);

   useEffect(() => {
      if (id) {
         fetchOrderDetails();
         fetchTechnicians();
         fetchParts();
         fetchActivities();
      }
   }, [id, fetchActivities]);

   const fetchOrderDetails = async () => {
      try {
         // Fetch Order
         let query = supabase
            .from('work_orders')
            .select(`
                *,
                assets (name, sector, category, model, manufacturer, code, warranty_expires_at, image_url),
                technicians (name),
                third_party_companies (name),
                requester:users!requester_id (name, role)
            `)
            .eq('id', id);

         if (!isAdmin && user?.id) {
            query = query.eq('requester_id', user.id);
         }

         const { data, error } = await query.single();

         if (error) throw error;
         console.log('DEBUG: Raw Supabase Data:', data);
         // Cast data to WorkOrder to handle new columns not yet in Supabase types
         const workOrderData = data as unknown as WorkOrder;
         console.log('DEBUG: workOrderData Assets:', workOrderData.assets);

         setWorkOrder(workOrderData);
         setStatus(workOrderData.status);
         setEditIssue(workOrderData.issue);
         setEditPriority(workOrderData.priority);
         setEditFailureType(workOrderData.failure_type || 'mecanica'); // Default fallback
         setEditMaintenanceCategory((workOrderData as any).maintenance_category || 'Equipamento');
         setEditMaintenanceType((workOrderData as any).maintenance_type || 'Corretiva');
         setReport(workOrderData.technical_report || ''); // Populate report state
         setHourlyRate(workOrderData.hourly_rate || 0);

         setPartsCost(Number((workOrderData as any).parts_cost) || 0);

         if (workOrderData.technician_id) setSelectedTechId(workOrderData.technician_id);
         else if ((workOrderData as any).third_party_company_id) setSelectedTechId((workOrderData as any).third_party_company_id);

         // Fetch Used Parts
         const { data: partsData } = await supabase
            .from('work_order_parts')
            .select(`
                id, item_id, quantity,
                inventory_items (name, unit_value)
            `)
            .eq('work_order_id', id);

         if (partsData) setUsedParts(partsData);

         // Fetch existing rating for this work order
         if (workOrderData.technician_id) {
            const { data: ratingData } = await supabaseUntyped
               .from('technician_ratings')
               .select('*')
               .eq('work_order_id', id)
               .maybeSingle();
            if (ratingData) {
               setExistingRating(ratingData);
               setTechRating(ratingData.rating);
            }
         }

      } catch (error) {
         console.error('Error fetching order:', error);
      } finally {
         setLoading(false);
      }
   };

   const fetchTechnicians = async () => {
      const { data: techs } = await supabase.from('technicians').select('id, name, specialty, hourly_rate, avatar').neq('status', 'Inativo');
      const { data: companies } = await supabase.from('third_party_companies').select('id, name, specialty').neq('status', 'Inativo');

      const combined = [
         ...((techs as Technician[]) || []).map(t => ({ ...t, is_third_party: false })),
         ...((companies || [])).map(c => ({
            id: c.id,
            name: c.name,
            specialty: c.specialty,
            hourly_rate: 0,
            avatar: null,
            is_third_party: true
         }))
      ];
      setTechnicians(combined);
   };

   const fetchParts = async () => {
      const { data } = await supabase.from('inventory_items').select('*').order('name');
      if (data) setAvailableParts(data);
   };

   // Flag: OS Concluída = sem edição
   const isConcluded = workOrder?.status === 'Concluído';

   // Reabrir OS: mantém número, zera datas, nova abertura
   const handleReopen = async () => {
      setFeedback({
         type: 'confirm',
         title: 'Reabrir Ordem de Serviço?',
         message: 'A OS será reaberta com uma nova data de abertura. Os tempos de manutenção serão zerados.',
         onConfirm: async () => {
            setSaving(true);
            try {
               const now = new Date().toISOString();
               const { error } = await supabase
                  .from('work_orders')
                  .update({
                     status: 'Pendente',
                     created_at: now,
                     responded_at: null,
                     resolved_at: null,
                     response_hours: 0,
                     repair_hours: 0,
                     downtime_hours: 0,
                     technical_report: '',
                     updated_at: now,
                  })
                  .eq('id', id);

               if (error) throw error;

               await logActivity('reopen', 'reabriu a Ordem de Serviço');

               if (workOrder) {
                  await NotificationService.notifyWorkOrderReopened({
                     id: workOrder.id,
                     title: `OS REABERTA: ${workOrder.order_number}`,
                     description: editIssue || workOrder.issue,
                     status: 'Pendente',
                     assetId: workOrder.asset_id,
                     requesterId: workOrder.requester_id,
                  } as any);
               }

               setFeedback({
                  type: 'success',
                  title: 'OS Reaberta!',
                  message: 'A Ordem de Serviço foi reaberta com sucesso.',
                  showLoading: true
               });

               setTimeout(() => {
                  window.location.reload();
               }, 2000);

            } catch (error) {
               console.error('Error reopening order:', error);
               setFeedback({
                  type: 'error',
                  title: 'Erro ao Reabrir',
                  message: (error as any).message || 'Ocorreu um erro inesperado.'
               });
            } finally {
               setSaving(false);
            }
         }
      });
   };

   const handleSave = async () => {
      setSaving(true);
      try {
         const calculatedPartsCost = usedParts.reduce((acc, part) => acc + (part.quantity * (part.inventory_items?.unit_value || 0)), 0);

         let finalResponseHours = Number((workOrder as any).response_hours) || 0;
         let finalDowntimeHours = Number((workOrder as any).downtime_hours) || 0;
         let finalRepairHours = Number((workOrder as any).repair_hours) || 0;

         const now = new Date();
         const createdDate = workOrder?.created_at ? new Date(workOrder.created_at) : now;

         // 1. Calculate Response Hours (MTTA) if missing
         if ((status === 'Em Manutenção' || status === 'Concluído') &&
            (!finalResponseHours || finalResponseHours === 0)) {
            const diffInHrs = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
            finalResponseHours = Number(Math.max(0, diffInHrs).toFixed(2));
         }

         // 2. Calculate Downtime and Repair Hours if completing
         if (status === 'Concluído') {
            // Downtime = creation to now
            const downtime = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
            finalDowntimeHours = Number(Math.max(0, downtime).toFixed(2));

            // Repair = Downtime - Response
            const repair = downtime - finalResponseHours;
            finalRepairHours = Number(Math.max(0, repair).toFixed(2));
         }

         // SLA Updates
         let slaUpdates: any = {};
         if (!workOrder?.responded_at && status === 'Em Manutenção') {
            slaUpdates.responded_at = now.toISOString();
         }
         if (!workOrder?.resolved_at && status === 'Concluído') {
            slaUpdates.resolved_at = now.toISOString();
         }

         const selectedEntity = technicians.find(t => t.id === selectedTechId);
         const isThirdParty = selectedEntity?.is_third_party;

         const { error } = await supabase
            .from('work_orders')
            .update({
               technician_id: isThirdParty === false ? selectedTechId : null,
               third_party_company_id: isThirdParty === true ? selectedTechId : null,
               status: status,
               issue: editIssue,
               priority: editPriority,
               failure_type: editFailureType,
               maintenance_category: editMaintenanceCategory,
               maintenance_type: editMaintenanceType,
               estimated_hours: 0,
               technical_report: report,
               hourly_rate: isThirdParty ? hourlyRate : 0, // Labor cost only for third parties
               response_hours: finalResponseHours,
               repair_hours: finalRepairHours,
               downtime_hours: finalDowntimeHours,
               parts_cost: calculatedPartsCost,
               updated_at: now.toISOString(),
               ...slaUpdates
            } as any)
            .eq('id', id);

         if (error) throw error;

         // Registrar logs de mudança
         if (workOrder?.status !== status) {
            await logActivity('status_change', `alterou o status para ${status}`);
         }

         const currentTechName = technicians.find(t => t.id === selectedTechId)?.name;
         if (workOrder?.technician_id !== selectedTechId) {
            await logActivity('assignment', `designou ${currentTechName || 'Nenhum'}`);
         }

         // Notificar sobre atualização
         if (workOrder) {
            await NotificationService.notifyWorkOrderUpdated({
               id: workOrder.id,
               title: `Atualização OS: ${workOrder.order_number}`,
               description: editIssue,
               priority: editPriority,
               status: status,
               assetId: workOrder.asset_id,
               locationId: '',
               assignedTo: selectedTechId || undefined,
               technicianName: currentTechName || 'Aguardando',
               requesterId: workOrder.requester_id || undefined,
               // Garantir compatibilidade com o que a Edge Function espera
               asset_id: workOrder.asset_id,
               requester_id: workOrder.requester_id,
               technical_report: report,
               maintenance_type: editMaintenanceType,
               estimated_hours: 0
            } as any);
         }

         // Mostra o modal de sucesso com visual premium
         setFeedback({
            type: 'success',
            title: 'Salvo com Sucesso!',
            message: 'As alterações da Ordem de Serviço foram registradas.',
            showLoading: true
         });

         // Redireciona após 2.5 segundos
         setTimeout(() => {
            navigate('/work-orders');
         }, 2500);

      } catch (error) {
         console.error('Error updating order:', error);
         setFeedback({
            type: 'error',
            title: 'Erro ao Salvar',
            message: (error as any).message || 'Ocorreu um erro inesperado ao salvar as alterações.'
         });
      } finally {
         setSaving(false);
      }
   };

   const handleAddPart = async () => {
      if (!selectedPartId) return;
      try {
         const { error } = await supabase
            .from('work_order_parts')
            .insert({
               work_order_id: id,
               item_id: selectedPartId,
               quantity: partQuantity
            });

         if (error) throw error;

         fetchOrderDetails();
         setSelectedPartId('');
         setPartQuantity(1);
      } catch (error) {
         console.error('Error adding part:', error);
         setFeedback({
            type: 'error',
            title: 'Erro na Peça',
            message: 'Não foi possível adicionar a peça ao estoque da Ordem de Serviço.'
         });
      }
   };

   const handleRemovePart = async (partId: string) => {
      setFeedback({
         type: 'confirm',
         title: 'Remover Peça?',
         message: 'Tem certeza que deseja remover esta peça desta Ordem de Serviço?',
         onConfirm: async () => {
            try {
               const { error } = await supabase
                  .from('work_order_parts')
                  .delete()
                  .eq('id', partId);

               if (error) throw error;
               fetchOrderDetails();
            } catch (error) {
               console.error('Error removing part:', error);
               setFeedback({
                  type: 'error',
                  title: 'Erro ao Remover',
                  message: 'Ocorreu um erro ao tentar remover a peça.'
               });
            }
         }
      });
   };

   const statusSteps = [
      { id: 'Pendente', label: 'Aberto', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
      { id: 'Recebido', label: 'Recebido', icon: User, color: 'text-primary', bg: 'bg-emerald-50/50' },
      { id: 'Em Manutenção', label: 'Em Manutenção', icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-50' },
      { id: 'Concluído', label: 'Finalizado', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' }
   ];

   const currentStepIndex = statusSteps.findIndex(s => s.id === status);

   if (loading) return <div className="p-8 text-center flex flex-col items-center gap-4">
      <Loader2 className="animate-spin text-primary" size={32} />
      <p className="text-slate-500 font-medium">Carregando detalhes da Ordem de Serviço...</p>
   </div>;

   if (!workOrder) return <div className="p-8 text-center">Ordem de serviço não encontrada.</div>;

   return (
      <div className="min-h-screen bg-slate-50/50 pb-20">
         <div className="max-w-[1440px] mx-auto px-6 py-8 space-y-6">
            {/* Cabeçalho de Impressão (Apenas PDF) */}
            <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-8">
               <div className="flex items-center gap-4">
                  <div className="size-16 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-2xl">
                     NH
                  </div>
                  <div>
                     <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Novo Horizonte</h1>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">Gestão de Manutenção Industrial</p>
                  </div>
               </div>
               <div className="text-right">
                  <h2 className="text-xl font-bold text-slate-900">Relatório de Ordem de Serviço</h2>
                  <p className="text-lg font-black text-primary bg-primary/5 px-2 py-1 rounded mt-1 inline-block">OS: #{workOrder.order_number}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
               </div>
            </div>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div className="space-y-1">
                  <div className="flex items-center gap-4">
                     <div className={`size-3 rounded-full animate-ping ${workOrder.priority === 'Crítica' ? 'bg-brand-alert' :
                        workOrder.priority === 'Alta' ? 'bg-orange-600' :
                           workOrder.priority === 'Média' ? 'bg-primary' :
                              'bg-emerald-600'}`}></div>
                     <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        {workOrder.order_number}: {workOrder.issue}
                     </h1>
                     <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border
                           ${workOrder.priority === 'Crítica' ? 'bg-red-50 text-red-700 border-red-100' :
                              workOrder.priority === 'Alta' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                 workOrder.priority === 'Média' ? 'bg-emerald-50/50 text-blue-700 border-primary-light/10' :
                                    'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                           Prioridade {workOrder.priority}
                        </span>
                        {status === 'Cancelado' && (
                           <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border bg-slate-900 text-white border-slate-900 flex items-center gap-1">
                              <X size={10} strokeWidth={3} />
                              OS Cancelada
                           </span>
                        )}
                     </div>
                  </div>
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                     Aberta Por <span className="font-semibold text-slate-700">{workOrder.requester?.name || 'Administrador'}</span> em {new Date(workOrder.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} às {new Date(workOrder.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
               </div>


            </div>

            {/* Timeline Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
               <div className="relative">
                  {/* Background Line */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 hidden md:block"></div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-2 relative z-10">
                     {statusSteps.map((step, idx) => {
                        const isLast = idx === statusSteps.length - 1;
                        // Mais simples:
                        const done = idx <= currentStepIndex;
                        const active = idx === currentStepIndex;

                        return (
                           <div key={step.id} className="flex flex-col items-center text-center gap-2">
                              <div className={`size-10 md:size-12 rounded-full flex items-center justify-center transition-all border-4 ${done ? `${step.bg} ${step.color.replace('text-', 'border-')} shadow-lg shadow-${step.color.replace('text-', '')}/10` : 'bg-white border-slate-50 text-slate-300'
                                 }`}>
                                 <step.icon size={18} className={done ? step.color : 'text-slate-300'} />
                              </div>
                              <div className="space-y-1">
                                 <p className={`text-sm font-bold ${done ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                                 <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                    {active ? 'Em andamento' : done ? 'Concluído' : 'Pendente'}
                                 </p>
                              </div>
                              {!isLast && (
                                 <div className={`block md:hidden h-8 w-px bg-slate-100 my-2`}></div>
                              )}
                           </div>
                        );
                     })}
                  </div>
               </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               {/* Left Column - Details & Execution */}
               <div className="lg:col-span-8 space-y-8">
                  {/* Card: Detalhes do Chamado */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                     <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                           <FileText size={16} className="text-primary" />
                           Detalhes do Chamado
                        </h3>
                        {isAdmin && (
                           <button
                              onClick={() => navigate(`/work-orders/${id}/edit`)}
                              className="text-xs font-bold text-primary hover:underline"
                           >
                              Editar
                           </button>
                        )}
                     </div>

                     <div className="p-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-12 mb-10">
                           <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">ID do Ativo</p>
                              <p className="text-sm font-bold text-slate-900">{workOrder.assets?.name || 'Manual'}</p>
                           </div>
                           <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Localização</p>
                              <p className="text-sm font-bold text-slate-700">{workOrder.assets?.sector || 'N/A'}</p>
                           </div>
                           <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Categoria</p>
                              <p className="text-sm font-bold text-slate-700 capitalize">
                                 {workOrder.maintenance_category || 'Geral'}
                              </p>
                           </div>
                           <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tipo de Problema</p>
                              <p className="text-sm font-bold text-slate-700 capitalize">{workOrder.failure_type || 'Geral'}</p>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Descrição</p>
                           <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 text-sm leading-relaxed min-h-[100px]">
                              {workOrder.issue}
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Card: Ordem de Serviço (Execução) */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                     <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                           <Wrench size={16} className="text-primary" />
                           Execução do Serviço
                        </h3>
                        <select
                           value={status}
                           onChange={(e) => setStatus(e.target.value)}
                           disabled={isConcluded || !isAdmin}

                           className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase border
                               ${status === 'Pendente' ? 'bg-slate-50 text-slate-600 border-slate-200' :
                                 status === 'Recebido' ? 'bg-blue-50 text-blue-700 border-primary-light/20' :
                                    status === 'Em Manutenção' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                       status === 'Cancelado' ? 'bg-slate-900 text-white border-slate-900' :
                                          'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                        >
                           <option value="Pendente">Pendente</option>
                           <option value="Recebido">Recebido</option>
                           <option value="Em Manutenção">Em Manutenção</option>
                           <option value="Concluído">Concluído</option>
                        </select>
                     </div>

                     <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-4">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Técnico ou Empresa Responsável</p>
                              <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                                 {(() => {
                                    const selectedTech = technicians.find(t => t.id === selectedTechId);
                                    if (selectedTech?.avatar) {
                                       return <img src={selectedTech.avatar} alt={selectedTech.name} className="size-10 rounded-lg object-cover" />;
                                    }
                                    return (
                                       <div className="size-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                                          {selectedTech?.is_third_party ? <Building2 size={20} /> : <User size={20} />}
                                       </div>
                                    );
                                 })()}
                                 <SearchableSelect
                                    value={selectedTechId}
                                    onChange={setSelectedTechId}
                                    disabled={isConcluded || !isAdmin}
                                    placeholder="Aguardando Designação"
                                    className="flex-1"
                                    options={[
                                       { value: '', label: 'Aguardando Designação' },
                                       ...technicians
                                          .filter(t => {
                                             if (!editMaintenanceCategory && !editFailureType) return true;

                                             const cat = (editMaintenanceCategory || '').toLowerCase();
                                             const falha = (editFailureType || '').toLowerCase();
                                             const spec = (t.specialty || '').toLowerCase();

                                             if (spec === 'geral' || spec === 'todos' || !spec) return true;

                                             // Se a categoria for Predial
                                             if (cat === 'predial' && spec.includes('predial')) return true;
                                             if (cat === 'outros' && spec.includes('outro')) return true;

                                             // Para equipamentos
                                             if (cat === 'equipamento') {
                                                if (spec.includes('máquina') || spec.includes('maquina') || spec.includes('mecanica') || spec.includes('mecânica')) return true;
                                                if (falha === 'eletrica' && (spec.includes('elétrica') || spec.includes('eletrica'))) return true;
                                                if (falha === 'hidraulica' && (spec.includes('hidráulica') || spec.includes('hidraulica'))) return true;
                                             }

                                             // Fallback seguro de substrings para não esconder ninguém válido
                                             if (spec.includes(falha) || falha.includes(spec)) return true;

                                             return false;
                                          })
                                          .map(t => ({
                                             value: t.id,
                                             label: `${t.name} ${t.is_third_party ? '(Terceirizado(a))' : ''}`.trim()
                                          }))
                                    ]}
                                 />
                              </div>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-4 text-center">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Início Manutenção</p>
                                 {(workOrder as any).responded_at ? (
                                    <div className="p-3 bg-emerald-50/50 rounded-xl text-sm font-bold text-blue-700">
                                       {new Date((workOrder as any).responded_at).toLocaleDateString('pt-BR')} {new Date((workOrder as any).responded_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                 ) : (
                                    <div className="p-3 bg-slate-100 rounded-xl text-sm font-bold text-slate-400 italic">
                                       dd/mm/aaaa --:--
                                    </div>
                                 )}
                              </div>
                              <div className="space-y-4 text-center">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data Fim</p>
                                 {(workOrder as any).resolved_at ? (
                                    <div className="p-3 bg-green-50 rounded-xl text-sm font-bold text-green-700">
                                       {new Date((workOrder as any).resolved_at).toLocaleDateString('pt-BR')} {new Date((workOrder as any).resolved_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                 ) : (
                                    <div className="p-3 bg-slate-100 rounded-xl text-sm font-bold text-slate-400 italic">
                                       dd/mm/aaaa --:--
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>

                        {(() => {
                           const selectedTech = technicians.find(t => t.id === selectedTechId);
                           if (selectedTech?.is_third_party) {
                              return (
                                 <div className="space-y-4 max-w-xs transition-all animate-in fade-in slide-in-from-top-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Custo de Mão de Obra (Empresa Parceira)</p>
                                    <div className="relative">
                                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                                       <input
                                          type="number"
                                          step="0.01"
                                          value={hourlyRate}
                                          onChange={(e) => setHourlyRate(Number(e.target.value))}
                                          disabled={isConcluded || !isAdmin}
                                          placeholder="0,00"
                                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-primary transition-all shadow-sm focus:ring-4 focus:ring-primary/5"
                                       />
                                    </div>
                                    <p className="text-[9px] text-slate-400 italic">Insira o valor total cobrado pela empresa parceira para esta OS.</p>
                                 </div>
                              );
                           }
                           return null;
                        })()}

                        <div className="space-y-4">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Relatório Técnico / Solução</p>
                           <textarea
                              value={report}
                              onChange={(e) => setReport(e.target.value)}
                              disabled={isConcluded || !isAdmin}

                              placeholder="Descreva o trabalho realizado, a causa raiz identificada e a resolução..."
                              className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary transition-all min-h-[120px] shadow-sm"
                           />
                        </div>

                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Materiais Utilizados</p>
                              <button
                                 onClick={() => setShowAddPart(!showAddPart)}

                                 disabled={isConcluded || !isAdmin}
                                 className="text-[10px] font-bold text-primary uppercase flex items-center gap-1 hover:opacity-70 transition-all"
                              >
                                 <Plus size={14} className={`transition-transform duration-300 ${showAddPart ? 'rotate-45 text-brand-alert' : ''}`} />
                                 {showAddPart ? <span className="text-brand-alert font-bold">Cancelar</span> : 'Adicionar Item'}
                              </button>
                           </div>

                           {showAddPart && (
                              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-wrap gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-400 shadow-sm">
                                 <div className="flex-1 min-w-[240px] space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buscar Material</label>
                                       {partSearch && (
                                          <span className="text-[9px] font-bold text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full animate-in fade-in zoom-in duration-300">
                                             {filteredParts.length} {filteredParts.length === 1 ? 'item' : 'itens'}
                                          </span>
                                       )}
                                    </div>
                                    <div className="relative group">
                                       <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                                       <input
                                          type="text"
                                          placeholder="Digitar nome da peça ou código..."
                                          value={partSearch}
                                          onChange={(e) => setPartSearch(e.target.value)}
                                          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all shadow-sm"
                                       />
                                       {partSearch && (
                                          <button
                                             onClick={() => setPartSearch('')}
                                             className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-400 transition-colors"
                                          >
                                             <Plus size={12} className="rotate-45" />
                                          </button>
                                       )}
                                    </div>
                                 </div>
                                 <div className="flex-[1.5] min-w-[240px] space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Selecionar Resultado</label>
                                    <select
                                       value={selectedPartId}
                                       onChange={(e) => setSelectedPartId(e.target.value)}
                                       className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary transition-all shadow-sm font-medium"
                                    >
                                       <option value="">{partSearch ? `Resultados para "${partSearch}"...` : 'Escolha um material...'}</option>
                                       {filteredParts.slice(0, 100).map(p => (
                                          <option key={p.id} value={p.id}>
                                             {p.name} {p.code ? `[${p.code}]` : ''} — Estoque: {p.quantity} {p.unit}
                                          </option>
                                       ))}
                                       {filteredParts.length > 100 && (
                                          <option disabled>+ {filteredParts.length - 100} itens ocultos... refine sua busca</option>
                                       )}
                                    </select>
                                 </div>
                                 <div className="w-20 space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 text-center block">Qtd</label>
                                    <input
                                       type="number"
                                       min="1"
                                       value={partQuantity}
                                       onChange={(e) => setPartQuantity(Number(e.target.value))}
                                       className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary transition-all shadow-sm text-center font-bold"
                                    />
                                 </div>
                                 <button
                                    onClick={handleAddPart}
                                    disabled={isConcluded || !selectedPartId || partQuantity <= 0}
                                    className="px-6 py-2.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all disabled:opacity-30 disabled:grayscale"
                                 >
                                    Incluir
                                 </button>
                              </div>
                           )}

                           <div className="border border-slate-100 rounded-xl overflow-hidden">
                              <table className="w-full text-left text-sm">
                                 <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                       <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase">Nome do Item</th>
                                       <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase text-center">Qtd</th>
                                       <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase text-right">Custo</th>
                                       <th className="px-4 py-3"></th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50">
                                    {usedParts.map(part => (
                                       <tr key={part.id} className="hover:bg-slate-50/50 transition-colors">
                                          <td className="px-4 py-3 font-medium text-slate-700">{part.inventory_items?.name}</td>
                                          <td className="px-4 py-3 text-center text-slate-600">{part.quantity}</td>
                                          <td className="px-4 py-3 text-right font-bold text-slate-700">
                                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((part.inventory_items?.unit_value || 0) * part.quantity)}
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                             <button onClick={() => handleRemovePart(part.id)} disabled={isConcluded || !isAdmin}

                                                className="text-red-400 hover:text-brand-alert transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                                <Trash2 size={14} />
                                             </button>
                                          </td>
                                       </tr>
                                    ))}
                                    {usedParts.length === 0 && (
                                       <tr>
                                          <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs italic">
                                             Nenhum material registrado.
                                          </td>
                                       </tr>
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Right Column - Sidebar Widgets */}
               <div className="lg:col-span-4 space-y-8">
                  {/* Widget: Tempos da OS */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                     <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Timer size={14} className="text-primary" />
                        Tempos da OS
                     </h4>

                     <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase">
                           <span className="text-slate-500">Tempo de Resposta</span>
                           <span className={responseTime.pending ? 'text-orange-500' : 'text-emerald-600'}>
                              {responseTime.pending ? 'Em andamento' : responseTime.label}
                           </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                           <div className={`h-full rounded-full transition-all duration-500 ${responseTime.pending ? 'bg-orange-400 animate-pulse' : 'bg-emerald-500'}`} style={{ width: responseTime.pending ? '100%' : '100%' }}></div>
                        </div>
                        <p className="text-[10px] text-slate-400">Abertura → Início Manutenção</p>
                     </div>

                     <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase">
                           <span className="text-slate-500">Tempo de Resolução</span>
                           <span className={!workOrder?.responded_at ? 'text-slate-400' : resolutionTime.pending ? 'text-orange-500' : 'text-emerald-600'}>
                              {!workOrder?.responded_at ? 'Aguardando' : resolutionTime.pending ? 'Em andamento' : resolutionTime.label}
                           </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                           <div className={`h-full rounded-full transition-all duration-500 ${!workOrder?.responded_at ? 'bg-slate-200' : resolutionTime.pending ? 'bg-orange-400 animate-pulse' : 'bg-emerald-500'}`} style={{ width: !workOrder?.responded_at ? '0%' : '100%' }}></div>
                        </div>
                        <p className="text-[10px] text-slate-400">Início Manutenção → Conclusão</p>
                     </div>
                  </div>
                  {/* Widget: Asset Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                     <div className="h-32 bg-slate-900 flex items-center justify-center overflow-hidden relative group">
                        {(workOrder.assets as any)?.image_url ? (
                           <img
                              src={(workOrder.assets as any).image_url}
                              alt={workOrder.assets?.name || 'Ativo'}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                           />
                        ) : (
                           <Building2 size={48} className="text-slate-700 opacity-50 group-hover:scale-110 transition-transform" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                     </div>
                     <div className="p-6 space-y-6">
                        <div className="space-y-1">
                           <h4 className="text-base font-bold text-slate-900">{workOrder.assets?.name || 'Geral'}</h4>
                           <p className="text-xs text-slate-500">{workOrder.assets?.model || 'Modelo não especificado'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Categoria</p>
                              <p className="text-xs font-semibold text-slate-700">{workOrder.assets?.category || 'N/A'}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Setor</p>
                              <p className="text-xs font-semibold text-slate-700">{(workOrder.assets as any)?.sector || 'N/A'}</p>
                           </div>
                        </div>

                        <button
                           onClick={() => {
                              const targetCode = workOrder.assets?.code;
                              console.log('DEBUG: Ver Histórico Clicked. Asset Code:', targetCode);
                              navigate(`/work-orders?search=${targetCode || ''}`);
                           }}
                           className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition-all"
                        >
                           Ver Histórico do Ativo
                        </button>
                     </div>
                  </div>

                  {/* Widget: Resumo de Custos */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                     <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <LineChart size={14} className="text-emerald-500" />
                        Resumo de Custos
                     </h4>

                     <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-slate-500">Mão de Obra</span>
                           <span className="font-semibold text-slate-700">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                 ((workOrder as any).third_party_company_id || (workOrder as any).third_party_companies) ? (workOrder.hourly_rate || 0) : 0
                              )}
                           </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-slate-500">Peças e Materiais</span>
                           <span className="font-semibold text-slate-700">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                 usedParts.reduce((acc, part) => acc + (part.quantity * (part.inventory_items?.unit_value || 0)), 0)
                              )}
                           </span>
                        </div>
                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                           <span className="text-xs font-bold text-slate-900 uppercase">Total Estimado</span>
                           <span className="text-lg font-black text-emerald-600">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                 ((((workOrder as any).third_party_company_id || (workOrder as any).third_party_companies) ? (workOrder.hourly_rate || 0) : 0)) +
                                 usedParts.reduce((acc, part) => acc + (part.quantity * (part.inventory_items?.unit_value || 0)), 0)
                              )}
                           </span>
                        </div>
                     </div>

                     <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                        <p className="text-[10px] text-slate-500 leading-tight italic">
                           * Custos de mão de obra são aplicáveis apenas para serviços executados por empresas parceiras.
                        </p>
                     </div>
                  </div>

                  {/* Widget: Avaliação do Serviço */}
                  {status === 'Concluído' && (workOrder?.technician_id || (workOrder as any).third_party_company_id) && (
                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                           <Star size={14} className="text-amber-500" />
                           Avaliação do Serviço
                        </h4>

                        {existingRating ? (
                           <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                 <div className="flex">
                                    {[1, 2, 3, 4, 5].map(star => (
                                       <Star
                                          key={star}
                                          size={20}
                                          className={star <= existingRating.rating ? 'text-amber-400' : 'text-slate-200'}
                                          fill={star <= existingRating.rating ? 'currentColor' : 'none'}
                                       />
                                    ))}
                                 </div>
                                 <span className="text-sm font-bold text-slate-700">{existingRating.rating}/5</span>
                              </div>
                              {existingRating.comment && (
                                 <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-100">"{existingRating.comment}"</p>
                              )}
                              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                 <CheckCircle2 size={12} /> Avaliação enviada em {new Date(existingRating.created_at).toLocaleDateString('pt-BR')}
                              </p>
                           </div>
                        ) : (
                           <div className="space-y-4">
                              <p className="text-xs text-slate-500">Como você avalia o serviço de <strong>{workOrder?.technicians?.name || (workOrder as any).third_party_companies?.name}</strong>?</p>
                              <div className="flex items-center gap-1">
                                 {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                       key={star}
                                       onMouseEnter={() => setRatingHover(star)}
                                       onMouseLeave={() => setRatingHover(0)}
                                       onClick={() => setTechRating(star)}
                                       className="transition-all hover:scale-110 active:scale-95"
                                    >
                                       <Star
                                          size={28}
                                          className={star <= (ratingHover || techRating) ? 'text-amber-400' : 'text-slate-200'}
                                          fill={star <= (ratingHover || techRating) ? 'currentColor' : 'none'}
                                       />
                                    </button>
                                 ))}
                                 {techRating > 0 && (
                                    <span className="ml-2 text-sm font-bold text-slate-600">{techRating}/5</span>
                                 )}
                              </div>
                              <textarea
                                 value={techRatingComment}
                                 onChange={(e) => setTechRatingComment(e.target.value)}
                                 placeholder="Comentário (opcional)..."
                                 className="w-full p-3 border border-slate-200 rounded-lg text-xs resize-none h-16 focus:ring-2 focus:ring-amber-200 focus:border-amber-300 outline-none transition-all"
                              />
                              <button
                                 disabled={techRating === 0 || ratingSaving}
                                 onClick={async () => {
                                    if (!user || techRating === 0) return;
                                    setRatingSaving(true);
                                    try {
                                       const { data, error } = await supabaseUntyped
                                          .from('technician_ratings')
                                          .insert({
                                             technician_id: workOrder?.technician_id || null,
                                             third_party_company_id: (workOrder as any).third_party_company_id || null,
                                             work_order_id: id,
                                             user_id: user.id,
                                             rating: techRating,
                                             comment: techRatingComment || null
                                          })
                                          .select()
                                          .single();
                                       if (error) throw error;
                                       setExistingRating(data);
                                       const responsibleName = workOrder?.technicians?.name || (workOrder as any).third_party_companies?.name;
                                       setFeedback({
                                          type: 'success',
                                          title: 'Avaliação Enviada!',
                                          message: `Você avaliou ${responsibleName} com ${techRating} estrela${techRating > 1 ? 's' : ''}.`
                                       });
                                    } catch (err) {
                                       console.error('Erro ao enviar avaliação:', err);
                                       setFeedback({
                                          type: 'error',
                                          title: 'Erro',
                                          message: 'Não foi possível enviar a avaliação. Tente novamente.'
                                       });
                                    } finally {
                                       setRatingSaving(false);
                                    }
                                 }}
                                 className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-200 active:scale-95 flex items-center justify-center gap-2"
                              >
                                 {ratingSaving ? <Loader2 className="animate-spin" size={14} /> : <Star size={14} />}
                                 Enviar Avaliação
                              </button>
                           </div>
                        )}
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* Sticky Bottom Action Bar */}
         <div className="fixed bottom-0 left-0 md:left-72 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-40">
            <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between">
               <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${status === 'Concluído' ? 'bg-green-100 text-green-700' :
                     status === 'Em Manutenção' ? 'bg-blue-100 text-blue-700' :
                        status === 'Cancelado' ? 'bg-slate-100 text-slate-700' :
                           'bg-amber-100 text-amber-700'
                     }`}>{status}</span>
               </div>
               <div className="flex items-center gap-3">
                  <button
                     onClick={() => window.print()}
                     className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all no-print"
                  >
                     <FileText size={16} />
                     Imprimir OS
                  </button>
                  {isAdmin && status !== 'Cancelado' && !isConcluded && (
                     <button
                        onClick={async () => {
                           setFeedback({
                              type: 'confirm',
                              title: 'Cancelar OS?',
                              message: 'Tem certeza que deseja cancelar esta Ordem de Serviço permanentemente?',
                              onConfirm: async () => {
                                 try {
                                    setSaving(true);

                                    // 1. Notify BEFORE deletion while record exists for enrichment
                                    await NotificationService.notifyWorkOrderCancelled({
                                       id: workOrder.id,
                                       title: `OS CANCELADA: ${workOrder.order_number}`,
                                       description: editIssue || workOrder.issue,
                                       status: 'Cancelado',
                                       assetId: workOrder.asset_id,
                                       requesterId: workOrder.requester_id,
                                       order_number: workOrder.order_number,
                                       asset_id: workOrder.asset_id,
                                       requester_id: workOrder.requester_id,
                                       priority: workOrder.priority || editPriority,
                                       technicianName: (workOrder as any).technician?.name || (workOrder as any).technicians?.name
                                    } as any, user?.name || 'Administrador');

                                    // 2. Physical Deletion
                                    const { error: cancelError } = await (supabase.rpc as any)('cancel_work_order', {
                                       p_work_order_id: id,
                                       p_admin_name: user?.name || 'Administrador'
                                    });

                                    if (cancelError) throw cancelError;

                                    setFeedback({
                                       type: 'success',
                                       title: 'OS Removida',
                                       message: 'A Ordem de Serviço foi excluída e o número foi liberado.',
                                       showLoading: true
                                    });

                                    setTimeout(() => {
                                       navigate('/work-orders');
                                    }, 2000);
                                 } catch (error) {
                                    console.error('Error canceling order:', error);
                                    setFeedback({
                                       type: 'error',
                                       title: 'Erro ao Cancelar',
                                       message: (error as any).message || 'Ocorreu um erro inesperado.'
                                    });
                                 } finally {
                                    setSaving(false);
                                 }

                              }
                           });
                        }}
                        className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-red-200 text-brand-alert rounded-lg text-xs md:text-sm font-bold hover:bg-red-50 transition-all"
                     >
                        <X size={16} />
                        <span className="hidden sm:inline">Cancelar OS</span>
                        <span className="sm:hidden">Cancelar</span>
                     </button>
                  )}
                  {isAdmin && (
                     isConcluded ? (
                        <button
                           onClick={handleReopen}
                           disabled={saving}
                           className="flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-amber-500 text-white rounded-lg text-xs md:text-sm font-bold hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                        >
                           {saving ? <Loader2 className="animate-spin" size={18} /> : <RotateCcw size={18} />}
                           <span>Reabrir OS</span>
                        </button>
                     ) : (
                        <button
                           onClick={handleSave}
                           disabled={saving || (status === 'Cancelado' && workOrder?.status === 'Cancelado')}
                           className="flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-primary text-white rounded-lg text-xs md:text-sm font-bold hover:bg-primary-dark transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                        >
                           {saving ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                           <span>
                              {status === 'Concluído' ? 'Finalizar Serviço' : (
                                 <>
                                    Salvar <span className="hidden sm:inline">Alterações</span>
                                 </>
                              )}
                           </span>
                        </button>
                     )
                  )}
               </div>
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
               showLoadingDots={feedback.showLoading}
            />
         )}
      </div>
   );
};

export default WorkOrderDetails;
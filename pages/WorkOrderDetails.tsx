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
   PlayCircle,
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
   Mail,
   X,
   XCircle,
   Star,
   RotateCcw,
   Box,
   Hash,
   Info
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, supabaseUntyped } from '../lib/supabase';
import { NotificationService } from '../services/NotificationService';
import FeedbackModal from '../components/FeedbackModal';
import { SearchableSelect } from '../components/SearchableSelect';

import { useSettings } from '../contexts/SettingsContext';

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
   photos?: string[];
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
      email?: string;
   } | null;
   response_hours?: number;
   repair_hours?: number;
   downtime_hours?: number;
   estimated_hours?: number;
   maintenance_type?: string;
   parts_cost?: number;
   responded_at?: string;
   resolved_at?: string;
   scheduled_at?: string;
   parts_invoice_number?: string;
   labor_invoice_number?: string;
   labor_cost?: number;
   manual_parts_cost?: number;
   extra_costs?: { type: 'part' | 'labor' | 'other'; invoice: string; amount: number; description?: string }[];
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
   const { settings } = useSettings();
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
   const [scheduledAt, setScheduledAt] = useState<string>('');
   const [laborCost, setLaborCost] = useState<number>(0);
   const [extraCosts, setExtraCosts] = useState<{ type: 'part' | 'labor' | 'other'; invoice: string; amount: number; description?: string }[]>([]);
   const [showExtraCosts, setShowExtraCosts] = useState(false);
   const [manualPartsCost, setManualPartsCost] = useState<number>(0);
   const [isManualMode, setIsManualMode] = useState(false);
   const [manualPartDescription, setManualPartDescription] = useState('');
   const [manualPartValue, setManualPartValue] = useState(0);

   // Funções Auxiliares
   const formatToLocalISO = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      // Ajusta para o fuso horário local subtraindo o offset em minutos convertido para ms
      const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
      return localDate.toISOString().slice(0, 16);
   };

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

   const currentTech = technicians.find(t => t.id === selectedTechId);
   const isThirdPartyTech = currentTech?.is_third_party === true || !!((workOrder as any)?.third_party_company_id);

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
   const [showRatingPopup, setShowRatingPopup] = useState(false);

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

         if (res.ok) {
            console.log('DEBUG: Activity logged successfully');
            fetchActivities();
         } else {
            const errorText = await res.text();
            console.warn('SUPABASE LOG ACTIVITY WARN:', errorText);
            // Non-critical failure, don't throw
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

   const fetchUsedParts = async () => {
      if (!id) return;
      const { data: partsData } = await supabase
         .from('work_order_parts')
         .select(`
             id, item_id, quantity,
             inventory_items (name, unit_value)
         `)
         .eq('work_order_id', id);

      if (partsData) setUsedParts(partsData);
   };

   const fetchOrderDetails = async () => {
      try {
         // Fetch Order
         let query = supabase
            .from('work_orders')
            .select(`
                *,
                photos,
                assets (name, sector, category, model, manufacturer, code, warranty_expires_at, image_url),
                technicians (name),
                third_party_companies (name),
                requester:users!requester_id (name, role, email)
            `)
            .eq('id', id);

          if (user?.role !== 'admin_root') {
            const managedCats: string[] = [];
            if (user?.manage_equipment) managedCats.push('Equipamento', 'MÁQUINA');
            if (user?.manage_predial) managedCats.push('Predial', 'PREDIAL');
            if (user?.manage_others) managedCats.push('Outros', 'OUTROS');
            
            let filterString = `requester_id.eq.${user?.id}`;
            if (managedCats.length > 0) {
              const catList = managedCats.map(c => `"${c}"`).join(',');
              filterString += `,maintenance_category.in.(${catList})`;
            }
            query = query.or(filterString);
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
         setHourlyRate(data.hourly_rate || 0);
         setLaborCost((workOrderData as any).labor_cost || 0);
         setExtraCosts((workOrderData as any).extra_costs || []);
         setManualPartsCost((workOrderData as any).manual_parts_cost || 0);
         setScheduledAt((workOrderData as any).scheduled_at || '');

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
         if (workOrderData.technician_id || (workOrderData as any).third_party_company_id) {
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
                     status: 'Aberto',
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
                     order_number: workOrder.order_number,
                     maintenance_category: workOrder.maintenance_category,
                     title: `OS REABERTA: ${workOrder.order_number}`,
                     description: editIssue || workOrder.issue,
                     status: 'Aberto',
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
         let finalScheduledAt = scheduledAt || null;

         if (!workOrder?.responded_at && status === 'Em Manutenção') {
            slaUpdates.responded_at = now.toISOString();
            // Auto-fill scheduled_at when going directly to Em Manutenção without scheduling
            if (!finalScheduledAt) {
               finalScheduledAt = now.toISOString();
            }
         }

         // Caso a OS já esteja em manutenção mas o agendamento tenha ficado vazio (correção de legado)
         if (status === 'Em Manutenção' && !finalScheduledAt) {
            finalScheduledAt = workOrder?.responded_at || now.toISOString();
         }

         if (!workOrder?.resolved_at && status === 'Concluído') {
            slaUpdates.resolved_at = now.toISOString();
            // Also auto-fill scheduled_at if it was never set
            if (!finalScheduledAt) {
               finalScheduledAt = now.toISOString();
            }
         }

         // Auto-set status to Agendado when a date is picked but status is still Pendente/Recebido
         let finalStatus = status;
         if (finalScheduledAt && (status === 'Aberto' || status === 'Recebido')) {
            finalStatus = 'Agendado';
         }

         const selectedEntity = technicians.find(t => t.id === selectedTechId);
         const isThirdParty = selectedEntity?.is_third_party;

         const { error } = await supabase
            .from('work_orders')
            .update({
               technician_id: isThirdParty === false ? selectedTechId : null,
               third_party_company_id: isThirdParty === true ? selectedTechId : null,
               status: finalStatus,
               issue: editIssue,
               priority: editPriority,
               failure_type: editFailureType,
               maintenance_category: editMaintenanceCategory,
               maintenance_type: editMaintenanceType,
               estimated_hours: 0,
               technical_report: report,
               labor_cost: laborCost,
               extra_costs: extraCosts,
               response_hours: finalResponseHours,
               repair_hours: finalRepairHours,
               downtime_hours: finalDowntimeHours,
               manual_parts_cost: Number(manualPartsCost),
               parts_cost: Number(manualPartsCost) + calculatedPartsCost,
               scheduled_at: finalScheduledAt,
               updated_at: now.toISOString(),
               ...slaUpdates
            } as any)
            .eq('id', id);

         if (error) throw error;

         // Registrar logs de mudança
         const isStatusChanged = workOrder?.status !== finalStatus;
         const isScheduleChanged = workOrder?.scheduled_at !== finalScheduledAt;

         if (isStatusChanged) {
            await logActivity('status_change', `alterou o status para ${finalStatus}`);
            setStatus(finalStatus);
         }

         if (isScheduleChanged && finalStatus === 'Agendado') {
            const formattedDate = finalScheduledAt ? new Date(finalScheduledAt).toLocaleString('pt-BR') : 'remover data';
            await logActivity('system', `atualizou o agendamento para ${formattedDate}`);
         }

         const currentTechName = technicians.find(t => t.id === selectedTechId)?.name;

         if (workOrder?.technician_id !== selectedTechId) {
            await logActivity('assignment', `designou ${currentTechName || 'Nenhum'}`);
         }

         // Notificar sobre atualização - Agora dispara se status mudou, agendamento mudou, relatório mudou ou técnico mudou
         const isReportChanged = workOrder?.technical_report !== report;
         const isTechChanged = workOrder?.technician_id !== selectedTechId;

         if (workOrder && (isStatusChanged || isScheduleChanged || isReportChanged || isTechChanged)) {
            await NotificationService.notifyWorkOrderUpdated({
               id: workOrder.id,
               order_number: workOrder.order_number,
               maintenance_category: editMaintenanceCategory,
               title: `Atualização OS: ${workOrder.order_number}`,
               description: editIssue,
               priority: editPriority,
               status: finalStatus,
               assetId: workOrder.asset_id,
               locationId: '',
               assignedTo: selectedTechId || undefined,
               technicianName: currentTechName || 'Aguardando',
               requesterId: workOrder.requester_id || undefined,
               asset_id: workOrder.asset_id,
               requester_id: workOrder.requester_id,
               technical_report: report,
               maintenance_type: editMaintenanceType,
               estimated_hours: 0,
               scheduled_at: finalScheduledAt
            } as any);
         }

         setFeedback({
            type: 'success',
            title: 'Salvo com Sucesso!',
            message: 'As alterações da Ordem de Serviço foram registradas.',
            showLoading: true
         });

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
      // Se não tem item selecionado, e não estamos em modo manual ainda
      if (!selectedPartId && !isManualMode) {
         setIsManualMode(true);
         setManualPartDescription(partSearch.trim());
         setManualPartValue(0);
         return;
      }

      // Se estamos em modo manual, criar o item no inventário e adicionar na OS
      if (isManualMode) {
         if (!manualPartDescription.trim()) {
            setFeedback({ type: 'error', title: 'Erro', message: 'A descrição é obrigatória.' });
            return;
         }

         try {
            setSaving(true);
            
            // 1. Gerar SKU automático
            const prefix = 'MAT-';
            const { data: lastItems } = await supabase
               .from('inventory_items')
               .select('sku')
               .ilike('sku', `${prefix}%`)
               .order('sku', { ascending: false })
               .limit(1);

            let nextNum = 1;
            if (lastItems && lastItems.length > 0) {
               const lastSku = lastItems[0].sku;
               const match = lastSku.match(/\d+/);
               const num = match ? parseInt(match[0], 10) : 0;
               nextNum = num + 1;
            }
            const autoSku = `${prefix}${nextNum.toString().padStart(4, '0')}`;

            // 2. Criar no inventário
            const { data: newItem, error: invError } = await supabase
               .from('inventory_items')
               .insert({
                  name: manualPartDescription.trim(),
                  sku: autoSku,
                  unit_value: manualPartValue,
                  quantity: 0,
                  status: 'Ativo'
               })
               .select()
               .single();

            if (invError) throw invError;

            // 3. Adicionar na OS
            const { error: partError } = await supabase
               .from('work_order_parts')
               .insert({
                  work_order_id: id,
                  item_id: newItem.id,
                  quantity: partQuantity
               });

            if (partError) throw partError;

            // Registrar atividade
            await supabase.from('work_order_activities').insert({
               work_order_id: id,
               user_id: user?.id,
               user_name: user?.name || 'Sistema',
               activity_type: 'parts',
               description: `inseriu ${manualPartDescription} (${partQuantity}un) - Código: ${autoSku}`
            });

            await fetchOrderDetails();
            await fetchParts();
            
            setIsManualMode(false);
            setPartSearch('');
            setSelectedPartId('');
            setPartQuantity(1);
            setManualPartDescription('');
            setManualPartValue(0);

            setFeedback({
               type: 'success',
               title: 'Item Cadastrado!',
               message: `"${manualPartDescription}" foi adicionado ao sistema e à OS.`
            });

         } catch (error) {
            console.error('Error in manual part addition:', error);
            setFeedback({ type: 'error', title: 'Erro', message: 'Falha ao cadastrar material.' });
         } finally {
            setSaving(false);
         }
         return;
      }

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

         // Registrar atividade
         const actorName = user?.name || 'Administrador';
         const partName = availableParts.find(p => p.id === selectedPartId)?.name || 'Peça';
         
         await supabase.from('work_order_activities').insert({
            work_order_id: id,
            user_id: user?.id,
            user_name: actorName,
            activity_type: 'parts',
            description: `adicionou ${partQuantity}un de ${partName}`
         });

         await fetchOrderDetails();
         setSelectedPartId('');
         setPartSearch('');
         setPartQuantity(1);

         setFeedback({
            type: 'success',
            title: 'Peça Adicionada',
            message: 'O item foi registrado com sucesso.'
         });
      } catch (error) {
         console.error('Error adding part:', error);
         setFeedback({
            type: 'error',
            title: 'Erro na Operação',
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
               fetchUsedParts();
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
      { id: 'Aberto', label: 'Aberto', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
      { id: 'Recebido', label: 'Recebido', icon: User, color: 'text-slate-900', bg: 'bg-slate-100' },
      { id: 'Agendado', label: 'Agendado', icon: Calendar, color: 'text-teal-600', bg: 'bg-teal-50' },
      { id: 'Em Manutenção', label: 'Em Manutenção', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
      { id: 'Concluído', label: 'Finalizado', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' }
   ];

   // Custom timeline logic: Agendado is determined by scheduled_at, not by status directly
   const getTimelineIndex = () => {
      const statusIdx = statusSteps.findIndex(s => s.id === status);
      // If status is not Agendado but scheduled_at exists, ensure Agendado step shows as done
      if (status === 'Em Manutenção' || status === 'Concluído') return statusIdx;
      if (status === 'Agendado') return 2;
      if (scheduledAt && (status === 'Aberto' || status === 'Recebido')) return 2; // Show as Agendado
      return statusIdx;
   };
   const currentStepIndex = getTimelineIndex();

   if (loading) return <div className="p-8 text-center flex flex-col items-center gap-4">
      <Loader2 className="animate-spin text-primary" size={32} />
      <p className="text-slate-500 font-medium">Carregando detalhes da Ordem de Serviço...</p>
   </div>;

   if (!workOrder) return <div className="p-8 text-center">Ordem de serviço não encontrada.</div>;

   return (
      <>
         <div className="min-h-screen bg-slate-50/50 pb-20 no-print">
            <div className="max-w-[1440px] mx-auto px-6 py-8 space-y-6">


               {/* Header Section */}
               <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200 p-8 md:p-10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
                     <Zap size={240} />
                  </div>

                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                     <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                           <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm
                             ${workOrder.priority === 'Crítica' ? 'bg-red-50 text-red-600 border-red-100' :
                                 workOrder.priority === 'Alta' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                    workOrder.priority === 'Média' ? 'bg-primary/5 text-primary border-primary/10' :
                                       'bg-slate-50 text-slate-500 border-slate-100'}`}>
                              PRIORIDADE {workOrder.priority}
                           </div>
                           <span className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 shadow-lg">
                              OS #{workOrder.order_number}
                           </span>
                           {status === 'Cancelado' && (
                              <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-red-600 text-white border-red-600 flex items-center gap-2">
                                 <X size={12} strokeWidth={3} /> CANCELADA
                              </span>
                           )}
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-[1.1]">
                           {workOrder.issue}
                        </h1>

                        <div className="flex flex-wrap items-center gap-6 text-slate-400 font-medium">
                           <div className="flex items-center gap-2.5">
                              <div className="size-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                                 <User size={16} />
                              </div>
                              <div>
                                 <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-0.5">Solicitado por</p>
                                 <p className="text-sm font-bold text-slate-700">{workOrder.requester?.name || 'Administrador'}</p>
                              </div>
                           </div>
                           <div className="h-8 w-px bg-slate-100 hidden sm:block"></div>
                           <div className="flex items-center gap-2.5">
                              <div className="size-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                                 <Mail size={16} />
                              </div>
                              <div>
                                 <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-0.5">E-mail</p>
                                 <p className="text-sm font-bold text-slate-700">{workOrder.requester?.email || 'adm@system.com'}</p>
                              </div>
                           </div>
                           <div className="h-8 w-px bg-slate-100 hidden sm:block"></div>
                           <div className="flex items-center gap-2.5">
                              <div className="size-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                                 <Calendar size={16} />
                              </div>
                              <div>
                                 <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-0.5">Criado em</p>
                                 <p className="text-sm font-bold text-slate-700">
                                    {new Date(workOrder.created_at).toLocaleDateString('pt-BR')} às {new Date(workOrder.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                 </p>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Unified Status Visualizer */}
                     <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col md:flex-row items-center gap-10 md:gap-14">
                        {statusSteps.map((step, idx) => {
                           const done = idx <= currentStepIndex;
                           const current = idx === currentStepIndex;
                           // Borda sólida e nítida para passos concluídos
                           const borderColor = done ? step.color.replace('text-', 'border-').replace('600', '300').replace('500', '200').replace('900', 'slate-300') : 'border-slate-100';

                           return (
                              <div key={step.id} className="relative flex flex-col items-center group/step">
                                 <div className={`size-14 rounded-2xl flex items-center justify-center transition-all duration-500 relative z-10 border-2 
                                     ${done ? `${step.bg} ${borderColor} shadow-sm` : 'bg-white border-slate-100 text-slate-200'}`}>
                                    <step.icon size={26} strokeWidth={done ? 3 : 2} className={done ? step.color : 'text-slate-200'} />
                                    {current && <span className="absolute -top-1 -right-1 size-4 bg-primary rounded-full animate-ping opacity-75"></span>}
                                 </div>
                                 <p className={`mt-3 text-[10px] font-black uppercase tracking-[0.15em] transition-colors ${done ? 'text-slate-900' : 'text-slate-400'}`}>
                                    {step.label}
                                 </p>
                                 {idx < statusSteps.length - 1 && <div className="absolute top-7 left-full w-full h-0.5 bg-slate-100 hidden md:block"></div>}
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
                     {/* Card: Detalhes Técnicos */}
                     <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden group/card transition-all hover:shadow-md">
                        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/20">
                           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-4">
                              <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                                 <FileText size={20} strokeWidth={2.5} />
                              </div>
                              Especificações Técnicas
                           </h3>
                        </div>

                        <div className="p-8 md:p-10">
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-10">
                              <div className="space-y-2">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ativo</p>
                                 <div className="flex items-center gap-2">
                                    <Box size={14} className="text-slate-400" />
                                    <p className="text-sm font-bold text-slate-900">{workOrder.assets?.name || 'Manual'}</p>
                                 </div>
                              </div>
                              <div className="space-y-2">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Local / Setor</p>
                                 <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-slate-400" />
                                    <p className="text-sm font-bold text-slate-700">{workOrder.assets?.sector || 'N/A'}</p>
                                 </div>
                              </div>
                              <div className="space-y-2">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Categoria</p>
                                 <div className="flex items-center gap-2">
                                    <Building2 size={14} className="text-slate-400" />
                                    <p className="text-sm font-bold text-slate-700 capitalize">{workOrder.maintenance_category || 'Geral'}</p>
                                 </div>
                              </div>
                              <div className="space-y-2">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Serviço</p>
                                 <div className="flex items-center gap-2">
                                    <Zap size={14} className="text-slate-400" />
                                    <p className="text-sm font-bold text-slate-700">{workOrder.maintenance_type || 'Corretiva'}</p>
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-4">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Descrição do Problema</p>
                              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 text-sm leading-relaxed font-medium min-h-[120px] italic shadow-inner">
                                 "{workOrder.issue}"
                              </div>
                           </div>

                           {workOrder.photos && workOrder.photos.length > 0 && (
                              <div className="space-y-4 pt-6 mt-6 border-t border-slate-100">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Galeria de Evidências</p>
                                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {workOrder.photos.map((photo, idx) => (
                                       <a
                                          key={idx}
                                          href={photo}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 group/photo hover:border-primary/50 transition-all shadow-sm"
                                       >
                                          <img
                                             src={photo}
                                             alt={`Evidência ${idx + 1}`}
                                             className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform duration-700"
                                          />
                                       </a>
                                    ))}
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>


                     {/* Card: Ordem de Serviço (Execução) */}
                     <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden group/card transition-all hover:shadow-md">
                        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/20">
                           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-4">
                              <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                                 <Wrench size={20} strokeWidth={2.5} />
                              </div>
                              Execução do Serviço
                           </h3>
                           <select
                              value={status}
                              onChange={(e) => {
                                 const newStatus = e.target.value;
                                 setStatus(newStatus);
                                 // Regra solicitada: Se pular o agendamento e ir direto para manutenção, preencher agendamento
                                 if (newStatus === 'Em Manutenção' && !scheduledAt) {
                                    setScheduledAt(new Date().toISOString());
                                 }
                              }}
                              disabled={isConcluded || !isAdmin}
                              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase border shadow-sm transition-all focus:ring-8 focus:ring-primary/5 cursor-pointer outline-none
                                ${status === 'Aberto' ? 'bg-amber-50 text-amber-700 border-amber-200/60' :
                                    status === 'Recebido' ? 'bg-slate-100 text-slate-700 border-slate-200/60' :
                                       status === 'Agendado' ? 'bg-primary/10 text-primary border-primary/20' :
                                          status === 'Em Manutenção' ? 'bg-slate-900 text-white border-slate-950' :
                                             status === 'Cancelado' ? 'bg-red-600 text-white border-red-700' :
                                                'bg-primary text-slate-900 border-primary shadow-lg shadow-primary/20'}`}
                           >
                              <option value="Aberto">Aberto</option>
                              <option value="Recebido">Recebido</option>
                              {status === 'Agendado' && <option value="Agendado">Agendado</option>}
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

                              {/* Agendamento de Manutenção */}
                              <div className="space-y-4">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar size={12} className="text-teal-500" />
                                    Agendar Manutenção
                                 </p>
                                 <div className="relative">
                                    <input
                                       type="datetime-local"
                                       value={formatToLocalISO(scheduledAt)}
                                       onChange={(e) => {
                                          const val = e.target.value;
                                          if (val) {
                                             setScheduledAt(new Date(val).toISOString());
                                             if (status === 'Recebido' || status === 'Aberto') {
                                                setStatus('Agendado');
                                             }
                                          } else {
                                             setScheduledAt('');
                                          }
                                       }}
                                       disabled={isConcluded || !isAdmin}
                                       className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-teal-400 transition-all shadow-sm focus:ring-4 focus:ring-teal-500/5"
                                    />
                                 </div>
                                 {scheduledAt && (
                                    <div className="flex items-center gap-2 p-2.5 bg-teal-50 border border-teal-100 rounded-xl">
                                       <Calendar size={14} className="text-teal-600 shrink-0" />
                                       <p className="text-[11px] font-bold text-teal-700">
                                          Agendada para {new Date(scheduledAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} às {new Date(scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                       </p>
                                       {!isConcluded && isAdmin && (
                                          <button
                                             onClick={() => { setScheduledAt(''); if (status === 'Agendado') setStatus('Recebido'); }}
                                             className="ml-auto text-teal-400 hover:text-red-500 transition-colors shrink-0"
                                             title="Remover agendamento"
                                          >
                                             <X size={14} />
                                          </button>
                                       )}
                                    </div>
                                 )}
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

                           {/* Manual and Multiple Invoices System */}
                           <div className="space-y-6">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Custos Adicionais e Notas Fiscais</h4>
                                 <button
                                    onClick={() => setShowExtraCosts(!showExtraCosts)}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-slate-200 transition-all hover:scale-[1.02] shadow-sm"
                                 >
                                    <Plus size={14} className={showExtraCosts ? 'rotate-45' : ''} />
                                    {showExtraCosts ? 'Recolher Painel' : 'Adicionar Custos Manuais'}
                                 </button>
                              </div>

                              {showExtraCosts && (
                                 <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/50 p-6 rounded-2xl border border-dashed border-slate-200">
                                       <div className="space-y-2">
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoria</p>
                                          <select
                                             id="extraCostType"
                                             className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-primary transition-all"
                                          >
                                             <option value="part">Materiais / Peças</option>
                                             {isThirdPartyTech && <option value="labor">Mão de Obra / Serviço</option>}
                                             <option value="other">Outros / Despesas</option>
                                          </select>
                                       </div>
                                       <div className="space-y-2">
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nº Nota Fiscal</p>
                                          <input
                                             id="extraCostInvoice"
                                             type="text"
                                             placeholder="NF-e..."
                                             className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-primary transition-all"
                                          />
                                       </div>
                                       <div className="space-y-2">
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor</p>
                                          <div className="relative">
                                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                             <input
                                                id="extraCostAmount"
                                                type="number"
                                                step="0.01"
                                                placeholder="0,00"
                                                onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                                                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-primary transition-all shadow-sm"
                                             />
                                          </div>
                                       </div>
                                       <button
                                          onClick={() => {
                                             const type = (document.getElementById('extraCostType') as HTMLSelectElement).value as any;
                                             const invoice = (document.getElementById('extraCostInvoice') as HTMLInputElement).value;
                                             const amount = Number((document.getElementById('extraCostAmount') as HTMLInputElement).value);

                                             if (amount > 0) {
                                                const newItem = { type, invoice, amount };
                                                const newList = [...extraCosts, newItem];
                                                setExtraCosts(newList);

                                                // Update totals immediately for summary
                                                const parts = newList.filter(c => c.type === 'part').reduce((acc, c) => acc + c.amount, 0);
                                                const labor = newList.filter(c => c.type === 'labor').reduce((acc, c) => acc + c.amount, 0);
                                                setManualPartsCost(parts);
                                                setLaborCost(labor);

                                                // Clear inputs
                                                (document.getElementById('extraCostInvoice') as HTMLInputElement).value = '';
                                                (document.getElementById('extraCostAmount') as HTMLInputElement).value = '';
                                             }
                                          }}
                                          className="self-end px-6 py-2.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
                                       >
                                          Adicionar
                                       </button>
                                    </div>

                                    {extraCosts.length > 0 ? (
                                       <div className="grid grid-cols-1 gap-2">
                                          {extraCosts.map((cost, idx) => (
                                             <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-all shadow-sm group animate-in fade-in slide-in-from-left-1">
                                                <div className="flex items-center gap-4">
                                                   <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest ${cost.type === 'part' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                      cost.type === 'labor' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                         'bg-slate-50 text-slate-600 border border-slate-100'
                                                      }`}>
                                                      {cost.type === 'part' ? 'Material' : cost.type === 'labor' ? 'Serviço' : 'Outro'}
                                                   </span>
                                                   <div className="space-y-0.5">
                                                      <p className="text-xs font-bold text-slate-700">{cost.invoice || 'Sem Nota'}</p>
                                                      <p className="text-[9px] text-slate-400 font-medium tracking-tight uppercase">Documento Fiscal</p>
                                                   </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                   <p className="text-sm font-black text-slate-900">
                                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cost.amount)}
                                                   </p>
                                                   <button
                                                      onClick={() => {
                                                         const newList = extraCosts.filter((_, i) => i !== idx);
                                                         setExtraCosts(newList);
                                                         const parts = newList.filter(c => c.type === 'part').reduce((acc, c) => acc + c.amount, 0);
                                                         const labor = newList.filter(c => c.type === 'labor').reduce((acc, c) => acc + c.amount, 0);
                                                         setManualPartsCost(parts);
                                                         setLaborCost(labor);
                                                      }}
                                                      className="opacity-0 group-hover:opacity-100 p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                   >
                                                      <Trash2 size={14} />
                                                   </button>
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    ) : (
                                       <div className="py-8 text-center bg-slate-50/20 rounded-2xl border border-dashed border-slate-100">
                                          <p className="text-xs text-slate-400 italic">Nenhum custo manual registrado ainda.</p>
                                       </div>
                                    )}
                                 </div>
                              )}
                           </div>


                           <div className="space-y-4">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Relatório Técnico / Solução</p>
                              <textarea
                                 value={report}
                                 onChange={(e) => setReport(e.target.value)}
                                 disabled={isConcluded || !isAdmin}

                                 placeholder="Descreva o trabalho realizado, a causa raiz identificada e a resolução..."
                                 className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary transition-all min-h-[120px] shadow-sm hover:border-slate-300"
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
                                 <div className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem] shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                    {!isManualMode ? (
                                       <div className="flex flex-wrap gap-4 items-end">
                                          <div className="flex-1 min-w-[240px] space-y-2">
                                             <div className="flex justify-between items-center ml-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[.15em]">Buscar Material</label>
                                                {partSearch && (
                                                   <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                                      {filteredParts.length} resultados
                                                   </span>
                                                )}
                                             </div>
                                             <div className="relative group">
                                                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                                                <input
                                                   type="text"
                                                   placeholder="Digitar nome da peça ou código..."
                                                   value={partSearch}
                                                   onChange={(e) => setPartSearch(e.target.value)}
                                                   className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                                                />
                                             </div>
                                          </div>
                                          <div className="flex-[1.5] min-w-[240px] space-y-2">
                                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[.15em] ml-1">Selecionar Resultado</label>
                                             <select
                                                value={selectedPartId}
                                                onChange={(e) => setSelectedPartId(e.target.value)}
                                                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary transition-all font-bold"
                                             >
                                                <option value="">{partSearch ? `Não encontrou? Clique em "Incluir" para cadastrar: "${partSearch}"` : 'Escolha um material...'}</option>
                                                {filteredParts.slice(0, 50).map(p => (
                                                   <option key={p.id} value={p.id}>{p.name} [{p.sku || p.code || 'S/ SKU'}]</option>
                                                ))}
                                             </select>
                                          </div>
                                          <div className="w-24 space-y-2">
                                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[.15em] ml-1">QTD</label>
                                             <input
                                                type="number"
                                                min="1"
                                                value={partQuantity}
                                                onChange={(e) => setPartQuantity(Number(e.target.value))}
                                                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary transition-all text-center font-black"
                                             />
                                          </div>
                                          <button
                                             onClick={handleAddPart}
                                             disabled={isConcluded || partQuantity <= 0}
                                             className="px-8 py-3 bg-primary text-slate-900 text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-30 active:scale-95"
                                          >
                                             Incluir
                                          </button>
                                       </div>
                                    ) : (
                                       <div className="space-y-6 animate-in zoom-in-95 duration-300">
                                          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                                             <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                                <Plus size={14} className="text-primary" /> Cadastrar Novo Material
                                             </h5>
                                             <button 
                                                onClick={() => setIsManualMode(false)}
                                                className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                                             >
                                                Voltar à busca
                                             </button>
                                          </div>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                             <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[.15em] ml-1">Descrição da Peça</label>
                                                <div className="relative">
                                                   <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                   <input
                                                      type="text"
                                                      value={manualPartDescription}
                                                      onChange={(e) => setManualPartDescription(e.target.value)}
                                                      placeholder="Ex: Rolamento Esférico 20mm Inox"
                                                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary transition-all font-bold"
                                                   />
                                                </div>
                                             </div>
                                             <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[.15em] ml-1">Valor Unit. (R$)</label>
                                                <div className="relative">
                                                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">R$</span>
                                                   <input
                                                      type="number"
                                                      step="0.01"
                                                      value={manualPartValue}
                                                      onChange={(e) => setManualPartValue(Number(e.target.value))}
                                                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary transition-all font-black text-slate-900"
                                                   />
                                                </div>
                                             </div>
                                          </div>

                                          <div className="flex items-center gap-4 pt-2">
                                             <div className="w-24 space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[.15em] ml-1">QTD</label>
                                                <input
                                                   type="number"
                                                   min="1"
                                                   value={partQuantity}
                                                   onChange={(e) => setPartQuantity(Number(e.target.value))}
                                                   className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary transition-all text-center font-black"
                                                />
                                             </div>
                                             <button
                                                onClick={handleAddPart}
                                                disabled={saving || !manualPartDescription.trim()}
                                                className="flex-1 py-4 bg-primary text-slate-900 text-xs font-black uppercase tracking-[.2em] rounded-xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                             >
                                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                                Confirmar Cadastro e Incluir na OS
                                             </button>
                                          </div>
                                       </div>
                                    )}
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
                     {/* Widget: Avaliação do Serviço */}
                     {status === 'Concluído' && (workOrder?.technician_id || (workOrder as any).third_party_company_id) && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
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
                                 <p className="text-xs text-slate-500 leading-relaxed">Avalie o serviço de <strong>{workOrder?.technicians?.name || (workOrder as any).third_party_companies?.name}</strong>:</p>
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
                                    placeholder="Deixe um comentário opcional..."
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
                     {/* Widget: Tempos da OS */}
                     <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 space-y-8 group/card transition-all hover:shadow-md overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover/card:scale-110 transition-transform duration-1000 rotate-12">
                           <Timer size={140} />
                        </div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-[.2em] flex items-center gap-3">
                           <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                              <Timer size={18} strokeWidth={2.5} />
                           </div>
                           SLA & Desempenho
                        </h4>

                        <div className="space-y-6">
                           <div className="space-y-3">
                              <div className="flex justify-between items-end">
                                 <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tempo de Resposta (MTTA)</p>
                                    <p className={`text-2xl font-black tracking-tight ${responseTime.pending ? 'text-amber-500 animate-pulse' : 'text-slate-900'}`}>
                                       {responseTime.pending ? 'Calculando...' : responseTime.label}
                                    </p>
                                 </div>
                                 <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${responseTime.pending ? 'bg-amber-50 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                                    {responseTime.pending ? 'Pendente' : 'Concluído'}
                                 </div>
                              </div>
                              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                                 <div className={`h-full rounded-full transition-all duration-1000 ${responseTime.pending ? 'bg-gradient-to-r from-orange-400 to-orange-500 animate-pulse' : 'bg-gradient-to-r from-indigo-500 to-emerald-500'}`} style={{ width: responseTime.pending ? '100%' : '100%' }}></div>
                              </div>
                           </div>

                           <div className="space-y-3 text-right">
                              <div className="flex justify-between items-end flex-row-reverse">
                                 <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tempo de Reparo (MTTR)</p>
                                    <p className={`text-2xl font-black tracking-tight ${!workOrder?.responded_at ? 'text-slate-200' : resolutionTime.pending ? 'text-slate-900 animate-pulse' : 'text-slate-900'}`}>
                                       {!workOrder?.responded_at ? '--:--' : resolutionTime.pending ? 'Em Manutenção' : resolutionTime.label}
                                    </p>
                                 </div>
                                 <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${!workOrder?.responded_at ? 'bg-slate-50 text-slate-400' : resolutionTime.pending ? 'bg-slate-900 text-white' : 'bg-primary/10 text-primary'}`}>
                                    {!workOrder?.responded_at ? 'Aguardando' : resolutionTime.pending ? 'Ativo' : 'Finalizado'}
                                 </div>
                              </div>
                              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                                 <div className={`h-full rounded-full transition-all duration-1000 ${!workOrder?.responded_at ? 'bg-slate-200' : resolutionTime.pending ? 'bg-slate-900 animate-pulse' : 'bg-primary shadow-lg shadow-primary/20'}`} style={{ width: !workOrder?.responded_at ? '0%' : '100%' }}></div>
                              </div>
                           </div>
                        </div>
                     </div>


                     {/* Widget: Asset Card */}
                     <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden group/card transition-all hover:shadow-md">
                        <div className="h-44 bg-slate-900 flex items-center justify-center overflow-hidden relative">
                           {(workOrder.assets as any)?.image_url ? (
                              <img
                                 src={(workOrder.assets as any).image_url}
                                 alt={workOrder.assets?.name || 'Ativo'}
                                 className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-1000 opacity-60"
                              />
                           ) : (
                              <div className="flex flex-col items-center gap-3">
                                 <Building2 size={48} className="text-slate-700 opacity-50 group-hover/card:scale-110 transition-transform duration-700" />
                                 <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Sem Imagem</span>
                              </div>
                           )}
                           <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
                           <div className="absolute bottom-6 left-8">
                              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1.5">Asset Tag ID</p>
                              <div className="flex items-center gap-2">
                                 <div className="size-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(0,223,130,0.8)]"></div>
                                 <p className="text-xl font-black text-white tracking-[0.1em]">{workOrder.assets?.code || 'S/ TAG'}</p>
                              </div>
                           </div>
                        </div>
                        <div className="p-8 space-y-8">
                           <div className="space-y-1.5">
                              <h4 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{workOrder.assets?.name || 'Recurso Geral'}</h4>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[.2em]">{workOrder.assets?.model || 'Modelo não cadastrado'}</p>
                           </div>

                           <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-1">
                                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Gênero / Cat</p>
                                 <p className="text-xs font-bold text-slate-600 truncate">{workOrder.assets?.category || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Localidade</p>
                                 <p className="text-xs font-bold text-slate-600 truncate">{(workOrder.assets as any)?.sector || 'N/A'}</p>
                              </div>
                           </div>

                           <button
                              onClick={() => navigate(`/work-orders?search=${workOrder.assets?.code || ''}`)}
                              className="w-full py-4 bg-slate-50 hover:bg-slate-950 hover:text-white text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-slate-200 transition-all duration-300 shadow-sm"
                           >
                              Explorar Histórico
                           </button>
                        </div>
                     </div>


                     {/* Widget: Resumo de Custos */}
                     <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden group/card transition-all hover:shadow-md relative">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover/card:scale-110 transition-transform duration-1000 -rotate-6">
                           <LineChart size={140} />
                        </div>
                        <div className="p-8 space-y-8">
                           <h4 className="text-xs font-black text-slate-900 uppercase tracking-[.2em] flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                                    <LineChart size={18} strokeWidth={2.5} />
                                 </div>
                                 Consolidado Financeiro
                              </div>
                              {isThirdPartyTech ? (
                                 <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-blue-100">Terceirizado</span>
                              ) : (
                                 <span className="px-3 py-1 bg-slate-50 text-slate-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-slate-100">Equipe Interna</span>
                              )}
                           </h4>

                           <div className="space-y-5">
                              <div className="flex justify-between items-center group/cost">
                                 <div className="flex items-center gap-3">
                                    <div className={`size-2 rounded-full group-hover/cost:scale-150 transition-transform ${isThirdPartyTech ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
                                    <div className="flex flex-col">
                                       <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mão de Obra</span>
                                       {!isThirdPartyTech && workOrder?.responded_at && (
                                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">HH: {resolutionTime.label}</span>
                                       )}
                                    </div>
                                 </div>
                                 <span className={`text-sm font-black ${isThirdPartyTech ? 'text-slate-900' : 'text-slate-400'}`}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                       isThirdPartyTech ? (laborCost || 0) : 0
                                    )}
                                 </span>
                              </div>

                              <div className="flex justify-between items-center group/cost">
                                 <div className="flex items-center gap-3">
                                    <div className="size-2 bg-emerald-500 rounded-full group-hover/cost:scale-150 transition-transform"></div>
                                    <div className="flex flex-col">
                                       <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Peças & Mat.</span>
                                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Materiais Aplicados</span>
                                    </div>
                                 </div>
                                 <span className="text-sm font-black text-slate-900">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                       (manualPartsCost || 0) + usedParts.reduce((acc, part) => acc + (part.quantity * (part.inventory_items?.unit_value || 0)), 0)
                                    )}
                                 </span>
                              </div>

                              <div className="pt-8 border-t border-slate-100 relative">
                                 <div className="flex justify-between items-end mb-2">
                                    <div className="flex flex-col gap-1">
                                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Investimento Total</span>
                                       <span className="text-[8px] font-bold text-slate-300 uppercase italic">* Valor estimado de fechamento</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                       <span className="text-3xl font-black text-slate-900 tracking-tighter">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                             (isThirdPartyTech ? (laborCost || 0) : 0) +
                                             (manualPartsCost || 0) +
                                             usedParts.reduce((acc, part) => acc + (part.quantity * (part.inventory_items?.unit_value || 0)), 0)
                                          )}
                                       </span>
                                       <div className="flex items-center gap-1.5 text-[8px] font-black text-emerald-600 uppercase tracking-[.15em] mt-2 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                          <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                          Em Reais (BRL)
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="px-8 py-5 bg-slate-50/80 border-t border-slate-100 italic">
                              <p className="text-[9px] text-slate-400 leading-relaxed font-bold uppercase tracking-wider text-center">
                                 {isThirdPartyTech
                                    ? "* Custos de terceiros vinculados à Nota Fiscal e horas técnicas orçadas."
                                    : "* Horas internas computadas para fins de gestão de produtividade e HH (Homem-Hora)."}
                              </p>
                           </div>
                        </div>


                     </div>
                  </div>
               </div >

               {/* Sticky Bottom Action Bar */}
               < div className="fixed bottom-0 left-0 md:left-72 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-40" >
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
                                 onClick={() => {
                                    if (status === 'Concluído' && workOrder?.status !== 'Concluído') {
                                       setShowRatingPopup(true);
                                    } else {
                                       handleSave();
                                    }
                                 }}
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
               </div >

               {/* Rating Popup Modal */}
               {
                  showRatingPopup && (
                     <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowRatingPopup(false)}>
                        <div
                           className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200"
                           onClick={(e) => e.stopPropagation()}
                        >
                           {/* Header */}
                           <div className="bg-gradient-to-r from-[#0a2540] to-[#1a3a5c] p-6 text-center">
                              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm mb-3">
                                 <Star size={32} className="text-amber-400 fill-amber-400" />
                              </div>
                              <h3 className="text-xl font-bold text-white">Avalie o Serviço</h3>
                              <p className="text-sm text-slate-300 mt-1">
                                 Como foi o trabalho do técnico?
                              </p>
                           </div>

                           {/* Body */}
                           <div className="p-6">
                              {/* Stars */}
                              <div className="flex items-center justify-center gap-2 mb-2">
                                 {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                       key={star}
                                       type="button"
                                       onClick={() => setTechRating(star)}
                                       onMouseEnter={() => setRatingHover(star)}
                                       onMouseLeave={() => setRatingHover(0)}
                                       className="p-1 transition-transform hover:scale-110 active:scale-95"
                                    >
                                       <Star
                                          size={36}
                                          className={`transition-colors ${star <= (ratingHover || techRating)
                                             ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                                             : 'text-slate-200'
                                             }`}
                                       />
                                    </button>
                                 ))}
                              </div>
                              <p className="text-center text-sm font-bold text-slate-500 mb-4">
                                 {techRating === 0 && 'Clique nas estrelas para avaliar'}
                                 {techRating === 1 && 'Ruim'}
                                 {techRating === 2 && 'Regular'}
                                 {techRating === 3 && 'Bom'}
                                 {techRating === 4 && 'Muito Bom'}
                                 {techRating === 5 && 'Excelente!'}
                              </p>

                              {/* Comment */}
                              <textarea
                                 value={techRatingComment}
                                 onChange={(e) => setTechRatingComment(e.target.value)}
                                 placeholder="Comentário opcional..."
                                 rows={3}
                                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:bg-white transition-all resize-none placeholder:text-slate-400"
                              />
                           </div>

                           {/* Footer */}
                           <div className="px-6 pb-6 flex gap-3">
                              <button
                                 onClick={() => {
                                    setShowRatingPopup(false);
                                    setTechRating(0);
                                    setTechRatingComment('');
                                    handleSave();
                                 }}
                                 className="flex-1 py-3 px-4 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                              >
                                 Pular
                              </button>
                              <button
                                 disabled={techRating === 0 || ratingSaving}
                                 onClick={async () => {
                                    if (techRating === 0) return;
                                    setRatingSaving(true);
                                    try {
                                       const techId = selectedTechId || workOrder?.technician_id;
                                       const thirdPartyId = (workOrder as any)?.third_party_company_id;

                                       if (techId || thirdPartyId) {
                                          await supabaseUntyped
                                             .from('technician_ratings')
                                             .insert({
                                                work_order_id: id,
                                                technician_id: techId || null,
                                                third_party_company_id: thirdPartyId || null,
                                                user_id: user?.id,
                                                rating: techRating,
                                                comment: techRatingComment || null
                                             });
                                       }
                                    } catch (err) {
                                       console.error('Error saving rating:', err);
                                    } finally {
                                       setRatingSaving(false);
                                       setShowRatingPopup(false);
                                       handleSave();
                                    }
                                 }}
                                 className="flex-1 py-3 px-4 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                 {ratingSaving ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />}
                                 Avaliar e Finalizar
                              </button>
                           </div>
                        </div>
                     </div>
                  )
               }

               {/* Feedback Modal Reutilizável */}
               {
                  feedback && (
                     <FeedbackModal
                        isOpen={!!feedback}
                        onClose={() => setFeedback(null)}
                        type={feedback.type}
                        title={feedback.title}
                        message={feedback.message}
                        onConfirm={feedback.onConfirm}
                        showLoadingDots={feedback.showLoading}
                     />
                  )
               }
            </div>
         </div>

         {/* VERSÃO PARA IMPRESSÃO FORMAL (Apenas @media print) */}
         < div className="hidden print:block font-sans text-black bg-white p-0 m-0 print:p-0" >
            <style>
               {`
                   @media print {
                       @page {
                          size: A4;
                          margin: 1.5cm 2.5cm;
                       }
                      body {
                         background: white !important;
                         -webkit-print-color-adjust: exact !important;
                         print-color-adjust: exact !important;
                         font-size: 10pt;
                      }
                      .no-print {
                         display: none !important;
                      }
                   }
                `}
            </style>

            {/* 1. Cabeçalho Institucional - Design Industrial Master */}
            <div className="w-full flex items-stretch border-2 border-black mb-5 bg-white">
               <div className="w-1/4 p-4 border-r-2 border-black flex flex-col items-center justify-center min-h-[90px]">
                  {settings.companyLogo ? (
                     <img
                        src={settings.companyLogo}
                        alt="Logo"
                        className="max-h-16 w-full object-contain grayscale brightness-0"
                        style={{ filter: 'grayscale(100%) brightness(0%)' }}
                     />
                  ) : (
                     <div className="size-14 border-2 border-black flex items-center justify-center font-black text-2xl text-black">NH</div>
                  )}
               </div>

               <div className="flex-1 p-4 flex flex-col items-center justify-center border-r-2 border-black text-center bg-white">
                  <h2 className="text-[10px] font-black uppercase text-black mb-1 opacity-60 tracking-widest">{settings.companyName || 'Novo Horizonte'}</h2>
                  <h1 className="text-2xl font-black text-black tracking-tighter leading-none">ORDEM DE SERVIÇO</h1>
                  <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-black mt-2">Documentação Técnica Operacional</p>
               </div>

               <div className="w-1/4 p-4 flex flex-col justify-center text-right bg-white">
                  <p className="text-[10px] font-bold uppercase text-gray-400 leading-none mb-1">Nº Identificação:</p>
                  <p className="text-xl font-black text-black leading-none">{workOrder.order_number}</p>
                  <div className="mt-3 space-y-0.5">
                     <p className="text-[8px] font-black text-black uppercase">Status: <span className="font-medium">{status}</span></p>
                     <p className="text-[8px] font-black text-black uppercase">Prioridade: <span className="italic font-bold">{workOrder.priority}</span></p>
                  </div>
               </div>
            </div>

            {/* 2. Identificação do Ativo - Layout Master */}
            <div className="mb-5">
               <div className="bg-black border-2 border-black px-3 py-1 text-white">
                  <h3 className="text-[10px] font-black uppercase tracking-widest leading-none">1. Identificação Técnica do Ativo</h3>
               </div>
               <div className="grid grid-cols-4 border-x-2 border-b-2 border-black divide-x divide-black bg-white">
                  <div className="col-span-2 p-3 space-y-1">
                     <label className="text-[8px] font-black text-gray-400 uppercase leading-none block">Equipamento / Ativo:</label>
                     <p className="font-black text-lg text-black uppercase leading-tight tracking-tight">{workOrder.assets?.name}</p>
                  </div>
                  <div className="p-3 space-y-1">
                     <label className="text-[8px] font-black text-gray-400 uppercase leading-none block">TAG / Código:</label>
                     <p className="font-black text-sm text-black uppercase tracking-widest">{workOrder.assets?.code || 'S/ TAG'}</p>
                  </div>
                  <div className="p-3 space-y-1">
                     <label className="text-[8px] font-black text-gray-400 uppercase leading-none block">Setor / Local:</label>
                     <p className="font-bold text-xs text-black uppercase">{workOrder.assets?.sector || 'Geral'}</p>
                  </div>

                  <div className="p-3 space-y-1 border-t-2 border-black">
                     <label className="text-[8px] font-black text-gray-400 uppercase leading-none block">Abertura OS:</label>
                     <p className="font-bold text-[10px] text-black italic">{new Date(workOrder.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                  </div>
                  <div className="col-span-2 p-3 space-y-1 border-t-2 border-black">
                     <label className="text-[8px] font-black text-gray-400 uppercase leading-none block">Solicitante:</label>
                     <p className="font-bold text-[11px] text-black uppercase truncate">{workOrder.requester?.name || 'Administrador'}</p>
                  </div>
                  <div className="p-3 space-y-1 border-t-2 border-black text-center">
                     <label className="text-[8px] font-black text-gray-400 uppercase leading-none block mb-1">Tipo Serviço:</label>
                     <span className="inline-block border border-black px-3 py-0.5 font-black text-[9px] uppercase italic text-black bg-gray-50">
                        {workOrder.maintenance_type || 'Corretiva'}
                     </span>
                  </div>
               </div>
            </div>

            {/* 3. Descrição do Problema */}
            <div className="mb-5">
               <div className="border-2 border-black p-4 bg-white min-h-[80px]">
                  <label className="text-[8px] font-black text-gray-400 uppercase italic mb-2 block border-b border-gray-100 pb-1">Relato de Defeito / Solicitação Inicial:</label>
                  <p className="text-sm font-medium text-black leading-relaxed italic">{workOrder.issue}</p>
               </div>
            </div>

            {/* 4. Execução do Serviço */}
            <div className="mb-5">
               <div className="bg-black border-2 border-black px-3 py-1 text-white">
                  <h3 className="text-[10px] font-black uppercase tracking-widest">2. Registro de Execução Operacional</h3>
               </div>
               <div className="border-x-2 border-b-2 border-black bg-white">
                  <div className="grid grid-cols-3 divide-x-2 divide-black border-b-2 border-black">
                     <div className="p-3 min-h-[65px] flex flex-col justify-end">
                        <label className="text-[8px] font-black text-gray-400 uppercase mb-auto">Mantenedor / Técnico Responsável:</label>
                        <div className="border-b border-black font-black text-sm text-black pb-1 uppercase tracking-tight">
                           {workOrder.technicians?.name || ' '}
                        </div>
                     </div>
                     <div className="p-3 min-h-[65px] flex flex-col justify-end">
                        <label className="text-[8px] font-black text-gray-400 uppercase mb-auto italic">Data/Hora Início Efetivo:</label>
                        <div className="border-b border-black font-black text-sm text-black pb-1 italic">
                           {workOrder.responded_at ? new Date(workOrder.responded_at).toLocaleString('pt-BR') : '____/____/____  ____:____'}
                        </div>
                     </div>
                     <div className="p-3 min-h-[65px] flex flex-col justify-end">
                        <label className="text-[8px] font-black text-gray-400 uppercase mb-auto italic">Data/Hora Término Efetivo:</label>
                        <div className="border-b border-black font-black text-sm text-black pb-1 italic">
                           ____/____/____  ____:____
                        </div>
                     </div>
                  </div>

                  {/* Peças Utilizadas */}
                  <div className="p-2 border-b border-black">
                     <label className="font-bold block text-[7px] uppercase text-gray-500 mb-1">Peças e Materiais Utilizados:</label>
                     <table className="w-full text-[8px]">
                        <thead>
                           <tr className="border-b border-black font-black uppercase text-[6px] text-gray-400">
                              <th className="text-left py-0.5 w-3/4">Descrição</th>
                              <th className="text-center py-0.5">Qtd</th>
                              <th className="text-right py-0.5">Cód.</th>
                           </tr>
                        </thead>
                        <tbody>
                           {[...Array(5)].map((_, i) => (
                              <tr key={i} className="border-b border-gray-200 border-dashed h-5">
                                 <td></td>
                                 <td></td>
                                 <td></td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>

                  {/* Relato Técnico */}
                  <div className="p-2">
                     <label className="font-bold block text-[7px] uppercase text-gray-500 mb-1">Relato de Atividades e Causa Raiz:</label>
                     <div className="w-full min-h-[140px] flex flex-col pt-0.5">
                        {[...Array(7)].map((_, i) => (
                           <div key={i} className="border-b border-gray-200 border-dashed w-full h-5"></div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            {/* 5. Encerramento e Assinaturas - Design Master */}
            <div className="mt-16">
               <div className="grid grid-cols-2 gap-32 px-12">
                  <div className="flex flex-col items-center">
                     <div className="border-t-2 border-black w-full mb-1"></div>
                     <p className="text-[10px] font-black uppercase text-black tracking-widest text-center">Assinatura do Mantenedor</p>
                     <p className="text-[7px] text-gray-500 italic mt-1 font-bold">Responsável Técnico pela Execução</p>
                  </div>
                  <div className="flex flex-col items-center">
                     <div className="border-t-2 border-black w-full mb-1"></div>
                     <p className="text-[10px] font-black uppercase text-black tracking-widest text-center">Liberação / Responsável</p>
                     <p className="text-[7px] text-gray-500 italic mt-1 font-bold">Visto e Aprovação do Serviço</p>
                  </div>
               </div>

               <div className="mt-16 pt-3 border-t-2 border-gray-100 flex justify-between items-end text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none">
                  <div className="flex flex-col gap-1">
                     <p>Documento Oficial Gerado Eletronicamente via Sistema Novo Horizonte CMMS</p>
                     <p>Software de Engenharia de Manutenção - Tecnologia de Gestão de Ativos</p>
                  </div>
                  <div className="text-right flex flex-col gap-1 italic">
                     <p>Versão Técnica: 5.0.0 (A4/Print)</p>
                     <p>Dados Auditáveis - Impressão: {new Date().toLocaleString('pt-BR')}</p>
                  </div>
               </div>
            </div>
         </div>
      </>
   );
};

export default WorkOrderDetails;